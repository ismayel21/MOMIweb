import React from 'react';
import { Brain, TrendingDown, TrendingUp, Minus, ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';
import { useWebSocket } from '@/contexts/WebSocketContext';

// ─── Mapas de estilo según clasificación IA ──────────────────────────────────

const CLASS_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}> = {
  normal: {
    label: 'Normal',
    color: '#4d7d6c',
    bg: '#e8f2ee',
    border: '#c5ddd3',
    icon: <ShieldCheck className="w-5 h-5" style={{ color: '#4d7d6c' }} />,
  },
  pre_hipoxemia: {
    label: 'Pre-hipoxemia',
    color: '#b8860b',
    bg: '#fef9e7',
    border: '#f0dfa0',
    icon: <AlertTriangle className="w-5 h-5" style={{ color: '#b8860b' }} />,
  },
  hipoxemia: {
    label: 'Hipoxemia',
    color: '#c4424b',
    bg: '#fdf0f0',
    border: '#f0c4c7',
    icon: <AlertOctagon className="w-5 h-5" style={{ color: '#c4424b' }} />,
  },
  unknown: {
    label: 'Esperando datos...',
    color: '#8e96a3',
    bg: '#f4f1ec',
    border: '#e8e2d9',
    icon: <Brain className="w-5 h-5" style={{ color: '#8e96a3' }} />,
  },
};

const TREND_ICON: Record<string, React.ReactNode> = {
  stable:     <Minus className="w-4 h-4" style={{ color: '#4d7d6c' }} />,
  descending: <TrendingDown className="w-4 h-4" style={{ color: '#b8860b' }} />,
  critical:   <TrendingDown className="w-4 h-4" style={{ color: '#c4424b' }} />,
};

const TREND_LABEL: Record<string, string> = {
  stable:     'Estable',
  descending: 'Descendente',
  critical:   'Caida critica',
};

const RISK_LABEL: Record<string, string> = {
  low:    'Bajo',
  medium: 'Medio',
  high:   'Alto',
};

// ─── Componente ──────────────────────────────────────────────────────────────

export const AICard: React.FC = () => {
  const { latestAIPrediction } = useWebSocket();

  const pred = latestAIPrediction;
  const cls = pred?.class ?? 'unknown';
  const cfg = CLASS_CONFIG[cls] ?? CLASS_CONFIG.unknown;

  return (
    <div
      className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
      style={{ border: `1.5px solid ${cfg.border}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5" style={{ color: '#9b8ec4' }} />
          <h3 className="text-lg font-semibold" style={{ color: '#5a6272' }}>
            IA Hipoxemia
          </h3>
        </div>
        {cfg.icon}
      </div>

      {/* Clasificacion principal */}
      <div
        className="rounded-lg px-4 py-3 mb-4"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
          {pred && pred.confidence > 0 && (
            <span className="text-sm font-medium" style={{ color: cfg.color }}>
              {Math.round(pred.confidence * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* Detalles */}
      {pred && cls !== 'unknown' && (
        <div className="space-y-3">
          {/* SpO2 actual */}
          {pred.spo2_current != null && (
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: '#8e96a3' }}>SpO&#8322; actual</span>
              <span className="font-semibold" style={{ color: '#2e3440' }}>
                {pred.spo2_current}%
              </span>
            </div>
          )}

          {/* FC materna */}
          {pred.hr_current != null && (
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: '#8e96a3' }}>FC Materna</span>
              <span className="font-semibold" style={{ color: '#2e3440' }}>
                {pred.hr_current} bpm
              </span>
            </div>
          )}

          {/* Tendencia SpO2 */}
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: '#8e96a3' }}>Tendencia SpO&#8322;</span>
            <span className="flex items-center gap-1 font-medium" style={{ color: '#2e3440' }}>
              {TREND_ICON[pred.spo2_trend] ?? null}
              {TREND_LABEL[pred.spo2_trend] ?? pred.spo2_trend}
            </span>
          </div>

          {/* Nivel de riesgo */}
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: '#8e96a3' }}>Riesgo</span>
            <span className="font-semibold" style={{ color: cfg.color }}>
              {RISK_LABEL[pred.risk_level] ?? pred.risk_level}
            </span>
          </div>

          {/* Buffer */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1" style={{ color: '#8e96a3' }}>
              <span>Buffer IA</span>
              <span>{Math.round(pred.buffer_fullness * 100)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full" style={{ background: '#f0ebe3' }}>
              <div
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.round(pred.buffer_fullness * 100)}%`,
                  background: cfg.color,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sin datos */}
      {(!pred || cls === 'unknown') && (
        <p className="text-sm" style={{ color: '#8e96a3' }}>
          El predictor necesita al menos 8 muestras de SpO&#8322; para comenzar el analisis.
        </p>
      )}
    </div>
  );
};
