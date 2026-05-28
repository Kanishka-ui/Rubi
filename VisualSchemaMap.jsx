import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Maximize2, Minimize2, ZoomIn, ZoomOut, Move, Info, Database } from 'lucide-react';

export default function VisualSchemaMap({ schema, onClose }) {
  const containerRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeNode, setActiveNode] = useState(null); // Table name hovered/selected
  const [activeLink, setActiveLink] = useState(null); // Link index hovered

  const tables = useMemo(() => schema?.tables || [], [schema]);
  const schemaDetails = useMemo(() => schema?.schema || {}, [schema]);

  // Width and height of the map viewport
  const width = 800;
  const height = 500;

  // 1. Dynamic Layout: Arrange tables in a circle/grid
  const nodes = useMemo(() => {
    if (tables.length === 0) return [];
    
    const cx = width / 2;
    const cy = height / 2;
    
    if (tables.length === 1) {
      return [{ id: tables[0], x: cx, y: cy }];
    }
    
    if (tables.length === 2) {
      return [
        { id: tables[0], x: cx - 180, y: cy },
        { id: tables[1], x: cx + 180, y: cy }
      ];
    }

    // Circular layout for 3+ tables
    const radius = Math.min(width, height) * 0.32;
    return tables.map((table, idx) => {
      const angle = (idx / tables.length) * 2 * Math.PI - Math.PI / 2;
      return {
        id: table,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
  }, [tables]);

  // Map nodes by table ID for fast lookup
  const nodeMap = useMemo(() => {
    const map = {};
    nodes.forEach(n => { map[n.id] = n; });
    return map;
  }, [nodes]);

  // 2. Relationship Detection Algorithm
  const links = useMemo(() => {
    const list = [];
    if (tables.length < 2) return [];

    for (let i = 0; i < tables.length; i++) {
      for (let j = i + 1; j < tables.length; j++) {
        const t1 = tables[i];
        const t2 = tables[j];
        
        const cols1 = schemaDetails[t1] || [];
        const cols2 = schemaDetails[t2] || [];

        cols1.forEach(c1 => {
          const colName1 = c1.Field.toLowerCase();
          
          cols2.forEach(c2 => {
            const colName2 = c2.Field.toLowerCase();

            // Match conditions:
            // - Exact matching _id columns (e.g. product_id in both)
            // - Primary key match (e.g. t1='orders' customer_id matches t2='customers' id)
            const isMatch = 
              (colName1 === colName2 && colName1.includes('_id')) ||
              (colName1 === `${t2.slice(0, -1).toLowerCase()}_id` && colName2 === 'id') ||
              (colName2 === `${t1.slice(0, -1).toLowerCase()}_id` && colName1 === 'id') ||
              (colName1 === 'id' && colName2 === `${t1.slice(0, -1).toLowerCase()}_id`) ||
              (colName2 === 'id' && colName1 === `${t2.slice(0, -1).toLowerCase()}_id`);

            if (isMatch) {
              list.push({
                source: t1,
                target: t2,
                sourceCol: c1.Field,
                targetCol: c2.Field,
              });
            }
          });
        });
      }
    }
    return list;
  }, [tables, schemaDetails]);

  // 3. Canvas Drag/Pan Handlers
  const handleMouseDown = (e) => {
    if (e.target.tagName === 'svg' || e.target.id === 'canvas-grid') {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDraggingCanvas) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
  };

  const handleZoom = (factor) => {
    setZoom(prev => Math.max(0.5, Math.min(2.5, prev + factor)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setActiveNode(null);
    setActiveLink(null);
  };

  // Node Dimensions
  const nodeWidth = 180;
  const nodeHeight = 160;

  return (
    <div className={`ql-modal-overlay ${fullscreen ? 'map-fullscreen-overlay' : ''}`} style={{ zIndex: 1000 }} onMouseUp={handleMouseUp}>
      <div 
        className={`ql-modal map-modal ${fullscreen ? 'map-modal-fullscreen' : ''}`} 
        style={{ width: fullscreen ? '100vw' : '880px', height: fullscreen ? '100vh' : '620px', maxWidth: 'none', background: '#0f172a' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="ql-modal-header" style={{ borderBottom: '1px solid #334155', padding: '1rem 1.5rem', background: '#1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={20} color="#6366f1" />
            <h2 style={{ color: '#f8fafc', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Visual Database Map (ER Schema)</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              className="dash-btn dash-btn-ghost" 
              onClick={() => setFullscreen(!fullscreen)} 
              title={fullscreen ? 'Minimize' : 'Fullscreen'}
              style={{ padding: '0.4rem', border: '1px solid #475569', color: '#94a3b8' }}
            >
              {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button 
              className="dash-btn dash-btn-danger" 
              onClick={onClose} 
              style={{ padding: '0.4rem', border: 'none' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Info panel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#1e293b', padding: '0.5rem 1.5rem', borderBottom: '1px solid #334155', fontSize: '0.8rem', color: '#94a3b8' }}>
          <Info size={14} color="#38bdf8" />
          <span>Interactive map of active tables and automatic relationships. Drag empty canvas to pan, or hover links/tables.</span>
        </div>

        {/* Map Canvas */}
        <div 
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          style={{ 
            position: 'relative', 
            height: fullscreen ? 'calc(100vh - 105px)' : '450px', 
            overflow: 'hidden', 
            background: '#090d16',
            cursor: isDraggingCanvas ? 'grabbing' : 'grab',
            userSelect: 'none'
          }}
        >
          {/* Canvas Controls */}
          <div style={{ position: 'absolute', bottom: '1.25rem', right: '1.25rem', display: 'flex', gap: '0.5rem', zIndex: 10 }}>
            <button className="dash-btn" onClick={() => handleZoom(0.15)} style={{ background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', padding: '0.5rem' }}><ZoomIn size={15} /></button>
            <button className="dash-btn" onClick={() => handleZoom(-0.15)} style={{ background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', padding: '0.5rem' }}><ZoomOut size={15} /></button>
            <button className="dash-btn" onClick={resetView} style={{ background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.75rem', padding: '0.5rem 0.75rem' }}><Move size={13} style={{ marginRight: '0.25rem' }} /> Reset</button>
          </div>

          {/* SVG Canvas Workspace */}
          <svg 
            width="100%" 
            height="100%" 
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            {/* Grid Pattern Background */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="1" />
              </pattern>
            </defs>
            <rect id="canvas-grid" width="100%" height="100%" fill="url(#grid)" />

            {/* Glowing filter for lines */}
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Transform Group (Zoom and Pan) */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              
              {/* 1. Draw SVG Connecting Lines (Relationships) */}
              {links.map((link, idx) => {
                const sNode = nodeMap[link.source];
                const tNode = nodeMap[link.target];
                if (!sNode || !tNode) return null;

                const isHovered = activeLink === idx;
                const isRelated = activeNode === link.source || activeNode === link.target;

                // Path coordinates (mid-to-mid line)
                const x1 = sNode.x;
                const y1 = sNode.y;
                const x2 = tNode.x;
                const y2 = tNode.y;

                // Control points for curvy bezier lines
                const dx = Math.abs(x2 - x1) * 0.5;
                const pathData = `M ${x1} ${y1} C ${x1 + (x2 > x1 ? dx : -dx)} ${y1}, ${x2 + (x2 > x1 ? -dx : dx)} ${y2}, ${x2} ${y2}`;

                return (
                  <g key={idx}>
                    {/* Thick invisible interaction path for easier hovering */}
                    <path 
                      d={pathData} 
                      fill="none" 
                      stroke="transparent" 
                      strokeWidth="15" 
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setActiveLink(idx)}
                      onMouseLeave={() => setActiveLink(null)}
                    />
                    {/* Outer glowing path */}
                    <path 
                      d={pathData} 
                      fill="none" 
                      stroke={isHovered ? '#818cf8' : (isRelated ? '#6366f1' : '#334155')} 
                      strokeWidth={isHovered ? 4 : (isRelated ? 2 : 1.5)} 
                      strokeDasharray={isHovered ? 'none' : (isRelated ? '5,5' : 'none')}
                      opacity={isHovered ? 1 : (activeNode && !isRelated ? 0.2 : 0.75)}
                      filter={isHovered || isRelated ? 'url(#glow)' : 'none'}
                      style={{ transition: 'stroke 0.2s, stroke-width 0.2s, opacity 0.2s' }}
                    />
                    
                    {/* Relationship tooltip text in middle */}
                    {(isHovered || (activeNode && isRelated && activeLink === null)) && (
                      <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2 - 10})`}>
                        <rect 
                          x="-80" 
                          y="-12" 
                          width="160" 
                          height="24" 
                          rx="4" 
                          fill="#1e293b" 
                          stroke="#4f46e5" 
                          strokeWidth="1"
                        />
                        <text 
                          fill="#f8fafc" 
                          fontSize="9" 
                          fontWeight="bold"
                          textAnchor="middle" 
                          dominantBaseline="central"
                        >
                          {link.sourceCol} ➔ {link.targetCol}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* 2. Draw Table Nodes as foreignObject cards */}
              {nodes.map(node => {
                const schemaList = schemaDetails[node.id] || [];
                const isHovered = activeNode === node.id;
                const isDimmed = activeNode && activeNode !== node.id && 
                                 !links.some(l => (l.source === node.id && l.target === activeNode) || 
                                                  (l.target === node.id && l.source === activeNode));

                return (
                  <g 
                    key={node.id} 
                    transform={`translate(${node.x - nodeWidth / 2}, ${node.y - nodeHeight / 2})`}
                    onMouseEnter={() => setActiveNode(node.id)}
                    onMouseLeave={() => setActiveNode(null)}
                    style={{ transition: 'opacity 0.2s', opacity: isDimmed ? 0.35 : 1 }}
                  >
                    <foreignObject 
                      width={nodeWidth} 
                      height={nodeHeight}
                      style={{ overflow: 'visible' }}
                    >
                      <div 
                        className={`map-node-card ${isHovered ? 'map-node-hovered' : ''}`}
                        style={{
                          background: '#1e293b',
                          border: isHovered ? '2px solid #6366f1' : '1px solid #475569',
                          borderRadius: '8px',
                          width: '100%',
                          height: '100%',
                          boxShadow: isHovered ? '0 0 15px rgba(99,102,241,0.4)' : '0 4px 6px -1px rgba(0,0,0,0.1)',
                          display: 'flex',
                          flexDirection: 'column',
                          color: '#f8fafc',
                          fontFamily: 'sans-serif',
                          fontSize: '0.75rem',
                          transition: 'border 0.2s, box-shadow 0.2s'
                        }}
                      >
                        {/* Table Header */}
                        <div 
                          style={{
                            background: isHovered ? '#312e81' : '#0f172a',
                            padding: '0.5rem 0.75rem',
                            borderBottom: '1px solid #475569',
                            borderTopLeftRadius: '6px',
                            borderTopRightRadius: '6px',
                            fontWeight: 'bold',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: '#818cf8'
                          }}
                        >
                          <Database size={13} />
                          <span>{node.id}</span>
                        </div>

                        {/* Columns List (Scrollable if very long) */}
                        <div 
                          style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '0.35rem 0.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem'
                          }}
                        >
                          {schemaList.map((col, idx) => {
                            const isPK = col.Key === 'PRI';
                            const isFK = col.Field.toLowerCase().includes('_id') && !isPK;
                            
                            return (
                              <div 
                                key={idx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '0.15rem 0.25rem',
                                  borderRadius: '3px',
                                  background: isPK ? 'rgba(234,179,8,0.08)' : (isFK ? 'rgba(99,102,241,0.08)' : 'transparent'),
                                }}
                              >
                                <span style={{ 
                                  fontWeight: isPK || isFK ? 'bold' : 'normal',
                                  color: isPK ? '#fbbf24' : (isFK ? '#818cf8' : '#cbd5e1')
                                }}>
                                  {isPK && '🔑 '}{col.Field}
                                </span>
                                <span style={{ color: '#64748b', fontSize: '0.65rem' }}>
                                  {col.Type}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Modal Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.75rem 1.5rem', background: '#1e293b', borderTop: '1px solid #334155' }}>
          <button 
            className="dash-btn dash-btn-primary" 
            onClick={onClose}
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
          >
            Close Map
          </button>
        </div>
      </div>
    </div>
  );
}
