import { api } from './axios';

export const bpAPI = {
  start:     () => api.post('/bp/start'),
  stop:      () => api.post('/bp/stop'),
  emergency: () => api.post('/bp/emergency'),
  getStatus: () => api.get<{ estado: string; timestamp: string }>('/bp/status'),
  getLast:   () => api.get<{
    sistolica: number; diastolica: number; media: number;
    frecuencia_cardiaca: number; interpretacion: string; timestamp: string;
  }>('/bp/last'),
};
