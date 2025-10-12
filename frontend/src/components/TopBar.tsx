import React from 'react';

interface TopBarProps {
  onTogglePanel: () => void;
  onClear: () => void;
  onDownload: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onTogglePanel, onClear, onDownload }) => {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2 bg-panel border-b border-muted shadow-custom" style={{ gridArea: 'top' }}>
      <span className="inline-flex items-center gap-2.5 font-bold tracking-wide">
        <span className="w-2.5 h-2.5 rounded-full bg-brand shadow-[0_0_0_6px_rgba(96,165,250,.15)]"></span>
        TengriLZ • LZ Adayları
      </span>
      <div className="flex-1"></div>
      <button 
        className="appearance-none border border-muted bg-transparent text-fg px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200 font-semibold hover:bg-white/5"
        onClick={onTogglePanel}
        title="Paneli aç/kapat"
      >
        Panel
      </button>
      <button 
        className="appearance-none border border-muted bg-transparent text-fg px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200 font-semibold hover:bg-white/5"
        onClick={onClear}
        title="Haritadaki çizimleri temizle"
      >
        Temizle
      </button>
      <button 
        className="appearance-none border border-muted bg-transparent text-fg px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200 font-semibold hover:bg-white/5"
        onClick={onDownload}
        title="Son sonucu GeoJSON olarak indir"
      >
        İndir
      </button>
    </div>
  );
};

export default TopBar;
