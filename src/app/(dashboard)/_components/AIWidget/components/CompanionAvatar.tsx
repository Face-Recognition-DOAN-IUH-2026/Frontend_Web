'use client';

import React from 'react';
import { Box, keyframes } from '@mui/material';
import type { CompanionState, VisemeData } from '@/lib/types/ai';

interface CompanionAvatarProps {
  state: CompanionState;
  visemeData?: VisemeData[];
  size?: number;
}

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const speaking = keyframes`
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.1); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(139, 0, 0, 0.3); }
  50% { box-shadow: 0 0 40px rgba(139, 0, 0, 0.6); }
`;

const getStateColor = (state: CompanionState): string => {
  switch (state) {
    case 'idle':
      return '#8B0000';
    case 'listening':
      return '#0A2540';
    case 'speaking':
      return '#059669';
    case 'thinking':
      return '#D4AF37';
    case 'error':
      return '#DC2626';
    default:
      return '#8B0000';
  }
};

const getStateAnimation = (state: CompanionState) => {
  switch (state) {
    case 'idle':
      return `${pulse} 2s ease-in-out infinite`;
    case 'listening':
      return `${pulse} 1s ease-in-out infinite`;
    case 'speaking':
      return `${speaking} 0.3s ease-in-out infinite`;
    case 'thinking':
      return `${pulse} 1.5s ease-in-out infinite`;
    default:
      return 'none';
  }
};

export default function CompanionAvatar({
  state,
  visemeData = [],
  size = 120,
}: CompanionAvatarProps) {
  const color = getStateColor(state);
  const animation = getStateAnimation(state);

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        animation,
        transition: 'all 0.3s ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: -4,
          borderRadius: '50%',
          border: `2px solid ${color}40`,
          animation: state === 'speaking' ? `${glow} 1s ease-in-out infinite` : 'none',
        },
      }}
    >
      <Box
        sx={{
          width: size * 0.6,
          height: size * 0.6,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.3,
          fontWeight: 'bold',
          color,
        }}
      >
        {state === 'thinking' ? '...' : state === 'error' ? '!' : 'AI'}
      </Box>

      {state === 'speaking' && visemeData.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: -8,
            display: 'flex',
            gap: 0.5,
            alignItems: 'flex-end',
            height: 20,
          }}
        >
          {visemeData.slice(0, 5).map((viseme, index) => (
            <Box
              key={index}
              sx={{
                width: 4,
                height: Math.max(4, viseme.value * 2),
                background: color,
                borderRadius: 1,
                transition: 'height 0.1s ease',
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
