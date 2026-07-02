'use client';

import { Box } from '@mui/material';
import { keyframes } from '@mui/system';

const pulseAnimation = keyframes`
  0% { transform: scale(1); opacity: 0; }
  50% { opacity: 0.4; }
  100% { transform: scale(1.8); opacity: 0; }
`;

interface PulseAnimationProps {
  color?: 'blue' | 'emerald' | 'red';
  size?: number;
}

const colorMap = {
  blue: { border: 'primary.main', ring: 'primary.dark' },
  emerald: { border: 'success.main', ring: 'success.dark' },
  red: { border: 'error.main', ring: 'error.dark' },
};

export default function PulseAnimation({ color = 'blue', size = 120 }: PulseAnimationProps) {
  const colors = colorMap[color];

  return (
    <Box sx={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer pulse ring */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: 2,
          borderColor: colors.border,
          animation: `${pulseAnimation} 2s ease-out infinite`,
        }}
      />
      {/* Middle ring */}
      <Box
        sx={{
          position: 'absolute',
          inset: '8px',
          borderRadius: '50%',
          border: 1,
          borderColor: colors.border,
          opacity: 0.4,
        }}
      />
      {/* Inner ring */}
      <Box
        sx={{
          position: 'absolute',
          inset: '16px',
          borderRadius: '50%',
          border: 1,
          borderColor: colors.border,
          opacity: 0.6,
        }}
      />
    </Box>
  );
}
