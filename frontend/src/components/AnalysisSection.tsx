import React from 'react';

interface AnalysisSectionProps {
  window: number;
  slope: number;
  morph: 'closing' | 'opening';
  onWindowChange: (window: number) => void;
  onSlopeChange: (slope: number) => void;
  onMorphChange: (morph: 'closing' | 'opening') => void;
  onRun: () => void;
}

const AnalysisSection: React.FC<AnalysisSectionProps> = ({
  window,
  slope,
  morph,
  onWindowChange,
  onSlopeChange,
  onMorphChange,
  onRun,
}) => {
  return (
    <div className="bg-white/[0.02] border border-muted rounded-custom p-3">
      <h3 className="m-0 mb-2.5 text-sm tracking-wide text-fg-dim font-bold uppercase">Analiz</h3>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">Pencere Yarıçapı (m)</span>
          <input 
            type="number" 
            step="50" 
            value={window}
            onChange={(e) => onWindowChange(parseFloat(e.target.value) || 0)}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          />
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">Eğim Eşiği (°)</span>
          <input 
            type="number" 
            step="0.5" 
            value={slope}
            onChange={(e) => onSlopeChange(parseFloat(e.target.value) || 0)}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">Morfoloji</span>
          <select 
            value={morph}
            onChange={(e) => onMorphChange(e.target.value as 'closing' | 'opening')}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          >
            <option value="closing">closing (birleştir)</option>
            <option value="opening">opening (parçala)</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2.5 mt-2.5">
        <button 
          className="flex-1 bg-gradient-to-b from-blue-500 to-blue-600 border border-blue-700 font-bold text-white px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200 hover:brightness-105"
          onClick={onRun}
        >
          Adayları Getir
        </button>
      </div>
    </div>
  );
};

export default AnalysisSection;
