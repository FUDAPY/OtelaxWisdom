'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Importación dinámica para prevenir errores de canvas en SSR (Next.js)
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-400">
      <span className="animate-pulse font-mono text-sm">Cargando topología de grafo jurídico...</span>
    </div>
  )
});

// Datos de contingencia inicial para renderizado inmediato
const DEFAULT_GRAPH_DATA = {
  nodes: [
    { id: 'LEY_1183_1985', label: 'Ley 1183/85', tipo: 'LEY', titulo: 'Código Civil Paraguayo', estado: 'MODIFICADA' },
    { id: 'LEY_1337_1988', label: 'Ley 1337/88', tipo: 'LEY', titulo: 'Código Procesal Civil', estado: 'VIGENTE' },
    { id: 'LEY_5544_2015', label: 'Ley 5544/15', tipo: 'LEY', titulo: 'Modifica Arts. del Código Procesal', estado: 'VIGENTE' },
    { id: 'SENT_45_2022', label: 'S.D. 45/2022', tipo: 'SENTENCIA', titulo: 'Inconstitucionalidad Art. 140', estado: 'FIRME' }
  ],
  links: [
    { source: 'LEY_5544_2015', target: 'LEY_1337_1988', label: 'MODIFICA' },
    { source: 'SENT_45_2022', target: 'LEY_1337_1988', label: 'DECLARA_INCONST' }
  ]
};

export default function KnowledgeGraph({ selectedNode, onSelectNode, apiUrl = '/api/v1/graph' }) {
  const [graphData, setGraphData] = useState(DEFAULT_GRAPH_DATA);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef(null);

  // Ajuste reactivo al tamaño del contenedor padre
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Carga de topología desde el backend
  useEffect(() => {
    let isMounted = true;
    async function loadTopology() {
      try {
        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          if (isMounted && data.nodes && data.nodes.length > 0) {
            setGraphData(data);
          }
        }
      } catch {
        // Mantiene datos de reserva si el endpoint no responde
      }
    }
    loadTopology();
    return () => { isMounted = false; };
  }, [apiUrl]);

  // Paleta semántica según estado jurídico
  const getNodeColor = (node) => {
    if (selectedNode?.id === node.id) return '#f59e0b'; // Ámbar de selección
    if (node.estado === 'DEROGADA') return '#f43f5e';   // Rojo alerta
    if (node.estado === 'MODIFICADA') return '#eab308'; // Amarillo advertencia
    if (node.tipo === 'SENTENCIA') return '#38bdf8';    // Azul jurisprudencia
    return '#10b981';                                   // Verde vigente
  };

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-slate-950">
      {/* Barra de estado contextual superior */}
      <div className="absolute left-4 top-4 z-10 flex gap-2 rounded-lg border border-slate-800 bg-slate-900/80 p-2 text-xs backdrop-blur">
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Vigente
        </span>
        <span className="flex items-center gap-1 text-yellow-400">
          <span className="h-2 w-2 rounded-full bg-yellow-500" /> Modificada
        </span>
        <span className="flex items-center gap-1 text-rose-400">
          <span className="h-2 w-2 rounded-full bg-rose-500" /> Derogada
        </span>
        <span className="flex items-center gap-1 text-sky-400">
          <span className="h-2 w-2 rounded-full bg-sky-500" /> Sentencia CSJ
        </span>
      </div>

      <ForceGraph2D
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeId="id"
        nodeLabel={(node) => `${node.label} - ${node.titulo}`}
        nodeColor={getNodeColor}
        nodeRelSize={7}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.15}
        linkColor={() => '#475569'}
        linkLabel={(link) => link.label}
        onNodeClick={(node) => {
          if (onSelectNode) onSelectNode(node);
        }}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.label || node.id;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px sans-serif`;

          // Círculo del nodo
          ctx.beginPath();
          ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);
          ctx.fillStyle = getNodeColor(node);
          ctx.fill();

          // Resaltado de borde en selección activa
          if (selectedNode?.id === node.id) {
            ctx.lineWidth = 2 / globalScale;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
          }

          // Etiqueta tipográfica
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText(label, node.x, node.y + 10);
        }}
      />
    </div>
  );
}
