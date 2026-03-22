import React, { useState, useEffect } from 'react';
import ChatInterface from '../components/ChatbotInterface';
import DataExplorer from '../components/DataExplorer';

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
  Chat: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Graph: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  Upload: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  Logout: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Plus: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Toast {
  message: string;
  type: 'info' | 'success' | 'error';
  visible: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const VisualizationHome: React.FC<{ token: string; onLogout?: () => void }> = ({ token: propToken, onLogout }) => {
  const [token, setToken] = useState<string | null>(propToken || localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState<'chat' | 'graph'>('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatResetKey, setChatResetKey] = useState(0);

  const handleNewChat = () => {
    setActiveTab('chat');
    setChatResetKey(k => k + 1);
  };

  const [showIngestModal, setShowIngestModal] = useState(false);
  const [ingestFile, setIngestFile] = useState<File | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  const [toast, setToast] = useState<Toast>({ message: '', type: 'info', visible: false });

  useEffect(() => {
    if (propToken) setToken(propToken);
  }, [propToken]);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('token');
      setToken(null);
    }
  };

  const showToast = (message: string, type: Toast['type']) => {
    setToast({ message, type, visible: true });
    if (type !== 'error') {
      setTimeout(() => setToast(prev => prev.message === message ? { ...prev, visible: false } : prev), 3000);
    }
  };

  const handleIngestSubmit = async (mode: 'file' | 'default') => {
    setShowIngestModal(false);
    setIngestLoading(true);
    showToast('Ingestion started…', 'info');

    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      let body: BodyInit;

      if (mode === 'file') {
        if (!ingestFile) return;
        const formData = new FormData();
        formData.append('file', ingestFile);
        body = formData;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({});
      }

      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: mode === 'file' ? { Authorization: `Bearer ${token}` } : headers,
        body,
      });

      if (res.ok) {
        setIngestFile(null);
        setDataVersion(prev => prev + 1);
        showToast('Ingestion completed successfully!', 'success');
      } else {
        const data = await res.json();
        showToast(`Ingestion failed: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch {
      showToast('Error: Failed to connect to server', 'error');
    } finally {
      setIngestLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font)', overflow: 'hidden' }}>

      {/* ── Ingest Modal ─────────────────────────────────────────────────── */}
      {showIngestModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{
            width: '360px', borderRadius: 'var(--radius-xl)',
            background: 'var(--bg-surface)', border: '1px solid var(--border-hover)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px',
            animation: 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Ingest Data</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Update the knowledge base with new content.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Upload Option */}
              <div style={{
                padding: '14px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
              }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--green)', marginBottom: '10px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Upload File
                </label>
                <input
                  type="file"
                  accept=".metta,.txt"
                  onChange={e => setIngestFile(e.target.files?.[0] || null)}
                  style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '100%', marginBottom: '10px' }}
                />
                <button
                  onClick={() => handleIngestSubmit('file')}
                  disabled={!ingestFile || ingestLoading}
                  style={{
                    width: '100%', padding: '9px', borderRadius: 'var(--radius-sm)',
                    border: 'none', cursor: ingestFile ? 'pointer' : 'not-allowed',
                    background: ingestFile ? 'var(--green)' : 'var(--bg-hover)',
                    color: ingestFile ? '#000' : 'var(--text-muted)',
                    fontWeight: 600, fontSize: '13px', fontFamily: 'var(--font)',
                    transition: 'all var(--transition)',
                  }}
                >
                  {ingestLoading && ingestFile ? 'Processing…' : 'Upload & Ingest'}
                </button>
              </div>

              <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>— or —</div>

              <button
                onClick={() => handleIngestSubmit('default')}
                disabled={ingestLoading}
                style={{
                  width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-primary)', cursor: ingestLoading ? 'not-allowed' : 'pointer',
                  fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font)',
                  transition: 'all var(--transition)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
              >
                {ingestLoading && !ingestFile ? 'Ingesting…' : 'Use Default Data'}
              </button>
            </div>

            <button
              onClick={() => { setShowIngestModal(false); setIngestFile(null); }}
              style={{
                alignSelf: 'center', background: 'transparent', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px',
                fontFamily: 'var(--font)', padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                transition: 'color var(--transition)',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <nav style={{
        width: sidebarCollapsed ? '60px' : 'var(--sidebar-w)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        padding: sidebarCollapsed ? '12px 10px' : '12px',
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden', zIndex: 10, flexShrink: 0,
      }}>
        {/* Logo area */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', marginBottom: '16px', padding: '4px 0' }}>
          {!sidebarCollapsed && (
            <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              MORK RAG
            </span>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '6px', borderRadius: 'var(--radius-sm)', transition: 'all var(--transition)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {sidebarCollapsed
                ? <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
                : <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /></>
              }
            </svg>
          </button>
        </div>

        {/* New Chat button */}
        <button
          onClick={handleNewChat}
          title="New Chat"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            gap: '10px', padding: '9px 10px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-primary)', cursor: 'pointer',
            fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font)',
            transition: 'all var(--transition)', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          <Icons.Plus />
          {!sidebarCollapsed && <span>New Chat</span>}
        </button>

        {/* Nav items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          <NavItem
            active={activeTab === 'chat'}
            onClick={() => setActiveTab('chat')}
            icon={<Icons.Chat />}
            label="AI Assistant"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={activeTab === 'graph'}
            onClick={() => setActiveTab('graph')}
            icon={<Icons.Graph />}
            label="Knowledge Graph"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={false}
            onClick={() => setShowIngestModal(true)}
            icon={<Icons.Upload />}
            label="Ingest Data"
            collapsed={sidebarCollapsed}
          />
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
          <NavItem
            active={false}
            onClick={handleLogout}
            icon={<Icons.Logout />}
            label="Log out"
            collapsed={sidebarCollapsed}
          />
        </div>
      </nav>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: activeTab === 'chat' ? 'flex' : 'none', height: '100%', flexDirection: 'column' }}>
          <ChatInterface key={chatResetKey} token={token} />
        </div>
        {activeTab === 'graph' && (
          <DataExplorer token={token} mode="graph" version={dataVersion} />
        )}
      </main>

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast.visible && (
        <div className="slide-in" style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000,
          background: 'var(--bg-surface)', backdropFilter: 'blur(16px)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(74,222,128,0.3)' : toast.type === 'error' ? 'rgba(248,113,113,0.3)' : 'rgba(96,165,250,0.3)'}`,
          borderLeft: `3px solid ${toast.type === 'success' ? 'var(--green)' : toast.type === 'error' ? 'var(--red)' : 'var(--blue)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', gap: '12px',
          color: 'var(--text-primary)', fontSize: '13px',
          maxWidth: '320px',
        }}>
          <span style={{
            fontSize: '16px',
            color: toast.type === 'success' ? 'var(--green)' : toast.type === 'error' ? 'var(--red)' : 'var(--blue)',
          }}>
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '⚠' : 'ℹ'}
          </span>
          <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
          <button
            onClick={() => setToast(prev => ({ ...prev, visible: false }))}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Sub-component: Sidebar Nav Item ─────────────────────────────────────────
interface NavItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ active, onClick, icon, label, collapsed }) => (
  <button
    onClick={onClick}
    title={collapsed ? label : undefined}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
      gap: '10px', padding: collapsed ? '10px' : '9px 10px',
      borderRadius: 'var(--radius-sm)', border: 'none',
      background: active ? 'var(--bg-surface)' : 'transparent',
      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      cursor: 'pointer', transition: 'all var(--transition)',
      fontSize: '13px', fontWeight: active ? 500 : 400,
      fontFamily: 'var(--font)', textAlign: 'left', width: '100%',
      whiteSpace: 'nowrap', overflow: 'hidden',
    }}
    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
  >
    <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>
    {!collapsed && <span>{label}</span>}
  </button>
);

export default VisualizationHome;