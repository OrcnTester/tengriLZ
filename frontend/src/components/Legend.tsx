import React from 'react';

const Legend: React.FC = () => {
  return (
    <div className="absolute right-4 bottom-4 z-[550] bg-slate-900/95 border border-muted px-2.5 py-2 rounded-lg text-xs text-fg">
      <div className="flex items-center gap-2 my-1">
        <span className="w-4 h-2.5 rounded bg-red-500"></span>
        En iyi LZ (kalın kırmızı + numara)
      </div>
      <div className="flex items-center gap-2 my-1">
        <span className="w-4 h-2.5 rounded bg-warn"></span>
        Aday merkezler (turuncu)
      </div>
      <div className="flex items-center gap-2 my-1">
        <span className="w-4 h-2.5 rounded bg-accent"></span>
        Temiz alan poligonları (yeşil)
      </div>
    </div>
  );
};

export default Legend;
