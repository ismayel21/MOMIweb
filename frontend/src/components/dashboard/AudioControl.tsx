import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';
import { audioAPI } from '@/api/audio';

const GAIN_MAX  = 800;
const GAIN_STEP = 50;

export const AudioControl: React.FC = () => {
  const [volume, setVolume]       = useState(200);   // gain 0–800
  const [muted, setMuted]         = useState(false);
  const [prevVol, setPrevVol]     = useState(200);   // para restaurar al desmutear
  const [pending, setPending]     = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sincronizar estado con el ESP32 cada 5 s
  useEffect(() => {
    const sync = async () => {
      try {
        const { data } = await audioAPI.state();
        setVolume(data.volume);
        setMuted(data.volume === 0);
      } catch { /* sin conexión, ignorar */ }
    };
    sync();
    pollRef.current = setInterval(sync, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const send = async (action: () => Promise<any>, optimisticVol?: number) => {
    if (pending) return;
    setPending(true);
    if (optimisticVol !== undefined) setVolume(optimisticVol);
    try { await action(); } catch { /* mostrar error si se desea */ }
    setPending(false);
  };

  const handleUp = () => {
    const next = Math.min(GAIN_MAX, volume + GAIN_STEP);
    send(() => audioAPI.up(), next);
    setMuted(false);
  };

  const handleDown = () => {
    const next = Math.max(0, volume - GAIN_STEP);
    send(() => audioAPI.down(), next);
    if (next === 0) setMuted(true);
  };

  const handleMute = () => {
    if (muted) {
      const restore = prevVol > 0 ? prevVol : GAIN_STEP * 4; // 200 por defecto
      send(() => audioAPI.set(restore), restore);
      setMuted(false);
    } else {
      setPrevVol(volume > 0 ? volume : prevVol);
      send(() => audioAPI.set(0), 0);
      setMuted(true);
    }
  };

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    setMuted(val === 0);
    if (val > 0) setPrevVol(val);
    send(() => audioAPI.set(val));
  };

  const pct = Math.round((volume / GAIN_MAX) * 100);

  const VolumeIcon = muted || volume === 0
    ? VolumeX
    : volume < GAIN_MAX / 2
    ? Volume1
    : Volume2;

  return (
    <div className="bg-white rounded-xl shadow-md p-4 border border-[#e8e2d9]">
      <div className="flex items-center gap-2 mb-3">
        <VolumeIcon className="w-4 h-4" style={{ color: '#6a9e8a' }} />
        <h3 className="text-sm font-semibold" style={{ color: '#5a6272' }}>Audio Doppler</h3>
        <span className="ml-auto text-xs" style={{ color: '#8e96a3' }}>
          {muted ? 'Silenciado' : `${pct}%`}
        </span>
      </div>

      {/* Slider */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={handleDown}
          disabled={pending || volume === 0}
          className="w-7 h-7 rounded-full bg-[#f4f1ec] hover:bg-[#e8e2d9] flex items-center justify-center
                     font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ color: '#5a6272' }}
        >
          −
        </button>

        <div className="flex-1 relative">
          <input
            type="range"
            min={0}
            max={GAIN_MAX}
            step={GAIN_STEP}
            value={volume}
            onChange={handleSlider}
            disabled={pending}
            className="w-full h-2 rounded-full appearance-none cursor-pointer
                       disabled:opacity-40"
            style={{
              background: `linear-gradient(to right, #6a9e8a ${pct}%, #e8e2d9 ${pct}%)`,
              accentColor: '#6a9e8a',
            }}
          />
        </div>

        <button
          onClick={handleUp}
          disabled={pending || volume === GAIN_MAX}
          className="w-7 h-7 rounded-full bg-[#f4f1ec] hover:bg-[#e8e2d9] flex items-center justify-center
                     font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ color: '#5a6272' }}
        >
          +
        </button>

        {/* Mute toggle */}
        <button
          onClick={handleMute}
          disabled={pending}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors
            ${muted
              ? 'bg-[#f9eced] text-[#c4848c] hover:bg-[#f0d4d7]'
              : 'bg-[#f4f1ec] text-[#8e96a3] hover:bg-[#e8e2d9]'}
            disabled:opacity-40 disabled:cursor-not-allowed`}
          title={muted ? 'Activar audio' : 'Silenciar'}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Barra visual de nivel */}
      <div className="flex gap-0.5">
        {Array.from({ length: 16 }, (_, i) => {
          const barPct = ((i + 1) / 16) * 100;
          const active = !muted && pct >= barPct - 6;
          const color  = i >= 13 ? 'bg-[#c4848c]' : i >= 10 ? 'bg-[#9b8ec4]' : 'bg-[#6a9e8a]';
          return (
            <div
              key={i}
              className={`flex-1 h-2 rounded-sm transition-all ${active ? color : 'bg-[#f0ebe3]'}`}
            />
          );
        })}
      </div>
    </div>
  );
};
