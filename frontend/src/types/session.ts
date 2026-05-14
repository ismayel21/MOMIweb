// src/types/session.ts
import type { Patient } from '@/types/patient';

export interface MonitoringSession {
  id: number;
  patient_id: number;
  patient?: Patient;
  is_active: boolean;
  session_uuid?: string;
  eva_enabled?: boolean;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  notes?: string;
}

export interface CreateSessionRequest {
  patient_id: number;
  notes?: string;
}
