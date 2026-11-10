const { getClient } = require('../config/postgres');
const { getSession } = require('../config/neo4j');
const embeddingService = require('./embeddingService');
const legalNormalizer = require('./legalNormalizer');

class IngestionWorker {
  /**
   * Ejecuta la ingesta atómica dual en PostgreSQL (pgvector) y Neo4j (grafo)
   * @param {Object} documentData 
   * @returns {Promise<Object>}
   */
  async ingestDocument(documentData) {
    const {
      tipo,
      numero,
      anio,
      titulo,
      fuente,
      fechaPromulgacion = null,
      estado = 'VIGENTE',
      rawText,
      metadata = {}
    } = documentData;

    const normalizedTipo = tipo.toUpperCase().trim();
    const cleanNumero = String(numero).trim();
    const parsedAnio = parseInt(anio, 10);
    const identificador = `${normalizedTipo}_${cleanNumero}_${parsedAnio}`;

    // 1. Procesamiento sintáctico del texto legal
    const chunks = legalNormalizer.extractArticles(rawText);
    const relations = legalNormalizer.extractLegalRelations(rawText);

    // 2. Generación secuencial/paralela controlada de embeddings
    const vectorizedChunks = [];
    for (const chunk of chunks) {
      const embedding = await embeddingService.generateEmbedding(chunk.text);
      vectorizedChunks.push({
        ...chunk,
        embedding
      });
    }

    // 3. Transacción en PostgreSQL
    const pgClient = await getClient();
    let normativaId;

    try {
      await pgClient.query('BEGIN');

      const normativaUpsertSql = `
        INSERT INTO normativas (
          tipo, numero, anio, identificador, titulo, fuente, fecha_promulgacion, estado, texto_completo, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (identificador) DO UPDATE SET
          titulo = EXCLUDED.titulo,
          estado = EXCLUDED.estado,
          texto_completo = EXCLUDED.texto_completo,
          metadata = EXCLUDED.metadata
        RETURNING id;
      `;

      const normativaRes = await pgClient.query(normativaUpsertSql, [
        normalizedTipo,
        cleanNumero,
        parsedAnio,
        identificador,
        titulo,
        fuente,
        fechaPromulgacion,
        estado,
        rawText,
        JSON.stringify(metadata)
      ]);

      normativaId = normativaRes.rows[0].id;

      // Limpia chunks antiguos si es una re-ingesta
      await pgClient.query('DELETE FROM chunks WHERE normativa_id = $1;', [normativaId]);

      // Inserción de chunks con vector
      for (const item of vectorizedChunks) {
        const vectorString = `[${item.embedding.join(',')}]`;
        const chunkInsertSql = `
          INSERT INTO chunks (
            normativa_id, articulo_numero, chunk_index, texto, embedding, metadata
          ) VALUES ($1, $2, $3, $4, $5::vector, $6);
        `;
        await pgClient.query(chunkInsertSql, [
          normativaId,
          item.articleNumber,
          item.index,
          item.text,
          vectorString,
          JSON.stringify({ ...metadata, source: fuente })
        ]);
      }

      await pgClient.query('COMMIT');
    } catch (pgError) {
      await pgClient.query('ROLLBACK');
      throw new Error(`Error en persistencia PostgreSQL: ${pgError.message}`);
    } finally {
      pgClient.release();
    }

    // 4. Transacción en Neo4j (Modelado Topológico)
    const neoSession = getSession();
    try {
      // Crear o actualizar nodo principal de la normativa
      await neoSession.run(
        `
        MERGE (n:Normativa { identificador: $identificador })
        SET n.tipo = $tipo,
            n.numero = $numero,
            n.anio = $anio,
            n.titulo = $titulo,
            n.fuente = $fuente,
            n.estado = $estado,
            n.updated_at = datetime()
        `,
        {
          identificador,
          tipo: normalizedTipo,
          numero: cleanNumero,
          anio: parsedAnio,
          titulo,
          fuente,
          estado
        }
      );

      // Crear nodos de artículos y relación estructural CONTIENE
      for (const chunk of chunks) {
        const articuloUid = `${identificador}_${chunk.articleNumber.replace(/\s+/g, '_')}`;
        await neoSession.run(
          `
          MATCH (n:Normativa { identificador: $identificador })
          MERGE (a:Articulo { uid: $articuloUid })
          SET a.numero = $numeroArticulo,
              a.texto = $texto,
              a.indice = $indice
          MERGE (n)-[:CONTIENE]->(a)
          `,
          {
            identificador,
            articuloUid,
            numeroArticulo: chunk.articleNumber,
            texto: chunk.text,
            indice: chunk.index
          }
        );
      }

      // Establecer relaciones normativas detectadas (DEROGA, MODIFICA, REGLAMENTA)
      for (const rel of relations) {
        // Enlaza con cualquier coincidencia identificada
        const cypherRel = `
          MATCH (origen:Normativa { identificador: $origenId })
          MERGE (destino:Normativa { identificador: $targetId })
          ON CREATE SET destino.tipo = $targetTipo, destino.numero = $targetNumero, destino.estado = 'DESCONOCIDO'
          MERGE (origen)-[r:${rel.type}]->(destino)
          SET r.created_at = datetime()
          WITH destino
          CALL apoc.do.when(
            $relType = 'DEROGA',
            'SET destino.estado = "DEROGADA" RETURN destino',
            'RETURN destino',
            { destino: destino }
          ) YIELD value
          RETURN count(value)
        `;

        await neoSession.run(cypherRel, {
          origenId: identificador,
          targetId: rel.targetIdentifier,
          targetTipo: rel.targetTipo,
          targetNumero: rel.targetNumero,
          relType: rel.type
        });
      }
    } catch (neoError) {
      throw new Error(`Error en persistencia Neo4j: ${neoError.message}`);
    } finally {
      await neoSession.close();
    }

    return {
      success: true,
      identificador,
      normativaId,
      totalChunks: chunks.length,
      relacionesDetectadas: relations.length
    };
  }
}

module.exports = new IngestionWorker();
