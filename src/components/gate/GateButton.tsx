'use client';

interface GateButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export default function GateButton({
  onClick,
  children,
  variant = 'primary',
  disabled,
  fullWidth,
  className = '',
}: GateButtonProps) {
  const baseClasses = 'flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 active:scale-95',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 active:scale-95',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 active:scale-95',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}