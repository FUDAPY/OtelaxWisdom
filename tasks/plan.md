# Plan de Trabajo - OtelaxWisdom-Core

## Fase 1: Arquitectura Base y Contenerización
- [x] Especificación técnica inicial (`SPEC.md`).
- [ ] Configuración de orquestación contenerizada (`docker-compose.yml`, `.env.example`, `.gitignore`).
- [ ] Documentación maestra del repositorio (`README.md`).

## Fase 2: Pipeline de Scraping e Ingesta Legal (Siguiente etapa)
- [ ] Estructura base de worker/scraper en Node.js para fuentes BACN y CSJ.
- [ ] Módulo de limpieza y normalización jurídica de textos normativos.
- [ ] Ingestor vectorial a PostgreSQL (pgvector) y modelado de relaciones a Neo4j.

## Fase 3: Endpoints de Consulta Forense RAG y Grafo
- [ ] Endpoints REST en Express para búsqueda híbrida (vectorial + grafo).
- [ ] Pruebas automatizadas de integración y validación de queries.
