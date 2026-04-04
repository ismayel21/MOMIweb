import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Activity, ArrowRight } from 'lucide-react';

const T = {
  bg:        '#faf8f5',
  bgAlt:     '#f4f1ec',
  surface:   '#ffffff',
  border:    '#e8e2d9',
  sage:      '#6a9e8a',
  sageDark:  '#4d7d6c',
  sageLight: '#e8f2ee',
  blush:     '#c4848c',
  blushLight:'#f9eced',
  text:      '#2e3440',
  textMid:   '#5a6272',
  textSoft:  '#8e96a3',
  error:     '#c4848c',
  errorBg:   '#f9eced',
};

const ECGLine: React.FC = () => (
  <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full h-full" fill="none" style={{ opacity: 0.18 }}>
    <path
      d="M0,30 L90,30 L110,30 L122,6 L134,54 L146,30 L166,30
         L256,30 L276,30 L288,6 L300,54 L312,30 L332,30
         L422,30 L442,30 L454,6 L466,54 L478,30 L498,30
         L588,30 L608,30 L620,6 L632,54 L644,30 L664,30
         L754,30 L774,30 L786,6 L798,54 L810,30 L830,30
         L920,30 L940,30 L952,6 L964,54 L976,30 L996,30
         L1086,30 L1106,30 L1118,6 L1130,54 L1142,30 L1200,30"
      stroke={T.sage}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <animateTransform attributeName="transform" type="translate" from="0 0" to="-166 0" dur="4s" repeatCount="indefinite" />
    </path>
  </svg>
);

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ username, password });
      navigate('/app');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, position: 'relative', overflow: 'hidden', padding: 16, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Blobs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: 500, height: 500, top: '-15%', left: '50%', transform: 'translateX(-50%)', borderRadius: '50%', background: `radial-gradient(circle, ${T.sageLight} 0%, transparent 70%)`, opacity: 0.7 }} />
        <div style={{ position: 'absolute', width: 320, height: 320, bottom: '5%', right: '-5%', borderRadius: '50%', background: `radial-gradient(circle, ${T.blushLight} 0%, transparent 70%)`, opacity: 0.8 }} />
      </div>

      {/* ECG strip bottom */}
      <div style={{ position: 'absolute', bottom: 32, left: 0, right: 0, height: 50, overflow: 'hidden' }}>
        <ECGLine />
      </div>

      <div style={{ position: 'relative', width: '100%', maxWidth: 380 }}>

        {/* Back */}
        <button
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: T.textSoft, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 32, transition: 'color .15s', padding: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = T.sage)}
          onMouseLeave={e => (e.currentTarget.style.color = T.textSoft)}
        >
          ← Volver a momi.onl
        </button>

        {/* Logo + heading */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: T.sage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity style={{ width: 16, height: 16, color: 'white' }} />
            </div>
            <span style={{ fontWeight: 700, color: T.text, fontSize: 16 }}>MOMI</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, marginBottom: 6, letterSpacing: '-0.3px' }}>Bienvenido de vuelta</h1>
          <p style={{ fontSize: 14, color: T.textMid }}>Ingresa a tu panel médico</p>
        </div>

        {/* Card */}
        <div style={{ background: T.surface, borderRadius: 20, padding: '28px 28px 24px', border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(106,158,138,0.08), 0 1px 4px rgba(0,0,0,0.04)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.textMid, marginBottom: 8, letterSpacing: '0.2px' }}>
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Tu nombre de usuario"
                required
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
                  background: T.bgAlt, border: `1.5px solid ${T.border}`, color: T.text,
                  outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s',
                  fontFamily: 'inherit',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = T.sage)}
                onBlur={e => (e.currentTarget.style.borderColor = T.border)}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.textMid, marginBottom: 8, letterSpacing: '0.2px' }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
                  background: T.bgAlt, border: `1.5px solid ${T.border}`, color: T.text,
                  outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s',
                  fontFamily: 'inherit',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = T.sage)}
                onBlur={e => (e.currentTarget.style.borderColor = T.border)}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, background: T.errorBg, border: `1px solid ${T.blush}44`, color: T.blush }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                background: loading ? T.sageLight : T.sage, color: loading ? T.sage : 'white',
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : `0 4px 16px ${T.sage}44`,
                transition: 'all .15s', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = T.sageDark; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = T.sage; }}
            >
              {loading ? 'Iniciando sesión...' : (
                <>Iniciar sesión <ArrowRight style={{ width: 15, height: 15 }} /></>
              )}
            </button>
          </form>

          <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${T.border}`, textAlign: 'center' }}>
            <button
              onClick={() => navigate('/')}
              style={{ background: 'none', border: 'none', color: T.textSoft, fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
              onMouseEnter={e => (e.currentTarget.style.color = T.sage)}
              onMouseLeave={e => (e.currentTarget.style.color = T.textSoft)}
            >
              ← Volver a momi.onl
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
