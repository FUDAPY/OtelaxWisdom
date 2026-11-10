try {
  require('dotenv').config();
} catch {
  if (typeof process.loadEnvFile === 'function') {
    try { process.loadEnvFile(); } catch {}
  }
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'otelax_admin',
    password: process.env.POSTGRES_PASSWORD || 'cambiar_este_password_seguro',
    database: process.env.POSTGRES_DB || 'otelax_wisdom'
  },
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'cambiar_este_password_seguro'
  },
  ai: {
    provider: process.env.EMBEDDING_PROVIDER || 'ollama',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
    embeddingModel: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
    embeddingDimensions: 768,
    openaiApiKey: process.env.OPENAI_API_KEY || ''
  }
};
