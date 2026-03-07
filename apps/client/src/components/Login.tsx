import React, { useState } from 'react';

interface LoginProps {
    onLogin: (token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const data = await res.json();

            if (res.ok && data.token) {
                onLogin(data.token);
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'radial-gradient(circle at center, #111, #050505)', color: '#4ade80', fontFamily: 'sans-serif' }}>
            <div style={{ padding: 40, background: 'rgba(10, 10, 10, 0.4)', backdropFilter: 'blur(32px)', borderRadius: 24, border: '1px solid rgba(74, 222, 128, 0.15)', boxShadow: '0 24px 60px rgba(74, 222, 128, 0.08)' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '24px', letterSpacing: '2px', textShadow: '0 0 8px rgba(74, 222, 128, 0.3)' }}>MORK RAG</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15, width: '300px' }}>
                    <input
                        type="text"
                        placeholder="ENTER USERNAME"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{
                            padding: '12px',
                            fontSize: 14,
                            backgroundColor: 'rgba(17, 17, 17, 0.5)',
                            border: '1px solid rgba(74, 222, 128, 0.2)',
                            color: '#4ade80',
                            borderRadius: '8px',
                            fontFamily: 'monospace',
                            outline: 'none',
                            transition: 'border 0.3s ease'
                        }}
                        onFocus={(e) => e.target.style.border = '1px solid rgba(74, 222, 128, 0.6)'}
                        onBlur={(e) => e.target.style.border = '1px solid rgba(74, 222, 128, 0.2)'}
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '12px',
                            fontSize: 16,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            backgroundColor: 'rgba(74, 222, 128, 0.9)',
                            color: '#050505',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            letterSpacing: '1px',
                            transition: 'all 0.2s',
                            opacity: loading ? 0.7 : 1,
                            boxShadow: '0 4px 12px rgba(74, 222, 128, 0.2)'
                        }}
                        onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#4ade80')}
                        onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = 'rgba(74, 222, 128, 0.9)')}
                    >
                        {loading ? 'INITIALIZING...' : 'START SESSION'}
                    </button>
                    {error && <p style={{ color: '#ef4444', textAlign: 'center', fontSize: '14px', margin: 0 }}>{error}</p>}
                </form>
            </div>
        </div>
    );
};

export default Login;
