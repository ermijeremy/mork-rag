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
    <VisualizationHome token={token} onLogout={handleLogout} />
  );
}

export default App;
