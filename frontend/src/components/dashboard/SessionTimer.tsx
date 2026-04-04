import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface SessionTimerProps {
  startTime: string;
  /** Duración máxima en minutos (opcional). Si se supera, el temporizador se vuelve rojo. */
  maxDurationMinutes?: number;
}

export const SessionTimer: React.FC<SessionTimerProps> = ({ startTime, maxDurationMinutes }) => {
  const [elapsed, setElapsed] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // SQLite devuelve fechas sin 'Z' → el browser las interpreta como hora local
    // y el cálculo queda incorrecto. Forzar interpretación UTC añadiendo 'Z'.
    const utcString = startTime.endsWith('Z') || startTime.includes('+')
      ? startTime
      : startTime + 'Z';
    const start = new Date(utcString).getTime();
    const tick = () => {
      const diff = Math.floor((Date.now() - start) / 1000);
      setElapsed(diff < 0 ? 0 : diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  const overMax = maxDurationMinutes != null && elapsed >= maxDurationMinutes * 60;
  const pct = maxDurationMinutes
    ? Math.min((elapsed / (maxDurationMinutes * 60)) * 100, 100)
    : null;

  // Color de la barra de progreso según porcentaje
  const barColor = overMax
    ? 'bg-red-500'
    : pct != null && pct > 75
    ? 'bg-yellow-400'
    : 'bg-green-500';

  return (
    <div className="mt-3 pt-3 border-t border-green-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Clock size={13} className="text-green-600" />
          <span className="text-xs font-medium text-green-700">Duración de sesión</span>
        </div>
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="text-xs text-green-400 hover:text-green-700 transition-colors"
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      {visible && (
        <>
          {/* Tiempo HH:MM:SS */}
          <p
            className={`text-center text-2xl font-mono font-bold leading-tight tracking-widest ${
              overMax ? 'text-red-600 animate-pulse' : 'text-green-700'
            }`}
          >
            {pad(h)}:{pad(m)}:{pad(s)}
          </p>

          {overMax && (
            <p className="text-center text-xs text-red-500 mt-0.5 font-medium">
              ⚠ Tiempo máximo superado
            </p>
          )}

          {/* Barra de progreso (solo si hay duración máxima) */}
          {pct !== null && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                <span>0 min</span>
                <span>{maxDurationMinutes} min</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  style={{ width: `${pct}%` }}
                  className={`h-2 rounded-full transition-all duration-1000 ${barColor}`}
                />
              </div>
              <p className="text-right text-xs text-gray-400 mt-0.5">
                {Math.round(pct)}%
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
