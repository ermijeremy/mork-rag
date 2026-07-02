import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import ChatHistoryGraph from './ChatHistoryGraph';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  role: string;
  content: string;
  nodeId?: number;
  debug?: {
    queryMetta?: string;
    queryEmbedding?: string;
    morkResponses?: string[];
  };
}

// ─── ChatInterface ────────────────────────────────────────────────────────────
const ChatInterface: React.FC<{ token: string; aiProvider?: string; aiApiKey?: string; onNewChat?: () => void }> = ({ token, aiProvider, aiApiKey, onNewChat }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);

  const [branchParentId, setBranchParentId] = useState<number | null>(null);
  const [branchLabel, setBranchLabel] = useState<string | null>(null);
  const [latestNodeId, setLatestNodeId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px';
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userText = input.trim();
    setInput('');
    setIsLoading(true);

    setMessages(prev => [...prev, { role: 'user', content: userText }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userText, parentId: branchParentId, provider: aiProvider, apiKey: aiApiKey }),
      });
      const data = await res.json();

      if (res.ok && data.response) {
        const nodeId: number = data.nodeId;
        const debug = data.debug;

        setMessages(prev => {
          const newMsgs = [...prev];
          const lastUserIndex = newMsgs.map(m => m.role).lastIndexOf('user');
          if (lastUserIndex !== -1 && debug) {
            newMsgs[lastUserIndex] = {
              ...newMsgs[lastUserIndex],
              debug: { queryMetta: debug.queryMetta, queryEmbedding: debug.queryEmbedding },
            };
          }
          newMsgs.push({
            role: 'assistant',
            content: data.response,
            nodeId,
            debug: { morkResponses: debug?.morkResponses },
          });
          return newMsgs;
        });

        setBranchParentId(nodeId);
        setBranchLabel(null);
        setLatestNodeId(nodeId);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection Error' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectNode = (node: any) => {
    setBranchParentId(node.id);
    setBranchLabel(node.user_message.slice(0, 50));
    setIsGraphOpen(false);
  };

  const isEmpty = messages.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', background: 'var(--bg-base)' }}>

      {/* ── Top Bar ────────────────────────────────────────────────────── */}
      <header style={{
        height: '52px', padding: '0 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          MORK RAG
        </span>

        <button
          id="history-graph-btn"
          onClick={() => setIsGraphOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-secondary)', cursor: 'pointer',
            fontSize: '12px', fontWeight: 500, fontFamily: 'var(--font)',
            transition: 'all var(--transition)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-surface)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
          title="View Conversation Graph"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          History
        </button>
      </header>

      {/* ── Messages Area ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Empty state — Kimi-style centered logo */}
        {isEmpty && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            paddingBottom: '120px', animation: 'fadeIn 0.4s ease',
          }}>
            <div style={{
              fontSize: '48px', fontWeight: 700, letterSpacing: '-0.04em',
              color: 'var(--text-primary)', marginBottom: '32px',
              fontFamily: 'var(--font)',
            }}>
              MORK RAG
            </div>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
              Ask anything about the knowledge graph
            </p>
            {/* Quick suggestion chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '520px' }}>
              {['Explore the knowledge graph', 'What concepts are connected?', 'Summarize key relationships'].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  style={{
                    padding: '8px 14px', borderRadius: '20px',
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--text-secondary)', fontSize: '13px',
                    cursor: 'pointer', fontFamily: 'var(--font)',
                    transition: 'all var(--transition)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-surface)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div style={{ padding: '20px 0', display: 'flex', justifyContent: 'center' }}>
            <div style={{ maxWidth: '768px', width: '100%', padding: '0 20px', display: 'flex', gap: '16px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingTop: '4px' }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'var(--text-muted)',
                    animation: `blink 1.2s ease-in-out ${i * 0.2}s infinite`,
                    display: 'inline-block',
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} style={{ height: '200px', flexShrink: 0 }} />
      </div>

      {/* ── Input Area ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to top, var(--bg-base) 60%, transparent)',
        padding: '32px 20px 24px',
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: '720px' }}>
          {/* Branch pill */}
          {branchLabel && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              marginBottom: '8px',
              padding: '5px 12px', borderRadius: '20px',
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', fontSize: '12px',
            }}>
              <span>Replying to: <em style={{ color: 'var(--text-primary)' }}>{branchLabel}…</em></span>
              <button
                onClick={() => { setBranchParentId(null); setBranchLabel(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {/* Input box — Kimi-style rounded card */}
          <div style={{
            position: 'relative',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-hover)',
            borderRadius: '18px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            transition: 'border-color var(--transition), box-shadow var(--transition)',
          }}
            onFocus={() => { }}
          >
            <textarea
              ref={textareaRef}
              id="chat-input"
              value={input}
              disabled={isLoading}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onFocus={e => {
                e.currentTarget.closest('div')!.style.borderColor = 'var(--border-focus)';
                e.currentTarget.closest('div')!.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)';
              }}
              onBlur={e => {
                e.currentTarget.closest('div')!.style.borderColor = 'var(--border-hover)';
                e.currentTarget.closest('div')!.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)';
              }}
              placeholder="Ask anything…"
              rows={1}
              style={{
                width: '100%', padding: '16px 52px 16px 20px',
                background: 'transparent', border: 'none', color: 'var(--text-primary)',
                fontSize: '15px', outline: 'none', resize: 'none',
                fontFamily: 'var(--font)', lineHeight: '1.5',
                maxHeight: '180px', overflowY: 'auto',
                borderRadius: '18px',
              }}
            />

            {/* Send button */}
            <button
              id="send-btn"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              style={{
                position: 'absolute', right: '10px', bottom: '10px',
                width: '34px', height: '34px', borderRadius: '10px',
                border: 'none', cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                background: input.trim() && !isLoading ? 'var(--text-primary)' : 'var(--bg-surface-2)',
                color: input.trim() && !isLoading ? 'var(--bg-base)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all var(--transition)',
                flexShrink: 0,
              }}
            >
              {isLoading ? (
                <div style={{
                  width: '14px', height: '14px',
                  border: '2px solid var(--text-muted)', borderTopColor: 'transparent',
                  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                }} />
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* ── History Graph Modal ─────────────────────────────────────────── */}
      {isGraphOpen && (
        <ChatHistoryGraph
          token={token}
          visible={isGraphOpen}
          onClose={() => setIsGraphOpen(false)}
          onSelectNode={handleSelectNode}
          latestNodeId={latestNodeId}
        />
      )}
    </div>
  );
};

// ─── MessageBubble ────────────────────────────────────────────────────────────
const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';
  const [showDebug, setShowDebug] = useState(false);

  const hasDebug = !!message.debug && (
    (isUser && !!(message.debug.queryMetta || message.debug.queryEmbedding)) ||
    (!isUser && Array.isArray(message.debug.morkResponses))
  );

  return (
    <div className="fade-in" style={{ width: '100%', padding: isUser ? '12px 0' : '18px 0' }}>
      <div style={{
        maxWidth: '768px', margin: '0 auto', display: 'flex',
        gap: '14px', padding: '0 20px',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
      }}>
        {/* Avatar + Info button column */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: isUser ? '#5436DA' : 'var(--bg-surface)',
            border: isUser ? 'none' : '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: '2px',
          }}>
            {isUser ? (
              <span style={{ color: '#fff', fontSize: '11px', fontWeight: 600 }}>U</span>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            )}
          </div>

          {/* Info toggle button — sits below the avatar, always visible when debug data exists */}
          {hasDebug && (
            <button
              onClick={() => setShowDebug(v => !v)}
              title={isUser ? 'View Mork Query' : 'View Mork Response'}
              style={{
                width: '28px', height: '22px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: showDebug ? 'var(--bg-surface-2)' : 'transparent',
                border: '1px solid var(--border)',
                color: showDebug ? 'var(--text-secondary)' : 'var(--text-muted)',
                borderRadius: '6px',
                cursor: 'pointer', fontSize: '10px',
                fontFamily: 'var(--font)', fontWeight: 600,
                transition: 'all var(--transition)',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--border-hover)';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.background = 'var(--bg-surface-2)';
              }}
              onMouseLeave={e => {
                if (!showDebug) {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {showDebug ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{
          flex: 1, minWidth: 0,
          background: isUser ? 'var(--bg-surface)' : 'transparent',
          padding: isUser ? '10px 14px' : '0',
          borderRadius: isUser ? 'var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg)' : '0',
          border: isUser ? '1px solid var(--border)' : 'none',
          maxWidth: isUser ? '80%' : '100%',
          alignSelf: isUser ? 'flex-end' : 'flex-start',
        }}>
          <div style={{
            color: 'var(--text-primary)', fontSize: '15px', lineHeight: 1.7,
            fontFamily: 'var(--font)',
          }}>
            <ReactMarkdown
              components={{
                p: ({ children }) => <p style={{ margin: '0 0 12px 0' }}>{children}</p>,
                code: ({ children, className }) => {
                  const isBlock = className;
                  return isBlock ? (
                    <pre style={{ background: 'var(--bg-surface-2)', padding: '14px 16px', borderRadius: 'var(--radius-md)', overflowX: 'auto', fontSize: '13px', lineHeight: 1.6, border: '1px solid var(--border)', margin: '12px 0' }}>
                      <code style={{ color: '#e6db74', fontFamily: 'monospace' }}>{children}</code>
                    </pre>
                  ) : (
                    <code style={{ background: 'var(--bg-surface-2)', padding: '2px 6px', borderRadius: '4px', fontSize: '13px', color: '#e6db74', fontFamily: 'monospace' }}>{children}</code>
                  );
                },
                ul: ({ children }) => <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>{children}</ul>,
                ol: ({ children }) => <ol style={{ paddingLeft: '20px', margin: '8px 0' }}>{children}</ol>,
                li: ({ children }) => <li style={{ marginBottom: '4px' }}>{children}</li>,
                h1: ({ children }) => <h1 style={{ fontSize: '20px', fontWeight: 600, margin: '16px 0 8px' }}>{children}</h1>,
                h2: ({ children }) => <h2 style={{ fontSize: '17px', fontWeight: 600, margin: '14px 0 6px' }}>{children}</h2>,
                h3: ({ children }) => <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '12px 0 4px' }}>{children}</h3>,
                strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
                blockquote: ({ children }) => (
                  <blockquote style={{ borderLeft: '3px solid var(--border-focus)', paddingLeft: '14px', color: 'var(--text-secondary)', margin: '12px 0', fontStyle: 'italic' }}>{children}</blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* ── Debug panel ───────────────────────────────────────────── */}
          {showDebug && (
            <div style={{
              marginTop: '12px', padding: '14px 16px', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              fontSize: '12px', fontFamily: 'monospace',
              whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.6,
              animation: 'fadeIn 0.2s ease',
            }}>
              {isUser ? (
                <>
                  <div style={{ color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Query Metta</div>
                  <div style={{ color: 'var(--green)', marginBottom: '14px' }}>{message.debug?.queryMetta || '—'}</div>
                  <div style={{ color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Query Embedding (first 5 lines)</div>
                  <div style={{ color: 'var(--blue)', maxHeight: '160px', overflowY: 'auto' }}>
                    {(message.debug?.queryEmbedding || '').split('\n').slice(0, 5).join('\n') || '—'}
                    {(message.debug?.queryEmbedding || '').split('\n').length > 5 && '\n… (truncated)'}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Retrieved from MORK</div>
                  {!message.debug?.morkResponses?.length ? (
                    <div style={{ color: 'var(--text-muted)' }}>No relevant context found.</div>
                  ) : (
                    message.debug.morkResponses.map((r, i) => (
                      <div key={i} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', paddingTop: i > 0 ? '8px' : '0', marginTop: i > 0 ? '8px' : '0' }}>
                        <div style={{ color: 'var(--accent)', marginBottom: '3px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Result #{i + 1}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>{r}</div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* ── Hide button at bottom of panel ── */}
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowDebug(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    cursor: 'pointer', fontSize: '11px',
                    fontFamily: 'var(--font)', fontWeight: 500,
                    transition: 'all var(--transition)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--border-hover)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.background = 'var(--bg-surface-2)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                  hide
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;