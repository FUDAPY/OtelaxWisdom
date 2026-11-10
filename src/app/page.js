'use client';

import React, { useState } from 'react';
import KnowledgeGraph from '../components/KnowledgeGraph';
import RagPanel from '../components/RagPanel';

export default function HomePage() {
  const [selectedNode, setSelectedNode] = useState(null);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Header institucional */}
      <header className="flex h-12 w-full shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-amber-500 font-mono text-xs font-black text-slate-950">
            OW
          </div>
          <div>
            <h1 className="text-xs font-bold uppercase tracking-wider text-white">
              OtelaxWisdom <span className="font-normal text-slate-400">| Red de Conocimiento Jurídico</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Ecosistema RAG Operativo
          </span>
          <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-amber-400">
            Otelax Dev
          </span>
        </div>
      </header>

      {/* Disposición dividida: 70% Grafo Topológico | 30% Panel Forense RAG */}
      <main className="flex flex-1 overflow-hidden">
        {/* Sección izquierda: Grafo de Conocimiento */}
        <section className="relative h-full w-[70%] border-r border-slate-800">
          <KnowledgeGraph
            selectedNode={selectedNode}
            onSelectNode={(node) => setSelectedNode(node)}
          />
        </section>

        {/* Sección derecha: Panel Forense y Búsqueda */}
        <section className="h-full w-[30%]">
          <RagPanel selectedNode={selectedNode} />
        </section>
      </main>
    </div>
  );
}
