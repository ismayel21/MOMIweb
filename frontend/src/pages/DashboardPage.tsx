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
    <div className="min-h-screen" style={{ background: '#faf8f5' }}>
      {/* Navbar */}
      <nav style={{ background: '#ffffff', borderBottom: '1px solid #e8e2d9' }}>
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
    </div>
  );
};