import React from 'react';

interface InputCardProps {
  label: string;
  value: number | string;
  onChange?: (val: string) => void;
  icon?: React.ReactNode;
  hint?: string;
  step?: string;
  readOnly?: boolean;
  highlight?: boolean;
}

export const InputCard: React.FC<InputCardProps> = ({ 
  label, 
  value, 
  onChange, 
  icon, 
  hint, 
  step = "0.0001", 
  readOnly = false,
  highlight = false
}) => {
  return (
    <div className={`p-5 rounded-xl border shadow-sm transition-all duration-300 ${
      highlight 
        ? 'bg-emerald-900/20 border-emerald-500/50 shadow-emerald-900/20' 
        : 'bg-slate-800 border-slate-700 hover:border-slate-600'
    }`}>
      <div className="flex justify-between items-center mb-3">
        <label className={`text-sm font-medium flex items-center gap-2 ${highlight ? 'text-emerald-400' : 'text-slate-400'}`}>
          {icon}
          {label}
        </label>
      </div>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder="0.00"
          step={step}
          readOnly={readOnly}
          className={`w-full text-2xl font-bold p-3 rounded-lg border focus:outline-none focus:ring-2 transition-colors ${
            readOnly 
              ? 'bg-transparent border-transparent cursor-default' 
              : 'bg-slate-900 border-slate-700 focus:ring-red-500 placeholder-slate-600'
          } ${highlight ? 'text-emerald-400' : 'text-white'}`}
        />
        {readOnly && <div className="absolute right-3 top-4 text-xs font-mono text-slate-500">sAVAX</div>}
      </div>
      {hint && <p className={`text-xs mt-3 ${highlight ? 'text-emerald-400/80' : 'text-slate-500'}`}>{hint}</p>}
    </div>
  );
};
