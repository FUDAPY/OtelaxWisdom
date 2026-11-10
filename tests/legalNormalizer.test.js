const test = require('node:test');
const assert = require('node:assert/strict');
const legalNormalizer = require('../src/services/legalNormalizer');

test('LegalNormalizer: Partición de texto legal en artículos', () => {
  const sampleLaw = `
    LEY N° 1234
    EL CONGRESO DE LA NACIÓN PARAGUAYA SANCIONA CON FUERZA DE LEY:
    
    Artículo 1°.- La presente ley tiene por objeto regular el comercio digital en la República del Paraguay.
    
    Art. 2.- Quedan sujetos a las disposiciones de esta ley todas las personas físicas o jurídicas.
    
    Artículo 3.- Derógase la Ley N° 987/1990 y modifícase el artículo 5 de la Ley N° 456.
  `;

  const articles = legalNormalizer.extractArticles(sampleLaw);
  assert.equal(articles.length >= 3, true, 'Debe extraer al menos los 3 artículos y preámbulo');
  
  const art1 = articles.find(a => a.articleNumber.includes('1'));
  assert.ok(art1, 'Debe existir el Artículo 1');
  assert.match(art1.text, /regular el comercio digital/);

  const art3 = articles.find(a => a.articleNumber.includes('3'));
  assert.ok(art3, 'Debe existir el Artículo 3');
  assert.match(art3.text, /Derógase la Ley N° 987/);
});

test('LegalNormalizer: Detección de relaciones jurídicas (DEROGA y MODIFICA)', () => {
  const sampleText = 'Por la presente se deroga la Ley N° 5544 y modifícase la Ley N° 1122.';
  const relations = legalNormalizer.extractLegalRelations(sampleText);

  assert.equal(relations.length, 2, 'Debe detectar exactamente dos relaciones jurídicas');

  const deroga = relations.find(r => r.type === 'DEROGA');
  assert.ok(deroga);
  assert.equal(deroga.targetNumero, '5544');
  assert.equal(deroga.targetIdentifier, 'LEY_5544');

  const modifica = relations.find(r => r.type === 'MODIFICA');
  assert.ok(modifica);
  assert.equal(modifica.targetNumero, '1122');
  assert.equal(modifica.targetIdentifier, 'LEY_1122');
});
