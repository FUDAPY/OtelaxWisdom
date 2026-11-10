# Panel de Control de Tareas

- [x] Crear SPEC.md con alcance, criterios de aceptación y non-goals
- [x] Crear docker-compose.yml con PostgreSQL (pgvector), Neo4j y Backend Node.js
- [x] Crear .env.example y .gitignore para hardening de seguridad
- [x] Crear README.md completo con visión de Otelax Dev y guía de despliegue
- [x] Inicializar package.json con dependencias (express, pg, neo4j-driver, etc.)
- [x] Implementar configuración de conexiones y esquemas de persistencia (Postgres + Neo4j)
- [x] Implementar servicio de embeddings y normalizador de texto legal con regex
- [x] Implementar worker de ingesta dual (pgvector + grafos Neo4j)
- [x] Implementar controlador y endpoint POST /api/v1/search con contexto híbrido
- [x] Implementar módulo utilitario de rate limiting y reintentos (RateLimiter)
- [x] Implementar scraper de la BACN (Leyes y Decretos)
- [x] Implementar scraper de la CSJ (Acuerdos y Sentencias)
- [x] Implementar componente de grafo interactivo (`src/components/KnowledgeGraph.js`)
- [x] Implementar panel lateral forense y chat RAG (`src/components/RagPanel.js`)
- [x] Implementar layout split-screen en Next.js (`src/app/page.js`)
- [x] Suite de pruebas automatizadas y chequeo sintáctico verificados al 100%
