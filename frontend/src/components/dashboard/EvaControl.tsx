import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionsAPI } from '@/api/sessions';
import { Zap } from 'lucide-react';

export const EvaControl: React.FC = () => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { data: activeSession } = useQuery({
    queryKey: ['activeSession'],
    queryFn: sessionsAPI.getActive,
    refetchInterval: 5000,
  });

  const evaEnabled = activeSession?.eva_enabled ?? false;

  const toggle = async () => {
    if (!activeSession?.id || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${activeSession.id}/eva`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['activeSession'] });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#e8e2d9] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={16} style={{ color: '#9b8ec4' }} />
          <span className="font-semibold text-sm" style={{ color: '#5a6272' }}>
            Estimulación Vibroacústica (EVA)
          </span>
        </div>

        {activeSession ? (
          <button
            type="button"
            onClick={toggle}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            style={{
              background: evaEnabled ? '#ede9fe' : '#f3f4f6',
              color: evaEnabled ? '#7c3aed' : '#6b7280',
              border: `1px solid ${evaEnabled ? '#c4b5fd' : '#d1d5db'}`,
            }}
          >
            <Zap size={13} />
            {loading ? '...' : evaEnabled ? 'Permitido' : 'Bloqueado'}
          </button>
        ) : (
          <span className="text-xs" style={{ color: '#8e96a3' }}>Sin sesión activa</span>
        )}
      </div>

      {activeSession && (
        <p className="text-xs mt-2" style={{ color: '#8e96a3' }}>
          {evaEnabled
            ? 'El dispositivo puede activar la estimulación vibroacústica.'
            : 'El dispositivo tiene bloqueada la estimulación vibroacústica.'}
        </p>
      )}
    </div>
  );
};
