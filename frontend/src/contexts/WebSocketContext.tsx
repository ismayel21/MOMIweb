import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { ReadingUpdate, AlertNotification, ButtonEvent, BPStatusUpdate, AIPrediction } from '@/types/websocket';

interface WebSocketContextType {
  isConnected: boolean;
  latestReading: ReadingUpdate | null;
  latestAlert: AlertNotification | null;
  latestButtonEvent: ButtonEvent | null;
  latestBPStatus: BPStatusUpdate | null;
  latestAIPrediction: AIPrediction | null;
  connect: (patientId: number) => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

const WS_BASE_URL: string = import.meta.env.DEV
  ? (import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000')
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // useRef en vez de useState: evita recrear connect/disconnect en cada cambio de WS
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestReading, setLatestReading] = useState<ReadingUpdate | null>(null);
  const [latestAlert, setLatestAlert] = useState<AlertNotification | null>(null);
  const [latestButtonEvent, setLatestButtonEvent] = useState<ButtonEvent | null>(null);
  const [latestBPStatus, setLatestBPStatus] = useState<BPStatusUpdate | null>(null);
  const [latestAIPrediction, setLatestAIPrediction] = useState<AIPrediction | null>(null);

  // connect y disconnect son estables (sin deps) — no se recrean en cada render
  const connect = useCallback((patientId: number) => {
    if (!patientId || isNaN(patientId)) return;

    // Cerrar socket previo si existe
    if (wsRef.current) {
      wsRef.current.onclose = null; // evitar que el handler dispare setIsConnected(false)
      wsRef.current.close();
    }

    console.log(`WebSocket conectando → patient_id: ${patientId}`);
    const ws = new WebSocket(`${WS_BASE_URL}/ws/live/${patientId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket conectado');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'reading')       setLatestReading(msg.data as ReadingUpdate);
        else if (msg.type === 'alert')    setLatestAlert(msg.data as AlertNotification);
        else if (msg.type === 'button_event') setLatestButtonEvent(msg.data as ButtonEvent);
        else if (msg.type === 'bp_status')    setLatestBPStatus(msg.data as BPStatusUpdate);
        else if (msg.type === 'ai_prediction') setLatestAIPrediction(msg.data as AIPrediction);
      } catch (e) {
        console.error('WebSocket parse error:', e);
      }
    };

    ws.onerror = (e) => console.error('WebSocket error:', e);

    ws.onclose = () => {
      console.log('WebSocket desconectado');
      setIsConnected(false);
    };
  }, []); // estable — sin dependencias

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      console.log('Desconectando WebSocket');
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []); // estable — sin dependencias

  // Limpiar al desmontar el provider (cierre de app)
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const value = {
    isConnected,
    latestReading,
    latestAlert,
    latestButtonEvent,
    latestBPStatus,
    latestAIPrediction,
    connect,
    disconnect,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
