import { api } from './axios';
import type { MonitoringSession, CreateSessionRequest } from '@/types/session';

export const sessionsAPI = {
  getAll: async (patientId?: number): Promise<MonitoringSession[]> => {
    const params = patientId ? { patient_id: patientId } : {};
    const response = await api.get<MonitoringSession[]>('/sessions', { params });
    return Array.isArray(response.data) ? response.data : [];
  },

  getHistory: async (params: {
    patient_id?: number;
    date_from?: string;
    date_to?: string;
    limit?: number;
  }): Promise<MonitoringSession[]> => {
    // Limpiar params undefined para no enviarlos como "undefined" string
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    );
    const response = await api.get<MonitoringSession[]>('/sessions', { params: clean });
    return Array.isArray(response.data) ? response.data : [];
  },
 
  getById: async (id: number): Promise<MonitoringSession> => {
    const response = await api.get<MonitoringSession>(`/sessions/${id}`);
    return response.data;
  },
 
  getActive: async (): Promise<MonitoringSession | null> => {
    const response = await api.get<MonitoringSession | null>('/sessions/active');
    return response.data;
  },
 
  create: async (data: CreateSessionRequest): Promise<MonitoringSession> => {
    const response = await api.post<MonitoringSession>('/sessions', data);
    return response.data;
  },
 
  end: async (id: number): Promise<MonitoringSession> => {
    const response = await api.post<MonitoringSession>(`/sessions/${id}/end`, {});
    return response.data;
  },

  getSummary: async (id: number): Promise<SessionSummary> => {
    const response = await api.get<SessionSummary>(`/sessions/${id}/summary`);
    return response.data;
  },
};

export interface SessionSummary {
  session_id: number;
  avg_fhr: number | null;
  avg_maternal_hr: number | null;
  avg_spo2: number | null;
  avg_systolic_bp: number | null;
  avg_diastolic_bp: number | null;
  contraction_count: number;
  button_press_count: number;
  avg_button_duration_s: number | null;
}