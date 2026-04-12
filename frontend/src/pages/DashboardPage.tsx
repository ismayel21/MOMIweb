import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PatientSelector } from '@/components/dashboard/PatientSelector';
import { VitalCard } from '@/components/dashboard/VitalCard';
import { CTGChart } from '@/components/dashboard/CTGChart';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { BloodPressurePanel } from '@/components/dashboard/BloodPressurePanel';
import { OnboardingGuide } from '@/components/dashboard/OnboardingGuide';
import { AudioControl } from '@/components/dashboard/AudioControl';
import { AICard } from '@/components/dashboard/AICard';
import { SensorType } from '@/types/reading';
import { Activity, LogOut, ClipboardList, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative" style={{ background: '#faf8f5' }}>

      {/* ── Fondo decorativo médico ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {/* Gradientes suaves */}
        <div className="absolute" style={{ width: 600, height: 600, top: '-5%', right: '-8%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(106,158,138,0.07) 0%, transparent 70%)' }} />
        <div className="absolute" style={{ width: 500, height: 500, bottom: '5%', left: '-6%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,132,140,0.06) 0%, transparent 70%)' }} />
        <div className="absolute" style={{ width: 350, height: 350, top: '40%', right: '20%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,142,196,0.05) 0%, transparent 70%)' }} />

        {/* Línea ECG sutil — fondo inferior */}
        <svg
          viewBox="0 0 1200 60"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 w-full"
          style={{ height: 80, opacity: 0.06 }}
          fill="none"
        >
          <path
            d="M0,30 L90,30 L110,30 L122,6 L134,54 L146,30 L166,30 L256,30 L276,30 L288,6 L300,54 L312,30 L332,30 L422,30 L442,30 L454,6 L466,54 L478,30 L498,30 L588,30 L608,30 L620,6 L632,54 L644,30 L664,30 L754,30 L774,30 L786,6 L798,54 L810,30 L830,30 L920,30 L940,30 L952,6 L964,54 L976,30 L996,30 L1086,30 L1106,30 L1118,6 L1130,54 L1142,30 L1200,30"
            stroke="#6a9e8a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <animateTransform attributeName="transform" type="translate" from="0 0" to="-166 0" dur="6s" repeatCount="indefinite" />
          </path>
        </svg>

        {/* Línea ECG sutil — fondo medio */}
        <svg
          viewBox="0 0 1200 60"
          preserveAspectRatio="none"
          className="absolute left-0 w-full"
          style={{ height: 60, top: '35%', opacity: 0.04 }}
          fill="none"
        >
          <path
            d="M0,30 L90,30 L110,30 L122,6 L134,54 L146,30 L166,30 L256,30 L276,30 L288,6 L300,54 L312,30 L332,30 L422,30 L442,30 L454,6 L466,54 L478,30 L498,30 L588,30 L608,30 L620,6 L632,54 L644,30 L664,30 L754,30 L774,30 L786,6 L798,54 L810,30 L830,30 L920,30 L940,30 L952,6 L964,54 L976,30 L996,30 L1086,30 L1106,30 L1118,6 L1130,54 L1142,30 L1200,30"
            stroke="#c4848c"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <animateTransform attributeName="transform" type="translate" from="-166 0" to="0 0" dur="8s" repeatCount="indefinite" />
          </path>
        </svg>

        {/* Patrón de puntos sutiles */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.025 }}>
          <defs>
            <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#6a9e8a" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      {/* ── Contenido (sobre el fondo) ── */}
      <div className="relative" style={{ zIndex: 1 }}>

      {/* Navbar */}
      <nav style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e8e2d9' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#6a9e8a' }}>
                <Activity className="w-3.5 h-3.5" style={{ color: '#ffffff' }} />
              </div>
              <span className="font-semibold text-sm" style={{ color: '#2e3440' }}>MOMI</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-xs mr-3 hidden sm:block" style={{ color: '#8e96a3' }}>
                {user?.full_name || user?.username}
              </span>
              <button
                onClick={() => navigate('/patients')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors"
                style={{ color: '#5a6272' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#2e3440'; (e.currentTarget as HTMLButtonElement).style.background = '#f4f1ec'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#5a6272'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <Users className="w-3.5 h-3.5" />
                Pacientes
              </button>
              <button
                onClick={() => navigate('/history')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors"
                style={{ color: '#5a6272' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#2e3440'; (e.currentTarget as HTMLButtonElement).style.background = '#f4f1ec'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#5a6272'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                Historial
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ml-1"
                style={{ color: '#c4848c', border: '1px solid #f0d4d7' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#a06068'; (e.currentTarget as HTMLButtonElement).style.background = '#f9eced'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#c4848c'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <LogOut className="w-3.5 h-3.5" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {user?.role !== 'tecnico' && <OnboardingGuide />}

        {/* ── Barra superior: Selector de paciente (inline) ── */}
        <div className="mb-4">
          <PatientSelector />
        </div>

        {/* ── Fila 1: Vitales + IA (5 cards en 1 fila) ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
          <VitalCard
            title="SpO₂ Materno"
            sensorType={SensorType.SPO2}
            valueField="spo2"
            icon="activity"
            unit="%"
            normalRange={[95, 100]}
          />
          <VitalCard
            title="FC Materna"
            sensorType={SensorType.SPO2}
            valueField="heart_rate"
            icon="heart"
            unit="BPM"
            normalRange={[60, 100]}
          />
          <VitalCard
            title="PA Sistólica"
            sensorType={SensorType.BLOOD_PRESSURE}
            icon="gauge"
            unit="mmHg"
            normalRange={[90, 140]}
          />
          <VitalCard
            title="FC Fetal"
            sensorType={SensorType.FETAL_DOPPLER}
            icon="heart"
            unit="BPM"
            normalRange={[110, 160]}
          />
          <div className="col-span-2 md:col-span-1">
            <AICard />
          </div>
        </div>

        {/* ── Fila 2: CTG + Audio (mismo nodo) | Sidebar: BP + Alertas ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Columna izquierda: CTG + Audio Doppler (ambos del nodo cardiotocógrafo) */}
          <div className="lg:col-span-2 space-y-3">
            <CTGChart />
            <AudioControl />
          </div>

          {/* Columna derecha: Presión arterial + Alertas */}
          <div className="space-y-4">
            <BloodPressurePanel />
            <AlertsList />
          </div>
        </div>
      </main>

      </div>{/* cierre de relative z-1 */}
    </div>
  );
};