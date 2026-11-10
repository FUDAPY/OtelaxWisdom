const express = require('express');
const ragController = require('../controllers/ragController');

const router = express.Router();

// Healthcheck
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'OtelaxWisdom-Core',
    timestamp: new Date().toISOString()
  });
});

// Rutas de consulta RAG e ingesta
router.post('/search', (req, res) => ragController.search(req, res));
router.post('/ingest', (req, res) => ragController.ingest(req, res));

module.exports = router;
