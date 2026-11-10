const test = require('node:test');
const assert = require('node:assert/strict');
const RateLimiter = require('../src/scrapers/utils/rateLimiter');

test('RateLimiter: Respeta el intervalo mínimo entre ejecuciones', async () => {
  const limiter = new RateLimiter({ minDelayMs: 60, maxRetries: 2 });
  const start = Date.now();

  await limiter.execute(async () => 'primero');
  await limiter.execute(async () => 'segundo');

  const elapsed = Date.now() - start;
  assert.equal(elapsed >= 55, true, `Debe transcurrir al menos el minDelayMs (${elapsed}ms)`);
});

test('RateLimiter: Reintenta ante fallos transitorios', async () => {
  const limiter = new RateLimiter({ minDelayMs: 10, maxRetries: 3 });
  let attempts = 0;

  const result = await limiter.execute(async () => {
    attempts++;
    if (attempts < 2) {
      throw new Error('Error de conexión temporal');
    }
    return 'exito';
  });

  assert.equal(result, 'exito');
  assert.equal(attempts, 2);
});
