'use client';

import { Button } from '@mui/material';
import type { ButtonProps } from '@mui/material';

interface GateButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  fullWidth?: boolean;
}

const variantConfig = {
  primary: {
    color: 'primary' as const,
    variant: 'contained' as const,
    sx: {
      py: 2,
      px: 4,
      fontSize: '1.1rem',
      fontWeight: 700,
      borderRadius: 3,
      textTransform: 'none',
      boxShadow: '0 4px 14px 0 rgba(59,130,246,0.39)',
      '&:hover': { boxShadow: '0 6px 20px 0 rgba(59,130,246,0.47)' },
    },
  } satisfies Partial<ButtonProps>,
  secondary: {
    color: 'inherit' as const,
    variant: 'outlined' as const,
    sx: {
      py: 2,
      px: 4,
      fontSize: '1.1rem',
      fontWeight: 700,
      borderRadius: 3,
      textTransform: 'none',
      borderColor: 'grey.600',
      color: 'white',
      '&:hover': { borderColor: 'grey.500', bgcolor: 'rgba(255,255,255,0.05)' },
    },
  } satisfies Partial<ButtonProps>,
  danger: {
    color: 'error' as const,
    variant: 'outlined' as const,
    sx: {
      py: 2,
      px: 4,
      fontSize: '1.1rem',
      fontWeight: 700,
      borderRadius: 3,
      textTransform: 'none',
      borderColor: 'error.dark',
      color: 'error.light',
      bgcolor: 'rgba(239,68,68,0.1)',
      '&:hover': { bgcolor: 'rgba(239,68,68,0.15)', borderColor: 'error.main' },
    },
  } satisfies Partial<ButtonProps>,
};

export default function GateButton({
  onClick,
  children,
  variant = 'primary',
  disabled,
  fullWidth,
}: GateButtonProps) {
  const config = variantConfig[variant];

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      fullWidth={fullWidth}
      variant={variant === 'primary' ? 'contained' : config.variant || 'outlined'}
      color={config.color}
      sx={config.sx}
    >
      {children}
    </Button>
  );
}
