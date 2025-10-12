import React from 'react';
import { LZCenter } from '../types';

interface TopLZSectionProps {
  topLZ: LZCenter[];
  onZoomToBest: () => void;
  onLZClick: (lz: LZCenter) => void;
}

const TopLZSection: React.FC<TopLZSectionProps> = ({ topLZ, onZoomToBest, onLZClick }) => {
  return (
    <div className="bg-white/[0.02] border border-muted rounded-custom p-3">
      <h3 className="m-0 mb-2.5 text-sm tracking-wide text-fg-dim font-bold uppercase">Top-10 LZ</h3>
      <div className="text-xs text-fg-dim mb-1.5">
        Listeden tıklayınca haritada ilgili LZ'ye zoom yapılır.
      </div>
      <ol className="m-0 mb-1.5 ml-4.5 p-0 grid gap-1.5">
        {topLZ.map((lz, index) => (
          <li 
            key={index}
            className="cursor-pointer hover:text-brand transition-colors"
            onClick={() => onLZClick(lz)}
          >
            <strong>#{index + 1}</strong> • {Math.round(lz.radius)} m • {lz.lat.toFixed(5)}, {lz.lon.toFixed(5)}
          </li>
        ))}
      </ol>
      <div className="flex gap-2.5">
        <button 
          className="appearance-none border border-muted bg-transparent text-fg px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200 font-semibold hover:bg-white/5"
          onClick={onZoomToBest}
        >
          #1'e Zoom
        </button>
      </div>
    </div>
  );
};

export default TopLZSection;
