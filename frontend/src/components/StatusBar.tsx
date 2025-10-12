import React from 'react';

interface StatusBarProps {
  status: string;
  isError?: boolean;
  isSuccess?: boolean;
}

const StatusBar: React.FC<StatusBarProps> = ({ status, isError, isSuccess }) => {
  return (
    <div className="absolute left-4 bottom-4 bg-slate-900/90 border border-muted px-3 py-2 rounded-lg text-fg shadow-custom text-xs z-[600]">
      {isError && <span className="text-red-500 font-bold">Hata:</span>}
      {isSuccess && <span className="text-accent font-bold">OK</span>}
      {!isError && !isSuccess && status}
    </div>
  );
};

export default StatusBar;
