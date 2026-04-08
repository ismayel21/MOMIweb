import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, ArrowRight, Baby, Heart, Bell,
  BarChart2, ShieldCheck, Menu, X, Stethoscope, Smartphone,
} from 'lucide-react';

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  bg:        '#faf8f5',
  bgAlt:     '#f4f1ec',
  surface:   '#ffffff',
  border:    '#e8e2d9',
  borderSoft:'#f0ebe3',
  sage:      '#6a9e8a',
  sageDark:  '#4d7d6c',
  sageLight: '#e8f2ee',
  blush:     '#c4848c',
  blushDark: '#a8666e',
  blushLight:'#f9eced',
  lavender:  '#9b8ec4',
  lavLight:  '#f0edf9',
  text:      '#2e3440',
  textMid:   '#5a6272',
  textSoft:  '#8e96a3',
};

// ─── ECG line (soft, slow) ────────────────────────────────────────────────────

const ECGLine: React.FC<{ color?: string; opacity?: number; className?: string }> = ({
  color = T.sage, opacity = 0.25, className = '',
}) => (
  <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className={`w-full h-full ${className}`} fill="none" style={{ opacity }}>
    <path
      d="M0,30 L90,30 L110,30 L122,6 L134,54 L146,30 L166,30
         L256,30 L276,30 L288,6 L300,54 L312,30 L332,30
         L422,30 L442,30 L454,6 L466,54 L478,30 L498,30
         L588,30 L608,30 L620,6 L632,54 L644,30 L664,30
         L754,30 L774,30 L786,6 L798,54 L810,30 L830,30
         L920,30 L940,30 L952,6 L964,54 L976,30 L996,30
         L1086,30 L1106,30 L1118,6 L1130,54 L1142,30 L1200,30"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    >
      <animateTransform attributeName="transform" type="translate" from="0 0" to="-166 0" dur="4s" repeatCount="indefinite" />
    </path>
  </svg>
);

// ─── Navbar ───────────────────────────────────────────────────────────────────

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const navLink = { color: T.textMid, fontSize: 14, cursor: 'pointer', transition: 'color .15s' } as React.CSSProperties;

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: scrolled ? 'rgba(250,248,245,0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(14px)' : 'none',
      borderBottom: scrolled ? `1px solid ${T.border}` : '1px solid transparent',
      transition: 'all .25s',
    }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: T.sage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity style={{ width: 16, height: 16, color: 'white' }} />
          </div>
          <span style={{ fontWeight: 700, color: T.text, fontSize: 17, letterSpacing: '-0.3px' }}>MOMI</span>
        </div>

        {/* Desktop links */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }} className="hidden md:flex">
          {[['#para-medicos','Para médicos'],['#para-pacientes','Para pacientes'],['#como-funciona','Cómo funciona']].map(([href, label]) => (
            <a key={href} href={href} style={navLink}
              onMouseEnter={e => (e.currentTarget.style.color = T.sage)}
              onMouseLeave={e => (e.currentTarget.style.color = T.textMid)}
            >{label}</a>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }} className="hidden md:flex">
          <button onClick={() => navigate('/login')} style={{ ...navLink, background: 'none', border: 'none', padding: '8px 14px', borderRadius: 8, fontWeight: 500 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.bgAlt; (e.currentTarget as HTMLButtonElement).style.color = T.sage; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = T.textMid; }}
          >
            Iniciar sesión
          </button>
          <button onClick={() => navigate('/login')} style={{
            background: T.sage, color: 'white', border: 'none',
            padding: '9px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14,
            cursor: 'pointer', transition: 'background .15s',
          }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = T.sageDark)}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = T.sage)}
          >
            Solicitar usuario
          </button>
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text }}>
          {open ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
        </button>
      </div>

      {open && (
        <div style={{ background: T.surface, borderTop: `1px solid ${T.border}`, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[['#para-medicos','Para médicos'],['#para-pacientes','Para pacientes'],['#como-funciona','Cómo funciona']].map(([href, label]) => (
            <a key={href} href={href} style={{ color: T.textMid, fontSize: 14 }} onClick={() => setOpen(false)}>{label}</a>
          ))}
          <button onClick={() => navigate('/login')} style={{ textAlign: 'left', background: 'none', border: 'none', color: T.textMid, fontSize: 14, cursor: 'pointer' }}>Iniciar sesión</button>
          <button onClick={() => navigate('/login')} style={{ background: T.sage, color: 'white', border: 'none', padding: '10px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
            Solicitar usuario
          </button>
        </div>
      )}
    </nav>
  );
};

// ─── Hero ─────────────────────────────────────────────────────────────────────

const Hero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section style={{ background: T.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden', paddingTop: 64 }}>
      {/* Blobs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: 560, height: 560, top: '-10%', right: '-8%', borderRadius: '50%', background: `radial-gradient(circle, ${T.sageLight} 0%, transparent 70%)`, opacity: 0.7 }} />
        <div style={{ position: 'absolute', width: 400, height: 400, bottom: '5%', left: '-6%', borderRadius: '50%', background: `radial-gradient(circle, ${T.blushLight} 0%, transparent 70%)`, opacity: 0.8 }} />
        <div style={{ position: 'absolute', width: 280, height: 280, top: '30%', left: '20%', borderRadius: '50%', background: `radial-gradient(circle, ${T.lavLight} 0%, transparent 70%)`, opacity: 0.5 }} />
      </div>

      {/* ECG strip */}
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, height: 50, overflow: 'hidden' }}>
        <ECGLine color={T.sage} opacity={0.2} />
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '80px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center', position: 'relative', width: '100%' }}
        className="grid-cols-1 md:grid-cols-2">

        {/* Left */}
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: T.blushLight, border: `1px solid ${T.blush}33`,
            borderRadius: 100, padding: '6px 14px', marginBottom: 28,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.blush, display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: T.blush, letterSpacing: '0.3px' }}>Monitoreo prenatal en tiempo real</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2.2rem, 4.5vw, 3.6rem)', fontWeight: 800,
            color: T.text, lineHeight: 1.1, letterSpacing: '-0.5px', marginBottom: 20,
          }}>
            Acompaña cada latido{' '}
            <span style={{ color: T.sage }}>de tu paciente</span>{' '}
            desde cualquier lugar.
          </h1>

          <p style={{ fontSize: 16, color: T.textMid, lineHeight: 1.7, marginBottom: 36, maxWidth: 460 }}>
            MOMI conecta sensores IoT con tu panel médico. Frecuencia cardíaca fetal, contracciones y signos vitales maternos — sincronizados al instante.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/login')} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: T.sage, color: 'white', border: 'none',
              padding: '13px 26px', borderRadius: 12, fontWeight: 600, fontSize: 15,
              cursor: 'pointer', boxShadow: `0 4px 20px ${T.sage}44`, transition: 'all .15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.sageDark; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = T.sage; (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
            >
              Iniciar sesión
              <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
            <button onClick={() => navigate('/login')} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: T.surface, color: T.textMid, border: `1.5px solid ${T.border}`,
              padding: '13px 26px', borderRadius: 12, fontWeight: 500, fontSize: 15,
              cursor: 'pointer', transition: 'all .15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.sage; (e.currentTarget as HTMLButtonElement).style.color = T.sage; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.textMid; }}
            >
              Iniciar sesión
            </button>
          </div>

          {/* Trust badges */}
          <div style={{ display: 'flex', gap: 24, marginTop: 36, flexWrap: 'wrap' }}>
            {[
              { icon: ShieldCheck, label: 'Datos cifrados', color: T.sage },
              { icon: Activity, label: 'IoT en tiempo real', color: T.lavender },
              { icon: Heart, label: 'Cuidado continuo', color: T.blush },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon style={{ width: 14, height: 14, color }} />
                <span style={{ fontSize: 12, color: T.textSoft, fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: dashboard mockup */}
        <div style={{ display: 'flex', justifyContent: 'center' }} className="hidden md:flex">
          <div style={{
            width: '100%', maxWidth: 360,
            background: T.surface, borderRadius: 20,
            border: `1px solid ${T.border}`,
            boxShadow: `0 20px 60px rgba(106,158,138,0.12), 0 4px 20px rgba(0,0,0,0.06)`,
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ background: T.sage, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity style={{ width: 14, height: 14, color: 'white' }} />
                <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>MOMI Dashboard</span>
              </div>
              <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 10, padding: '3px 10px', borderRadius: 100, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#a8f0c8', display: 'inline-block' }} />
                En sesión
              </span>
            </div>

            {/* Patient info */}
            <div style={{ padding: '14px 18px 10px', borderBottom: `1px solid ${T.borderSoft}` }}>
              <span style={{ fontSize: 11, color: T.textSoft }}>Paciente activa</span>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginTop: 2 }}>María González · 32 sem</div>
            </div>

            {/* Vitals */}
            <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'FCF', value: '148', unit: 'bpm', color: T.blush, bg: T.blushLight },
                { label: 'FC Materna', value: '82', unit: 'bpm', color: '#e07878', bg: '#fdf0f0' },
                { label: 'SpO₂', value: '97', unit: '%', color: T.sage, bg: T.sageLight },
                { label: 'Presión Art.', value: '118/76', unit: 'mmHg', color: T.lavender, bg: T.lavLight },
              ].map(({ label, value, unit, color, bg }) => (
                <div key={label} style={{ background: bg, borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: T.textSoft, marginBottom: 6, fontWeight: 500 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 10, color: T.textSoft, marginTop: 3 }}>{unit}</div>
                </div>
              ))}
            </div>

            {/* Waveform */}
            <div style={{ margin: '0 18px 16px', background: T.bgAlt, borderRadius: 12, height: 56, overflow: 'hidden', border: `1px solid ${T.border}` }}>
              <ECGLine color={T.blush} opacity={0.7} />
            </div>

            {/* Alert */}
            <div style={{ margin: '0 18px 18px', background: T.blushLight, border: `1px solid ${T.blush}33`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Bell style={{ width: 13, height: 13, color: T.blush, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: T.blushDark, fontWeight: 500 }}>FCF levemente elevada — revisar</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Stats ────────────────────────────────────────────────────────────────────

const Stats: React.FC = () => (
  <div style={{ background: T.surface, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, padding: '28px 24px' }}>
    <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }} className="grid-cols-2 md:grid-cols-4">
      {[
        { value: '4 sensores', label: 'FCF · FC · SpO₂ · PA' },
        { value: 'Tiempo real', label: 'Transmisión IoT continua' },
        { value: '24/7', label: 'Monitoreo disponible' },
        { value: 'Alertas', label: 'Automáticas por parámetros' },
      ].map(({ value, label }) => (
        <div key={label} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.sage, marginBottom: 4 }}>{value}</div>
          <div style={{ fontSize: 12, color: T.textSoft }}>{label}</div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Para médicos ─────────────────────────────────────────────────────────────

const ForDoctors: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    { icon: BarChart2, title: 'Panel unificado', desc: 'Todas tus pacientes activas en una sola vista. Signos vitales, sesiones y alertas organizados.', color: T.sage, bg: T.sageLight },
    { icon: Bell, title: 'Alertas automáticas', desc: 'Notificaciones inmediatas cuando los parámetros salen del rango normal definido.', color: T.blush, bg: T.blushLight },
    { icon: Activity, title: 'Historial clínico', desc: 'Accede al historial completo de sesiones: FCF, tocodinamómetro, SpO₂ y presión.', color: T.lavender, bg: T.lavLight },
    { icon: ShieldCheck, title: 'Gestión de pacientes', desc: 'Registra y organiza a tus pacientes. Cada una asociada directamente a tu cuenta.', color: '#8db5a0', bg: '#eef5f1' },
  ];

  return (
    <section id="para-medicos" style={{ background: T.bg, padding: '96px 24px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ marginBottom: 56 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.sage, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Para médicos</span>
          <h2 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', fontWeight: 800, color: T.text, marginTop: 10, lineHeight: 1.2, letterSpacing: '-0.3px' }}>
            Todo lo que necesitas para<br />
            <span style={{ color: T.textMid, fontWeight: 600 }}>monitorear a tus pacientes.</span>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
          {features.map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} style={{
              background: T.surface, borderRadius: 16, padding: '28px 24px',
              border: `1px solid ${T.border}`,
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              transition: 'transform .15s, box-shadow .15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <Icon style={{ width: 20, height: 20, color }} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 13, color: T.textMid, lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 36 }}>
          <button onClick={() => navigate('/login')} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: T.sage, background: 'none', border: 'none',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            transition: 'gap .15s',
          }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.gap = '10px')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.gap = '6px')}
          >
            Solicitar acceso <ArrowRight style={{ width: 15, height: 15 }} />
          </button>
        </div>
      </div>
    </section>
  );
};

// ─── Para pacientes ───────────────────────────────────────────────────────────

const ForPatients: React.FC = () => (
  <section id="para-pacientes" style={{ background: T.bgAlt, padding: '96px 24px' }}>
    <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }} className="grid-cols-1 md:grid-cols-2">

      {/* Left */}
      <div>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.blush, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Para pacientes</span>
        <h2 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', fontWeight: 800, color: T.text, marginTop: 10, marginBottom: 18, lineHeight: 1.2, letterSpacing: '-0.3px' }}>
          Tu bebé, monitoreado<br />
          <span style={{ color: T.textMid, fontWeight: 600 }}>con precisión y cuidado.</span>
        </h2>
        <p style={{ fontSize: 15, color: T.textMid, lineHeight: 1.7, marginBottom: 32 }}>
          La estación MOMI mide continuamente el latido fetal y tus signos vitales mediante sensores. Tu médico puede ver todo en tiempo real desde cualquier lugar.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { icon: Baby, label: 'Frecuencia cardíaca fetal en tiempo real', color: T.blush },
            { icon: Heart, label: 'FC materna, SpO₂ y presión arterial', color: '#e07878' },
            { icon: Activity, label: 'Registro de contracciones y actividad uterina', color: T.sage },
            { icon: Bell, label: 'Tu médico recibe alertas automáticas al instante', color: T.lavender },
          ].map(({ icon: Icon, label, color }) => (
            <li key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <Icon style={{ width: 14, height: 14, color }} />
              </div>
              <span style={{ fontSize: 14, color: T.textMid, lineHeight: 1.5, paddingTop: 6 }}>{label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Right: device */}
      <div style={{ display: 'flex', justifyContent: 'center' }} className="hidden md:flex">
        <div style={{ position: 'relative' }}>
          {/* Glow */}
          <div style={{ position: 'absolute', inset: -20, borderRadius: 32, background: `radial-gradient(circle, ${T.blushLight} 0%, transparent 70%)`, filter: 'blur(20px)' }} />

          {/* Frame */}
          <div style={{
            position: 'relative', width: 230,
            background: '#f0ede8', borderRadius: 28, padding: 10,
            boxShadow: `0 20px 50px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06)`,
            border: `1px solid ${T.border}`,
          }}>
            <div style={{ background: T.surface, borderRadius: 20, overflow: 'hidden' }}>
              <div style={{ background: T.sage, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 7 }}>
                <Activity style={{ width: 11, height: 11, color: 'white' }} />
                <span style={{ color: 'white', fontSize: 11, fontWeight: 600 }}>Estación Prenatal</span>
              </div>
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'FCF', value: '148 bpm', color: T.blush, bg: T.blushLight },
                  { label: 'SpO₂', value: '97 %', color: T.sage, bg: T.sageLight },
                  { label: 'FC', value: '82 bpm', color: '#e07878', bg: '#fdf0f0' },
                  { label: 'PA', value: '118/76', color: T.lavender, bg: T.lavLight },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: bg, borderRadius: 9, padding: '8px 12px' }}>
                    <span style={{ fontSize: 11, color: T.textSoft }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
                  </div>
                ))}
                <div style={{ background: T.bgAlt, borderRadius: 9, height: 44, overflow: 'hidden', marginTop: 2, border: `1px solid ${T.border}` }}>
                  <ECGLine color={T.blush} opacity={0.65} />
                </div>
              </div>
            </div>
          </div>

          {/* Badge */}
          <div style={{
            position: 'absolute', top: 20, right: -50,
            background: T.surface, borderRadius: 12, padding: '8px 14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6dba9c', display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: T.text }}>En vivo</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ─── Cómo funciona ────────────────────────────────────────────────────────────

const HowItWorks: React.FC = () => {
  const steps = [
    { n: '01', icon: Stethoscope, title: 'El médico recibe acceso', desc: 'El administrador crea tu cuenta en momi.onl. Accedes a tu panel donde aparecerán todas tus pacientes.', color: T.sage, bg: T.sageLight },
    { n: '02', icon: Smartphone, title: 'La paciente inicia sesión', desc: 'Desde la estación táctil MOMI, la paciente busca su nombre e inicia la sesión.', color: T.blush, bg: T.blushLight },
    { n: '03', icon: Activity, title: 'Monitoreo en tiempo real', desc: 'Los sensores transmiten al instante. El médico recibe alertas automáticas desde su panel.', color: T.lavender, bg: T.lavLight },
  ];

  return (
    <section id="como-funciona" style={{ background: T.surface, padding: '96px 24px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.lavender, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Flujo de uso</span>
          <h2 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', fontWeight: 800, color: T.text, marginTop: 10, letterSpacing: '-0.3px' }}>
            Tres pasos. Eso es todo.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }} className="grid-cols-1 md:grid-cols-3">
          {steps.map(({ n, icon: Icon, title, desc, color, bg }, i) => (
            <div key={n} style={{ position: 'relative' }}>
              {/* Connector */}
              {i < 2 && (
                <div style={{ position: 'absolute', top: 36, left: 'calc(100% - 12px)', width: 24, borderTop: `1.5px dashed ${T.border}`, zIndex: 1 }} className="hidden md:block" />
              )}
              <div style={{
                background: T.bg, borderRadius: 20, padding: '32px 28px',
                border: `1px solid ${T.border}`,
                boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon style={{ width: 22, height: 22, color }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color, background: bg, padding: '3px 10px', borderRadius: 100 }}>{n}</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 10 }}>{title}</h3>
                <p style={{ fontSize: 13, color: T.textMid, lineHeight: 1.65 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── CTA ──────────────────────────────────────────────────────────────────────

const CTA: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section style={{ background: T.bgAlt, padding: '96px 24px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
        {/* Decorative icon */}
        <div style={{ width: 60, height: 60, borderRadius: 18, background: T.sageLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
          <Heart style={{ width: 26, height: 26, color: T.sage }} />
        </div>

        <h2 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', fontWeight: 800, color: T.text, marginBottom: 16, lineHeight: 1.2, letterSpacing: '-0.3px' }}>
          Empieza a acompañar<br />a tus pacientes hoy.
        </h2>
        <p style={{ fontSize: 15, color: T.textMid, marginBottom: 36, lineHeight: 1.6 }}>
          Solicita tu acceso. Tu primera paciente conectada en minutos.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/login')} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: T.sage, color: 'white', border: 'none',
            padding: '14px 30px', borderRadius: 12, fontWeight: 600, fontSize: 15,
            cursor: 'pointer', boxShadow: `0 4px 20px ${T.sage}44`, transition: 'all .15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.sageDark; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = T.sage; (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
          >
            Iniciar sesión <ArrowRight style={{ width: 16, height: 16 }} />
          </button>
          <button onClick={() => navigate('/login')} style={{
            background: T.surface, color: T.textMid, border: `1.5px solid ${T.border}`,
            padding: '14px 30px', borderRadius: 12, fontWeight: 500, fontSize: 15,
            cursor: 'pointer', transition: 'all .15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.sage; (e.currentTarget as HTMLButtonElement).style.color = T.sage; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.textMid; }}
          >
            Ya tengo cuenta
          </button>
        </div>
      </div>
    </section>
  );
};

// ─── Footer ───────────────────────────────────────────────────────────────────

const Footer: React.FC = () => (
  <footer style={{ background: T.surface, borderTop: `1px solid ${T.border}`, padding: '28px 24px' }}>
    <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: T.sage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Activity style={{ width: 13, height: 13, color: 'white' }} />
        </div>
        <span style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>MOMI</span>
        <span style={{ color: T.textSoft, fontSize: 13 }}>— Monitoreo Materno Inteligente</span>
      </div>
      <span style={{ fontSize: 12, color: T.textSoft }}>© {new Date().getFullYear()} MOMI · momi.onl</span>
    </div>
  </footer>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export const LandingPage: React.FC = () => (
  <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
    <Navbar />
    <Hero />
    <Stats />
    <ForDoctors />
    <ForPatients />
    <HowItWorks />
    <CTA />
    <Footer />
  </div>
);
