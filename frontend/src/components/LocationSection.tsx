import React from 'react';

interface LocationSectionProps {
  lat: number;
  lon: number;
  onLatChange: (lat: number) => void;
  onLonChange: (lon: number) => void;
  onUseMapCenter: () => void;
}

const LocationSection: React.FC<LocationSectionProps> = ({ 
  lat, 
  lon, 
  onLatChange, 
  onLonChange, 
  onUseMapCenter 
}) => {
  return (
    <div className="bg-white/[0.02] border border-muted rounded-custom p-3">
      <h3 className="m-0 mb-2.5 text-sm tracking-wide text-fg-dim font-bold uppercase">Konum</h3>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">Merkez Enlem (lat)</span>
          <input 
            type="number" 
            step="0.000001" 
            value={lat}
            onChange={(e) => onLatChange(parseFloat(e.target.value) || 0)}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          />
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs text-fg-dim">Merkez Boylam (lon)</span>
          <input 
            type="number" 
            step="0.000001" 
            value={lon}
            onChange={(e) => onLonChange(parseFloat(e.target.value) || 0)}
            className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          />
        </div>
      </div>
      <div className="flex gap-2.5 mt-2.5">
        <button 
          className="appearance-none border border-muted bg-transparent text-fg px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200 font-semibold hover:bg-white/5"
          onClick={onUseMapCenter}
        >
          Use Map Center
        </button>
      </div>
    </div>
  );
};

export default LocationSection;
