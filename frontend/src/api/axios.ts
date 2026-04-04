import axios from 'axios';

// En producción usa rutas relativas (mismo dominio), en dev apunta a localhost.
// Si VITE_API_BASE_URL está vacío o no definido → rutas relativas ('').
// Nunca usar una URL http:// cuando la página está en https:// (Mixed Content).
const rawBase = import.meta.env.VITE_API_BASE_URL ?? (
  import.meta.env.DEV ? 'http://localhost:8000' : ''
);

// Forzar HTTPS si la página se carga por HTTPS y la URL configurada es HTTP.
// Esto previene errores de Mixed Content aunque VITE_API_BASE_URL esté mal configurada.
const safeBase = (() => {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    if (rawBase.startsWith('http://')) {
      return rawBase.replace('http://', 'https://');
    }
  }
  return rawBase;
})();

const API_BASE_URL = safeBase;

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a todas las requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
 
// Interceptor para manejar errores globales
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido o expirado
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);