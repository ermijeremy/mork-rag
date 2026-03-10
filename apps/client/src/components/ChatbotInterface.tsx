import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import ChatHistoryGraph from './ChatHistoryGraph'; 

const ChatInterface: React.FC<{ token: string }> = ({ token }) => {
    const [messages, setMessages] = useState<{ role: string; content: string; nodeId?: number }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGraphOpen, setIsGraphOpen] = useState(false);

    // Branching logic state
    const [branchParentId, setBranchParentId] = useState<number | null>(null);
    const [branchLabel, setBranchLabel] = useState<string | null>(null);
    const [latestNodeId, setLatestNodeId] = useState<number | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const userText = input.trim();
        setInput('');
        setIsLoading(true);

        // Add user message
        setMessages(prev => [...prev, { role: 'user', content: userText }]);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ message: userText, parentId: branchParentId }),
            });
            const data = await res.json();

            if (res.ok && data.response) {
                const nodeId: number = data.nodeId;
                setMessages(prev => [...prev, { role: 'assistant', content: data.response, nodeId }]);
                setBranchParentId(nodeId); // Continue thread by default
                setBranchLabel(null); // Clear branch UI
                setLatestNodeId(nodeId);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
            }
        } catch (e) {
            console.error(e);
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', background: 'radial-gradient(circle at center, #111 0%, #050505 100%)' }}>

            {/* --- Header --- */}
            <header style={{
                padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'rgba(5,5,5,0.8)', backdropFilter: 'blur(10px)', zIndex: 10
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#fff' }}>New Chat</h1>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>Model: Hyper-On v1.0</p>
                </div>
                <button
                    onClick={() => setIsGraphOpen(true)}
                    style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#cbd5e1', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px'
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                    View History
                </button>
            </header>

            {/* --- Messages Area --- */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {messages.length === 0 && (
                    <div style={{ marginTop: '20%', textAlign: 'center', color: '#334155' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
                        <h2 style={{ color: '#e2e8f0', fontWeight: 500 }}>How can I help you today?</h2>
                    </div>
                )}

                {messages.map((m, i) => (
                    <MessageBubble key={i} message={m} />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* --- Input Area --- */}
            <div style={{ padding: '24px 32px 40px', background: 'transparent' }}>
                {branchLabel && (
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '10px',
                        background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)',
                        borderRadius: '20px', padding: '6px 12px', marginBottom: '12px', fontSize: '12px', color: '#4ade80'
                    }}>
                        <span>Replying to: <strong>{branchLabel}...</strong></span>
                        <button onClick={() => { setBranchParentId(null); setBranchLabel(null); }} style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer' }}>×</button>
                    </div>
                )}

                <div style={{
                    position: 'relative', maxWidth: '800px', margin: '0 auto',
                    boxShadow: '0 0 40px rgba(0,0,0,0.5)', borderRadius: '24px',
                    border: '1px solid rgba(74, 222, 128, 0.2)', background: '#0a0a0a',
                    transition: 'all 0.3s'
                }}>
                    <input
                        value={input}
                        disabled={isLoading}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder={isLoading ? "Thinking..." : "Message Mork RAG..."}
                        style={{
                            width: '100%', padding: '20px 24px', paddingRight: '60px',
                            background: 'transparent', border: 'none', color: '#fff',
                            fontSize: '16px', outline: 'none', resize: 'none',
                            fontFamily: 'inherit',
                            opacity: isLoading ? 0.5 : 1
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        style={{
                            position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                            background: input.trim() && !isLoading ? '#4ade80' : '#333',
                            border: 'none', borderRadius: '8px', width: '36px', height: '36px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: input.trim() && !isLoading ? 'pointer' : 'default', transition: 'background 0.2s'
                        }}
                    >
                        {isLoading ? (
                            <div style={{
                                width: '16px', height: '16px', border: '2px solid #666',
                                borderTop: '2px solid #fff', borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        )}
                    </button>
                    <style>{`
                        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    `}</style>
                </div>
            </div>

            {/* --- History Graph Modal --- */}
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

// --- Helper: Message Bubble ---
const MessageBubble: React.FC<{ message: any }> = ({ message }) => {
    const isUser = message.role === 'user';
    return (
        <div style={{
            display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row',
            gap: '12px', alignItems: 'flex-start', animation: 'fadeIn 0.3s ease'
        }}>
            <div style={{
                width: '36px', height: '36px', borderRadius: '12px',
                background: isUser ? '#4ade80' : '#1e293b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
            }}>
                {isUser ?
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> :
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.5-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2z"></path><path d="M12 6v6l4 2"></path></svg>
                }
            </div>
            <div style={{
                maxWidth: '70%', padding: '16px 20px', borderRadius: '18px',
                background: isUser ? 'rgba(74, 222, 128, 0.1)' : '#111',
                border: `1px solid ${isUser ? 'rgba(74, 222, 128, 0.3)' : 'rgba(255,255,255,0.05)'}`,
                color: '#e2e8f0', fontSize: '15px', lineHeight: '1.6'
            }}>
                <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
        </div>
    );
};

export default ChatInterface;