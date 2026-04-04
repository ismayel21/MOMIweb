import React, { useEffect, useState } from 'react';
import { Heart, Activity, Gauge } from 'lucide-react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import type { SensorType } from '@/types/reading';

interface VitalCardProps {
  title: string;
  sensorType: SensorType;
  /** Campo específico a mostrar dentro del reading. Por defecto usa lógica automática. */
  valueField?: 'spo2' | 'heart_rate' | 'systolic_bp' | 'contraction_intensity';
  icon: 'heart' | 'activity' | 'gauge';
  unit: string;
  normalRange: [number, number];
}

export const VitalCard: React.FC<VitalCardProps> = ({
  title,
  sensorType,
  valueField,
  icon,
  unit,
  normalRange,
}) => {
  const { latestReading } = useWebSocket();
  const [value, setValue] = useState<number | null>(null);
  const [timestamp, setTimestamp] = useState<string>('');

  useEffect(() => {
    if (latestReading && latestReading.sensor_type === sensorType) {
      let newValue: number | null = null;

      if (valueField) {
        // Campo explícito (evita cruce de valores entre SpO2 y FC materna)
        newValue = latestReading[valueField] ?? null;
      } else if (sensorType === 'SPO2') {
        newValue = latestReading.spo2 ?? latestReading.heart_rate ?? null;
      } else if (sensorType === 'BLOOD_PRESSURE') {
        newValue = latestReading.systolic_bp ?? null;
      } else if (sensorType === 'FETAL_DOPPLER') {
        newValue = latestReading.heart_rate ?? null;
      } else if (sensorType === 'TOCODYNAMOMETER') {
        newValue = latestReading.contraction_intensity ?? null;
      }

      if (newValue !== null) {
        setValue(newValue);
        setTimestamp(latestReading.timestamp);
      }
    }
  }, [latestReading, sensorType]);

  // Determinar color según rango normal
  const getStatusColor = (): string => {
    if (value === null) return 'text-[#8e96a3]';
    if (value < normalRange[0] || value > normalRange[1]) {
      return 'text-[#c4848c]';
    }
    return 'text-[#4d7d6c]';
  };

  const getIcon = () => {
    const className = `w-8 h-8 ${getStatusColor()}`;
    switch (icon) {
      case 'heart':
        return <Heart className={className} />;
      case 'activity':
        return <Activity className={className} />;
      case 'gauge':
        return <Gauge className={className} />;
    }
  };

return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-[#e8e2d9]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: '#5a6272' }}>{title}</h3>
        {getIcon()}
      </div>

      <div className="flex items-baseline space-x-2">
        <span className={`text-5xl font-bold ${getStatusColor()}`}>
          {value !== null ? Math.round(value) : '--'}
        </span>
        <span className="text-xl" style={{ color: '#8e96a3' }}>{unit}</span>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span style={{ color: '#8e96a3' }}>
          Normal: {normalRange[0]}-{normalRange[1]}
        </span>
        {timestamp && (
          <span style={{ color: '#8e96a3' }}>
            {new Date(timestamp).toLocaleTimeString('es-BO')}
          </span>
        )}
      </div>

      {value !== null && (value < normalRange[0] || value > normalRange[1]) && (
        <div className="mt-3 px-3 py-2 bg-[#f9eced] border border-[#f0d4d7] rounded-lg">
          <p className="text-sm font-medium" style={{ color: '#a06068' }}>⚠️ Fuera de rango normal</p>
        </div>
      )}
    </div>
  );
};