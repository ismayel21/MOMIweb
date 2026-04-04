import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BloodPressurePanel } from '@/components/dashboard/BloodPressurePanel';
import { CTGChart, BtnEvent } from '@/components/dashboard/CTGChart';
import { AudioControl } from '@/components/dashboard/AudioControl';
import { Activity, LogOut, Wifi, WifiOff } from 'lucide-react';

interface SensorData {
  value: number | null;
  timestamp: string | null;
  secondsAgo: number;
}

interface CalibrationState {
  fetal_hr:    SensorData;
  maternal_hr: SensorData;
  spo2:        SensorData;
  systolic_bp: SensorData;
  toco:        SensorData;
}

interface DataPoint { t: number; v: number | null; }

const MAX_POINTS = 3000;
const emptySensor = (): SensorData => ({ value: null, timestamp: null, secondsAgo: 999 });

const WS_BASE = (import.meta as any).env?.VITE_WS_BASE_URL || 'ws://localhost:8000';

export const TecnicoDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [sensors, setSensors] = useState<CalibrationState>({
    fetal_hr:    emptySensor(),
    maternal_hr: emptySensor(),
    spo2:        emptySensor(),
    systolic_bp: emptySensor(),
    toco:        emptySensor(),
  });
  const [fhrData,   setFhrData]   = useState<DataPoint[]>([]);
  const [tocoData,  setTocoData]  = useState<DataPoint[]>([]);
  const [btnEvents, setBtnEvents] = useState<BtnEvent[]>([]);

  // Update "seconds ago" counter every second
  useEffect(() => {
    const id = setInterval(() => {
      setSensors(prev => {
        const now = Date.now();
        const update = (s: SensorData): SensorData =>
          s.timestamp
            ? { ...s, secondsAgo: Math.floor((now - new Date(s.timestamp + (s.timestamp.endsWith('Z') ? '' : 'Z')).getTime()) / 1000) }
            : s;
        return {
          fetal_hr:    update(prev.fetal_hr),
          maternal_hr: update(prev.maternal_hr),
          spo2:        update(prev.spo2),
          systolic_bp: update(prev.systolic_bp),
          toco:        update(prev.toco),
        };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // WebSocket calibration channel
  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE}/ws/calibration`);
    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        // Eventos del botón materno
        if (msg.type === 'button_event') {
          const now = Date.now();
          const ev = msg.data.event as string;
          if (ev === 'Boton_Presionado') {
            setBtnEvents(prev => [...prev, { startTime: now }]);
          } else if (ev === 'Boton_Soltado') {
            setBtnEvents(prev => {
              const copy = [...prev];
              for (let i = copy.length - 1; i >= 0; i--) {
                if (copy[i].endTime == null) { copy[i] = { ...copy[i], endTime: now }; break; }
              }
              return copy;
            });
          }
          return;
        }

        if (msg.type !== 'calibration') return;
        const d = msg.data;
        const ts = d.timestamp;
        const now = Date.now();
        setSensors(prev => {
          const next = { ...prev };
          if (d.sensor_type === 'FETAL_DOPPLER' && d.heart_rate != null)
            next.fetal_hr = { value: d.heart_rate, timestamp: ts, secondsAgo: 0 };
          if (d.sensor_type === 'SPO2') {
            if (d.spo2 != null)
              next.spo2 = { value: d.spo2, timestamp: ts, secondsAgo: 0 };
            if (d.heart_rate != null)
              next.maternal_hr = { value: d.heart_rate, timestamp: ts, secondsAgo: 0 };
          }
          if (d.sensor_type === 'BLOOD_PRESSURE' && d.systolic_bp != null)
            next.systolic_bp = { value: d.systolic_bp, timestamp: ts, secondsAgo: 0 };
          if (d.sensor_type === 'TOCODYNAMOMETER' && d.contraction_intensity != null)
            next.toco = { value: Math.round(d.contraction_intensity), timestamp: ts, secondsAgo: 0 };
          return next;
        });
        // Acumular para CTG
        if (d.sensor_type === 'FETAL_DOPPLER' && d.heart_rate != null)
          setFhrData(prev => [...prev, { t: now, v: d.heart_rate }].slice(-MAX_POINTS));
        if (d.sensor_type === 'TOCODYNAMOMETER' && d.contraction_intensity != null)
          setTocoData(prev => [...prev, { t: now, v: d.contraction_intensity }].slice(-MAX_POINTS));
      } catch { /* ignore parse errors */ }
    };
    return () => ws.close();
  }, []);

  const SensorCard: React.FC<{
    label: string; unit: string; sensor: SensorData; normalRange?: [number, number]; color?: string;
  }> = ({ label, unit, sensor, normalRange, color = '#3498DB' }) => {
    const isRecent = sensor.secondsAgo < 10;
    const isOutOfRange = normalRange && sensor.value != null &&
      (sensor.value < normalRange[0] || sensor.value > normalRange[1]);
    return (
      <div
        className={`bg-white rounded-xl shadow-sm p-4 border-l-4 transition-all ${isRecent ? 'opacity-100' : 'opacity-60'}`}
        style={{ borderLeftColor: isRecent ? color : '#e8e2d9' }}
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-medium" style={{ color: '#8e96a3' }}>{label}</span>
          <span className={`flex items-center gap-1 text-xs ${isRecent ? 'text-[#4d7d6c]' : 'text-[#8e96a3]'}`}>
            {isRecent ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {sensor.secondsAgo < 999 ? `${sensor.secondsAgo}s` : '–'}
          </span>
        </div>
        <div className={`text-3xl font-bold ${isOutOfRange ? 'text-[#c4848c]' : 'text-[#2e3440]'}`}>
          {sensor.value != null ? Math.round(sensor.value) : '–'}
          <span className="text-sm font-normal text-[#8e96a3] ml-1">{unit}</span>
        </div>
        {isOutOfRange && (
          <p className="text-xs text-[#c4848c] mt-1">Fuera de rango ({normalRange![0]}–{normalRange![1]})</p>
        )}
        {normalRange && !isOutOfRange && sensor.value != null && (
          <p className="text-xs text-[#8e96a3] mt-1">Rango: {normalRange[0]}–{normalRange[1]}</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: "#faf8f5" }}>
      {/* Navbar */}
      <nav style={{ background: "#ffffff", borderBottom: "1px solid #e8e2d9" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8" style={{ color: '#6a9e8a' }} />
              <div>
                <h1 className="text-lg font-bold" style={{ color: '#2e3440' }}>MOMI — Modo Técnico</h1>
                <p className="text-xs" style={{ color: '#8e96a3' }}>Calibración y diagnóstico de sensores</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`flex items-center gap-1.5 text-sm font-medium ${isConnected ? 'text-[#4d7d6c]' : 'text-[#c4848c]'}`}>
                {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                {isConnected ? 'Conectado' : 'Desconectado'}
              </span>
              <span className="text-sm hidden sm:block" style={{ color: '#8e96a3' }}>👤 {user?.full_name || user?.username}</span>
              <button
                onClick={logout}
                className="flex items-center px-3 py-2 transition-colors"
                style={{ color: '#8e96a3' }}
              >
                <LogOut className="w-4 h-4 mr-1" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info banner */}
        <div className="bg-[#f0edf9] border border-[#d4cef0] rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-2xl">⚙️</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#6b5fa0' }}>Modo Calibración / Técnico</p>
            <p className="text-xs mt-0.5" style={{ color: '#7c70b0' }}>
              Los datos se reciben en tiempo real <strong>sin guardar en la base de datos</strong>.
              No se requiere paciente ni sesión activa. Úsalo para verificar que cada nodo ESP32 envíe datos correctamente.
            </p>
          </div>
        </div>

        {/* CTG */}
        <div className="mb-6">
          <CTGChart externalFhrData={fhrData} externalTocoData={tocoData} externalButtonEvents={btnEvents} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sensor grid */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#8e96a3' }}>
                Módulo Estómago (ESP32 + Doppler + Toco)
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <SensorCard label="FCF (Doppler Fetal)" unit="BPM" sensor={sensors.fetal_hr}
                  normalRange={[110, 160]} color="#c4848c" />
                <SensorCard label="Toco (Presión uterina)" unit="u.a." sensor={sensors.toco}
                  color="#6a9e8a" />
              </div>
              <AudioControl />
            </div>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#8e96a3' }}>
                Módulo SpO₂ Materno
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <SensorCard label="SpO₂ Materno" unit="%" sensor={sensors.spo2}
                  normalRange={[95, 100]} color="#9b8ec4" />
                <SensorCard label="FC Materna" unit="BPM" sensor={sensors.maternal_hr}
                  normalRange={[60, 100]} color="#6a9e8a" />
              </div>
            </div>
          </div>

          {/* BP Panel */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#8e96a3' }}>
              Tensiómetro
            </h2>
            <BloodPressurePanel />
          </div>
        </div>
      </main>
    </div>
  );
};
