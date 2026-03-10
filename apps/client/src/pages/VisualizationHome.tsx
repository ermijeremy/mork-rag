import React, { useState, useEffect } from 'react';
import Login from '../components/Login';
import ChatInterface from '../components/ChatbotInterface';
import DataExplorer from '../components/DataExplorer';

// --- Icons (Inline SVGs for zero-dependency) ---
const Icons = {
  Chat: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
  ),
  Graph: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
  ),
  Rules: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
  ),
  Ingest: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
  ),
  Logout: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
  )
};

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState<'chat' | 'graph' | 'rules'>('chat');
  
  // Ingest Modal State
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [ingestFile, setIngestFile] = useState<File | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error'; visible: boolean }>({ message: '', type: 'info', visible: false });

  const handleLogin = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const showToast = (message: string, type: 'info' | 'success' | 'error') => {
      setToast({ message, type, visible: true });
      // Auto-hide success/info messages
      if (type !== 'error') {
          setTimeout(() => {
              setToast(prev => (prev.message === message ? { ...prev, visible: false } : prev));
          }, 3000);
      }
  };

  const handleIngestSubmit = async (mode: 'file' | 'default') => {
      // 1. Close modal immediately
      setShowIngestModal(false);
      setIngestLoading(true);
      
      // 2. Show starting toast
      showToast('Ingestion started...', 'info');

      try {
          const headers: any = { Authorization: `Bearer ${token}` };
          let body;
          
          if (mode === 'file') {
              if (!ingestFile) return;
              const formData = new FormData();
              formData.append('file', ingestFile);
              body = formData;
          } else {
               headers['Content-Type'] = 'application/json';
               body = JSON.stringify({});
          }
  
          const fetchOptions: RequestInit = {
              method: 'POST',
              headers: mode === 'file' ? { Authorization: `Bearer ${token}` } : headers,
              body
          };
  
          const res = await fetch('/api/ingest', fetchOptions);
          
          if (res.ok) {
              setIngestFile(null);
              setDataVersion(prev => prev + 1);
              showToast('Ingestion completed successfully!', 'success');
          } else {
              const data = await res.json();
              showToast(`Ingestion failed: ${data.error || 'Unknown error'}`, 'error');
          }
      } catch (e) {
          console.error(e);
          showToast('Error: Failed to connect to server', 'error');
      } finally {
          setIngestLoading(false);
      }
  };

  if (!token) return <Login onLogin={handleLogin} />;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#050505', color: '#e2e8f0', fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>
      {/* Global Styles Injection */}
      <style>{`
        body { margin: 0; background: #050505; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #4ade80; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .glass-panel { background: rgba(20, 20, 20, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); }
      `}</style>
      
      {/* Ingest Modal */}
      {showIngestModal && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="glass-panel" style={{
                padding: '24px', borderRadius: '16px', width: '340px',
                display: 'flex', flexDirection: 'column', gap: '20px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}>
                <div>
                    <h3 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '18px' }}>Ingest Data</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.4 }}>
                        Update the knowledge base with new content.
                    </p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        <label style={{ display: 'block', fontSize: '12px', color: '#4ade80', marginBottom: '8px', fontWeight: 600 }}>OPTION 1: UPLOAD FILE</label>
                        <input 
                            type="file" 
                            accept=".metta,.txt"
                            onChange={e => setIngestFile(e.target.files?.[0] || null)}
                            style={{ fontSize: '12px', color: '#94a3b8', width: '100%', marginBottom: '8px' }}
                        />
                        <button 
                            onClick={() => handleIngestSubmit('file')}
                            disabled={!ingestFile || ingestLoading}
                            style={{
                                width: '100%', padding: '8px', borderRadius: '6px', border: 'none',
                                backgroundColor: ingestFile ? '#4ade80' : '#334155',
                                color: ingestFile ? '#000' : '#94a3b8',
                                cursor: ingestFile ? 'pointer' : 'not-allowed',
                                fontWeight: 600, fontSize: '13px', transition: 'all 0.2s'
                            }}
                        >
                            {ingestLoading && ingestFile ? 'Processing...' : 'Upload & Ingest'}
                        </button>
                    </div>
                    
                    <div style={{ textAlign: 'center', fontSize: '12px', color: '#555' }}>— OR —</div>
                    
                    <button 
                        onClick={() => handleIngestSubmit('default')}
                        disabled={ingestLoading}
                        style={{
                            width: '100%', padding: '10px', borderRadius: '8px', 
                            border: '1px solid #334155',
                            backgroundColor: 'transparent', color: '#e2e8f0',
                            cursor: ingestLoading ? 'not-allowed' : 'pointer',
                            fontSize: '13px', fontWeight: 500,
                            transition: 'all 0.2s',
                        }}
                        onMouseOver={e => !ingestLoading && (e.currentTarget.style.borderColor = '#94a3b8')}
                        onMouseOut={e => !ingestLoading && (e.currentTarget.style.borderColor = '#334155')}
                    >
                        {ingestLoading && !ingestFile ? 'Ingesting...' : 'Use Default Data'}
                    </button>
                </div>

                <button 
                    onClick={() => { setShowIngestModal(false); setIngestFile(null); }}
                    style={{
                        alignSelf: 'center', background: 'transparent',
                        border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px',
                        textDecoration: 'underline'
                    }}
                >
                    Cancel
                </button>
            </div>
        </div>
      )}

      {/* --- Sidebar Navigation --- */}
      <nav style={{
        width: '260px',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(74, 222, 128, 0.1)',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)',
        padding: '24px 16px',
        zIndex: 10
      }}>
        <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '12px' }}>
          <div style={{ width: '32px', height: '32px', background: '#4ade80', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(74, 222, 128, 0.4)' }}>
            <span style={{ color: '#000', fontWeight: '900', fontSize: '18px' }}>M</span>
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '-0.5px', color: '#fff' }}>Mork RAG</div>
            <div style={{ fontSize: '10px', color: '#4ade80', letterSpacing: '1px', textTransform: 'uppercase' }}>Hyper Engine</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <SidebarItem
            active={activeTab === 'chat'}
            onClick={() => setActiveTab('chat')}
            icon={<Icons.Chat />}
            label="AI Assistant"
          />
          <SidebarItem
            active={activeTab === 'graph'}
            onClick={() => setActiveTab('graph')}
            icon={<Icons.Graph />}
            label="Knowledge Graph"
          />
          <SidebarItem
            active={activeTab === 'rules'}
            onClick={() => setActiveTab('rules')}
            icon={<Icons.Rules />}
            label="Inference Rules"
          />

          <button
            onClick={() => setShowIngestModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: '12px',
              background: 'rgba(74, 222, 128, 0.05)',
              border: '1px dashed rgba(74, 222, 128, 0.3)',
              color: '#4ade80',
              cursor: 'pointer', transition: 'all 0.3s ease',
              fontSize: '14px', fontWeight: 500, textAlign: 'left',
              marginTop: '12px'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(74, 222, 128, 0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(74, 222, 128, 0.05)')}
          >
            <Icons.Ingest /> Ingest Data
          </button>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '12px', borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444', display: 'flex', alignItems: 'center', gap: '12px',
              cursor: 'pointer', transition: 'all 0.2s', fontSize: '13px', fontWeight: 500
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
          >
            <Icons.Logout /> End Session
          </button>
        </div>
      </nav>

      {/* --- Main Content Area --- */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: activeTab === 'chat' ? 'block' : 'none', height: '100%' }}>
            <ChatInterface token={token} />
        </div>
        {activeTab === 'graph' && <DataExplorer token={token} mode="graph" version={dataVersion} />}
        {activeTab === 'rules' && <DataExplorer token={token} mode="rules" version={dataVersion} />}
      </main>

      {/* --- Toast Notification --- */}
      {toast.visible && (
          <div style={{
              position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000,
              backgroundColor: 'rgba(20, 20, 20, 0.95)',
              backdropFilter: 'blur(10px)',
              borderLeft: `4px solid ${
                  toast.type === 'success' ? '#4ade80' : 
                  toast.type === 'error' ? '#ef4444' : '#3b82f6'
              }`,
              borderRadius: '8px',
              padding: '16px 20px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', gap: '12px',
              color: '#fff', fontSize: '14px',
              animation: 'slideIn 0.3s ease-out',
              maxWidth: '300px'
          }}>
              {toast.type === 'success' && <span style={{ color: '#4ade80', fontSize: '18px' }}>✓</span>}
              {toast.type === 'error' && <span style={{ color: '#ef4444', fontSize: '18px' }}>⚠</span>}
              {toast.type === 'info' && <span style={{ color: '#3b82f6', fontSize: '18px' }}>ℹ</span>}
              
              <div style={{ flex: 1 }}>
                  {toast.message}
              </div>
              
              <button 
                onClick={() => setToast(prev => ({ ...prev, visible: false }))}
                style={{ 
                    background: 'transparent', border: 'none', color: '#64748b', 
                    cursor: 'pointer', fontSize: '18px', padding: 0, marginLeft: '8px' 
                }}
              >
                  ×
              </button>
          </div>
      )}

      <style>{`
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// --- Subcomponent: Sidebar Item ---
const SidebarItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 16px', borderRadius: '12px',
      background: active ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
      border: active ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid transparent',
      color: active ? '#4ade80' : '#94a3b8',
      cursor: 'pointer', transition: 'all 0.3s ease',
      fontSize: '14px', fontWeight: 500, textAlign: 'left',
      boxShadow: active ? '0 0 20px rgba(74, 222, 128, 0.05)' : 'none'
    }}
    onMouseEnter={e => !active && (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
    onMouseLeave={e => !active && (e.currentTarget.style.background = 'transparent')}
  >
    <span style={{ filter: active ? 'drop-shadow(0 0 5px rgba(74,222,128,0.5))' : 'none' }}>{icon}</span>
    {label}
  </button>
);

export default App;