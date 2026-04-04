import React, { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { bpAPI } from '@/api/bp';
import { useWebSocket } from '@/contexts/WebSocketContext';

type Phase = 'idle' | 'calibrating' | 'inflating' | 'measuring' | 'completed' | 'error';

interface BPResult {
  sistolica: number;
  diastolica: number;
  media: number;
  frecuencia_cardiaca: number;
  interpretacion: string;
  time: string;
}

const PHASE_STEPS: { key: Phase; label: string }[] = [
  { key: 'calibrating', label: 'Calibrando' },
  { key: 'inflating',   label: 'Inflando'   },
  { key: 'measuring',   label: 'Midiendo'   },
  { key: 'completed',   label: 'Resultado'  },
];

const INTERPRETATION_COLORS: Record<string, string> = {
  NORMAL:               'bg-green-100 text-green-800 border-green-300',
  ELEVADA:              'bg-yellow-100 text-yellow-800 border-yellow-300',
  HIPERTENSION_GRADO_1: 'bg-orange-100 text-orange-800 border-orange-300',
  HIPERTENSION_GRADO_2: 'bg-red-100 text-red-800 border-red-300',
  CRISIS_HIPERTENSIVA:  'bg-red-200 text-red-900 border-red-400',
};

const INTERPRETATION_LABELS: Record<string, string> = {
  NORMAL:               'Normal',
  ELEVADA:              'Elevada',
  HIPERTENSION_GRADO_1: 'Hipertensión Grado 1',
  HIPERTENSION_GRADO_2: 'Hipertensión Grado 2',
  CRISIS_HIPERTENSIVA:  'Crisis Hipertensiva',
};

function estadoToPhase(estado: string): Phase | null {
  if (estado === 'medicion_iniciada' || estado === 'test_preinflado') return 'calibrating';
  if (estado === 'inflando')          return 'inflating';
  if (estado === 'midiendo')          return 'measuring';
  if (estado === 'medicion_completada') return 'completed';
  if (estado === 'detenido')          return 'idle';
  if (estado === 'emergencia_activada' || estado === 'error_datos_insuficientes') return 'error';
  return null;
}

// ── Gauge animado ─────────────────────────────────────────────────────────────
const PressureGauge: React.FC<{ phase: Phase }> = ({ phase }) => {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (phase === 'calibrating') { setLevel(15); return; }
    if (phase === 'completed')   { setLevel(0);  return; }
    if (phase === 'inflating') {
      const id = setInterval(() => setLevel(p => p < 95 ? p + 2 : p), 200);
      return () => clearInterval(id);
    }
    if (phase === 'measuring') {
      const id = setInterval(() => setLevel(p => p > 5 ? p - 1 : p), 300);
      return () => clearInterval(id);
    }
    setLevel(0);
  }, [phase]);

  const color = level > 70 ? '#c4848c' : level > 40 ? '#9b8ec4' : '#6a9e8a';
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-[#8e96a3]">Brazalete</span>
      <div className="relative w-10 h-32 bg-[#f4f1ec] rounded-full border border-[#e8e2d9] overflow-hidden flex flex-col justify-end">
        <div
          className="w-full transition-all duration-300 rounded-full"
          style={{ height: `${level}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono" style={{ color: '#5a6272' }}>
        {phase === 'calibrating' ? 'Cal...' : `~${Math.round(level * 1.6)} mmHg`}
      </span>
    </div>
  );
};

// ── Panel principal ───────────────────────────────────────────────────────────
export const BloodPressurePanel: React.FC = () => {
  const { isConnected: hasActiveSession } = useWebSocket();
  const [phase, setPhase]           = useState<Phase>('idle');
  const [lastResult, setLastResult] = useState<BPResult | null>(null);
  const [history, setHistory]       = useState<BPResult[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Polling REST — no depende del WebSocket ─────────────────────────────
  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const { data: s } = await bpAPI.getStatus();
        const newPhase = estadoToPhase(s.estado ?? '');
        if (newPhase) setPhase(newPhase);

        if (s.estado === 'medicion_completada') {
          try {
            const { data: r } = await bpAPI.getLast();
            const result: BPResult = {
              sistolica:           r.sistolica,
              diastolica:          r.diastolica,
              media:               r.media ?? 0,
              frecuencia_cardiaca: r.frecuencia_cardiaca ?? 0,
              interpretacion:      r.interpretacion ?? '',
              time: new Date(r.timestamp).toLocaleTimeString('es-BO'),
            };
            setLastResult(result);
            setHistory(prev => [...prev.slice(-4), result]);
            setPhase('completed');
          } catch { /* sin resultado aún */ }
          stopPolling();
        }

        if (['detenido', 'emergencia_activada', 'error_datos_insuficientes'].includes(s.estado)) {
          stopPolling();
        }
      } catch { /* red no disponible, ignorar */ }
    }, 1500);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  // ── Mutations ──────────────────────────────────────────────────────────
  const startMutation = useMutation({
    mutationFn: bpAPI.start,
    onSuccess: (res: any) => {
      const data = res?.data ?? res;
      if (data?.status === 'offline') {
        setPhase('error');
        return;
      }
      setPhase('calibrating');
      startPolling();
    },
    onError: () => setPhase('error'),
  });

  const stopMutation = useMutation({
    mutationFn: bpAPI.stop,
    onSuccess: () => {
      setPhase('idle');
      stopPolling();
    },
    onError: () => { setPhase('idle'); stopPolling(); },
  });

  const isMeasuring    = phase === 'calibrating' || phase === 'inflating' || phase === 'measuring';
  const currentStepIdx = PHASE_STEPS.findIndex(s => s.key === phase);

  const historyChartData = history.map((r, i) => ({
    name: `M${i + 1}`,
    sistolica:  r.sistolica,
    diastolica: r.diastolica,
  }));

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-[#e8e2d9]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5" style={{ color: '#6a9e8a' }} />
          <h2 className="text-xl font-bold" style={{ color: '#2e3440' }}>Presión Arterial</h2>
        </div>
        {phase === 'error' && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ color: '#c4848c', background: '#f9eced' }}>
            Estación no conectada
          </span>
        )}
      </div>

      {/* Pasos de proceso */}
      <div className="flex items-center mb-4">
        {PHASE_STEPS.map((step, idx) => {
          const isActive = step.key === phase;
          const isDone   = currentStepIdx > idx && phase !== 'idle' && phase !== 'error';
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${isActive ? 'animate-pulse text-white'
                  : isDone   ? 'text-white'
                             : 'text-[#8e96a3]'}`}
                  style={{
                    background: isActive ? '#6a9e8a' : isDone ? '#4d7d6c' : '#f0ebe3',
                  }}
                >
                  {isDone ? '✓' : idx + 1}
                </div>
                <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : ''}`}
                  style={{ color: isActive ? '#4d7d6c' : '#8e96a3' }}>
                  {step.label}
                </span>
              </div>
              {idx < PHASE_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-4 transition-all`}
                  style={{ background: isDone ? '#6a9e8a' : '#e8e2d9' }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Contenido principal */}
      <div className="flex gap-4 items-start mb-4">
        {isMeasuring && <PressureGauge phase={phase} />}

        <div className="flex-1">
          {(phase === 'idle' || phase === 'error') && (
            <p className="text-sm mt-2" style={{ color: '#8e96a3' }}>
              {hasActiveSession
                ? <>Coloque el brazalete en el brazo y presione <strong>Iniciar medición</strong>.</>
                : 'Inicie un monitoreo para habilitar la medición de presión arterial.'}
            </p>
          )}
          {isMeasuring && (
            <div className="space-y-2 mt-1">
              <p className="text-sm font-medium animate-pulse" style={{ color: '#4d7d6c' }}>
                {phase === 'calibrating' && '⚙️ Calibrando sensor...'}
                {phase === 'inflating'   && '⬆️ Inflando brazalete...'}
                {phase === 'measuring'   && '📉 Desinflando y tomando datos...'}
              </p>
              <p className="text-xs" style={{ color: '#8e96a3' }}>No mueva el brazo durante la medición</p>
            </div>
          )}
          {phase === 'completed' && lastResult && (
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold" style={{ color: '#2e3440' }}>{lastResult.sistolica}</span>
                <span className="text-2xl" style={{ color: '#8e96a3' }}>/</span>
                <span className="text-2xl font-semibold" style={{ color: '#5a6272' }}>{lastResult.diastolica}</span>
                <span className="text-sm ml-1" style={{ color: '#8e96a3' }}>mmHg</span>
              </div>
              {lastResult.frecuencia_cardiaca > 0 && (
                <p className="text-sm mb-2" style={{ color: '#8e96a3' }}>FC: {lastResult.frecuencia_cardiaca} BPM</p>
              )}
              <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded border ${
                INTERPRETATION_COLORS[lastResult.interpretacion] ?? 'bg-[#f4f1ec] text-[#5a6272] border-[#e8e2d9]'
              }`}>
                {INTERPRETATION_LABELS[lastResult.interpretacion] ?? lastResult.interpretacion}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-3 mb-4">
        <button
          type="button"
          onClick={() => startMutation.mutate()}
          disabled={isMeasuring || startMutation.isPending || !hasActiveSession}
          className="flex-1 py-2.5 text-white text-sm font-semibold rounded-lg
                     transition-colors
                     disabled:bg-[#e8e2d9] disabled:text-[#8e96a3] disabled:cursor-not-allowed"
          style={{ background: '#6a9e8a' }}
        >
          {startMutation.isPending ? 'Enviando...' : '▶ Iniciar medición'}
        </button>
        {isMeasuring && (
          <button
            type="button"
            onClick={() => stopMutation.mutate()}
            disabled={stopMutation.isPending}
            className="px-4 py-2.5 text-white text-sm font-semibold rounded-lg
                       transition-colors
                       disabled:bg-[#e8e2d9] disabled:text-[#8e96a3] disabled:cursor-not-allowed"
            style={{ background: '#c4848c' }}
          >
            ⏹ Detener
          </button>
        )}
      </div>

      {/* Historial */}
      {history.length > 1 && (
        <div>
          <p className="text-xs mb-2" style={{ color: '#8e96a3' }}>Últimas mediciones</p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={historyChartData} margin={{ top: 0, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[40, 200]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number, name: string) =>
                [`${v} mmHg`, name === 'sistolica' ? 'Sistólica' : 'Diastólica']} />
              <ReferenceLine y={140} stroke="#c4848c" strokeDasharray="4 2" strokeWidth={1} />
              <ReferenceLine y={90}  stroke="#9b8ec4" strokeDasharray="4 2" strokeWidth={1} />
              <Bar dataKey="sistolica"  fill="#c4848c" opacity={0.8} radius={[3, 3, 0, 0]} />
              <Bar dataKey="diastolica" fill="#6a9e8a" opacity={0.8} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-1 text-xs text-[#8e96a3]">
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 inline-block bg-[#c4848c] rounded" /> Sistólica
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 inline-block bg-[#6a9e8a] rounded" /> Diastólica
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
