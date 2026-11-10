let cheerio;
try {
  cheerio = require('cheerio');
} catch {
  cheerio = null;
}
const RateLimiter = require('./utils/rateLimiter');
const config = require('../config/env');

class CsjScraper {
  /**
   * Scraper para jurisprudencia de la Corte Suprema de Justicia (CSJ) del Paraguay
   * @param {Object} options
   * @param {string} options.baseUrl Portal de jurisprudencia / IIJ de la CSJ
   * @param {number} options.rateLimitMs Intervalo mínimo entre solicitudes
   */
  constructor({
    baseUrl = 'https://www.pj.gov.py/jurisprudencia',
    rateLimitMs = 1500
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
   * Petición HTTP con limitación de tasa
   * @param {string} url 
   * @returns {Promise<string>}
   */
  async fetchHtml(url) {
    return this.rateLimiter.execute(async () => {
      const response = await fetch(url, { headers: this.headers });
      if (!response.ok) {
        throw new Error(`Fallo HTTP CSJ [${response.status}]: ${url}`);
      }
      return response.text();
    });
  }

  /**
   * Extrae la lista de fallos desde una página de resultados
   * @param {number} page 
   * @returns {Promise<Array<Object>>}
   */
  async scrapeListingPage(page = 1) {
    const targetUrl = `${this.baseUrl}?page=${page}`;
    try {
      const html = await this.fetchHtml(targetUrl);
      const $ = cheerio.load(html);
      const fallos = [];

      $('.resultado-item, .jurisprudencia-card, tr.fallo-row, .search-result-item').each((_, el) => {
        const linkEl = $(el).find('a.titulo-fallo, a[href*="fallo"], h4 a, h5 a').first();
        const rawTitulo = linkEl.text().trim() || $(el).find('.caratula, .titulo').text().trim();
        const detailHref = linkEl.attr('href') || $(el).find('a').first().attr('href');

        if (!rawTitulo || !detailHref) return;

        // Detección de tipo: Acuerdo y Sentencia (S.D.) o Auto Interlocutorio (A.I.)
        const upperTitle = rawTitulo.toUpperCase();
        let tipo = 'SENTENCIA';
        if (upperTitle.includes('ACUERDO Y SENTENCIA') || upperTitle.includes('A. Y S.') || upperTitle.includes('A.S.')) {
          tipo = 'ACUERDO';
        } else if (upperTitle.includes('AUTO INTERLOCUTORIO') || upperTitle.includes('A.I.')) {
          tipo = 'AUTO_INTERLOCUTORIO';
        }

        // Extracción de número y año del fallo (ej: N° 123/2021)
        const numMatch = rawTitulo.match(/(?:N[°º.]?\s*)?(\d+)(?:\/(\d{2,4}))?/i);
        const numero = numMatch ? numMatch[1] : 'S/N';
        let anio = numMatch && numMatch[2] ? numMatch[2] : null;

        if (anio && anio.length === 2) {
          anio = parseInt(anio, 10) > 50 ? `19${anio}` : `20${anio}`;
        }

        const absoluteUrl = detailHref.startsWith('http')
          ? detailHref
          : new URL(detailHref, this.baseUrl).toString();

        fallos.push({
          rawTitulo,
          tipo,
          numero,
          anio: anio ? parseInt(anio, 10) : new Date().getFullYear(),
          detailUrl: absoluteUrl
        });
      });

      return fallos;
    } catch (error) {
      console.error(`[CsjScraper] Error escaneando página ${page}: ${error.message}`);
      return [];
    }
  }

  /**
   * Extrae los metadatos y el cuerpo completo del fallo judicial
   * @param {string} detailUrl 
   * @returns {Promise<Object>}
   */
  async scrapeFalloDetail(detailUrl) {
    try {
      const html = await this.fetchHtml(detailUrl);
      const $ = cheerio.load(html);

      $('script, style, nav, footer, header, .no-print').remove();

      // Extracción de Sala judicial
      const fullText = $('body').text();
      let sala = 'Despacho General';
      const salaMatch = fullText.match(/Sala\s+(Constitucional|Civil\s+y\s+Comercial|Penal)/i);
      if (salaMatch) {
        sala = `Sala ${salaMatch[1]}`;
      }

      // Extracción de fecha de la resolución
      let fechaResolucion = null;
      const fechaMatch = fullText.match(/(?:Asunci[oó]n|Fecha)[,\s]+(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/i)
        || fullText.match(/(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})/i);

      if (fechaMatch) {
        if (fechaMatch[3] && !isNaN(fechaMatch[2])) {
          fechaResolucion = `${fechaMatch[3]}-${fechaMatch[2].padStart(2, '0')}-${fechaMatch[1].padStart(2, '0')}`;
        } else if (fechaMatch[3]) {
          const meses = {
            enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
            julio: '07', agosto: '08', setiembre: '09', septiembre: '09', octubre: '10',
            noviembre: '11', diciembre: '12'
          };
          const mes = meses[fechaMatch[2].toLowerCase()] || '01';
          fechaResolucion = `${fechaMatch[3]}-${mes}-${fechaMatch[1].padStart(2, '0')}`;
        }
      }

      // Extracción de partes procesales (carátula)
      let partes = 'No individualizado';
      const partesMatch = fullText.match(/Juicio\s*:\s*["“]?([^"”\n\r]+)["”]?/i)
        || fullText.match(/Car[aá]tula\s*:\s*([^\n\r]+)/i);
      if (partesMatch) {
        partes = partesMatch[1].trim();
      }

      // Extracción del texto del fallo y la sección RESUELVE
      const contenedor = $('.cuerpo-fallo, .texto-resolucion, #textoFallo, .document-body, article');
      const rawText = contenedor.length > 0 ? contenedor.text().trim() : fullText.trim();

      return {
        rawText,
        sala,
        partes,
        fechaResolucion
      };
    } catch (error) {
      console.error(`[CsjScraper] Error extrayendo detalle de fallo en ${detailUrl}: ${error.message}`);
      return { rawText: '', sala: 'Desconocida', partes: 'No disponible', fechaResolucion: null };
    }
  }

  /**
   * Envía la sentencia o acuerdo al pipeline de ingesta
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
        console.error(`[CsjScraper] Fallo en POST /ingest (${response.status}): ${errorText}`);
        return false;
      }

      const result = await response.json();
      console.log(`[CsjScraper] Ingesta exitosa: ${payload.tipo} ${payload.numero}/${payload.anio} -> Chunks: ${result.totalChunks}`);
      return true;
    } catch (error) {
      console.error(`[CsjScraper] Error de conexión con endpoint de ingesta: ${error.message}`);
      return false;
    }
  }

  /**
   * Orquesta la ejecución del scraper por rango de páginas
   * @param {Object} params
   * @param {number} params.startPage 
   * @param {number} params.maxPages 
   */
  async run({ startPage = 1, maxPages = 5 } = {}) {
    console.log(`[CsjScraper] Iniciando extracción CSJ: Páginas ${startPage} a ${startPage + maxPages - 1}`);
    let totalIngestados = 0;

    for (let page = startPage; page < startPage + maxPages; page++) {
      console.log(`[CsjScraper] Consultando página ${page}...`);
      const fallos = await this.scrapeListingPage(page);

      if (fallos.length === 0) {
        console.log(`[CsjScraper] Fin de resultados en página ${page}.`);
        break;
      }

      for (const fallo of fallos) {
        try {
          const detail = await this.scrapeFalloDetail(fallo.detailUrl);

          if (!detail.rawText || detail.rawText.length < 50) {
            console.warn(`[CsjScraper] Texto insuficiente para fallo ${fallo.rawTitulo}. Omitiendo.`);
            continue;
          }

          const payload = {
            tipo: fallo.tipo,
            numero: fallo.numero,
            anio: fallo.anio,
            titulo: `${fallo.tipo} N° ${fallo.numero}/${fallo.anio} - ${detail.partes}`,
            fuente: 'CSJ',
            fechaPromulgacion: detail.fechaResolucion,
            estado: 'FIRME',
            rawText: detail.rawText,
            metadata: {
              sourceUrl: fallo.detailUrl,
              sala: detail.sala,
              partes: detail.partes,
              scrapedAt: new Date().toISOString()
            }
          };

          const ok = await this.dispatchToIngest(payload);
          if (ok) totalIngestados++;
        } catch (itemErr) {
          console.error(`[CsjScraper] Error procesando fallo ${fallo.rawTitulo}: ${itemErr.message}`);
        }
      }
    }

    console.log(`[CsjScraper] Proceso finalizado. Total resoluciones ingestadas: ${totalIngestados}`);
    return { totalIngestados };
  }
}

module.exports = CsjScraper;
