import React from 'react';

interface M2SectionProps {
  window: number;
  pad: number;
  minH: number;
  sigma: number;
  altMode: 'AGL' | 'MSL';
  altVal: number;
  corridor: number;
  minClr: number;
  step: number;
  end: string;
  onWindowChange: (window: number) => void;
  onPadChange: (pad: number) => void;
  onMinHChange: (minH: number) => void;
  onSigmaChange: (sigma: number) => void;
  onAltModeChange: (altMode: 'AGL' | 'MSL') => void;
  onAltValChange: (altVal: number) => void;
  onCorridorChange: (corridor: number) => void;
  onMinClrChange: (minClr: number) => void;
  onStepChange: (step: number) => void;
  onEndChange: (end: string) => void;
  onObstaclesAOI: () => void;
  onClearanceAOI: () => void;
}

const M2Section: React.FC<M2SectionProps> = ({
  window,
  pad,
  minH,
  sigma,
  altMode,
  altVal,
  corridor,
  minClr,
  step,
  end,
  onWindowChange,
  onPadChange,
  onMinHChange,
  onSigmaChange,
  onAltModeChange,
  onAltValChange,
  onCorridorChange,
  onMinClrChange,
  onStepChange,
  onEndChange,
  onObstaclesAOI,
  onClearanceAOI,
}) => {
  return (
    <div className="bg-white/[0.02] border border-muted rounded-custom p-3">
      <h3 className="m-0 mb-2.5 text-sm tracking-wide text-fg-dim font-bold uppercase">M2 (AOI) • Engeller & Clearance</h3>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">Pencere (m)</span>
          <input 
            type="number" 
            step="100" 
            value={window}
            onChange={(e) => onWindowChange(parseFloat(e.target.value) || 0)}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          />
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">Pad (m) (ops.)</span>
          <input 
            type="number" 
            step="50" 
            value={pad}
            onChange={(e) => onPadChange(parseFloat(e.target.value) || 0)}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">Min Engel H (m)</span>
          <input 
            type="number" 
            step="0.5" 
            value={minH}
            onChange={(e) => onMinHChange(parseFloat(e.target.value) || 0)}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          />
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">Yumuşatma σ</span>
          <input 
            type="number" 
            step="0.5" 
            value={sigma}
            onChange={(e) => onSigmaChange(parseFloat(e.target.value) || 0)}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">AGL/MSL</span>
          <select 
            value={altMode}
            onChange={(e) => onAltModeChange(e.target.value as 'AGL' | 'MSL')}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          >
            <option value="AGL">AGL</option>
            <option value="MSL">MSL</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">Uçuş irtifası (m)</span>
          <input 
            type="number" 
            step="1" 
            value={altVal}
            onChange={(e) => onAltValChange(parseFloat(e.target.value) || 0)}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">Koridor genişliği (m)</span>
          <input 
            type="number" 
            step="10" 
            value={corridor}
            onChange={(e) => onCorridorChange(parseFloat(e.target.value) || 0)}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          />
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">Min clearance (m)</span>
          <input 
            type="number" 
            step="1" 
            value={minClr}
            onChange={(e) => onMinClrChange(parseFloat(e.target.value) || 0)}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">Örnekleme adımı (m)</span>
          <input 
            type="number" 
            step="5" 
            value={step}
            onChange={(e) => onStepChange(parseFloat(e.target.value) || 0)}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          />
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">Rota bitişi (lat,lon)</span>
          <input 
            placeholder="39.790, 30.560"
            value={end}
            onChange={(e) => onEndChange(e.target.value)}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          />
        </div>
      </div>
      <div className="flex gap-2.5 mt-2.5">
        <button 
          className="appearance-none border border-muted bg-transparent text-fg px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200 font-semibold hover:bg-white/5"
          onClick={onObstaclesAOI}
        >
          Engeller (AOI)
        </button>
        <button 
          className="flex-1 bg-gradient-to-b from-blue-500 to-blue-600 border border-blue-700 font-bold text-white px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200 hover:brightness-105"
          onClick={onClearanceAOI}
        >
          Clearance (AOI)
        </button>
      </div>
    </div>
  );
};

export default M2Section;
