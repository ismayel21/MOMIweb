export interface SessionEvent {
  id: number;
  session_id: number;
  timestamp: string;
  event_type: 'BUTTON_PRESS' | 'BUTTON_RELEASE' | string;
  description?: string;
  event_data?: string;
}
