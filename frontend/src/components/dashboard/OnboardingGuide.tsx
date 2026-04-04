import React, { useState, useEffect } from 'react';
import { Info, X } from 'lucide-react';

const STEPS = [
  { icon: '👤', title: 'Registrar paciente', desc: 'Asegúrate de tener al menos una paciente registrada en el sistema.' },
  { icon: '🔍', title: 'Seleccionar paciente', desc: 'En el panel derecho, selecciona la paciente a monitorear.' },
  { icon: '▶', title: 'Iniciar monitoreo', desc: 'Presiona "Iniciar Monitoreo". Los datos se guardan solo durante sesión activa.' },
  { icon: '⏹', title: 'Terminar sesión', desc: 'Al finalizar presiona "Terminar Sesión". Los datos quedan en el historial.' },
];

const STORAGE_KEY = 'momi_guide_dismissed';

export const OnboardingGuide: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="bg-[#e8f2ee] border border-[#b8d9ce] rounded-xl p-4 mb-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 flex-shrink-0" style={{ color: '#6a9e8a' }} />
          <span className="text-sm font-semibold" style={{ color: '#4d7d6c' }}>¿Cómo usar MOMI Dashboard?</span>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="transition-colors"
          style={{ color: '#6a9e8a' }}
          title="No mostrar más"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STEPS.map((step, i) => (
          <div key={i} className="flex flex-col items-center text-center bg-white rounded-lg p-3 border border-[#c8e6de]">
            <span className="text-2xl mb-1">{step.icon}</span>
            <span className="text-xs font-semibold mb-1" style={{ color: '#4d7d6c' }}>{i + 1}. {step.title}</span>
            <span className="text-xs" style={{ color: '#8e96a3' }}>{step.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
