import { api } from './axios';
import type { SessionEvent } from '@/types/event';

export const eventsAPI = {
  getForSession: async (sessionId: number): Promise<SessionEvent[]> => {
    const response = await api.get<SessionEvent[]>('/events', {
      params: { session_id: sessionId },
    });
    return Array.isArray(response.data) ? response.data : [];
  },
};
