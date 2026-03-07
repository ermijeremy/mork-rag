import React, { useState, useEffect } from 'react';
import ChatbotSidebar from './components/ChatbotSidebar';
import VisualizationHome from './pages/VisualizationHome';
import Login from './components/Login';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('mork_rag_token');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  const handleLogin = (newToken: string) => {
    localStorage.setItem('mork_rag_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('mork_rag_token');
    setToken(null);
    setIsSidebarOpen(false);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#050505', color: '#4ade80', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <VisualizationHome token={token}>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{
              padding: '8px 16px',
              backgroundColor: isSidebarOpen ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
              border: '1px solid #4ade80',
              color: '#4ade80',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              transition: 'background-color 0.2s',
              boxShadow: '0 0 4px rgba(74, 222, 128, 0.1)'
            }}
          >
            {isSidebarOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: '1px solid #ef4444',
              color: '#ef4444',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Logout
          </button>
        </VisualizationHome>
      </div>
      {isSidebarOpen && (
        <div style={{ width: '380px', margin: '16px 16px 16px 0', borderRadius: '24px', border: '1px solid rgba(74, 222, 128, 0.2)', backgroundColor: '#0a0a0a', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column' }}>
          <ChatbotSidebar onClose={() => setIsSidebarOpen(false)} token={token} />
        </div>
      )}
    </div>
  );
}

export default App;
