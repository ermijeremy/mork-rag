import React, { useEffect, useState, useRef, useMemo } from 'react';
import { parseMettaToGraph, GraphNode, GraphLink } from '../utils/mettaParser';

interface GraphViewerProps {
    mettaText: string;
    highlightRule?: string[] | null;
    clearHighlight?: () => void;
}

export const GraphViewer: React.FC<GraphViewerProps> = ({ mettaText, highlightRule, clearHighlight }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [links, setLinks] = useState<GraphLink[]>([]);

    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [lockedNode, setLockedNode] = useState<string | null>(null);

    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [nodePositions, setNodePositions] = useState<Map<string, { x: number, y: number, color: string }>>(new Map());

    const [draggingNode, setDraggingNode] = useState<string | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };
        window.addEventListener('resize', updateDimensions);
        updateDimensions();
        setTimeout(updateDimensions, 100);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    useEffect(() => {
        if (mettaText) {
            const data = parseMettaToGraph(mettaText);
            setNodes(data.nodes);
            setLinks(data.links);
        }
    }, [mettaText]);

    const categories = useMemo(() => Array.from(new Set(nodes.filter(n => n.type === 'property').map(n => n.category!))), [nodes]);
    const propertyColumns = useMemo(() => categories.map(c => ({ id: c, label: c.toUpperCase() })), [categories]);

    useEffect(() => {
        if (nodes.length === 0 || dimensions.width === 0) return;

        const newPositions = new Map<string, { x: number, y: number, color: string }>();
        const columnWidth = dimensions.width / (propertyColumns.length || 1);

        const categoryColors: Record<string, string> = {
            'article': '#60a5fa',
            'length': '#fcd34d',
            'reading-time': '#fb923c',
            'tone': '#f472b6',
            'audience-expertise': '#34d399',
            'engagement': '#f87171',
            'authored-by': '#fca5a5',
            'complexity': '#a78bfa',
            'content-type': '#93c5fd',
            'date-period': '#818cf8',
            'primary-goal': '#fef08a',
            'popularity': '#cbd5e1'
        };

        const articleNodes = nodes.filter(n => n.type === 'article');
        const articleSpacing = dimensions.width / (articleNodes.length + 1);
        const articleY = dimensions.height - 40; 

        articleNodes.forEach((node, idx) => {
            newPositions.set(node.id, {
                x: (idx + 1) * articleSpacing,
                y: articleY,
                color: categoryColors['article'] || '#60a5fa'
            });
        });

        const verticalPadding = 100;
        const availableHeight = articleY - verticalPadding - 80;

        propertyColumns.forEach((col, colIndex) => {
            const colNodes = nodes.filter(n => n.category === col.id);
            const x = (colIndex + 0.5) * columnWidth;
            const verticalSpacing = availableHeight / (colNodes.length || 1);

            colNodes.forEach((node, nodeIndex) => {
                const y = verticalPadding + (nodeIndex + 0.5) * verticalSpacing;
                newPositions.set(node.id, {
                    x,
                    y,
                    color: categoryColors[col.id] || '#4ade80'
                });
            });
        });

        setNodePositions(newPositions);
    }, [nodes, dimensions.width, dimensions.height, propertyColumns]); 

    const relations = useMemo(() => {
        const adj = new Map<string, Set<string>>();
        nodes.forEach(n => adj.set(n.id, new Set([n.id])));
        links.forEach(l => {
            if (adj.has(l.source)) adj.get(l.source)!.add(l.target);
            if (adj.has(l.target)) adj.get(l.target)!.add(l.source);
        });
        return adj;
    }, [nodes, links]);

    const activeData = useMemo(() => {
        if (highlightRule && highlightRule.length > 0) {
            const ruleNodesSet = new Set(highlightRule);
            const supporting = nodes.filter(n =>
                n.type === 'article' &&
                highlightRule.some(ruleProp => relations.get(n.id)?.has(ruleProp))
            );

            const activeNodes = new Set<string>(highlightRule);
            supporting.forEach(n => activeNodes.add(n.id));

            return {
                activeNodes,
                primaryNodes: ruleNodesSet
            };
        }

        const focusNode = lockedNode || hoveredNode;
        if (focusNode) {
            return {
                activeNodes: relations.get(focusNode) || new Set([focusNode]),
                primaryNodes: new Set([focusNode])
            };
        }

        return null;
    }, [highlightRule, lockedNode, hoveredNode, nodes, relations]);

    // Handlers for Interactions
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const scaleAmount = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(transform.scale * (1 + scaleAmount), 0.1), 5); 
        setTransform(prev => ({ ...prev, scale: newScale }));
    };

    const handlePointerDown = (e: React.PointerEvent, nodeId?: string) => {
        setDragStart({ x: e.clientX, y: e.clientY });

        if (clearHighlight && highlightRule) {
            clearHighlight();
        }

        if (nodeId) {
            setDraggingNode(nodeId);
            setLockedNode(nodeId);
            setHoveredNode(null);
            e.stopPropagation();
        } else {
            setLockedNode(null);
            setIsPanning(true);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!draggingNode && !isPanning) return;

        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;

        if (isPanning) {
            setTransform(prev => ({
                ...prev,
                x: prev.x + dx,
                y: prev.y + dy
            }));
            setDragStart({ x: e.clientX, y: e.clientY });
        } else if (draggingNode) {
            setNodePositions(prev => {
                const nextMap = new Map(prev);
                const pos = nextMap.get(draggingNode);
                if (pos) {
                    nextMap.set(draggingNode, {
                        ...pos,
                        x: pos.x + dx / transform.scale,
                        y: pos.y + dy / transform.scale
                    });
                }
                return nextMap;
            });
            setDragStart({ x: e.clientX, y: e.clientY });
        }
    };

    const handlePointerUp = () => {
        setDraggingNode(null);
        setIsPanning(false);
    };

    const zoomIn = () => setTransform(p => ({ ...p, scale: Math.min(p.scale * 1.2, 5) }));
    const zoomOut = () => setTransform(p => ({ ...p, scale: Math.max(p.scale / 1.2, 0.1) }));
    const resetZoom = () => setTransform({ x: 0, y: 0, scale: 1 });

    const computedWidth = Math.max(dimensions.width, propertyColumns.length * 200 + 200);

    return (
        <div
            ref={containerRef}
            style={{ width: '100%', height: '100%', backgroundColor: '#0f172a', position: 'relative', overflow: 'hidden' }}
            onWheel={handleWheel}
            onPointerDown={(e) => handlePointerDown(e)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            {/* Controls */}
            <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 10, display: 'flex', gap: '10px' }}>
                <button onClick={zoomIn} style={{ padding: '8px 12px', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid #4ade80', color: '#4ade80', cursor: 'pointer', borderRadius: '4px', fontFamily: 'monospace' }}>+</button>
                <button onClick={zoomOut} style={{ padding: '8px 12px', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid #4ade80', color: '#4ade80', cursor: 'pointer', borderRadius: '4px', fontFamily: 'monospace' }}>-</button>
                <button onClick={resetZoom} style={{ padding: '8px 12px', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid #4ade80', color: '#4ade80', cursor: 'pointer', borderRadius: '4px', fontFamily: 'monospace' }}>RESET ZOOM</button>
            </div>

            <svg
                width="100%"
                height="100%"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    cursor: isPanning ? 'grabbing' : 'grab',
                    touchAction: 'none'
                }}
            >
                <defs>
                    <style>
                        {`
                       .node-hovering { transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                       .path-anim { animation: dash 1s ease-out forwards; stroke-dasharray: 2000; stroke-dashoffset: 2000; }
                       @keyframes dash { to { stroke-dashoffset: 0; } }
                     `}
                    </style>
                </defs>

                <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
                    {/* Draw Links (Bezier Curves) */}
                    {nodePositions.size > 0 && links.map((link, i) => {
                        const sourcePos = nodePositions.get(link.source);
                        const targetPos = nodePositions.get(link.target);
                        if (!sourcePos || !targetPos) return null;

                        const offset = (targetPos.x - sourcePos.x) * 0.5;
                        const pathD = `M ${sourcePos.x} ${sourcePos.y} 
                                       C ${sourcePos.x + offset} ${sourcePos.y}, 
                                         ${targetPos.x - offset} ${targetPos.y}, 
                                         ${targetPos.x} ${targetPos.y}`;

                        const isLinkHovered = activeData
                            ? activeData.primaryNodes.has(link.source) || activeData.primaryNodes.has(link.target)
                            : false;
                        const isMuted = activeData && !isLinkHovered;

                        return (
                            <path
                                key={`link-${i}`}
                                className={nodePositions.size > 0 ? "path-anim" : ""}
                                d={pathD}
                                fill="none"
                                stroke={isLinkHovered ? targetPos.color : "rgba(148, 163, 184, 0.2)"}
                                strokeWidth={isLinkHovered ? "3" : "1"}
                                style={{
                                    opacity: isMuted ? 0.05 : 1,
                                    filter: isLinkHovered ? `drop-shadow(0 0 12px ${targetPos.color})` : 'none',
                                    transition: draggingNode ? "none" : "all 0.3s ease"
                                }}
                            />
                        );
                    })}

                    {/* Draw Column Headers (Static at top) */}
                    {propertyColumns.map((col, i) => {
                        const colWidth = dimensions.width / (propertyColumns.length || 1);
                        const x = (i + 0.5) * colWidth;
                        const headerWidth = Math.min(160, colWidth - 10);

                        return (
                            <g key={`header-${i}`} transform={`translate(${x}, 40)`}>
                                <rect
                                    x={-headerWidth / 2}
                                    y={-14}
                                    width={headerWidth}
                                    height={28}
                                    fill="rgba(30, 41, 59, 0.8)"
                                    stroke={highlightRule ? "rgba(74,222,128,0.2)" : "#4ade80"}
                                    strokeWidth="1"
                                    rx="4"
                                />
                                <text
                                    x={0}
                                    y={4}
                                    fill={highlightRule ? "rgba(74,222,128,0.4)" : "#4ade80"}
                                    fontSize={headerWidth < 100 ? "8" : (headerWidth < 130 ? "10" : "11")}
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    style={{ fontFamily: 'monospace' }}
                                >
                                    {col.label}
                                </text>
                            </g>
                        );
                    })}

                    {/* Draw Nodes */}
                    {nodes.map(node => {
                        const pos = nodePositions.get(node.id);
                        if (!pos) return null;

                        const isPrimaryFocus = activeData ? activeData.primaryNodes.has(node.id) : false;
                        const isRelated = activeData ? activeData.activeNodes.has(node.id) : false;
                        const isMuted = activeData && !isRelated;
                        const isRuleActive = !!(highlightRule && highlightRule.length > 0);

                        return (
                            <g
                                key={`node-${node.id}`}
                                className={draggingNode === node.id ? "" : "node-hovering"}
                                onPointerDown={(e) => handlePointerDown(e, node.id)}
                                onMouseEnter={() => !draggingNode && !lockedNode && setHoveredNode(node.id)}
                                onMouseLeave={() => !lockedNode && setHoveredNode(null)}
                                style={{ cursor: draggingNode === node.id ? 'grabbing' : 'grab', opacity: isMuted ? 0.2 : 1 }}
                            >
                                <circle
                                    className={draggingNode === node.id ? "" : "node-hovering"}
                                    cx={pos.x}
                                    cy={pos.y}
                                    r={isPrimaryFocus ? 20 : (isRelated && !isRuleActive ? 16 : 14)}
                                    fill={pos.color}
                                    stroke="rgba(255,255,255,0.2)"
                                    strokeWidth={isPrimaryFocus ? "4" : "1"}
                                    style={{ filter: `drop-shadow(0 0 ${isPrimaryFocus ? '16px' : (isRelated && !isRuleActive ? '8px' : '0px')} ${pos.color}ff)` }}
                                />
                                <text
                                    className={draggingNode === node.id ? "" : "node-hovering"}
                                    x={node.type === 'article' ? pos.x - (isPrimaryFocus ? 30 : 24) : pos.x + (isPrimaryFocus ? 30 : 24)}
                                    y={pos.y + 4}
                                    fill={isPrimaryFocus ? '#ffffff' : (isRelated && !isRuleActive ? '#f8fafc' : '#cbd5e1')}
                                    fontSize={isPrimaryFocus ? "14" : "12"}
                                    fontWeight={isPrimaryFocus || (isRelated && !isRuleActive) ? "bold" : "normal"}
                                    textAnchor={node.type === 'article' ? 'end' : 'start'}
                                    style={{ fontFamily: 'sans-serif', pointerEvents: 'none', userSelect: 'none' }}
                                >
                                    {node.type === 'article' ? node.id : node.label}
                                </text>
                            </g>
                        );
                    })}
                </g>
            </svg>
        </div>
    );
};
