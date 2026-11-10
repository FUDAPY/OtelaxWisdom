# SPEC: OtelaxWisdom-Core

## 1. Visión y Alcance
OtelaxWisdom-Core es un ecosistema forense RAG (Retrieval-Augmented Generation) y red de grafos de conocimiento jurídico visual enfocado en el marco normativo paraguayo (BACN, CSJ, Decretos, Leyes). Diseñado para despliegue autónomo en VPS mediante Docker/Dokploy e interconexión agnóstica con LLMs (locales o APIs).

## 2. Criterios de Aceptación
- Orquestación reproducible mediante `docker-compose.yml` con:
  - PostgreSQL 16 + extensión `pgvector`.
  - Neo4j 5 Community Edition para relaciones normativas (derogaciones, modificaciones, concordancias).
  - Servicio Backend en Node.js/Express.
- Archivo `.env.example` y exclusión estricta de secretos en `.gitignore`.
- Documentación técnica y directrices de despliegue en `README.md`.
- Pipeline de scraping y extracción estructurada para fuentes oficiales (BACN, CSJ).
- Endpoints de ingesta, vectorización y consulta RAG con resolución en grafo.

## 3. Fuera de Alcance (Non-goals)
- Despliegue automático o scripts de ejecución remota no autorizados.
- Interfaces visuales frontend en esta fase inicial.
- Credenciales o secretos reales en el repositorio.
