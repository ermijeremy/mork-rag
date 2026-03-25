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

const NODE_W = 210;
const NODE_H = 68;
const H_GAP = 64;
const V_GAP = 52;

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

    result.forEach(n => {
        n.x = 28 + n.col * (NODE_W + H_GAP);
        n.y = 28 + n.row * (NODE_H + V_GAP);
    });

    return result;
}

// ─── Curvy animated edge ──────────────────────────────────────────────────────

const Edge: React.FC<{ x1: number; y1: number; x2: number; y2: number; highlight: boolean }> = ({
    x1, y1, x2, y2, highlight,
}) => {
    const dy = y2 - y1;
    const ctrl = Math.max(Math.abs(dy) * 0.55, 40);
    const d = `M${x1},${y1} C${x1},${y1 + ctrl} ${x2},${y2 - ctrl} ${x2},${y2}`;
    return (
        <path
            d={d}
            fill="none"
            stroke={highlight ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.12)'}
            strokeWidth={highlight ? 1.8 : 1.2}
            strokeDasharray={highlight ? 'none' : 'none'}
            style={{ transition: 'stroke 0.25s, stroke-width 0.25s' }}
        />
    );
};

// ─── Node card ────────────────────────────────────────────────────────────────

const GraphNodeCard: React.FC<{
    node: LayoutNode;
    isSelected: boolean;
    isLatest: boolean;
    isHovered: boolean;
    onHover: (id: number | null) => void;
    onClick: (node: ChatNode) => void;
}> = ({ node, isSelected, isLatest, isHovered, onHover, onClick }) => {
    const borderColor = isSelected
        ? 'rgba(255,255,255,0.5)'
        : isLatest
            ? 'rgba(255,255,255,0.3)'
            : isHovered
                ? 'rgba(255,255,255,0.2)'
                : 'rgba(255,255,255,0.08)';

    const bg = isSelected
        ? 'rgba(255,255,255,0.1)'
        : isHovered
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.03)';

    const shadow = isSelected
        ? '0 0 0 1px rgba(255,255,255,0.3), 0 8px 24px rgba(0,0,0,0.5)'
        : isHovered
            ? '0 4px 16px rgba(0,0,0,0.4)'
            : '0 2px 8px rgba(0,0,0,0.3)';

    const truncate = (s: string, max = 58) =>
        s.length > max ? s.slice(0, max) + '…' : s;

    return (
        <foreignObject
            x={node.x}
            y={node.y}
            width={NODE_W}
            height={NODE_H}
            style={{ cursor: 'pointer', overflow: 'hidden' }}
            onMouseEnter={() => onHover(node.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onClick(node)}
        >
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    backgroundColor: bg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 12,
                    padding: '9px 11px',
                    boxShadow: shadow,
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 4,
                    userSelect: 'none',
                }}
            >
                {/* User message — clipped to single line */}
                <div style={{
                    fontSize: 12,
                    color: 'var(--text-primary, #f0f0f0)',
                    fontWeight: 500,
                    lineHeight: 1.35,
                    fontFamily: 'var(--font)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {node.user_message}
                </div>
                {/* AI snippet — clipped to single line */}
                <div style={{
                    fontSize: 11,
                    color: 'var(--text-muted, #666)',
                    lineHeight: 1.35,
                    fontFamily: 'var(--font)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {node.ai_response}
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

    // Pan / zoom
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

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        setScale(s => Math.min(2.5, Math.max(0.25, s - e.deltaY * 0.001)));
    };

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

    const handleDeleteBranch = async () => {
        if (!tooltip) return;
        if (!window.confirm('Delete this response and all replies branched from it? This cannot be undone.')) return;

        try {
            const res = await fetch(`/api/chat/graph/${tooltip.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                if (selected === tooltip.id) setSelected(null);
                setTooltip(null);
                fetchGraph();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete history');
            }
        } catch (e) {
            console.error(e);
            alert('Error deleting branch');
        }
    };

    if (!visible) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 999,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(6px)',
                    animation: 'fadeIn 0.2s ease',
                }}
            />

            {/* Panel — consistent with main design */}
            <div
                style={{
                    position: 'fixed',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%,-50%)',
                    zIndex: 1000,
                    width: 'min(92vw, 960px)',
                    height: 'min(86vh, 660px)',
                    background: 'var(--bg-surface, #1a1a1a)',
                    border: '1px solid var(--border-hover, rgba(255,255,255,0.14))',
                    borderRadius: 20,
                    boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    fontFamily: 'var(--font)',
                }}
            >
                {/* ── Header ─────────────────────────────────────────────── */}
                <div style={{
                    height: '52px', padding: '0 20px',
                    borderBottom: '1px solid var(--border, rgba(255,255,255,0.07))',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Graph icon */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary, #9a9a9a)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #f0f0f0)', letterSpacing: '-0.01em' }}>
                            Conversation History
                        </span>
                        <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 20,
                            background: 'var(--bg-surface-2, #222)', border: '1px solid var(--border, rgba(255,255,255,0.07))',
                            color: 'var(--text-muted, #555)', fontWeight: 500,
                        }}>
                            {nodes.length} node{nodes.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                            onClick={fetchGraph}
                            title="Refresh"
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                background: 'transparent', border: '1px solid var(--border, rgba(255,255,255,0.07))',
                                borderRadius: 6, color: 'var(--text-secondary, #9a9a9a)',
                                padding: '5px 11px', cursor: 'pointer', fontSize: 12,
                                fontFamily: 'var(--font)', transition: 'all 0.18s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
                                <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
                            </svg>
                            Refresh
                        </button>
                        <button
                            onClick={onClose}
                            title="Close"
                            style={{
                                background: 'transparent', border: 'none',
                                color: 'var(--text-muted, #555)', fontSize: 18,
                                cursor: 'pointer', lineHeight: 1, padding: '4px 8px',
                                borderRadius: 6, transition: 'all 0.18s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* ── Canvas ─────────────────────────────────────────────── */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
                    {loading ? (
                        <div style={{
                            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexDirection: 'column', gap: 14,
                        }}>
                            <div style={{
                                width: 28, height: 28,
                                border: '2px solid var(--border-hover, rgba(255,255,255,0.14))',
                                borderTopColor: 'var(--text-secondary, #9a9a9a)',
                                borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                            }} />
                            <span style={{ fontSize: 13, color: 'var(--text-muted, #555)' }}>Loading history…</span>
                        </div>
                    ) : nodes.length === 0 ? (
                        <div style={{
                            height: '100%', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: 14,
                        }}>
                            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted, #555)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            <span style={{ fontSize: 13, color: 'var(--text-muted, #555)' }}>No conversation history yet. Start chatting!</span>
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
                            {/* Subtle dot grid */}
                            <defs>
                                <pattern id="chDotGrid" width="28" height="28" patternUnits="userSpaceOnUse">
                                    <circle cx="1" cy="1" r="0.8" fill="rgba(255,255,255,0.04)" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#chDotGrid)" />

                            <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
                                {/* Edges first (behind nodes) */}
                                {layout.map(node => {
                                    if (node.parent_id === null) return null;
                                    const parent = layoutById.get(node.parent_id);
                                    if (!parent) return null;
                                    const highlight =
                                        hovered === node.id || hovered === node.parent_id ||
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

                    {/* ── Node detail panel ──────────────────────────────── */}
                    {tooltip && (
                        <div style={{
                            position: 'absolute', bottom: 12, left: 12, right: 12,
                            background: 'var(--bg-base, #0d0d0d)',
                            border: '1px solid var(--border-hover, rgba(255,255,255,0.14))',
                            borderRadius: 14,
                            padding: '16px 18px',
                            backdropFilter: 'blur(16px)',
                            display: 'flex', flexDirection: 'column', gap: 12,
                            animation: 'slideUp 0.2s ease',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #555)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Node #{tooltip.id}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-primary, #f0f0f0)', fontWeight: 500, lineHeight: 1.5, marginBottom: 4 }}>
                                        <span style={{ color: 'var(--text-muted, #555)' }}>You: </span>
                                        {tooltip.user_message}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary, #9a9a9a)', lineHeight: 1.5, maxHeight: 52, overflow: 'hidden' }}>
                                        <span style={{ color: 'var(--text-muted, #555)' }}>AI: </span>
                                        {tooltip.ai_response.slice(0, 200)}{tooltip.ai_response.length > 200 ? '…' : ''}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setTooltip(null)}
                                    style={{
                                        background: 'transparent', border: 'none',
                                        color: 'var(--text-muted, #555)', cursor: 'pointer',
                                        flexShrink: 0, padding: '2px', display: 'flex',
                                        transition: 'color 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <button
                                    onClick={handleSelectForChat}
                                    style={{
                                        padding: '8px 16px',
                                        background: 'var(--text-primary, #f0f0f0)',
                                        border: 'none',
                                        borderRadius: 8,
                                        color: 'var(--bg-base, #0d0d0d)',
                                        cursor: 'pointer', fontSize: 12,
                                        fontFamily: 'var(--font)',
                                        fontWeight: 600,
                                        transition: 'all 0.18s',
                                        display: 'flex', alignItems: 'center', gap: 6,
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                        <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                                    </svg>
                                    Branch from here
                                </button>

                                <button
                                    onClick={handleDeleteBranch}
                                    style={{
                                        padding: '8px 12px',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        borderRadius: 8,
                                        color: '#ef4444',
                                        cursor: 'pointer', fontSize: 12,
                                        fontFamily: 'var(--font)',
                                        fontWeight: 500,
                                        transition: 'all 0.18s',
                                        display: 'flex', alignItems: 'center', gap: 6,
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'; }}
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                    Delete branch
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer hint ────────────────────────────────────────── */}
                <div style={{
                    height: '34px', padding: '0 20px',
                    borderTop: '1px solid var(--border, rgba(255,255,255,0.07))',
                    display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0,
                }}>
                    {[
                        ['Scroll', 'Zoom'],
                        ['Drag', 'Pan'],
                        ['Click node', 'Inspect & branch'],
                    ].map(([key, label]) => (
                        <span key={key} style={{ fontSize: 11, color: 'var(--text-muted, #555)' }}>
                            <span style={{ color: 'var(--text-secondary, #9a9a9a)' }}>{key}</span>
                            <span style={{ margin: '0 4px', opacity: 0.5 }}>·</span>
                            {label}
                        </span>
                    ))}
                </div>
            </div>

            {/* Keyframe animations */}
            <style>{`
                @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
                @keyframes popIn   { from { opacity:0; transform:translate(-50%,-50%) scale(0.92) } to { opacity:1; transform:translate(-50%,-50%) scale(1) } }
                @keyframes slideUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
                @keyframes spin    { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
            `}</style>
        </>
    );
};

export default ChatHistoryGraph;
