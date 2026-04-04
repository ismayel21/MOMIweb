// src/types/reading.ts
export enum SensorType {
  SPO2 = 'SPO2',
  BLOOD_PRESSURE = 'BLOOD_PRESSURE',
  FETAL_DOPPLER = 'FETAL_DOPPLER',
  TOCODYNAMOMETER = 'TOCODYNAMOMETER',
  EVA = 'EVA',
}
 
export interface SensorReading {
  id: number;
  session_id: number;
  sensor_type: SensorType;
  timestamp: string;
  heart_rate?: number;
  spo2?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  contraction_intensity?: number;
  quality_score?: number;
  raw_data?: string;
}
 
export interface ReadingsQuery {
  session_id?: number;
  sensor_type?: SensorType;
  start_time?: string;
  end_time?: string;
  limit?: number;
}