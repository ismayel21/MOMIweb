import React, { useState, useEffect } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer,
} from 'recharts';
import { useWebSocket } from '@/contexts/WebSocketContext';

// ── Colores (mismo esquema que monitor_estomago.py) ──────────────────────────
const FHR_COLOR  = '#E74C3C'; // rojo
const TOCO_COLOR = '#3498DB'; // azul
const BTN_COLOR  = '#F39C12'; // ámbar

const WINDOW_MS  = 180_000; // ventana de 3 minutos (como tira CTG)
const MAX_POINTS = 3000;    // máximo de puntos en memoria

interface DataPoint {
  t: number;        // timestamp ms
  v: number | null;
}

// ── Formateador de eje X ─────────────────────────────────────────────────────
const tickFmt = (t: number) => new Date(t).toLocaleTimeString();

// ── Panel individual ─────────────────────────────────────────────────────────
interface PanelProps {
  data: { t: number; v: number | null }[];
  dataKey: string;
  color: string;
  domain: [number | 'auto', number | 'auto'];
  yLabel: string;
  height: number;
  windowStart: number;
  windowEnd: number;
  tooltipSuffix: string;
  topMargin?: number;
  bottomMargin?: number;
  hideXAxis?: boolean;
  buttonEvents?: BtnEvent[];
}

// Ticks del eje Y para FCF (cada 10 BPM, marcas gruesas cada 30)
const FCF_TICKS = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210];
// Ticks del eje Y para Toco (cada 10 unidades)
const TOCO_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

const CTGPanel: React.FC<PanelProps> = ({
  data, dataKey, color, domain, yLabel, height,
  windowStart, windowEnd, tooltipSuffix,
  topMargin = 5, bottomMargin = 5, hideXAxis = false,
  buttonEvents = [],
}) => {
  const isFCF = domain[0] === 50;
  const yTicks = isFCF ? FCF_TICKS : TOCO_TICKS;

  return (
  <ResponsiveContainer width="100%" height={height}>
    <ComposedChart
      data={data}
      margin={{ top: topMargin, right: 8, bottom: bottomMargin, left: 0 }}
    >
      {/* Líneas menores (cada tick) */}
      <CartesianGrid
        strokeDasharray=""
        stroke="#e8e2d9"
        strokeWidth={0.5}
        vertical={true}
        horizontal={true}
      />
      <XAxis
        dataKey="t"
        type="number"
        scale="time"
        domain={[windowStart, windowEnd]}
        tickFormatter={tickFmt}
        stroke="#aaa"
        tick={hideXAxis ? false : { fontSize: 9 }}
        tickLine={!hideXAxis}
        axisLine={!hideXAxis}
        interval={9}  // ~1 tick cada 10 segundos aprox
      />
      <YAxis
        domain={domain}
        ticks={yTicks}
        stroke="#aaa"
        tick={{ fontSize: 9 }}
        width={38}
        label={{
          value: yLabel,
          angle: -90,
          position: 'insideLeft',
          style: { fontSize: 10, fill: color },
        }}
      />
      <Tooltip
        labelFormatter={tickFmt}
        formatter={(v: unknown) => {
          const num = typeof v === 'number' ? v : null;
          return num != null ? [`${num} ${tooltipSuffix}`, dataKey === 'v' ? yLabel : dataKey] : ['—', yLabel];
        }}
      />

      {/* Eventos de botón materno */}
      {buttonEvents.map((evt, i) => (
        <React.Fragment key={i}>
          {/* Área sombreada entre presión y suelta */}
          {evt.endTime != null && (
            <ReferenceArea
              x1={Math.max(evt.startTime, windowStart)}
              x2={Math.min(evt.endTime, windowEnd)}
              fill={BTN_COLOR}
              fillOpacity={0.15}
              label={{
                value: 'Botón Materno',
                position: 'insideTop',
                style: { fontSize: 9, fill: BTN_COLOR },
              }}
            />
          )}
          {/* Línea sólida: inicio de pulsación */}
          <ReferenceLine
            x={evt.startTime}
            stroke={BTN_COLOR}
            strokeWidth={2}
          />
          {/* Línea discontinua: fin de pulsación */}
          {evt.endTime != null && (
            <ReferenceLine
              x={evt.endTime}
              stroke={BTN_COLOR}
              strokeWidth={2}
              strokeDasharray="6 3"
            />
          )}
        </React.Fragment>
      ))}

      <Line
        type="linear"
        dataKey="v"
        stroke={color}
        strokeWidth={1.5}
        dot={false}
        isAnimationActive={false}
        connectNulls={false}
      />
    </ComposedChart>
  </ResponsiveContainer>
  );
};

export interface BtnEvent {
  startTime: number;
  endTime?: number;
}

interface CTGChartProps {
  /** Si se proveen, se usan en lugar del WebSocket de sesión (modo calibración) */
  externalFhrData?:      DataPoint[];
  externalTocoData?:     DataPoint[];
  externalButtonEvents?: BtnEvent[];
}

// ── CTGChart principal ───────────────────────────────────────────────────────
export const CTGChart: React.FC<CTGChartProps> = ({
  externalFhrData, externalTocoData, externalButtonEvents,
}) => {
  const { latestReading, latestButtonEvent } = useWebSocket();

  const [internalFhr,      setInternalFhr]      = useState<DataPoint[]>([]);
  const [internalToco,     setInternalToco]     = useState<DataPoint[]>([]);
  const [internalBtnEvents, setInternalBtnEvents] = useState<BtnEvent[]>([]);

  // Acumular lecturas FCF desde WS de sesión (solo si no hay datos externos)
  useEffect(() => {
    if (externalFhrData != null) return;
    if (
      latestReading?.sensor_type === 'FETAL_DOPPLER' &&
      latestReading.heart_rate != null
    ) {
      const t = Date.now();
      setInternalFhr(prev => [...prev, { t, v: latestReading.heart_rate! }].slice(-MAX_POINTS));
    }
  }, [latestReading, externalFhrData]);

  // Acumular lecturas Toco desde WS de sesión (solo si no hay datos externos)
  useEffect(() => {
    if (externalTocoData != null) return;
    if (
      latestReading?.sensor_type === 'TOCODYNAMOMETER' &&
      latestReading.contraction_intensity != null
    ) {
      const t = Date.now();
      setInternalToco(prev => [...prev, { t, v: latestReading.contraction_intensity! }].slice(-MAX_POINTS));
    }
  }, [latestReading, externalTocoData]);

  // Gestionar botón materno desde WS de sesión (solo si no hay datos externos)
  useEffect(() => {
    if (externalButtonEvents != null) return;
    if (!latestButtonEvent) return;
    const now = Date.now();
    if (latestButtonEvent.event === 'Boton_Presionado') {
      setInternalBtnEvents(prev => [...prev, { startTime: now }]);
    } else if (latestButtonEvent.event === 'Boton_Soltado') {
      setInternalBtnEvents(prev => {
        const copy = [...prev];
        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].endTime == null) {
            copy[i] = { ...copy[i], endTime: now };
            break;
          }
        }
        return copy;
      });
    }
  }, [latestButtonEvent, externalButtonEvents]);

  const fhrData  = externalFhrData      ?? internalFhr;
  const tocoData = externalTocoData     ?? internalToco;
  const btnEvents = externalButtonEvents ?? internalBtnEvents;

  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Filtrar ventana visible
  const fhrVisible  = fhrData.filter(d => d.t >= windowStart);
  const tocoVisible = tocoData.filter(d => d.t >= windowStart);
  const evtVisible  = btnEvents.filter(
    e => e.startTime >= windowStart || (e.endTime != null && e.endTime >= windowStart),
  );

  const isEmpty = fhrVisible.length === 0 && tocoVisible.length === 0;

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-[#e8e2d9]">
      <h2 className="text-xl font-bold mb-1" style={{ color: '#2e3440' }}>Cardiotocografía (CTG)</h2>
      <p className="text-xs mb-4" style={{ color: '#8e96a3' }}>Ventana: últimos 3 minutos</p>

      {isEmpty ? (
        <div className="flex items-center justify-center h-40 text-sm" style={{ color: '#8e96a3' }}>
          Sin datos — esperando señal del sensor…
        </div>
      ) : (
        /* Dos paneles pegados, sin separación de título entre ellos */
        <div>
          {/* Panel superior — FCF */}
          <CTGPanel
            data={fhrVisible}
            dataKey="FCF"
            color={FHR_COLOR}
            domain={[50, 210]}
            yLabel="FCF (bpm)"
            height={200}
            windowStart={windowStart}
            windowEnd={now}
            tooltipSuffix="bpm"
            topMargin={5}
            bottomMargin={0}
            hideXAxis
          />

          {/* Panel inferior — Toco + botón materno */}
          <CTGPanel
            data={tocoVisible}
            dataKey="Toco"
            color={TOCO_COLOR}
            domain={['auto', 'auto']}
            yLabel="Toco"
            height={150}
            windowStart={windowStart}
            windowEnd={now}
            tooltipSuffix=""
            topMargin={0}
            bottomMargin={5}
            buttonEvents={evtVisible}
          />
        </div>
      )}

      {/* Leyenda de botón materno */}
      {evtVisible.length > 0 && (
        <div className="flex items-center gap-4 mt-2 text-xs text-[#8e96a3]">
          <span className="flex items-center gap-1">
            <span
              style={{ display: 'inline-block', width: 16, height: 2, background: BTN_COLOR }}
            />
            Inicio pulsación
          </span>
          <span className="flex items-center gap-1">
            <span
              style={{
                display: 'inline-block', width: 16, height: 2,
                background: BTN_COLOR, borderTop: `2px dashed ${BTN_COLOR}`,
              }}
            />
            Fin pulsación
          </span>
          <span className="flex items-center gap-1">
            <span
              style={{
                display: 'inline-block', width: 16, height: 10,
                background: BTN_COLOR, opacity: 0.2,
              }}
            />
            Duración
          </span>
        </div>
      )}
    </div>
  );
};
