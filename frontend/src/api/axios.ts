import axios from 'axios';

// En DEV apunta a localhost (o VITE_API_BASE_URL si está definido).
// En PRODUCCIÓN siempre usa el origen actual del browser → protocolo correcto automático.
// import.meta.env.DEV es una constante booleana bakeada por Vite en build time:
//   - npm run dev  → DEV = true
//   - npm run build → DEV = false  (producción)
const API_BASE_URL: string = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000')
  : window.location.origin;   // → 'https://momi.onl' en producción

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