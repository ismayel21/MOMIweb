import { api } from './axios';

export const audioAPI = {
  up:    () => api.post('/audio/up'),
  down:  () => api.post('/audio/down'),
  set:   (volume: number) => api.post('/audio/set', { volume }),
  state: () => api.get<{ volume: number; min: number; max: number }>('/audio/state'),
};
