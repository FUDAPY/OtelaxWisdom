const ragService = require('../services/ragService');
const ingestionWorker = require('../services/ingestionWorker');

class RagController {
  /**
   * Endpoint de búsqueda semántica y contextualización forense RAG
   * POST /api/v1/search
   */
  async search(req, res) {
    try {
      const { query, limit = 5 } = req.body;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'El campo "query" es obligatorio y debe ser una cadena no vacía.'
        });
      }

      const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 5, 1), 50);
      const data = await ragService.searchLegalContext(query.trim(), parsedLimit);

      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  /**
   * Endpoint de ingesta manual/worker de documentos normativos
   * POST /api/v1/ingest
   */
  async ingest(req, res) {
    try {
      const { tipo, numero, anio, titulo, fuente, rawText } = req.body;

      if (!tipo || !numero || !anio || !titulo || !fuente || !rawText) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Campos requeridos faltantes: tipo, numero, anio, titulo, fuente, rawText.'
        });
      }

      const result = await ingestionWorker.ingestDocument(req.body);
      return res.status(201).json(result);
    } catch (error) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
}

module.exports = new RagController();
