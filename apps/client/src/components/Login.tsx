import React, { useState } from 'react';

interface LoginProps {
  onLogin: (token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isRegistering ? '/api/register' : '/api/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (res.ok && data.token) {
        onLogin(data.token);
      } else {
        setError(data.error || (isRegistering ? 'Registration failed' : 'Login failed'));
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100vh', width: '100vw',
      background: '#0d0d0d',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Subtle background radial */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(107,107,255,0.07) 0%, transparent 70%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '360px', padding: '0 24px', animation: 'fadeIn 0.35s ease' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '36px', fontWeight: 700, letterSpacing: '-0.03em',
            color: '#f0f0f0', margin: 0,
          }}>
            MORK RAG
          </h1>
          <p style={{ fontSize: '14px', color: '#555', marginTop: '8px', fontWeight: 400 }}>
            {isRegistering ? 'Create your account' : 'Sign in to continue'}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#161616',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#777', marginBottom: '6px', letterSpacing: '0.02em' }}>
                Username
              </label>
              <input
                id="login-username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: '100%', padding: '11px 14px',
                  background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px', color: '#f0f0f0', fontSize: '14px',
                  fontFamily: 'inherit', outline: 'none',
                  transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.25)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(107,107,255,0.08)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#777', marginBottom: '6px', letterSpacing: '0.02em' }}>
                Password
              </label>
              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', padding: '11px 14px',
                  background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px', color: '#f0f0f0', fontSize: '14px',
                  fontFamily: 'inherit', outline: 'none',
                  transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.25)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(107,107,255,0.08)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px',
                background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                color: '#f87171', fontSize: '13px', lineHeight: 1.4,
              }}>
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              style={{
                marginTop: '4px',
                width: '100%', padding: '12px',
                background: loading ? '#2a2a2a' : '#f0f0f0',
                color: loading ? '#555' : '#0d0d0d',
                border: 'none', borderRadius: '10px',
                fontWeight: 600, fontSize: '14px',
                fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.18s ease',
                letterSpacing: '0.02em',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#ffffff'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#f0f0f0'; }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{
                    width: '14px', height: '14px', border: '2px solid #555', borderTopColor: 'transparent',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block',
                  }} />
                  {isRegistering ? 'Creating account…' : 'Signing in…'}
                </span>
              ) : (
                isRegistering ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#555' }}>
            {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
            <button
              onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
              style={{
                background: 'none', border: 'none', color: '#9a9a9a',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px',
                fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: '2px',
                padding: 0, transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#f0f0f0'}
              onMouseLeave={e => e.currentTarget.style.color = '#9a9a9a'}
            >
              {isRegistering ? 'Sign In' : 'Register'}
            </button>
          </div>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: #3a3a3a; }
      `}</style>
    </div>
  );
};

export default Login;
