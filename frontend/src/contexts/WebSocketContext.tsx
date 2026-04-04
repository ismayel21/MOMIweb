import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReadingUpdate, AlertNotification, ButtonEvent, BPStatusUpdate } from '@/types/websocket';

interface WebSocketContextType {
  isConnected: boolean;
  latestReading: ReadingUpdate | null;
  latestAlert: AlertNotification | null;
  latestButtonEvent: ButtonEvent | null;
  latestBPStatus: BPStatusUpdate | null;
  connect: (patientId: number) => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// En DEV usa localhost; en PRODUCCIÓN usa el host actual con protocolo correcto.
// import.meta.env.DEV es false en cualquier build de producción (vite build).
const WS_BASE_URL: string = import.meta.env.DEV
  ? (import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000')
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestReading, setLatestReading] = useState<ReadingUpdate | null>(null);
  const [latestAlert, setLatestAlert] = useState<AlertNotification | null>(null);
  const [latestButtonEvent, setLatestButtonEvent] = useState<ButtonEvent | null>(null);
  const [latestBPStatus, setLatestBPStatus] = useState<BPStatusUpdate | null>(null);

  const connect = useCallback((patientId: number) => {
    if (!patientId || isNaN(patientId)) {
      console.warn('WebSocket: patient_id inválido, no se conecta');
      return;
    }

    if (ws) {
      ws.close();
    }

    console.log(`Conectando WebSocket a patient_id: ${patientId}`);

    const websocket = new WebSocket(`${WS_BASE_URL}/ws/live/${patientId}`);

    websocket.onopen = () => {
      console.log('WebSocket conectado');
      setIsConnected(true);
    };

    websocket.onmessage = (event) => {
      try {
        // El backend envía { type, timestamp, data: {...} }
        const msg = JSON.parse(event.data);

        if (msg.type === 'reading') {
          setLatestReading(msg.data as ReadingUpdate);
        } else if (msg.type === 'alert') {
          setLatestAlert(msg.data as AlertNotification);
        } else if (msg.type === 'button_event') {
          setLatestButtonEvent(msg.data as ButtonEvent);
        } else if (msg.type === 'bp_status') {
          setLatestBPStatus(msg.data as BPStatusUpdate);
        }
      } catch (error) {
        console.error('Error parseando mensaje WebSocket:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('Error WebSocket:', error);
    };

    websocket.onclose = () => {
      console.log('WebSocket desconectado');
      setIsConnected(false);
    };

    setWs(websocket);
  }, [ws]);

  const disconnect = useCallback(() => {
    if (ws) {
      console.log('Desconectando WebSocket');
      ws.close();
      setWs(null);
      setIsConnected(false);
    }
  }, [ws]);

  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  const value = {
    isConnected,
    latestReading,
    latestAlert,
    latestButtonEvent,
    latestBPStatus,
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
