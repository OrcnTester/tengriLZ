import React from 'react';

interface BaseMapSectionProps {
  selectedBaseMap: string;
  onBaseMapChange: (baseMap: string) => void;
}

const BaseMapSection: React.FC<BaseMapSectionProps> = ({ selectedBaseMap, onBaseMapChange }) => {
  const baseMaps = [
    { value: 'osm', label: 'OSM' },
    { value: 'opentopo', label: 'Topo' },
    { value: 'esri', label: 'Uydu' },
  ];

  return (
    <div className="bg-white/[0.02] border border-muted rounded-custom p-3">
      <h3 className="m-0 mb-2.5 text-sm tracking-wide text-fg-dim font-bold uppercase">Taban Harita</h3>
      <div className="grid grid-cols-3 gap-1.5">
        {baseMaps.map((baseMap) => (
          <React.Fragment key={baseMap.value}>
            <input 
              type="radio" 
              name="bm" 
              id={`bm-${baseMap.value}`}
              value={baseMap.value}
              checked={selectedBaseMap === baseMap.value}
              onChange={(e) => onBaseMapChange(e.target.value)}
              className="hidden"
            />
            <label 
              htmlFor={`bm-${baseMap.value}`}
              className={`text-center p-2 border border-muted rounded-lg cursor-pointer font-semibold transition-all duration-200 ${
                selectedBaseMap === baseMap.value 
                  ? 'border-brand text-fg shadow-[0_0_0_4px_rgba(96,165,250,.12)]' 
                  : 'text-fg-dim'
              }`}
            >
              {baseMap.label}
            </label>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default BaseMapSection;
