import { api } from './axios';
import type { Alert, CreateAlertRequest } from '@/types/alert';
 
export const alertsAPI = {
  getAll: async (patientId?: number): Promise<Alert[]> => {
    const params = patientId ? { patient_id: patientId } : {};
    const response = await api.get<Alert[]>('/alerts', { params });
    return response.data;
  },
 
  getUnacknowledged: async (): Promise<Alert[]> => {
    const response = await api.get<Alert[]>('/alerts/unacknowledged');
    return response.data;
  },
 
  create: async (data: CreateAlertRequest): Promise<Alert> => {
    const response = await api.post<Alert>('/alerts', data);
    return response.data;
  },
 
  acknowledge: async (id: number, acknowledgedBy?: string): Promise<Alert> => {
    const response = await api.put<Alert>(`/alerts/${id}/acknowledge`, {
      acknowledged_by: acknowledgedBy ?? 'doctor',
    });
    return response.data;
  },
};
 