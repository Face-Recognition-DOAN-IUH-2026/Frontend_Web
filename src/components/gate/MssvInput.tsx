'use client';

import { useState, KeyboardEvent } from 'react';

interface MssvInputProps {
  onSubmit: (mssv: string) => void;
  disabled?: boolean;
}

export default function MssvInput({ onSubmit, disabled }: MssvInputProps) {
  const [value, setValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit(value.trim());
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Nhập MSSV..."
        className="w-full bg-slate-800/80 border border-slate-600 rounded-xl px-5 py-4 text-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all disabled:opacity-50 font-mono tracking-wider text-center"
      />
      {value && (
        <button
          onClick={() => onSubmit(value.trim())}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 disabled:opacity-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      )}
    </div>
  );
}