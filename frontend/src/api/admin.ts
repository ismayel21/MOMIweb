import { api } from './axios';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  full_name?: string;
  password: string;
  role: string;
}

export interface UpdateUserRequest {
  full_name?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
  password?: string;
}

export const adminAPI = {
  listUsers: async (): Promise<AdminUser[]> => {
    const res = await api.get<AdminUser[]>('/admin/users');
    return Array.isArray(res.data) ? res.data : [];
  },

  createUser: async (data: CreateUserRequest): Promise<AdminUser> => {
    const res = await api.post<AdminUser>('/admin/users', data);
    return res.data;
  },

  updateUser: async (id: number, data: UpdateUserRequest): Promise<AdminUser> => {
    const res = await api.put<AdminUser>(`/admin/users/${id}`, data);
    return res.data;
  },

  deactivateUser: async (id: number): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },
};
