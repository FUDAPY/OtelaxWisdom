const { query } = require('../config/postgres');
const { getSession } = require('../config/neo4j');
const embeddingService = require('./embeddingService');

class RagService {
  /**
   * Búsqueda híbrida: Vectorial (Postgres) + Contexto Topológico (Neo4j)
   * @param {string} queryText 
   * @param {number} limit 
   * @returns {Promise<Object>}
   */
  async searchLegalContext(queryText, limit = 5) {
    if (!queryText || typeof queryText !== 'string') {
      throw new Error('El parámetro queryText es obligatorio.');
    }

    // 1. Vectorización de la consulta de entrada
    const queryVector = await embeddingService.generateEmbedding(queryText);
    const vectorString = `[${queryVector.join(',')}]`;

    // 2. Búsqueda semántica por distancia coseno en PostgreSQL
    const vectorSearchSql = `
      SELECT 
        c.id AS chunk_id,
        c.articulo_numero,
        c.texto,
        ROUND((1 - (c.embedding <=> $1::vector))::numeric, 4) AS score_similitud,
        n.id AS normativa_id,
        n.identificador,
        n.tipo,
        n.numero,
        n.anio,
        n.titulo,
        n.fuente,
        n.estado AS estado_registro
      FROM chunks c
      JOIN normativas n ON c.normativa_id = n.id
      ORDER BY c.embedding <=> $1::vector ASC
      LIMIT $2;
    `;

    const pgResult = await query(vectorSearchSql, [vectorString, limit]);
    const matches = pgResult.rows;

    if (matches.length === 0) {
      return {
        query: queryText,
        totalResultados: 0,
        resultados: [],
        alertaForense: 'No se encontraron concordancias semánticas en la base de datos.'
      };
    }

    // 3. Extracción de identificadores únicos para consulta de grafo
    const uniqueIdentifiers = [...new Set(matches.map(m => m.identificador))];

    // 4. Consulta topológica en Neo4j para estado de vigencia y colisiones normativas
    const neoSession = getSession();
    const graphMap = new Map();

    try {
      const cypherQuery = `
        MATCH (n:Normativa)
        WHERE n.identificador IN $identifiers
        OPTIONAL MATCH (derogante:Normativa)-[:DEROGA]->(n)
        OPTIONAL MATCH (n)-[:DEROGA]->(derogada:Normativa)
        OPTIONAL MATCH (modificante:Normativa)-[:MODIFICA]->(n)
        OPTIONAL MATCH (n)-[:MODIFICA]->(modificada:Normativa)
        RETURN 
          n.identificador AS id,
          n.estado AS estadoGrafo,
          collect(DISTINCT derogante.identificador) AS derogadaPor,
          collect(DISTINCT derogada.identificador) AS derogaA,
          collect(DISTINCT modificante.identificador) AS modificadaPor,
          collect(DISTINCT modificada.identificador) AS modificaA
      `;

      const neoResult = await neoSession.run(cypherQuery, { identifiers: uniqueIdentifiers });

      for (const record of neoResult.records) {
        const id = record.get('id');
        graphMap.set(id, {
          estadoGrafo: record.get('estadoGrafo'),
          derogadaPor: record.get('derogadaPor').filter(Boolean),
          derogaA: record.get('derogaA').filter(Boolean),
          modificadaPor: record.get('modificadaPor').filter(Boolean),
          modificaA: record.get('modificaA').filter(Boolean)
        });
      }
    } finally {
      await neoSession.close();
    }

    // 5. Consolidación del contexto forense RAG
    const structuredResults = matches.map(match => {
      const graphData = graphMap.get(match.identificador) || {
        estadoGrafo: match.estado_registro,
        derogadaPor: [],
        derogaA: [],
        modificadaPor: [],
        modificaA: []
      };

      const estaDerogada = graphData.derogadaPor.length > 0 || graphData.estadoGrafo === 'DEROGADA';

      return {
        chunkId: match.chunk_id,
        normativa: {
          identificador: match.identificador,
          tipo: match.tipo,
          numero: match.numero,
          anio: match.anio,
          titulo: match.titulo,
          fuente: match.fuente,
          estadoVigencia: estaDerogada ? 'DEROGADA' : match.estado_registro
        },
        articulo: match.articulo_numero,
        texto: match.texto,
        scoreSimilitud: parseFloat(match.score_similitud),
        redJuridica: {
          alertaDerogacion: estaDerogada,
          derogadaPor: graphData.derogadaPor,
          modificadaPor: graphData.modificadaPor,
          derogaA: graphData.derogaA,
          modificaA: graphData.modificaA
        }
      };
    });

    return {
      query: queryText,
      totalResultados: structuredResults.length,
      resultados: structuredResults
    };
  }
}

module.exports = new RagService();
