// src/types/websocket.ts
export interface WebSocketMessage {
  type: 'reading' | 'alert' | 'button_event' | 'connection' | 'error' | 'bp_status' | 'ai_prediction';
  data: any;
}

export interface AIPrediction {
  class: 'normal' | 'pre_hipoxemia' | 'hipoxemia' | 'unknown';
  confidence: number;
  risk_level: 'low' | 'medium' | 'high';
  spo2_trend: 'stable' | 'descending' | 'critical';
  spo2_current: number | null;
  hr_current: number | null;
  buffer_fullness: number;
}

export interface ButtonEvent {
  event: 'Boton_Presionado' | 'Boton_Soltado';
  patient_id: number;
  timestamp: string;
}
 
export interface ReadingUpdate {
  sensor_type: string;
  heart_rate?: number;
  spo2?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  contraction_intensity?: number;
  timestamp: string;
}
 
export interface AlertNotification {
  id: number;
  patient_id: number;
  level: string;
  title: string;
  message: string;
  timestamp: string;
}

export interface BPStatusUpdate {
  estado: 'medicion_iniciada' | 'test_preinflado' | 'inflando' | 'midiendo' |
          'medicion_completada' | 'detenido' | 'emergencia_activada' |
          'emergencia_resuelta' | 'error_datos_insuficientes' | string;
  timestamp: string;
}
