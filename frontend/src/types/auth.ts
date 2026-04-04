export interface LoginRequest {
  username: string;
  password: string;
}
 
export interface LoginResponse {
  access_token: string;
  token_type: string;
}
 
export interface User {
  id: number;
  username: string;
  full_name: string;
  email?: string;
  role: 'doctor' | 'tecnico' | 'admin';
}