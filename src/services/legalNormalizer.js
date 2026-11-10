class LegalNormalizer {
  /**
   * Limpia y normaliza caracteres extraños del texto legal en bruto
   * @param {string} rawText 
   * @returns {string}
   */
  sanitizeText(rawText) {
    return rawText
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/[ \u00a0]+/g, ' ')
      .trim();
  }

  /**
   * Divide el texto legal en fragmentos por artículos mediante Regex
   * @param {string} rawText 
   * @returns {Array<{ articleNumber: string, text: string, index: number }>}
   */
  extractArticles(rawText) {
    const text = this.sanitizeText(rawText);
    const articleRegex = /(?:^|\n)\s*(?:Art[ií]culo|Art\.|ART[IÍ]CULO|ART\.)\s*(\d+[a-zA-Zº°\.-]*)[.:\s-]?/g;
    
    const chunks = [];
    let match;
    const matches = [];

    while ((match = articleRegex.exec(text)) !== null) {
      matches.push({
        articleNumber: `Art. ${match[1].replace(/[.:]/g, '').trim()}`,
        startIndex: match.index
      });
    }

    if (matches.length === 0) {
      // Si no detecta artículos formalmente, retorna el texto como fragmento único
      return [{ articleNumber: 'Cuerpo Principal', text, index: 0 }];
    }

    // Si existe texto previo al primer artículo (preámbulo / considerandos)
    if (matches[0].startIndex > 0) {
      const preambleText = text.substring(0, matches[0].startIndex).trim();
      if (preambleText.length > 20) {
        chunks.push({
          articleNumber: 'Preámbulo / Vistos',
          text: preambleText,
          index: 0
        });
      }
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      const chunkText = next 
        ? text.substring(current.startIndex, next.startIndex).trim()
        : text.substring(current.startIndex).trim();

      chunks.push({
        articleNumber: current.articleNumber,
        text: chunkText,
        index: chunks.length
      });
    }

    return chunks;
  }

  /**
   * Detecta vínculos jurídicos explícitos (derogaciones, modificaciones, reglamentaciones)
   * @param {string} text 
   * @returns {Array<{ type: string, targetIdentifier: string, targetTipo: string, targetNumero: string }>}
   */
  extractLegalRelations(text) {
    const relations = [];

    // Patrón: Derogación expresa de leyes o decretos
    const derogaRegex = /(?:der[oó]g(?:ase|anse|ase|a|an)?|queda[n]?\s+derogad[ao]s?)\s+(?:la\s+)?(Ley|Decreto|Acuerdo)?\s*(?:N[°º.]?\s*)?(\d+)(?:\/(\d{2,4}))?/gi;
    let match;
    while ((match = derogaRegex.exec(text)) !== null) {
      const targetTipo = (match[1] || 'LEY').toUpperCase();
      const targetNumero = match[2];
      relations.push({
        type: 'DEROGA',
        targetIdentifier: `${targetTipo}_${targetNumero}`,
        targetTipo,
        targetNumero
      });
    }

    // Patrón: Modificación de normativas o artículos
    const modificaRegex = /(?:modif[ií]c(?:ase|anse|ase|a|an)?)\s+(?:el\s+art[íi]culo\s+\d+\s+de\s+la\s+)?(?:la\s+|el\s+)?(Ley|Decreto)?\s*(?:N[°º.]?\s*)?(\d+)(?:\/(\d{2,4}))?/gi;
    while ((match = modificaRegex.exec(text)) !== null) {
      const targetTipo = (match[1] || 'LEY').toUpperCase();
      const targetNumero = match[2];
      relations.push({
        type: 'MODIFICA',
        targetIdentifier: `${targetTipo}_${targetNumero}`,
        targetTipo,
        targetNumero
      });
    }

    // Patrón: Reglamentación de leyes
    const reglamentaRegex = /(?:reglament(?:ase|a|an)?)\s+(?:la\s+)?(Ley)?\s*(?:N[°º.]?\s*)?(\d+)(?:\/(\d{2,4}))?/gi;
    while ((match = reglamentaRegex.exec(text)) !== null) {
      const targetTipo = (match[1] || 'LEY').toUpperCase();
      const targetNumero = match[2];
      relations.push({
        type: 'REGLAMENTA',
        targetIdentifier: `${targetTipo}_${targetNumero}`,
        targetTipo,
        targetNumero
      });
    }

    return relations;
  }
}

module.exports = new LegalNormalizer();
