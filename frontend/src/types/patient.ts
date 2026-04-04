// src/types/patient.ts
export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  blood_type?: string;
  medical_record_number?: string;
  phone?: string;
  address?: string;
  emergency_contact?: string;
  created_at: string;
}
 
export interface CreatePatientRequest {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  blood_type?: string;
  medical_record_number?: string;
  phone?: string;
  address?: string;
  emergency_contact?: string;
}