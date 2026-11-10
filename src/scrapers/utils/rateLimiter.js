class RateLimiter {
  /**
   * @param {Object} options
   * @param {number} options.minDelayMs Tiempo mínimo entre solicitudes consecutivas
   * @param {number} options.maxRetries Intentos máximos en caso de error transitorio
   */
  constructor({ minDelayMs = 1000, maxRetries = 3 } = {}) {
    this.minDelayMs = minDelayMs;
    this.maxRetries = maxRetries;
    this.lastRequestTimestamp = 0;
  }

  /**
   * Pausa la ejecución por un tiempo determinado
   * @param {number} ms 
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Ejecuta una función respetando el límite de tasa y reintentos exponenciales
   * @param {Function} taskFn Función asíncrona a ejecutar
   * @returns {Promise<any>}
   */
  async execute(taskFn) {
    const now = Date.now();
    const timeSinceLast = now - this.lastRequestTimestamp;

    if (timeSinceLast < this.minDelayMs) {
      await this.sleep(this.minDelayMs - timeSinceLast);
    }

    this.lastRequestTimestamp = Date.now();

    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        return await taskFn();
      } catch (error) {
        attempt++;
        if (attempt >= this.maxRetries) {
          throw error;
        }

        const backoffMs = this.minDelayMs * Math.pow(2, attempt);
        console.warn(`[RateLimiter] Error transitorio en intento ${attempt}. Reintentando en ${backoffMs}ms... Motivo: ${error.message}`);
        await this.sleep(backoffMs);
      }
    }
  }
}

module.exports = RateLimiter;
