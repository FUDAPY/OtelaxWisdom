const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');
const routes = require('./routes');
const { initializeSchemas } = require('./db/initSchema');
const { pool } = require('./config/postgres');
const { close: closeNeo4j } = require('./config/neo4j');

const app = express();

// Middlewares defensivos y de observabilidad
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

if (config.env !== 'test') {
  app.use(morgan('combined'));
}

// Enrutador de API
app.use(config.apiPrefix, routes);

// Manejo centralizado de errores 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Ruta ${req.originalUrl} no encontrada.` });
});

// Inicialización de servidor y validación de esquemas
let server;

const startServer = async () => {
  try {
    // Inicialización preventiva de esquemas en bases de datos
    await initializeSchemas();
    console.log('[OtelaxWisdom] Esquemas de PostgreSQL y Neo4j verificados.');

    server = app.listen(config.port, () => {
      console.log(`[OtelaxWisdom] Servidor escuchando en puerto ${config.port} (${config.env})`);
      console.log(`[OtelaxWisdom] Endpoint RAG activo en ${config.apiPrefix}/search`);
    });
  } catch (error) {
    console.error('[OtelaxWisdom] Error durante la inicialización:', error.message);
    // Permite que el contenedor reintente conforme a la política de Docker
    process.exit(1);
  }
};

// Cierre controlado de conexiones
const gracefulShutdown = async (signal) => {
  console.log(`[OtelaxWisdom] Señal ${signal} recibida. Cerrando recursos...`);
  if (server) {
    server.close(async () => {
      await pool.end();
      await closeNeo4j();
      console.log('[OtelaxWisdom] Conexiones finalizadas limpiamente.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (require.main === module) {
  startServer();
}

module.exports = app;
