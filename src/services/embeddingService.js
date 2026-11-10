const config = require('../config/env');

class EmbeddingService {
  /**
   * Genera vector numérico a partir de texto usando Ollama u OpenAI
   * @param {string} text 
   * @returns {Promise<number[]>}
   */
  async generateEmbedding(text) {
    const cleanText = text.replace(/\n+/g, ' ').trim();
    if (!cleanText) {
      return new Array(config.ai.embeddingDimensions).fill(0);
    }

    if (config.ai.provider === 'openai' && config.ai.openaiApiKey) {
      return this.generateOpenAIEmbedding(cleanText);
    }
    return this.generateOllamaEmbedding(cleanText);
  }

  async generateOllamaEmbedding(prompt) {
    const response = await fetch(`${config.ai.ollamaBaseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ai.embeddingModel,
        prompt
      })
    });

    if (!response.ok) {
      throw new Error(`Error en Ollama embedding [${response.status}]: ${await response.text()}`);
    }

    const data = await response.json();
    return data.embedding;
  }

  async generateOpenAIEmbedding(input) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.ai.openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input
      })
    });

    if (!response.ok) {
      throw new Error(`Error en OpenAI embedding [${response.status}]: ${await response.text()}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }
}

module.exports = new EmbeddingService();
