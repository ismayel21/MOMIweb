import { api } from './axios';
import type { LoginRequest, LoginResponse, User } from '@/types/auth';
 
export const authAPI = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    // FastAPI OAuth2 espera form-data, no JSON
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
 
    const response = await api.post<LoginResponse>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },
 
  getMe: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
};