const { query } = require('../config/postgres');
const { getSession } = require('../config/neo4j');
const config = require('../config/env');

const initPostgresSchema = async () => {
  // Asegura extensiones de vectores e identificadores únicos
  await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
  await query(`CREATE EXTENSION IF NOT EXISTS vector;`);

  // Tabla cabecera de normativas legales
  await query(`
    CREATE TABLE IF NOT EXISTS normativas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tipo VARCHAR(50) NOT NULL,
      numero VARCHAR(50) NOT NULL,
      anio INTEGER NOT NULL,
      identificador VARCHAR(100) UNIQUE NOT NULL,
      titulo TEXT NOT NULL,
      fuente VARCHAR(50) NOT NULL,
      fecha_promulgacion DATE,
      estado VARCHAR(50) DEFAULT 'VIGENTE',
      texto_completo TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Tabla de fragmentos vectorizados (artículos y considerandos)
  const vectorDim = config.ai.embeddingDimensions;
  await query(`
    CREATE TABLE IF NOT EXISTS chunks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      normativa_id UUID NOT NULL REFERENCES normativas(id) ON DELETE CASCADE,
      articulo_numero VARCHAR(50),
      chunk_index INTEGER NOT NULL,
      texto TEXT NOT NULL,
      embedding vector(${vectorDim}),
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Índices relacionales y vectoriales HNSW para búsqueda coseno
  await query(`CREATE INDEX IF NOT EXISTS idx_normativas_identificador ON normativas(identificador);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_chunks_normativa_id ON chunks(normativa_id);`);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw 
    ON chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
  `);
};

const initNeo4jSchema = async () => {
  const session = getSession();
  try {
    // Restricciones de unicidad para entidades normativas y artículos
    await session.run(`
      CREATE CONSTRAINT constraint_normativa_identificador IF NOT EXISTS
      FOR (n:Normativa) REQUIRE n.identificador IS UNIQUE
    `);

    await session.run(`
      CREATE CONSTRAINT constraint_articulo_uid IF NOT EXISTS
      FOR (a:Articulo) REQUIRE a.uid IS UNIQUE
    `);

    // Índices de búsqueda sobre tipo y estado de vigencia
    await session.run(`
      CREATE INDEX index_normativa_tipo_estado IF NOT EXISTS
      FOR (n:Normativa) ON (n.tipo, n.estado)
    `);
  } finally {
    await session.close();
  }
};

const initializeSchemas = async () => {
  try {
    await initPostgresSchema();
    await initNeo4jSchema();
    return { success: true, message: 'Esquemas de PostgreSQL y Neo4j inicializados correctamente.' };
  } catch (error) {
    throw new Error(`Fallo en inicialización de esquemas: ${error.message}`);
  }
};

module.exports = {
  initializeSchemas,
  initPostgresSchema,
  initNeo4jSchema
};
