# OtelaxWisdom Core ⚖️ 🧠 - Ecosistema Forense Inteligente & Red de Conocimiento Jurídico RAG

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Desarrollado por Otelax Dev](https://img.shields.io/badge/Desarrollado%20por-Otelax%20Dev-amber.svg)](https://github.com/FUDAPY)
[![Node.js](https://img.shields.io/badge/Node.js-20%20LTS-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20pgvector-blue.svg)](https://github.com/pgvector/pgvector)
[![Neo4j](https://img.shields.io/badge/Neo4j-5%20Graph-orange.svg)](https://neo4j.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14%20App%20Router-black.svg)](https://nextjs.org/)

---

## 🇪🇸 Español

### 1. Visión y Propósito
**OtelaxWisdom-Core** es una plataforma forense jurídica de código abierto diseñada para resolver la fragmentación del marco legal paraguayo. Combina recuperación aumentada por generación (**RAG**) sobre vectores semánticos con un **Grafo de Conocimiento Normativo** que mapea de forma explícita las relaciones de vigencia: derogaciones, modificaciones y concordancias entre leyes, decretos y sentencias judiciales de la CSJ y la BACN.

### 2. Arquitectura del Sistema
- **Base de Datos Vectorial:** PostgreSQL 16 con extensión `pgvector` e indexación HNSW para búsqueda por similitud de coseno.
- **Base de Datos de Grafos:** Neo4j 5 (Community) modelando nodos (`Normativa`, `Articulo`, `Sentencia`) y aristas relacionales (`DEROGA`, `MODIFICA`, `REGLAMENTA`).
- **Pipeline de Ingesta & Scrapers:** Extractor automatizado para la BACN y la CSJ con control estricto de tasa (`RateLimiter`) y chunking por artículos mediante expresiones regulares especializadas.
- **Frontend Interactivo:** Next.js (App Router) con visualización de topología bidimensional interactiva vía `react-force-graph-2d` y panel lateral forense en tiempo real.

### 3. Puesta en Marcha Rápida

#### Requisitos
- Docker y Docker Compose (v2.20+)
- Git

#### Despliegue con Docker Compose
```bash
# 1. Clonar el repositorio
git clone https://github.com/FUDAPY/OtelaxWisdom-Core.git
cd OtelaxWisdom-Core

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Compilar y levantar la infraestructura
docker-compose up -d --build
```

#### Puertos y Servicios
- **Frontend UI & API RAG:** `http://localhost:3000`
- **Neo4j Browser:** `http://localhost:7474`
- **PostgreSQL (pgvector):** `localhost:5432`

---

## 🇺🇸 English

### 1. Vision & Purpose
**OtelaxWisdom-Core** is an open-source forensic legal intelligence platform designed to eliminate fragmentation across legal systems. It integrates Retrieval-Augmented Generation (**RAG**) powered by semantic embeddings with a **Legal Knowledge Graph** that tracks normative validity: repeals, amendments, and cross-references between statutes, executive decrees, and Supreme Court rulings.

### 2. Technical Stack
- **Vector Database:** PostgreSQL 16 with `pgvector` extension and HNSW indexing for cosine similarity retrieval.
- **Graph Database:** Neo4j 5 Community modeling legal entities (`Normativa`, `Articulo`, `Sentencia`) and edges (`DEROGA`, `MODIFICA`, `REGLAMENTA`).
- **Scraping & Ingestion Engine:** Node.js workers equipped with adaptive rate limiting and regex-driven article parsing.
- **Split-Screen UI:** Next.js App Router featuring interactive graph visualization via `react-force-graph-2d` coupled with a live forensic RAG query panel.

### 3. Quick Start

```bash
git clone https://github.com/FUDAPY/OtelaxWisdom-Core.git
cd OtelaxWisdom-Core
cp .env.example .env
docker-compose up -d --build
```

---

## Licencia / License
Este proyecto está licenciado bajo los términos de la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

## Autoría y Dirección / Authorship
Diseñado y desarrollado por **Giuliano Emanuel María Catella Riveros**, Director General, **Grupo Otelax Holding**.
