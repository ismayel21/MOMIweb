import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import { format } from 'date-fns';
import {
  ArrowLeft, Printer, Calendar, User, Clock,
  Activity, ChevronRight, Filter, FileText,
} from 'lucide-react';
import { patientsAPI } from '@/api/patients';
import { sessionsAPI } from '@/api/sessions';
import { readingsAPI } from '@/api/readings';
import { eventsAPI } from '@/api/events';
import type { MonitoringSession } from '@/types/session';
import type { SensorReading } from '@/types/reading';
import { SensorType } from '@/types/reading';
import type { Patient } from '@/types/patient';
import type { SessionEvent } from '@/types/event';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const avg = (nums: number[]): number | null =>
  nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;

const formatDuration = (minutes?: number): string => {
  if (minutes == null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
};

const fmtDateTime = (iso: string) => format(new Date(iso), 'dd/MM/yyyy HH:mm');
const fmtTime = (iso: string) => format(new Date(iso), 'HH:mm:ss');

// ─── SessionDetail ─────────────────────────────────────────────────────────────

interface SessionDetailProps {
  session: MonitoringSession;
  patient?: Patient;
  readings: SensorReading[];
  events: SessionEvent[];
  isLoading: boolean;
}

const BTN_COLOR = '#F39C12';

const SessionDetail: React.FC<SessionDetailProps> = ({
  session, patient, readings, events, isLoading,
}) => {
  // Lecturas por tipo
  const fhrR  = readings.filter(r => r.sensor_type === SensorType.FETAL_DOPPLER && r.heart_rate);
  const spo2R = readings.filter(r => r.sensor_type === SensorType.SPO2 && r.spo2);
  const hrR   = readings.filter(r => r.sensor_type === SensorType.SPO2 && r.heart_rate);
  const bpR   = readings.filter(r => r.sensor_type === SensorType.BLOOD_PRESSURE && r.systolic_bp);

  // Promedios
  const avgFHR  = avg(fhrR.map(r => r.heart_rate!));
  const avgSpO2 = avg(spo2R.map(r => r.spo2!));
  const avgHR   = avg(hrR.map(r => r.heart_rate!));
  const avgSys  = avg(bpR.map(r => r.systolic_bp!));
  const avgDia  = avg(bpR.map(r => r.diastolic_bp).filter((v): v is number => v != null));

  // Datos para gráficos (últimas 60 muestras de cada tipo)
  const fhrChart = fhrR.slice(-60).map(r => ({ t: fmtTime(r.timestamp), FCF: r.heart_rate }));
  const spo2Chart = spo2R.slice(-60).map(r => ({ t: fmtTime(r.timestamp), SpO2: r.spo2, FCM: r.heart_rate }));
  const bpChart = bpR.slice(-30).map(r => ({
    t: fmtTime(r.timestamp),
    Sistólica: r.systolic_bp,
    Diastólica: r.diastolic_bp,
  }));

  const hasCharts = fhrChart.length > 0 || spo2Chart.length > 0 || bpChart.length > 0;

  // ── CTG: todos los puntos de la sesión, para gráfico scrolleable ──────────
  const tocoR = readings.filter(r => r.sensor_type === SensorType.TOCODYNAMOMETER && r.contraction_intensity != null);

  // Ancho dinámico: 3px por punto, mínimo 600px
  const ctgWidth = Math.max(600, Math.max(fhrR.length, tocoR.length) * 3);
  const hasCTG   = fhrR.length > 0 || tocoR.length > 0;

  // Parear eventos de botón (PRESS + RELEASE) para dibujar áreas en el CTG
  interface BtnPair { startTime: string; endTime?: string; }
  const btnPairs: BtnPair[] = [];
  let currentPress: string | null = null;
  for (const ev of events) {
    if (ev.event_type === 'BUTTON_PRESS') {
      currentPress = ev.timestamp;
    } else if (ev.event_type === 'BUTTON_RELEASE' && currentPress) {
      btnPairs.push({ startTime: currentPress, endTime: ev.timestamp });
      currentPress = null;
    }
  }
  // Pulsación sin soltar aún
  if (currentPress) btnPairs.push({ startTime: currentPress });

  return (
    <div>
      {/* ── Cabecera solo para impresión ── */}
      <div className="hidden print:block mb-6 pb-4 border-b-2 border-[#6a9e8a]">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#6a9e8a' }}>MOMI — Reporte de Sesión</h1>
            <p className="text-sm" style={{ color: '#8e96a3' }}>Sistema de Monitoreo Materno Inteligente</p>
          </div>
          <div className="text-right text-sm" style={{ color: '#8e96a3' }}>
            <p>Impreso: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          </div>
        </div>
      </div>

      {/* ── Header con botón imprimir (solo pantalla) ── */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: '#2e3440' }}>
          <FileText size={18} style={{ color: '#6a9e8a' }} />
          Sesión #{session.id}
        </h3>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 px-3 py-2 text-white
                     rounded-lg text-sm transition-colors"
          style={{ background: '#6a9e8a' }}
        >
          <Printer size={14} />
          Imprimir
        </button>
      </div>

      {/* ── Datos de la paciente ── */}
      {patient && (
        <div className="bg-[#e8f2ee] border border-[#b8d9ce] rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <User size={15} style={{ color: '#4d7d6c' }} />
            <span className="font-semibold text-sm" style={{ color: '#4d7d6c' }}>Paciente</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div>
              <span style={{ color: '#8e96a3' }}>Nombre: </span>
              <span className="font-medium" style={{ color: '#2e3440' }}>{patient.first_name} {patient.last_name}</span>
            </div>
            <div>
              <span style={{ color: '#8e96a3' }}>N° HC: </span>
              <span className="font-medium" style={{ color: '#2e3440' }}>{patient.medical_record_number ?? '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Resumen de sesión ── */}
      <div className="bg-[#f4f1ec] rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={15} style={{ color: '#5a6272' }} />
          <span className="font-semibold text-sm" style={{ color: '#5a6272' }}>Resumen</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div><span style={{ color: '#8e96a3' }}>Inicio: </span><span className="font-medium" style={{ color: '#2e3440' }}>{fmtDateTime(session.start_time)}</span></div>
          <div><span style={{ color: '#8e96a3' }}>Fin: </span><span className="font-medium" style={{ color: '#2e3440' }}>{session.end_time ? fmtDateTime(session.end_time) : '—'}</span></div>
          <div><span style={{ color: '#8e96a3' }}>Duración: </span><span className="font-medium" style={{ color: '#2e3440' }}>{formatDuration(session.duration_minutes)}</span></div>
          <div><span style={{ color: '#8e96a3' }}>Total lecturas: </span><span className="font-medium" style={{ color: '#2e3440' }}>{readings.length}</span></div>
        </div>
        {session.notes && (
          <p className="text-sm italic mt-2" style={{ color: '#8e96a3' }}>"{session.notes}"</p>
        )}
      </div>

      {/* ── Tabla de promedios ── */}
      {isLoading ? (
        <div className="animate-pulse bg-[#f4f1ec] rounded-xl h-36 mb-4" />
      ) : (
        <div className="bg-white border border-[#e8e2d9] rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={15} style={{ color: '#6a9e8a' }} />
            <span className="font-semibold text-sm" style={{ color: '#5a6272' }}>Promedios de signos vitales</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f0ebe3]" style={{ color: '#8e96a3' }}>
                <th className="text-left py-1 font-normal">Parámetro</th>
                <th className="text-center py-1 font-normal">Promedio</th>
                <th className="text-center py-1 font-normal">Lecturas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f4f1ec]">
              <tr>
                <td className="py-1.5" style={{ color: '#5a6272' }}>SpO₂ Materna</td>
                <td className="text-center font-medium" style={{ color: '#2e3440' }}>{avgSpO2 != null ? `${avgSpO2} %` : '—'}</td>
                <td className="text-center text-[#8e96a3]">{spo2R.length}</td>
              </tr>
              <tr>
                <td className="py-1.5" style={{ color: '#5a6272' }}>FC Materna</td>
                <td className="text-center font-medium" style={{ color: '#2e3440' }}>{avgHR != null ? `${avgHR} bpm` : '—'}</td>
                <td className="text-center text-[#8e96a3]">{hrR.length}</td>
              </tr>
              <tr>
                <td className="py-1.5" style={{ color: '#5a6272' }}>Presión Arterial</td>
                <td className="text-center font-medium" style={{ color: '#2e3440' }}>
                  {avgSys != null ? `${avgSys}/${avgDia ?? '?'} mmHg` : '—'}
                </td>
                <td className="text-center text-[#8e96a3]">{bpR.length}</td>
              </tr>
              <tr>
                <td className="py-1.5" style={{ color: '#5a6272' }}>FC Fetal (Doppler)</td>
                <td className="text-center font-medium" style={{ color: '#2e3440' }}>{avgFHR != null ? `${avgFHR} bpm` : '—'}</td>
                <td className="text-center text-[#8e96a3]">{fhrR.length}</td>
              </tr>
              <tr>
                <td className="py-1.5" style={{ color: '#5a6272' }}>Contracciones detectadas</td>
                <td className="text-center font-medium" style={{ color: '#2e3440' }}>{tocoR.length > 0 ? tocoR.length : '—'}</td>
                <td className="text-center text-[#8e96a3]">{tocoR.length}</td>
              </tr>
              <tr>
                <td className="py-1.5" style={{ color: '#5a6272' }}>Percepción materna (botón)</td>
                <td className="text-center font-medium" style={{ color: '#2e3440' }}>
                  {btnPairs.length > 0
                    ? `${btnPairs.length} pulsación${btnPairs.length !== 1 ? 'es' : ''}`
                    : '—'}
                </td>
                <td className="text-center text-[#8e96a3]">{btnPairs.length}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Gráficos interactivos (ocultos al imprimir) ── */}
      {!isLoading && hasCharts && (
        <div className="space-y-4 print:hidden">
          {fhrChart.length > 0 && (
            <div className="bg-white border border-[#e8e2d9] rounded-xl p-4">
              <p className="text-sm font-semibold mb-3" style={{ color: '#5a6272' }}>FC Fetal — bpm</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={fhrChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe3" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis domain={[60, 220]} tick={{ fontSize: 10 }} width={30} />
                  <Tooltip />
                  <Line type="monotone" dataKey="FCF" stroke="#6a9e8a" dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {spo2Chart.length > 0 && (
            <div className="bg-white border border-[#e8e2d9] rounded-xl p-4">
              <p className="text-sm font-semibold mb-3" style={{ color: '#5a6272' }}>SpO₂ y FC Materna</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={spo2Chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe3" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} width={30} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="SpO2" stroke="#6a9e8a" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="FCM" stroke="#9b8ec4" dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {bpChart.length > 0 && (
            <div className="bg-white border border-[#e8e2d9] rounded-xl p-4">
              <p className="text-sm font-semibold mb-3" style={{ color: '#5a6272' }}>Presión Arterial — mmHg</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={bpChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe3" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis domain={[40, 200]} tick={{ fontSize: 10 }} width={30} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Sistólica" stroke="#c4848c" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="Diastólica" stroke="#9b8ec4" dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── CTG scrolleable: FCF + Toco + Botón materno ── */}
          {hasCTG && (
            <div className="bg-white border border-[#e8e2d9] rounded-xl p-4">
              <p className="text-sm font-semibold mb-1" style={{ color: '#5a6272' }}>
                Cardiotocografía (CTG) — sesión completa
              </p>
              <p className="text-xs text-[#8e96a3] mb-3">
                Desplaza horizontalmente para ver toda la sesión
              </p>

              <div className="overflow-x-auto">
                {/* Panel FCF */}
                {fhrR.length > 0 && (
                  <div style={{ width: ctgWidth, minWidth: '100%' }}>
                    <ComposedChart
                      width={ctgWidth}
                      height={180}
                      data={fhrR.map(r => ({ t: fmtTime(r.timestamp), FCF: r.heart_rate }))}
                      margin={{ top: 5, right: 8, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="t" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                      <YAxis
                        domain={[50, 210]}
                        tick={{ fontSize: 9 }}
                        width={38}
                        label={{ value: 'FCF (bpm)', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#E74C3C' } }}
                      />
                      <Tooltip formatter={(v: number) => [`${v} bpm`, 'FCF']} />
                      <Line
                        type="monotone"
                        dataKey="FCF"
                        stroke="#E74C3C"
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                        connectNulls={false}
                      />
                    </ComposedChart>
                  </div>
                )}

                {/* Panel Toco + eventos del botón materno */}
                {tocoR.length > 0 && (
                  <div style={{ width: ctgWidth, minWidth: '100%' }}>
                    <ComposedChart
                      width={ctgWidth}
                      height={130}
                      data={tocoR.map(r => ({ t: fmtTime(r.timestamp), Toco: r.contraction_intensity }))}
                      margin={{ top: 0, right: 8, bottom: 5, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="t" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                      <YAxis
                        tick={{ fontSize: 9 }}
                        width={38}
                        label={{ value: 'Toco', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#3498DB' } }}
                      />
                      <Tooltip formatter={(v: number) => [`${v}`, 'Toco']} />

                      {/* Áreas y líneas del botón materno */}
                      {btnPairs.map((pair, i) => {
                        const x1 = fmtTime(pair.startTime);
                        const x2 = pair.endTime ? fmtTime(pair.endTime) : undefined;
                        return (
                          <React.Fragment key={i}>
                            {x2 && (
                              <ReferenceArea
                                x1={x1}
                                x2={x2}
                                fill={BTN_COLOR}
                                fillOpacity={0.15}
                                label={{ value: 'Botón Materno', position: 'insideTop', style: { fontSize: 8, fill: BTN_COLOR } }}
                              />
                            )}
                            <ReferenceLine x={x1} stroke={BTN_COLOR} strokeWidth={2} />
                            {x2 && (
                              <ReferenceLine x={x2} stroke={BTN_COLOR} strokeWidth={2} strokeDasharray="6 3" />
                            )}
                          </React.Fragment>
                        );
                      })}

                      <Line
                        type="monotone"
                        dataKey="Toco"
                        stroke="#3498DB"
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                        connectNulls={false}
                      />
                    </ComposedChart>
                  </div>
                )}
              </div>

              {/* Leyenda del botón */}
              {btnPairs.length > 0 && (
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span style={{ display: 'inline-block', width: 14, height: 2, background: BTN_COLOR }} />
                    Inicio pulsación
                  </span>
                  <span className="flex items-center gap-1">
                    <span style={{ display: 'inline-block', width: 14, height: 0, borderTop: `2px dashed ${BTN_COLOR}` }} />
                    Fin pulsación
                  </span>
                  <span className="flex items-center gap-1">
                    <span style={{ display: 'inline-block', width: 14, height: 10, background: BTN_COLOR, opacity: 0.2 }} />
                    Duración
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!isLoading && readings.length === 0 && (
        <div className="text-center py-8 text-[#8e96a3]">
          <Activity size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm">Sin lecturas registradas en esta sesión</p>
        </div>
      )}
    </div>
  );
};

// ─── HistoryPage ───────────────────────────────────────────────────────────────

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();

  // Estado de filtros
  const [patientId, setPatientId]   = useState<number | undefined>();
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [selectedSession, setSelectedSession] = useState<MonitoringSession | null>(null);

  // Queries
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: patientsAPI.getAll,
  });

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions-history', patientId, dateFrom, dateTo],
    queryFn: () =>
      sessionsAPI.getHistory({
        patient_id: patientId,
        date_from: dateFrom || undefined,
        // incluye todo el día final hasta las 23:59:59
        date_to: dateTo ? `${dateTo}T23:59:59` : undefined,
        limit: 200,
      }),
  });

  const { data: readings = [], isLoading: loadingReadings } = useQuery({
    queryKey: ['readings-session', selectedSession?.id],
    queryFn: () => readingsAPI.getForSession(selectedSession!.id),
    enabled: !!selectedSession,
  });

  const { data: sessionEvents = [] } = useQuery({
    queryKey: ['events-session', selectedSession?.id],
    queryFn: () => eventsAPI.getForSession(selectedSession!.id),
    enabled: !!selectedSession,
  });

  const selectedPatient = useMemo(
    () => patients.find(p => p.id === selectedSession?.patient_id),
    [patients, selectedSession],
  );

  const getPatientName = (pid: number) => {
    const p = patients.find(p => p.id === pid);
    return p ? `${p.first_name} ${p.last_name}` : `Paciente #${pid}`;
  };

  const clearFilters = () => {
    setPatientId(undefined);
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = patientId != null || dateFrom !== '' || dateTo !== '';

  return (
    <div className="min-h-screen" style={{ background: "#faf8f5" }}>

      {/* ── Navbar (oculto al imprimir) ── */}
      <nav style={{ background: "#ffffff", borderBottom: "1px solid #e8e2d9" }} className="print:hidden">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 transition-colors"
            style={{ color: '#8e96a3' }}
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Dashboard</span>
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Calendar size={18} style={{ color: '#6a9e8a' }} />
            <h1 className="text-lg font-bold" style={{ color: '#2e3440' }}>Historial de Sesiones</h1>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ── Filtros (ocultos al imprimir) ── */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e8e2d9] p-4 mb-5 print:hidden">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={14} style={{ color: '#8e96a3' }} />
            <span className="text-sm font-medium" style={{ color: '#5a6272' }}>Filtros</span>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            {/* Paciente */}
            <div>
              <label className="block text-xs text-[#8e96a3] mb-1">Paciente</label>
              <select
                value={patientId ?? ''}
                onChange={e => setPatientId(e.target.value ? Number(e.target.value) : undefined)}
                className="px-3 py-2 border border-[#e8e2d9] rounded-lg text-sm
                           focus:ring-2 focus:ring-[#6a9e8a] focus:outline-none"
              >
                <option value="">Todas</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha desde */}
            <div>
              <label className="block text-xs text-[#8e96a3] mb-1">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-[#e8e2d9] rounded-lg text-sm
                           focus:ring-2 focus:ring-[#6a9e8a] focus:outline-none"
              />
            </div>

            {/* Fecha hasta */}
            <div>
              <label className="block text-xs text-[#8e96a3] mb-1">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2 border border-[#e8e2d9] rounded-lg text-sm
                           focus:ring-2 focus:ring-[#6a9e8a] focus:outline-none"
              />
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-[#8e96a3] hover:text-[#5a6272]
                           border border-[#e8e2d9] rounded-lg transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* ── Panel dividido: lista | detalle ── */}
        <div className="grid lg:grid-cols-5 gap-5">

          {/* Lista de sesiones (oculta al imprimir) */}
          <div className="lg:col-span-2 print:hidden">
            <div className="bg-white rounded-xl shadow-sm border border-[#e8e2d9] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#e8e2d9] bg-[#f4f1ec] flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: '#5a6272' }}>Sesiones</span>
                {sessions.length > 0 && (
                  <span className="text-xs text-[#8e96a3] bg-[#e8e2d9] px-2 py-0.5 rounded-full">
                    {sessions.length}
                  </span>
                )}
              </div>

              {loadingSessions ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-3 bg-[#f0ebe3] rounded w-3/4 mb-2" />
                      <div className="h-2 bg-[#f4f1ec] rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="p-10 text-center text-[#8e96a3]">
                  <Calendar size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin sesiones encontradas</p>
                  {hasFilters && (
                    <p className="text-xs mt-1">Prueba ajustando los filtros</p>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-[#f0ebe3] max-h-[calc(100vh-300px)] overflow-y-auto">
                  {sessions.map(session => (
                    <li
                      key={session.id}
                      onClick={() => setSelectedSession(session)}
                      className={`px-4 py-3 cursor-pointer transition-colors ${
                        selectedSession?.id === session.id
                          ? 'border-l-4 border-[#6a9e8a]'
                          : 'border-l-4 border-transparent'
                      }`}
                      style={selectedSession?.id === session.id ? { background: '#e8f2ee' } : undefined}
                      onMouseEnter={e => { if (selectedSession?.id !== session.id) (e.currentTarget as HTMLLIElement).style.background = '#f4f1ec'; }}
                      onMouseLeave={e => { if (selectedSession?.id !== session.id) (e.currentTarget as HTMLLIElement).style.background = ''; }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: '#2e3440' }}>
                            {getPatientName(session.patient_id)}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: '#8e96a3' }}>
                            {fmtDateTime(session.start_time)}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                              session.is_active
                                ? 'bg-[#e8f2ee] text-[#4d7d6c]'
                                : 'bg-[#f4f1ec] text-[#8e96a3]'
                            }`}>
                              {session.is_active ? '● Activa' : '✓ Finalizada'}
                            </span>
                            {session.duration_minutes != null && (
                              <span className="text-xs text-[#8e96a3]">
                                {formatDuration(session.duration_minutes)}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={15} className="text-[#8e96a3] mt-1 flex-shrink-0" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Detalle de sesión */}
          <div className="lg:col-span-3">
            {selectedSession ? (
              <div className="bg-white rounded-xl shadow-sm border border-[#e8e2d9] p-5 overflow-y-auto max-h-[calc(100vh-200px)]">
                <SessionDetail
                  session={selectedSession}
                  patient={selectedPatient}
                  readings={readings}
                  events={sessionEvents}
                  isLoading={loadingReadings}
                />
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-[#e8e2d9] p-16 text-center text-[#8e96a3] print:hidden">
                <ChevronRight size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">Selecciona una sesión</p>
                <p className="text-xs mt-1 text-[#8e96a3]">
                  para ver el historial de signos vitales y gráficos interactivos
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
