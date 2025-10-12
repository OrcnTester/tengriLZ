import React, { useState } from 'react';

interface ScanSectionProps {
  onScan: (radiusKm: number, stepM: number) => void;
}

const ScanSection: React.FC<ScanSectionProps> = ({ onScan }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [radiusKm, setRadiusKm] = useState(2);
  const [stepM, setStepM] = useState(400);

  return (
    <div className="bg-white/[0.02] border border-muted rounded-custom p-3">
      <h3 className="m-0 mb-2.5 text-sm tracking-wide text-fg-dim font-bold uppercase">Tarama (Gelişmiş)</h3>
      <details className="rounded-lg overflow-hidden">
        <summary 
          className="cursor-pointer list-none font-bold text-fg"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className={`inline-block w-2.5 h-2.5 border-r-2 border-b-2 border-fg-dim transform transition-transform duration-200 mr-2 ${
            isOpen ? 'rotate-45' : '-rotate-45'
          }`}></span>
          Aç/Kapat
        </summary>
        <div className="grid grid-cols-2 gap-2.5 mt-2.5">
          <div className="grid gap-1.5">
            <span className="text-xs text-fg-dim">Scan Yarıçapı (km)</span>
            <input 
              type="number" 
              step="0.5" 
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseFloat(e.target.value) || 0)}
              className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
            />
          </div>
          <div className="grid gap-1.5">
            <span className="text-xs text-fg-dim">Grid Adımı (m)</span>
            <input 
              type="number" 
              step="50" 
              value={stepM}
              onChange={(e) => setStepM(parseFloat(e.target.value) || 0)}
              className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
            />
          </div>
        </div>
        <div className="flex gap-2.5 mt-2.5">
          <button 
            className="appearance-none border border-muted bg-transparent text-fg px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200 font-semibold hover:bg-white/5"
            onClick={() => onScan(radiusKm, stepM)}
          >
            Scan Grid
          </button>
        </div>
      </details>
    </div>
  );
};

export default ScanSection;
