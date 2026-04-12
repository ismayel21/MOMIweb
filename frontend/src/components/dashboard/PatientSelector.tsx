import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsAPI } from '@/api/patients';
import { sessionsAPI, type SessionSummary } from '@/api/sessions';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { SessionTimer } from '@/components/dashboard/SessionTimer';
import type { MonitoringSession } from '@/types/session';
import { X, Activity, Heart, Droplets, Gauge, TrendingUp, Hand } from 'lucide-react';

// ── Modal de resumen de sesión ───────────────────────────────────────────────
interface SummaryModalProps {
  summary: SessionSummary;
  patientName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const SummaryModal: React.FC<SummaryModalProps> = ({ summary, patientName, onConfirm, onCancel, loading }) => {
  const row = (icon: React.ReactNode, label: string, value: string | null) => (
    <div className="flex items-center justify-between py-2.5 border-b border-[#f0ebe3] last:border-0">
      <div className="flex items-center gap-2 text-sm" style={{ color: '#5a6272' }}>
        {icon}
        {label}
      </div>
      <span className="font-semibold text-sm" style={{ color: '#2e3440' }}>
        {value ?? <span className="font-normal" style={{ color: '#8e96a3' }}>Sin datos</span>}
      </span>
    </div>
  );

  const bp = summary.avg_systolic_bp != null
    ? `${summary.avg_systolic_bp}/${summary.avg_diastolic_bp ?? '?'} mmHg`
    : null;

  const btnAnalysis = summary.button_press_count > 0
    ? `${summary.button_press_count} pulsación${summary.button_press_count !== 1 ? 'es' : ''}${summary.avg_button_duration_s != null ? ` · ${summary.avg_button_duration_s}s promedio` : ''}`
    : '0 pulsaciones';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-5 border-b border-[#e8e2d9] flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold" style={{ color: '#2e3440' }}>Resumen de sesión</h2>
            <p className="text-xs mt-0.5" style={{ color: '#8e96a3' }}>{patientName}</p>
          </div>
          <button onClick={onCancel} className="text-[#8e96a3] hover:text-[#5a6272]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {row(<Activity className="w-4 h-4 text-[#c4848c]" />,   'FC Fetal promedio',     summary.avg_fhr != null ? `${summary.avg_fhr} bpm` : null)}
          {row(<Heart className="w-4 h-4 text-[#6a9e8a]" />,   'FC Materna promedio',   summary.avg_maternal_hr != null ? `${summary.avg_maternal_hr} bpm` : null)}
          {row(<Droplets className="w-4 h-4 text-[#4d7d6c]" />, 'SpO₂ Materno promedio', summary.avg_spo2 != null ? `${summary.avg_spo2} %` : null)}
          {row(<Gauge className="w-4 h-4 text-[#9b8ec4]" />,   'Presión Arterial prom.', bp)}
          {row(<TrendingUp className="w-4 h-4 text-[#6a9e8a]" />, 'Contracciones',         `${summary.contraction_count}`)}
          {row(<Hand className="w-4 h-4 text-[#9b8ec4]" />,    'Percepción materna',    btnAnalysis)}
        </div>

        <div className="p-5 pt-0 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-[#e8e2d9] text-[#5a6272] rounded-lg text-sm hover:bg-[#f4f1ec] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            style={{ background: '#c4848c' }}
          >
            {loading ? 'Terminando...' : 'Terminar sesión'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const PatientSelector: React.FC = () => {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [maxDurationInput, setMaxDurationInput] = useState('');
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const queryClient = useQueryClient();
  const { connect, disconnect } = useWebSocket();

  // Duración máxima como número (undefined si no se ingresó)
  const maxDurationMinutes = maxDurationInput !== '' ? parseInt(maxDurationInput, 10) : undefined;

  // Cargar pacientes
  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: patientsAPI.getAll,
  });

  // Cargar sesión activa
  const { data: activeSession, isLoading: sessionLoading } = useQuery({
    queryKey: ['activeSession'],
    queryFn: sessionsAPI.getActive,
    refetchInterval: 5000,
  });

  // Conectar WebSocket cuando hay sesión activa
  useEffect(() => {
    if (activeSession?.patient_id) {
      connect(activeSession.patient_id);
    } else {
      disconnect();
    }
  }, [activeSession?.patient_id]);

  // Mutation para iniciar sesión
  const startSessionMutation = useMutation({
    mutationFn: (patientId: number) =>
      sessionsAPI.create({
        patient_id: patientId,
        notes: 'Sesión iniciada desde dashboard web',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSession'] });
    },
  });

  // Mutation para terminar sesión
  const endSessionMutation = useMutation({
    mutationFn: (sessionId: number) => sessionsAPI.end(sessionId),
    onSuccess: () => {
      setSelectedPatientId(null);
      setMaxDurationInput('');
      queryClient.invalidateQueries({ queryKey: ['activeSession'] });
      queryClient.invalidateQueries({ queryKey: ['sessions-history'] });
    },
  });

  const handleStartSession = () => {
    if (!selectedPatientId || startSessionMutation.isPending) return;
    startSessionMutation.mutate(selectedPatientId);
  };

  const handleEndSession = async () => {
    if (!activeSession?.id || loadingSummary) return;
    setLoadingSummary(true);
    try {
      const s = await sessionsAPI.getSummary(activeSession.id);
      setSummary(s);
    } catch {
      // Si falla el resumen, terminar igual
      endSessionMutation.mutate(activeSession.id);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleConfirmEnd = () => {
    if (!activeSession?.id) return;
    endSessionMutation.mutate(activeSession.id);
    setSummary(null);
  };

  const getPatientName = (patientId: number): string => {
    const patient = patients?.find((p) => p.id === patientId);
    if (!patient) return 'Paciente desconocida';
    return `${patient.first_name} ${patient.last_name}`;
  };

  if (patientsLoading || sessionLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 border border-[#e8e2d9]">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-[#f0ebe3] rounded w-1/2" />
          <div className="h-10 bg-[#f0ebe3] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md px-4 py-3 border border-[#e8e2d9]">
      {activeSession ? (
        /* ── SESIÓN ACTIVA — Layout horizontal compacto ── */
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#4d7d6c] animate-pulse flex-shrink-0" />
            <span className="font-semibold text-sm truncate" style={{ color: '#4d7d6c' }}>
              {getPatientName(activeSession.patient_id)}
            </span>
            <span className="text-xs hidden sm:inline" style={{ color: '#8e96a3' }}>
              desde {new Date(
                activeSession.start_time.endsWith('Z') ? activeSession.start_time : activeSession.start_time + 'Z'
              ).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <SessionTimer
            startTime={activeSession.start_time}
            maxDurationMinutes={maxDurationMinutes}
          />

          <button
            type="button"
            onClick={handleEndSession}
            disabled={endSessionMutation.isPending || loadingSummary}
            className="px-4 py-2 text-white text-sm font-semibold rounded-lg
                       transition-colors flex-shrink-0
                       disabled:bg-[#e8e2d9] disabled:text-[#8e96a3] disabled:cursor-not-allowed"
            style={{ background: '#c4848c' }}
          >
            {loadingSummary ? 'Resumen...' : '⏹ Terminar'}
          </button>

          {summary && (
            <SummaryModal
              summary={summary}
              patientName={getPatientName(activeSession.patient_id)}
              onConfirm={handleConfirmEnd}
              onCancel={() => setSummary(null)}
              loading={endSessionMutation.isPending}
            />
          )}
        </div>
      ) : (
        /* ── SIN SESIÓN — Layout horizontal compacto ── */
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedPatientId || ''}
            onChange={(e) => setSelectedPatientId(Number(e.target.value))}
            className="flex-1 min-w-[180px] px-3 py-2 border border-[#e8e2d9] rounded-lg text-sm
                       focus:ring-2 focus:ring-[#6a9e8a] focus:border-transparent"
            style={{ color: '#2e3440' }}
          >
            <option value="">-- Seleccionar Paciente --</option>
            {patients?.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.first_name} {patient.last_name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={480}
              value={maxDurationInput}
              onChange={(e) => setMaxDurationInput(e.target.value)}
              placeholder="Min"
              title="Duración máxima (minutos, opcional)"
              className="w-20 px-2 py-2 border border-[#e8e2d9] rounded-lg text-sm text-center
                         focus:ring-2 focus:ring-[#6a9e8a] focus:border-transparent"
            />
            <span className="text-xs hidden sm:inline" style={{ color: '#8e96a3' }}>min</span>
          </div>

          <button
            type="button"
            onClick={handleStartSession}
            disabled={!selectedPatientId || startSessionMutation.isPending}
            className="px-5 py-2 text-white text-sm font-semibold rounded-lg
                       transition-colors flex-shrink-0
                       disabled:bg-[#e8e2d9] disabled:text-[#8e96a3] disabled:cursor-not-allowed"
            style={{ background: '#6a9e8a' }}
          >
            {startSessionMutation.isPending ? 'Iniciando...' : '▶ Iniciar Monitoreo'}
          </button>
        </div>
      )}
    </div>
  );
};
