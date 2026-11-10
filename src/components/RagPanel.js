'use client';

import React, { useState } from 'react';

export default function RagPanel({ selectedNode, apiSearchUrl = '/api/v1/search' }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiSearchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), limit: 4 })
      });

      if (!response.ok) {
        throw new Error(`Fallo en consulta RAG [${response.status}]`);
      }

      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="flex h-full w-full flex-col border-l border-slate-800 bg-slate-900 text-slate-100">
      {/* Encabezado del Panel Forense */}
      <div className="border-b border-slate-800 p-4">
        <h2 className="text-base font-semibold tracking-wide text-amber-400">
          Panel Forense y Consulta RAG
        </h2>
        <p className="text-xs text-slate-400">
          Recuperación semántica y auditoría de vigencia normativa
        </p>
      </div>

      {/* Tarjeta de Metadatos del Nodo Seleccionado */}
      <div className="border-b border-slate-800 p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Normativa Seleccionada en Grafo
        </div>
        {selectedNode ? (
          <div className="mt-2 space-y-1.5 rounded-md border border-slate-700 bg-slate-950 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">{selectedNode.label || selectedNode.id}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  selectedNode.estado === 'DEROGADA'
                    ? 'bg-rose-950 text-rose-300'
                    : selectedNode.estado === 'MODIFICADA'
                    ? 'bg-yellow-950 text-yellow-300'
                    : 'bg-emerald-950 text-emerald-300'
                }`}
              >
                {selectedNode.estado || 'VIGENTE'}
              </span>
            </div>
            <div className="text-slate-300">{selectedNode.titulo || 'Sin título registrado'}</div>
            <div className="text-[11px] text-slate-400">Tipo: {selectedNode.tipo || 'LEY'}</div>

            {selectedNode.estado === 'DEROGADA' && (
              <div className="mt-2 rounded bg-rose-900/40 p-2 text-[11px] text-rose-200">
                ⚠️ Alerta: Esta norma ha sido derogada formalmente. No apta para fundamentación de vigencia activa.
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2 rounded border border-dashed border-slate-800 p-3 text-center text-xs text-slate-400">
            Haz clic en un nodo del grafo para auditar su trazabilidad jurídica.
          </div>
        )}
      </div>

      {/* Contenedor de Resultados RAG */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Resultados de Búsqueda Forense
        </div>

        {loading && (
          <div className="flex items-center justify-center p-6 text-xs text-slate-400">
            <span className="animate-pulse">Vectorizando y cotejando en grafo...</span>
          </div>
        )}

        {error && (
          <div className="rounded border border-rose-800 bg-rose-950/50 p-2 text-xs text-rose-300">
            {error}
          </div>
        )}

        {searchResults?.resultados?.map((item, idx) => (
          <div
            key={item.chunkId || idx}
            className="rounded-md border border-slate-800 bg-slate-950 p-3 text-xs space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sky-400">
                {item.normativa?.identificador} - {item.articulo}
              </span>
              <span className="text-[10px] text-slate-400">
                Similitud: {(item.scoreSimilitud * 100).toFixed(1)}%
              </span>
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-4">
              {item.texto}
            </p>

            {item.redJuridica?.alertaDerogacion && (
              <div className="rounded bg-rose-950/80 px-2 py-1 text-[10px] text-rose-300">
                ⚠️ Advertencia de Derogación: {item.redJuridica.derogadaPor?.join(', ')}
              </div>
            )}
          </div>
        ))}

        {!loading && !searchResults && (
          <div className="text-center p-6 text-xs text-slate-400">
            Introduce una consulta jurídica para extraer artículos correlacionados.
          </div>
        )}
      </div>

      {/* Input de Consulta RAG */}
      <form onSubmit={handleSearch} className="border-t border-slate-800 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: plazos prescripción civil..."
            className="flex-1 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-amber-400 focus:outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
          >
            Buscar
          </button>
        </div>
      </form>
    </aside>
  );
}
