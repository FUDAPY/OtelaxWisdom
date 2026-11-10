const test = require('node:test');
const assert = require('node:assert/strict');
const CsjScraper = require('../src/scrapers/csjScraper');

test('CsjScraper: Instanciación e inicialización con rate limit', () => {
  const scraper = new CsjScraper({ rateLimitMs: 2000 });
  assert.equal(scraper.rateLimiter.minDelayMs, 2000);
  assert.match(scraper.ingestEndpoint, /\/ingest$/);
});
