import React from 'react';
import { AircraftPresets } from '../types';

interface AircraftSectionProps {
  preset: string;
  rotor: number;
  margin: number;
  k: number;
  slope: number;
  diameter: number;
  onPresetChange: (preset: string) => void;
  onRotorChange: (rotor: number) => void;
  onMarginChange: (margin: number) => void;
  onKChange: (k: number) => void;
  onSlopeChange: (slope: number) => void;
  onDiameterChange: (diameter: number) => void;
}

const AC_PRESETS: AircraftPresets = {
  EC135: { rotor: 10.2, margin: 6, k: 1.5, slope: 8 },
  'UH-1H': { rotor: 14.63, margin: 8, k: 1.6, slope: 7 },
  S70: { rotor: 16.36, margin: 10, k: 1.7, slope: 6 },
};

const AircraftSection: React.FC<AircraftSectionProps> = ({
  preset,
  rotor,
  margin,
  k,
  slope,
  diameter,
  onPresetChange,
  onRotorChange,
  onMarginChange,
  onKChange,
  onSlopeChange,
  onDiameterChange,
}) => {
  const handlePresetChange = (newPreset: string) => {
    onPresetChange(newPreset);
    if (newPreset && AC_PRESETS[newPreset as keyof AircraftPresets]) {
      const presetData = AC_PRESETS[newPreset as keyof AircraftPresets];
      onRotorChange(presetData.rotor);
      onMarginChange(presetData.margin);
      onKChange(presetData.k);
      onSlopeChange(presetData.slope);
    }
  };

  return (
    <div className="bg-white/[0.02] border border-muted rounded-custom p-3">
      <h3 className="m-0 mb-2.5 text-sm tracking-wide text-fg-dim font-bold uppercase">Aircraft</h3>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">Preset</span>
          <select 
            value={preset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          >
            <option value="">Custom</option>
            <option value="EC135">EC135</option>
            <option value="UH-1H">UH-1H</option>
            <option value="S70">S70</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">Rotor çapı (m)</span>
          <input 
            type="number" 
            step="0.1" 
            value={rotor}
            onChange={(e) => onRotorChange(parseFloat(e.target.value) || 0)}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">Emniyet payı (m)</span>
          <input 
            type="number" 
            step="0.5" 
            value={margin}
            onChange={(e) => onMarginChange(parseFloat(e.target.value) || 0)}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          />
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">k faktörü</span>
          <input 
            type="number" 
            step="0.1" 
            value={k}
            onChange={(e) => onKChange(parseFloat(e.target.value) || 0)}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">Slope limiti (°)</span>
          <input 
            type="number" 
            step="0.5" 
            value={slope}
            onChange={(e) => onSlopeChange(parseFloat(e.target.value) || 0)}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          />
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">Min iniş çap (fallback)</span>
          <input 
            type="number" 
            step="1" 
            value={diameter}
            onChange={(e) => onDiameterChange(parseFloat(e.target.value) || 0)}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          />
        </div>
      </div>
    </div>
  );
};

export default AircraftSection;
