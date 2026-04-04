// src/types/alert.ts
interface Patient {
  id: number;
  name: string;
}

export enum AlertLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}
 
export interface Alert {
  id: number;
  patient_id: number;
  patient?: Patient;
  level: AlertLevel;
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledged_at?: string;
  acknowledged_by?: number;
}
 
export interface CreateAlertRequest {
  patient_id: number;
  level: AlertLevel;
  title: string;
  message: string;
}