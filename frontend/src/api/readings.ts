import { api } from './axios';
import type { SensorReading, ReadingsQuery } from '@/types/reading';

export const readingsAPI = {
  getAll: async (query: ReadingsQuery): Promise<SensorReading[]> => {
    const response = await api.get<SensorReading[]>('/readings', { params: query });
    return response.data;
  },

  getLatest: async (sessionId: number, sensorType?: string): Promise<SensorReading[]> => {
    const params: Record<string, unknown> = { session_id: sessionId, limit: 1 };
    if (sensorType) params.sensor_type = sensorType;
    const response = await api.get<SensorReading[]>('/readings', { params });
    return response.data;
  },

  /** Todas las lecturas de una sesión (para historial y gráficos) */
  getForSession: async (sessionId: number): Promise<SensorReading[]> => {
    const response = await api.get<SensorReading[]>('/readings', {
      params: { session_id: sessionId, limit: 10000 },
    });
    return response.data;
  },
};
