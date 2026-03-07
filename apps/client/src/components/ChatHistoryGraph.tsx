import React, { useEffect, useRef, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatNode {
    id: number;
    parent_id: number | null;
    user_message: string;
    ai_response: string;
    created_at: string;
}

interface LayoutNode extends ChatNode {
    x: number;
    y: number;
    col: number;
    row: number;
}

interface Props {
    token: string;
    visible: boolean;
    onClose: () => void;
    onSelectNode: (node: ChatNode) => void;
    latestNodeId?: number | null;
}

// ─── Layout helpers ──────────────────────────────────────────────────────────

const NODE_W = 200;
const NODE_H = 64;
const H_GAP = 60;   
const V_GAP = 40;   


function buildLayout(nodes: ChatNode[]): LayoutNode[] {
    if (!nodes.length) return [];

    const byId = new Map(nodes.map(n => [n.id, n]));
    const children = new Map<number | null, ChatNode[]>();
    for (const n of nodes) {
        const key = n.parent_id;
        if (!children.has(key)) children.set(key, []);
        children.get(key)!.push(n);
    }

    const result: LayoutNode[] = [];
    const assign = (nodeId: number, row: number, col: number) => {
        const node = byId.get(nodeId);
        if (!node) return;
        result.push({ ...node, row, col, x: 0, y: 0 }); 
        const kids = children.get(nodeId) ?? [];
        kids.forEach((child, i) => {
            assign(child.id, row + 1, col + i);
        });
    };

    const roots = nodes.filter(n => n.parent_id === null || !byId.has(n.parent_id!));
    roots.forEach((r, i) => assign(r.id, 0, i));

    let maxCol = 0;
    result.forEach(n => { if (n.col > maxCol) maxCol = n.col; });

    result.forEach(n => {
        n.x = 24 + n.col * (NODE_W + H_GAP);
        n.y = 24 + n.row * (NODE_H + V_GAP);
    });

    return result;
}

// ─── Animated edge component ─────────────────────────────────────────────────

const Edge: React.FC<{ x1: number; y1: number; x2: number; y2: number; highlight: boolean }> = ({
    x1, y1, x2, y2, highlight,
}) => {
    const mx = (x1 + x2) / 2;
    const d = `M${x1},${y1} C${x1},${mx} ${x2},${mx} ${x2},${y2}`;
    return (
        <path
            d={d}
            fill="none"
            stroke={highlight ? '#4ade80' : 'rgba(74,222,128,0.25)'}
            strokeWidth={highlight ? 2 : 1.5}
            strokeDasharray={highlight ? 'none' : '4,4'}
            style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
        />
    );
};

// ─── Single node card ─────────────────────────────────────────────────────────

const GraphNodeCard: React.FC<{
    node: LayoutNode;
    isSelected: boolean;
    isLatest: boolean;
    isHovered: boolean;
    onHover: (id: number | null) => void;
    onClick: (node: ChatNode) => void;
}> = ({ node, isSelected, isLatest, isHovered, onHover, onClick }) => {
    const glow = isSelected
        ? '0 0 0 2px #4ade80, 0 0 18px rgba(74,222,128,0.5)'
        : isLatest
            ? '0 0 0 1.5px rgba(74,222,128,0.6), 0 0 10px rgba(74,222,128,0.25)'
            : isHovered
                ? '0 0 0 1px rgba(74,222,128,0.4), 0 4px 12px rgba(0,0,0,0.5)'
                : '0 2px 6px rgba(0,0,0,0.4)';

    const bg = isSelected
        ? 'rgba(74,222,128,0.15)'
        : isHovered
            ? 'rgba(74,222,128,0.08)'
            : 'rgba(15,15,15,0.85)';

    const truncate = (s: string, max = 60) =>
        s.length > max ? s.slice(0, max) + '…' : s;

    return (
        <foreignObject
            x={node.x}
            y={node.y}
            width={NODE_W}
            height={NODE_H}
            style={{ cursor: 'pointer', overflow: 'visible' }}
            onMouseEnter={() => onHover(node.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onClick(node)}
        >
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: bg,
                    border: `1px solid ${isSelected || isLatest ? 'rgba(74,222,128,0.6)' : 'rgba(74,222,128,0.2)'}`,
                    borderRadius: 10,
                    padding: '8px 10px',
                    boxShadow: glow,
                    backdropFilter: 'blur(6px)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    userSelect: 'none',
                }}
            >
                {/* User message */}
                <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 600, lineHeight: 1.3 }}>
                    {truncate(node.user_message, 55)}
                </div>
                {/* AI snippet */}
                <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.3 }}>
                    {truncate(node.ai_response, 55)}
                </div>
            </div>
        </foreignObject>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

const ChatHistoryGraph: React.FC<Props> = ({
    token,
    visible,
    onClose,
    onSelectNode,
    latestNodeId,
}) => {
    const [nodes, setNodes] = useState<ChatNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<number | null>(null);
    const [hovered, setHovered] = useState<number | null>(null);
    const [tooltip, setTooltip] = useState<ChatNode | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    // Pan state
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

    const fetchGraph = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch('/api/chat/graph', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) setNodes(data.graph ?? []);
        } catch (e) {
            console.error('Failed to fetch chat graph', e);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (visible) fetchGraph();
    }, [visible, latestNodeId, fetchGraph]);

    const layout = buildLayout(nodes);
    const layoutById = new Map(layout.map(n => [n.id, n]));

    const svgW = layout.reduce((m, n) => Math.max(m, n.x + NODE_W + 24), 300);
    const svgH = layout.reduce((m, n) => Math.max(m, n.y + NODE_H + 24), 200);

    // ── Zoom ─────────────────────────────────────────────────────────────────
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        setScale(s => Math.min(2, Math.max(0.3, s - e.deltaY * 0.001)));
    };

    // ── Pan ──────────────────────────────────────────────────────────────────
    const onMouseDown = (e: React.MouseEvent) => {
        if ((e.target as SVGElement).tagName !== 'svg' &&
            (e.target as SVGElement).tagName !== 'rect') return;
        isPanning.current = true;
        panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    };
    const onMouseMove = (e: React.MouseEvent) => {
        if (!isPanning.current) return;
        setPan({
            x: panStart.current.panX + e.clientX - panStart.current.x,
            y: panStart.current.panY + e.clientY - panStart.current.y,
        });
    };
    const onMouseUp = () => { isPanning.current = false; };

    const handleNodeClick = (node: ChatNode) => {
        setSelected(node.id);
        setTooltip(node);
    };

    const handleSelectForChat = () => {
        if (!tooltip) return;
        onSelectNode(tooltip);
        onClose();
    };

    if (!visible) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 999,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    animation: 'fadeIn 0.2s ease',
                }}
            />

            {/* Panel */}
            <div
                style={{
                    position: 'fixed',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%,-50%)',
                    zIndex: 1000,
                    width: 'min(90vw, 900px)',
                    height: 'min(85vh, 640px)',
                    backgroundColor: '#080808',
                    border: '1px solid rgba(74,222,128,0.3)',
                    borderRadius: 20,
                    boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(74,222,128,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid rgba(74,222,128,0.15)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Tree icon */}
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <circle cx="10" cy="3" r="2" fill="#4ade80" fillOpacity="0.8" />
                            <line x1="10" y1="5" x2="10" y2="9" stroke="#4ade80" strokeOpacity="0.5" strokeWidth="1.5" />
                            <circle cx="5" cy="11" r="2" fill="#4ade80" fillOpacity="0.6" />
                            <circle cx="15" cy="11" r="2" fill="#4ade80" fillOpacity="0.6" />
                            <line x1="10" y1="9" x2="5" y2="11" stroke="#4ade80" strokeOpacity="0.4" strokeWidth="1.5" />
                            <line x1="10" y1="9" x2="15" y2="11" stroke="#4ade80" strokeOpacity="0.4" strokeWidth="1.5" />
                            <circle cx="5" cy="17" r="2" fill="#4ade80" fillOpacity="0.4" />
                            <line x1="5" y1="13" x2="5" y2="15" stroke="#4ade80" strokeOpacity="0.3" strokeWidth="1.5" />
                        </svg>
                        <div>
                            <div style={{ color: '#4ade80', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>
                                CHAT HISTORY GRAPH
                            </div>
                            <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>
                                {nodes.length} node{nodes.length !== 1 ? 's' : ''} · click any node to branch from it
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                            onClick={fetchGraph}
                            title="Refresh"
                            style={{
                                background: 'transparent', border: '1px solid rgba(74,222,128,0.25)',
                                borderRadius: 8, color: '#4ade80', padding: '5px 11px',
                                cursor: 'pointer', fontSize: 12, fontFamily: 'monospace',
                                transition: 'all 0.2s',
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(74,222,128,0.08)'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                            ↻ Refresh
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent', border: 'none',
                                color: '#64748b', fontSize: 20, cursor: 'pointer',
                                lineHeight: 1, padding: '2px 6px', borderRadius: 6,
                                transition: 'color 0.2s',
                            }}
                            onMouseOver={e => e.currentTarget.style.color = '#4ade80'}
                            onMouseOut={e => e.currentTarget.style.color = '#64748b'}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Canvas */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
                    {loading ? (
                        <div style={{
                            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#4ade80', fontFamily: 'monospace', fontSize: 13, gap: 10,
                        }}>
                            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span>
                            Loading graph…
                        </div>
                    ) : nodes.length === 0 ? (
                        <div style={{
                            height: '100%', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            color: '#334155', fontFamily: 'monospace', fontSize: 13, gap: 8,
                        }}>
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity="0.4">
                                <circle cx="24" cy="10" r="5" stroke="#4ade80" strokeWidth="1.5" />
                                <circle cx="10" cy="34" r="5" stroke="#4ade80" strokeWidth="1.5" />
                                <circle cx="38" cy="34" r="5" stroke="#4ade80" strokeWidth="1.5" />
                                <line x1="24" y1="15" x2="10" y2="29" stroke="#4ade80" strokeWidth="1.5" strokeDasharray="3,3" />
                                <line x1="24" y1="15" x2="38" y2="29" stroke="#4ade80" strokeWidth="1.5" strokeDasharray="3,3" />
                            </svg>
                            No chat history yet. Start a conversation!
                        </div>
                    ) : (
                        <svg
                            ref={svgRef}
                            style={{ width: '100%', height: '100%', cursor: isPanning.current ? 'grabbing' : 'grab' }}
                            onWheel={handleWheel}
                            onMouseDown={onMouseDown}
                            onMouseMove={onMouseMove}
                            onMouseUp={onMouseUp}
                            onMouseLeave={onMouseUp}
                        >
                            {/* Subtle grid */}
                            <defs>
                                <pattern id="cgGrid" width="32" height="32" patternUnits="userSpaceOnUse">
                                    <path d="M32 0L0 0 0 32" fill="none" stroke="rgba(74,222,128,0.04)" strokeWidth="0.5" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#cgGrid)" />

                            <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
                                {/* Edges */}
                                {layout.map(node => {
                                    if (node.parent_id === null) return null;
                                    const parent = layoutById.get(node.parent_id);
                                    if (!parent) return null;
                                    const highlight = hovered === node.id || hovered === node.parent_id ||
                                        selected === node.id || selected === node.parent_id;
                                    return (
                                        <Edge
                                            key={`edge-${node.id}`}
                                            x1={parent.x + NODE_W / 2}
                                            y1={parent.y + NODE_H}
                                            x2={node.x + NODE_W / 2}
                                            y2={node.y}
                                            highlight={highlight}
                                        />
                                    );
                                })}

                                {/* Nodes */}
                                {layout.map(node => (
                                    <GraphNodeCard
                                        key={node.id}
                                        node={node}
                                        isSelected={selected === node.id}
                                        isLatest={latestNodeId === node.id}
                                        isHovered={hovered === node.id}
                                        onHover={setHovered}
                                        onClick={handleNodeClick}
                                    />
                                ))}
                            </g>
                        </svg>
                    )}

                    {/* Tooltip / action panel */}
                    {tooltip && (
                        <div
                            style={{
                                position: 'absolute',
                                bottom: 16, left: 16, right: 16,
                                backgroundColor: 'rgba(10,10,10,0.95)',
                                border: '1px solid rgba(74,222,128,0.3)',
                                borderRadius: 12,
                                padding: '14px 16px',
                                backdropFilter: 'blur(12px)',
                                display: 'flex', flexDirection: 'column', gap: 10,
                                animation: 'slideUp 0.2s ease',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 10, color: '#4ade80', fontFamily: 'monospace', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                                        Selected Node #{tooltip.id}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500, lineHeight: 1.4 }}>
                                        <span style={{ color: '#4ade80' }}>Q: </span>{tooltip.user_message}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4, marginTop: 4, maxHeight: 48, overflow: 'hidden' }}>
                                        <span style={{ color: '#64748b' }}>A: </span>
                                        {tooltip.ai_response.slice(0, 180)}{tooltip.ai_response.length > 180 ? '…' : ''}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setTooltip(null)}
                                    style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}
                                >✕</button>
                            </div>
                            <button
                                onClick={handleSelectForChat}
                                style={{
                                    alignSelf: 'flex-start',
                                    padding: '8px 18px',
                                    background: 'rgba(74,222,128,0.12)',
                                    border: '1px solid rgba(74,222,128,0.5)',
                                    borderRadius: 8,
                                    color: '#4ade80',
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontFamily: 'monospace',
                                    fontWeight: 600,
                                    letterSpacing: 0.5,
                                    transition: 'all 0.2s',
                                }}
                                onMouseOver={e => {
                                    e.currentTarget.style.background = 'rgba(74,222,128,0.22)';
                                    e.currentTarget.style.boxShadow = '0 0 12px rgba(74,222,128,0.2)';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.background = 'rgba(74,222,128,0.12)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                ⤷ Branch Chat from This Node
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div style={{
                    padding: '8px 20px',
                    borderTop: '1px solid rgba(74,222,128,0.08)',
                    display: 'flex', gap: 20, flexShrink: 0,
                }}>
                    {[
                        ['scroll', 'Zoom in/out'],
                        ['drag', 'Pan canvas'],
                        ['click node', 'Inspect & branch'],
                    ].map(([key, label]) => (
                        <span key={key} style={{ fontSize: 10, color: '#334155', fontFamily: 'monospace' }}>
                            <span style={{ color: '#475569' }}>{key}</span> · {label}
                        </span>
                    ))}
                </div>
            </div>

            {/* Keyframe animations */}
            <style>{`
        @keyframes fadeIn   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn    { from { opacity:0; transform:translate(-50%,-50%) scale(0.88) } to { opacity:1; transform:translate(-50%,-50%) scale(1) } }
        @keyframes slideUp  { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin     { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
      `}</style>
        </>
    );
};

export default ChatHistoryGraph;
