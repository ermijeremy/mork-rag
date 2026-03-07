import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import ChatHistoryGraph, { ChatNode } from './ChatHistoryGraph';

interface ChatbotSidebarProps {
  onClose: () => void;
  token: string;
}

const ChatbotSidebar: React.FC<ChatbotSidebarProps> = ({ onClose, token }) => {
  const [messages, setMessages] = useState<{ role: string; content: string; nodeId?: number }[]>([]);
  const [input, setInput] = useState('');
  const [showGraph, setShowGraph] = useState(false);
  const [latestNodeId, setLatestNodeId] = useState<number | null>(null);


  const [branchParentId, setBranchParentId] = useState<number | null>(null);
  const [branchLabel, setBranchLabel] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; vx: number; vy: number }[]>([]);
  const rippleIdRef = useRef(0);
  const lastMousePos = useRef({ x: -1000, y: -1000 });
  const lastMoveTime = useRef(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const now = Date.now();
      if (now - lastMoveTime.current < 25) return;
      lastMoveTime.current = now;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let vx = 0; let vy = 0;
      if (lastMousePos.current.x !== -1000) {
        vx = x - lastMousePos.current.x;
        vy = y - lastMousePos.current.y;
      }
      lastMousePos.current = { x, y };

      const id = rippleIdRef.current++;
      setRipples(prev => [...prev.slice(-20), { id, x, y, vx, vy }]);
      setTimeout(() => { setRipples(prev => prev.filter(r => r.id !== id)); }, 3000);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input.trim();
    setInput('');

    setMessages(prev => [...prev, { role: 'user', content: userText }]);

    if (branchParentId !== null && branchLabel) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: `↳ Branching from: "${branchLabel}"`,
      }]);
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userText,
          parentId: branchParentId,
        }),
      });

      const data = await res.json();

      if (res.ok && data.response) {
        const nodeId: number = data.nodeId;
        setMessages(prev => [...prev, { role: 'assistant', content: data.response, nodeId }]);
        setBranchParentId(nodeId);
        setBranchLabel(null);
        setLatestNodeId(nodeId);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error || 'No response'}` }]);
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Failed to connect to server.' }]);
    } finally {
      setTimeout(scrollToBottom, 50);
    }
  };

  const handleSelectNode = (node: ChatNode) => {
    setBranchParentId(node.id);
    setBranchLabel(node.user_message.slice(0, 60));
    setShowGraph(false);
  };

  const clearBranch = () => {
    setBranchParentId(null);
    setBranchLabel(null);
  };

  return (
    <>
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: '#0a0a0a',
          color: '#4ade80',
          overflow: 'hidden',
        }}
      >
        {/* Ripple layer */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none' }}>
          {ripples.map(r => (
            <div key={r.id} style={{
              position: 'absolute',
              left: r.x - 75, top: r.y - 75,
              width: 150, height: 150,
              background: 'radial-gradient(circle, rgba(74, 222, 128, 0.08) 0%, transparent 60%)',
              animation: 'waterFlow 2.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
              pointerEvents: 'none',
              mixBlendMode: 'screen',
              // @ts-ignore
              '--tx': `${Math.max(Math.min(r.vx * 3, 100), -100)}px`,
              // @ts-ignore
              '--ty': `${Math.max(Math.min(r.vy * 3, 100), -100)}px`,
            }} />
          ))}
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(74, 222, 128, 0.2)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: 8,
          }}>
            <h3 style={{ margin: 0, textShadow: '0 0 8px rgba(74, 222, 128, 0.3)', letterSpacing: '1px', fontSize: 14 }}>
              AI ASSISTANT
            </h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Graph History button */}
              <button
                id="chat-history-graph-btn"
                onClick={() => setShowGraph(true)}
                title="View Chat History Graph"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(74,222,128,0.07)',
                  border: '1px solid rgba(74,222,128,0.3)',
                  borderRadius: 8,
                  color: '#4ade80',
                  padding: '5px 11px',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(74,222,128,0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(74,222,128,0.07)'}
              >
                {/* Mini tree icon */}
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="1.5" r="1.5" fill="#4ade80" fillOpacity="0.9" />
                  <line x1="6.5" y1="3" x2="6.5" y2="5.5" stroke="#4ade80" strokeOpacity="0.6" strokeWidth="1.2" />
                  <circle cx="3" cy="7.5" r="1.5" fill="#4ade80" fillOpacity="0.7" />
                  <circle cx="10" cy="7.5" r="1.5" fill="#4ade80" fillOpacity="0.7" />
                  <line x1="6.5" y1="5.5" x2="3" y2="7.5" stroke="#4ade80" strokeOpacity="0.5" strokeWidth="1.2" />
                  <line x1="6.5" y1="5.5" x2="10" y2="7.5" stroke="#4ade80" strokeOpacity="0.5" strokeWidth="1.2" />
                  <circle cx="3" cy="11.5" r="1.5" fill="#4ade80" fillOpacity="0.5" />
                  <line x1="3" y1="9" x2="3" y2="10" stroke="#4ade80" strokeOpacity="0.4" strokeWidth="1.2" />
                </svg>
                Graph
              </button>
              <button
                onClick={onClose}
                style={{
                  background: 'transparent', border: 'none',
                  color: '#4ade80', fontSize: 18, cursor: 'pointer',
                  padding: '4px 8px', borderRadius: '4px', transition: 'background-color 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(74, 222, 128, 0.1)'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── Messages ───────────────────────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((m, i) => {
              if (m.role === 'system') {
                return (
                  <div key={i} style={{
                    alignSelf: 'center',
                    fontSize: 10, color: '#334155',
                    fontFamily: 'monospace',
                    padding: '4px 10px',
                    border: '1px dashed rgba(74,222,128,0.15)',
                    borderRadius: 20,
                    backgroundColor: 'rgba(74,222,128,0.03)',
                  }}>
                    {m.content}
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    backgroundColor: m.role === 'user' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(17, 17, 17, 0.6)',
                    backdropFilter: 'blur(8px)',
                    border: `1px solid ${m.role === 'user' ? 'rgba(74, 222, 128, 0.5)' : '#333'}`,
                    padding: '12px 16px',
                    borderRadius: '8px',
                    maxWidth: '85%',
                    wordBreak: 'break-word',
                    boxShadow: m.role === 'user' ? '0 0 8px rgba(74, 222, 128, 0.1)' : 'none',
                  }}
                >
                  <div style={{ fontSize: '10px', color: m.role === 'user' ? '#86efac' : '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                    {m.role}
                    {m.nodeId != null && (
                      <span style={{ color: '#334155', marginLeft: 6 }}>· node #{m.nodeId}</span>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#cbd5e1' }} className="markdown-body">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />

            {/* Keyframe styles */}
            <style dangerouslySetInnerHTML={{
              __html: `
              @keyframes waterFlow {
                0%   { transform:scale(0.3) translate(0,0) rotate(0deg); opacity:0.6; border-radius:40% 60% 70% 30% / 40% 50% 60% 50%; filter:blur(2px); }
                50%  { opacity:0.2; }
                100% { transform:scale(2) translate(var(--tx),var(--ty)) rotate(180deg); opacity:0; border-radius:50%; filter:blur(8px); }
              }
              .markdown-body p { margin-top:0; margin-bottom:8px; }
              .markdown-body p:last-child { margin-bottom:0; }
              .markdown-body code { background:#1e293b; padding:2px 4px; border-radius:4px; color:#4ade80; }
              .markdown-body pre { background:#1e293b; padding:8px; border-radius:4px; overflow-x:auto; }
              .markdown-body pre code { background:transparent; padding:0; color:#e2e8f0; }
              .markdown-body ul, .markdown-body ol { margin-top:0; margin-bottom:8px; padding-left:20px; }
            `}} />
          </div>

          {/* ── Branch banner ──────────────────────────────────────────────── */}
          {branchLabel && (
            <div style={{
              margin: '0 12px 0',
              padding: '7px 12px',
              background: 'rgba(74,222,128,0.07)',
              border: '1px solid rgba(74,222,128,0.25)',
              borderRadius: 8,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 11, color: '#4ade80', fontFamily: 'monospace',
            }}>
              <span>↳ Branching from: <em style={{ color: '#86efac' }}>"{branchLabel}"</em></span>
              <button
                onClick={clearBranch}
                style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 13 }}
                title="Cancel branch"
              >✕</button>
            </div>
          )}

          {/* ── Input ──────────────────────────────────────────────────────── */}
          <div style={{ padding: '12px 20px 20px', borderTop: '1px solid rgba(74, 222, 128, 0.1)', backgroundColor: 'rgba(5, 5, 5, 0.7)', backdropFilter: 'blur(10px)' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              style={{
                width: '100%',
                padding: '14px 20px',
                backgroundColor: 'rgba(22, 22, 22, 0.6)',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(74, 222, 128, 0.3)',
                borderRadius: '24px',
                color: '#4ade80',
                outline: 'none',
                fontSize: '14px',
                fontFamily: 'sans-serif',
                boxSizing: 'border-box',
                transition: 'all 0.3s ease',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'rgba(74, 222, 128, 0.8)';
                e.target.style.boxShadow = '0 0 12px rgba(74, 222, 128, 0.2)';
                e.target.style.backgroundColor = 'rgba(26, 26, 26, 0.8)';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(74, 222, 128, 0.3)';
                e.target.style.boxShadow = 'none';
                e.target.style.backgroundColor = 'rgba(22, 22, 22, 0.6)';
              }}
              placeholder={branchLabel ? `Continue from "${branchLabel.slice(0, 30)}..."` : 'Ask the AI Assistant…'}
            />
          </div>
        </div>
      </div>

      {/* ── Chat History Graph popup ──────────────────────────────────────── */}
      <ChatHistoryGraph
        token={token}
        visible={showGraph}
        onClose={() => setShowGraph(false)}
        onSelectNode={handleSelectNode}
        latestNodeId={latestNodeId}
      />
    </>
  );
};

export default ChatbotSidebar;
