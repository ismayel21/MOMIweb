import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, Info, Check } from 'lucide-react';
import { alertsAPI } from '@/api/alerts';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Alert, AlertLevel } from '@/types/alert';

export const AlertsList: React.FC = () => {
  const queryClient = useQueryClient();
  const { latestAlert } = useWebSocket();
  const { user } = useAuth();

  // Cargar alertas no reconocidas
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts', 'unacknowledged'],
    queryFn: alertsAPI.getUnacknowledged,
    refetchInterval: 10000, // Refetch cada 10s
  });

  // Mutation para reconocer alerta
  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: number) => alertsAPI.acknowledge(alertId, user?.username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  // Agregar alerta nueva del WebSocket
  React.useEffect(() => {
    if (latestAlert) {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    }
  }, [latestAlert, queryClient]);

  const getAlertIcon = (level: AlertLevel) => {
    switch (level) {
      case 'CRITICAL':
        return <AlertCircle className="w-5 h-5 text-[#c4848c]" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-[#9b8ec4]" />;
      case 'INFO':
        return <Info className="w-5 h-5 text-[#6a9e8a]" />;
    }
  };

  const getAlertColor = (level: AlertLevel) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-[#f9eced] border-[#f0d4d7]';
      case 'WARNING':
        return 'bg-[#f0edf9] border-[#d4cef0]';
      case 'INFO':
        return 'bg-[#e8f2ee] border-[#b8d9ce]';
    }
  };

  if (isLoading) {
    return <div className="animate-pulse">Cargando alertas...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-[#e8e2d9]">
      <h2 className="text-xl font-bold mb-4" style={{ color: '#2e3440' }}>
        Alertas Activas
        {alerts && alerts.length > 0 && (
          <span className="ml-2 px-2 py-1 text-white text-sm rounded-full" style={{ background: '#c4848c' }}>
            {alerts.length}
          </span>
        )}
      </h2>

      {!alerts || alerts.length === 0 ? (
        <div className="text-center py-8 text-[#8e96a3]">
          <Check className="w-12 h-12 mx-auto mb-2" />
          <p>No hay alertas activas</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 border rounded-lg ${getAlertColor(alert.level)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getAlertIcon(alert.level)}
                  <div className="flex-1">
                    <h4 className="font-semibold" style={{ color: '#2e3440' }}>{alert.title}</h4>
                    <p className="text-sm mt-1" style={{ color: '#5a6272' }}>{alert.message}</p>
                    <p className="text-xs mt-2" style={{ color: '#8e96a3' }}>
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => acknowledgeMutation.mutate(alert.id)}
                  className="ml-4 px-3 py-1 text-sm bg-white border border-[#e8e2d9] rounded hover:bg-[#f4f1ec] transition-colors"
                  style={{ color: '#5a6272' }}
                >
                  Reconocer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};