import React, { useState, useEffect } from 'react';
import VisualizationHome from './pages/VisualizationHome';
import Login from './components/Login';

function App() {
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
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#050505', color: '#4ade80', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <VisualizationHome token={token}>
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
    </div>
  );
}

export default App;
