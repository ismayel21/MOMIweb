// src/types/websocket.ts
export interface WebSocketMessage {
  type: 'reading' | 'alert' | 'button_event' | 'connection' | 'error' | 'bp_status';
  data: any;
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
