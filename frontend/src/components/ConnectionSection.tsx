import React from 'react';

interface ConnectionSectionProps {
  baseUrl: string;
  onBaseUrlChange: (url: string) => void;
}

const ConnectionSection: React.FC<ConnectionSectionProps> = ({ baseUrl, onBaseUrlChange }) => {
  return (
    <div className="bg-white/[0.02] border border-muted rounded-custom p-3">
      <h3 className="m-0 mb-2.5 text-sm tracking-wide text-fg-dim font-bold uppercase">Bağlantı</h3>
      <div className="grid gap-1.5">
        <span className="text-xs text-fg-dim">API Adresi</span>
        <input 
          className="bg-[#0b1220] text-fg border border-muted rounded-lg p-2.5 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(96,165,250,.12)]"
          placeholder="http://127.0.0.1:8000" 
          value={baseUrl}
          onChange={(e) => onBaseUrlChange(e.target.value)}
        />
      </div>
    </div>
  );
};

export default ConnectionSection;
