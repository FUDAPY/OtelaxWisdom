let cheerio;
try {
  cheerio = require('cheerio');
} catch {
  cheerio = null;
}
const RateLimiter = require('./utils/rateLimiter');
const config = require('../config/env');

class BacnScraper {
  /**
   * Scraper oficial para la Biblioteca y Archivo Central del Congreso Nacional (BACN)
   * @param {Object} options
   * @param {string} options.baseUrl URL base de búsqueda de leyes
   * @param {number} options.rateLimitMs Tiempo entre requests consecutivos (def: 1200ms)
   */
  constructor({
    baseUrl = 'https://www.bacn.gov.py/leyes-paraguayas',
    rateLimitMs = 1200
  } = {}) {
    this.baseUrl = baseUrl;
    this.rateLimiter = new RateLimiter({ minDelayMs: rateLimitMs, maxRetries: 3 });
    this.ingestEndpoint = `http://127.0.0.1:${config.port}${config.apiPrefix}/ingest`;
    this.headers = {
      'User-Agent': 'OtelaxWisdom-Bot/1.0 (+https://github.com/FUDAPY/OtelaxWisdom; dev@otelax.com)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-PY,es;q=0.9'
    };
  }

  /**
   * Realiza una petición HTTP respetando la limitación de tasa
   * @param {string} url 
   * @returns {Promise<string>}
   */
  async fetchHtml(url) {
    return this.rateLimiter.execute(async () => {
      const response = await fetch(url, { headers: this.headers });
      if (!response.ok) {
        throw new Error(`Fallo HTTP en BACN [${response.status}]: ${url}`);
      }
      return response.text();
    });
  }

  /**
   * Parsea la página de listado de normativas de la BACN
   * @param {number} page 
   * @returns {Promise<Array<Object>>}
   */
  async scrapeListingPage(page = 1) {
    const targetUrl = `${this.baseUrl}?page=${page}`;
    try {
      const html = await this.fetchHtml(targetUrl);
      const $ = cheerio.load(html);
      const records = [];

      // Selectores sobre los bloques de normativas del portal
      $('.ley-item, .card-body, tr.normativa-row').each((_, el) => {
        const titleEl = $(el).find('h4, h5, .titulo, a.ley-title').first();
        const rawTitle = titleEl.text().trim();
        const detailHref = titleEl.find('a').attr('href') || $(el).find('a').first().attr('href');

        if (!rawTitle || !detailHref) return;

        // Extracción de número y año mediante expresiones regulares
        const numeroMatch = rawTitle.match(/(?:Ley|Decreto|N[°º.]?)\s*(\d+)(?:\/(\d{2,4}))?/i);
        const numero = numeroMatch ? numeroMatch[1] : null;
        let anio = numeroMatch && numeroMatch[2] ? numeroMatch[2] : null;

        // Detección de año en 2 dígitos a 4 dígitos
        if (anio && anio.length === 2) {
          anio = parseInt(anio, 10) > 50 ? `19${anio}` : `20${anio}`;
        }

        // Estado normativo (Vigente / Derogada / Modificada)
        const badgeText = $(el).find('.badge, .estado, .status-label').text().toUpperCase();
        let estado = 'VIGENTE';
        if (badgeText.includes('DEROG')) estado = 'DEROGADA';
        else if (badgeText.includes('MODIF')) estado = 'MODIFICADA';

        const absoluteUrl = detailHref.startsWith('http') 
          ? detailHref 
          : new URL(detailHref, this.baseUrl).toString();

        records.push({
          rawTitle,
          numero: numero || 'S/N',
          anio: anio ? parseInt(anio, 10) : new Date().getFullYear(),
          tipo: rawTitle.toUpperCase().includes('DECRETO') ? 'DECRETO' : 'LEY',
          estado,
          detailUrl: absoluteUrl
        });
      });

      return records;
    } catch (error) {
      console.error(`[BacnScraper] Error escaneando página ${page}: ${error.message}`);
      return [];
    }
  }

  /**
   * Extrae el texto legal completo y metadatos de la página de detalle
   * @param {string} detailUrl 
   * @returns {Promise<{ rawText: string, fechaPromulgacion: string|null }>}
   */
  async scrapeDocumentDetail(detailUrl) {
    try {
      const html = await this.fetchHtml(detailUrl);
      const $ = cheerio.load(html);

      // Limpieza de elementos irrelevantes (scripts, estilos, navbars)
      $('script, style, nav, footer, header, .no-print').remove();

      // Extracción del contenedor principal de texto
      const textContainer = $('.cuerpo-ley, .document-content, #contenido-ley, .panel-body, article');
      const rawText = textContainer.length > 0 
        ? textContainer.text().trim() 
        : $('body').text().trim();

      // Búsqueda de fecha de promulgación
      let fechaPromulgacion = null;
      const fechaMatch = $('body').text().match(/(?:promulgad[ao]|fecha)\s*:\s*(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/i);
      if (fechaMatch) {
        fechaPromulgacion = `${fechaMatch[3]}-${fechaMatch[2].padStart(2, '0')}-${fechaMatch[1].padStart(2, '0')}`;
      }

      return {
        rawText,
        fechaPromulgacion
      };
    } catch (error) {
      console.error(`[BacnScraper] Error extrayendo detalle de ${detailUrl}: ${error.message}`);
      return { rawText: '', fechaPromulgacion: null };
    }
  }

  /**
   * Transmite el documento parseado al endpoint de ingesta
   * @param {Object} payload 
   * @returns {Promise<boolean>}
   */
  async dispatchToIngest(payload) {
    try {
      const response = await fetch(this.ingestEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[BacnScraper] Fallo en POST /ingest (${response.status}): ${errorText}`);
        return false;
      }

      const result = await response.json();
      console.log(`[BacnScraper] Ingesta exitosa: ${payload.tipo} ${payload.numero}/${payload.anio} -> Chunks: ${result.totalChunks}`);
      return true;
    } catch (error) {
      console.error(`[BacnScraper] Error de conexión con endpoint de ingesta: ${error.message}`);
      return false;
    }
  }

  /**
   * Orquesta la ejecución del scraper por rango de páginas
   * @param {Object} params
   * @param {number} params.startPage Página inicial (def: 1)
   * @param {number} params.maxPages Límite de páginas a recorrer
   */
  async run({ startPage = 1, maxPages = 5 } = {}) {
    console.log(`[BacnScraper] Iniciando extracción: Página ${startPage} hasta ${startPage + maxPages - 1}`);
    let totalIngestados = 0;

    for (let page = startPage; page < startPage + maxPages; page++) {
      console.log(`[BacnScraper] Procesando página ${page}...`);
      const items = await this.scrapeListingPage(page);

      if (items.length === 0) {
        console.log(`[BacnScraper] No se encontraron más registros en la página ${page}. Finalizando ciclo.`);
        break;
      }

      for (const item of items) {
        try {
          const detail = await this.scrapeDocumentDetail(item.detailUrl);

          if (!detail.rawText || detail.rawText.length < 50) {
            console.warn(`[BacnScraper] Texto insuficiente para ${item.rawTitle}. Omitiendo.`);
            continue;
          }

          const payload = {
            tipo: item.tipo,
            numero: item.numero,
            anio: item.anio,
            titulo: item.rawTitle,
            fuente: 'BACN',
            fechaPromulgacion: detail.fechaPromulgacion,
            estado: item.estado,
            rawText: detail.rawText,
            metadata: {
              sourceUrl: item.detailUrl,
              scrapedAt: new Date().toISOString()
            }
          };

          const ok = await this.dispatchToIngest(payload);
          if (ok) totalIngestados++;
        } catch (itemErr) {
          console.error(`[BacnScraper] Error procesando item ${item.rawTitle}: ${itemErr.message}`);
        }
      }
    }

    console.log(`[BacnScraper] Ciclo finalizado. Total de documentos ingestados: ${totalIngestados}`);
    return { totalIngestados };
  }
}

module.exports = BacnScraper;
