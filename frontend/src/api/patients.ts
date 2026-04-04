import { api } from './axios';
import type { Patient, CreatePatientRequest } from '@/types/patient';
 
export const patientsAPI = {
  getAll: async (): Promise<Patient[]> => {
    const response = await api.get<Patient[]>('/patients');
    return response.data;
  },
 
  getById: async (id: number): Promise<Patient> => {
    const response = await api.get<Patient>(`/patients/${id}`);
    return response.data;
  },
 
  create: async (data: CreatePatientRequest): Promise<Patient> => {
    const response = await api.post<Patient>('/patients', data);
    return response.data;
  },
 
  update: async (id: number, data: Partial<CreatePatientRequest>): Promise<Patient> => {
    const response = await api.put<Patient>(`/patients/${id}`, data);
    return response.data;
  },
 
  delete: async (id: number): Promise<void> => {
    await api.delete(`/patients/${id}`);
  },
};