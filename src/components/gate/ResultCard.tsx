'use client';

import PulseAnimation from './PulseAnimation';

interface ResultCardProps {
  status: 'success' | 'error' | 'unregistered' | 'processing';
  patronInfo?: {
    fullName: string;
    mssv: string;
    faculty: string;
  };
  message?: string;
}

export default function ResultCard({ status, patronInfo, message }: ResultCardProps) {
  type PulseColor = 'emerald' | 'red' | 'amber' | 'none';
  const config: Record<string, {
    borderColor: string;
    bgColor: string;
    pulseColor: PulseColor;
    icon: React.ReactNode;
  }> = {
    success: {
      borderColor: 'border-emerald-500',
      bgColor: 'bg-emerald-500/10',
      pulseColor: 'emerald',
      icon: (
        <svg className="w-16 h-16 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    error: {
      borderColor: 'border-red-500',
      bgColor: 'bg-red-500/10',
      pulseColor: 'red',
      icon: (
        <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    unregistered: {
      borderColor: 'border-amber-500',
      bgColor: 'bg-amber-500/10',
      pulseColor: 'amber',
      icon: (
        <svg className="w-16 h-16 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
    },
    processing: {
      borderColor: 'border-slate-500',
      bgColor: 'bg-slate-500/10',
      pulseColor: 'none',
      icon: (
        <div className="w-16 h-16 border-4 border-slate-500 border-t-transparent rounded-full animate-spin" />
      ),
    },
  };

  const { borderColor, bgColor, pulseColor, icon } = config[status];

  return (
    <div className={`relative border-2 ${borderColor} ${bgColor} rounded-2xl p-8 text-center`}>
      {pulseColor !== 'none' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <PulseAnimation color={pulseColor} />
        </div>
      )}

      <div className="relative z-10">
        <div className="flex justify-center mb-4">{icon}</div>

        {patronInfo && (
          <div className="space-y-2 mb-4">
            <h3 className="text-2xl font-bold text-white">{patronInfo.fullName}</h3>
            <p className="text-amber-400 font-mono text-lg">{patronInfo.mssv}</p>
            <p className="text-slate-400">{patronInfo.faculty}</p>
          </div>
        )}

        {message && (
          <p className={`text-lg ${status === 'success' ? 'text-emerald-400' : status === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}