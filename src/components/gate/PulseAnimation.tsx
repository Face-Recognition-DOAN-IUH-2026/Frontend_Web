'use client';

interface PulseAnimationProps {
  color?: 'amber' | 'emerald' | 'red';
  size?: number;
}

export default function PulseAnimation({ color = 'amber', size = 120 }: PulseAnimationProps) {
  const colorMap = {
    amber: 'border-amber-500',
    emerald: 'border-emerald-500',
    red: 'border-red-500',
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div
        className={`absolute inset-0 rounded-full border-2 ${colorMap[color]} opacity-0 animate-ping`}
        style={{ animationDuration: '2s' }}
      />
      <div
        className={`absolute inset-2 rounded-full border ${colorMap[color]} opacity-40`}
      />
      <div
        className={`absolute inset-4 rounded-full border ${colorMap[color]} opacity-60`}
      />
    </div>
  );
}