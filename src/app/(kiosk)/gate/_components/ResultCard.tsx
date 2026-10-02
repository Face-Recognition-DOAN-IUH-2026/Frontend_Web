'use client';

import { Box, CircularProgress, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CancelIcon from '@mui/icons-material/Cancel';
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

type PulseColor = 'emerald' | 'red' | 'blue' | 'none';

const statusConfig: Record<string, {
  borderColor: string;
  bgColor: string;
  pulseColor: PulseColor;
  iconColor: string;
  icon: React.ReactNode;
}> = {
  success: {
    borderColor: 'success.main',
    bgColor: 'rgba(16,185,129,0.12)',
    pulseColor: 'emerald',
    iconColor: 'success.main',
    icon: <CheckCircleIcon sx={{ fontSize: 68 }} />,
  },
  error: {
    borderColor: 'error.main',
    bgColor: 'rgba(239,68,68,0.12)',
    pulseColor: 'red',
    iconColor: 'error.main',
    icon: <ErrorIcon sx={{ fontSize: 68 }} />,
  },
  unregistered: {
    borderColor: 'warning.main',
    bgColor: 'rgba(245,158,11,0.12)',
    pulseColor: 'blue',
    iconColor: 'warning.main',
    icon: <CancelIcon sx={{ fontSize: 68 }} />,
  },
  processing: {
    borderColor: 'primary.main',
    bgColor: 'rgba(139,0,0,0.08)',
    pulseColor: 'none',
    iconColor: 'primary.main',
    icon: <CircularProgress size={56} sx={{ color: 'primary.main' }} />,
  },
};

const messageColors: Record<string, string> = {
  success: 'success.main',
  error: 'error.main',
  unregistered: 'warning.main',
  processing: 'text.secondary',
};

export default function ResultCard({ status, patronInfo, message }: ResultCardProps) {
  const config = statusConfig[status];

  return (
    <Box
      sx={{
        position: 'relative',
        border: 2,
        borderColor: config.borderColor,
        bgcolor: config.bgColor,
        backdropFilter: 'blur(12px)',
        borderRadius: 4,
        p: 4,
        textAlign: 'center',
        transition: 'all 0.3s ease',
      }}
    >
      {config.pulseColor !== 'none' && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <PulseAnimation color={config.pulseColor} />
        </Box>
      )}

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, color: config.iconColor }}>
          {config.icon}
        </Box>

        {patronInfo && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary" }}>
              {patronInfo.fullName}
            </Typography>
            <Typography variant="subtitle1" color="primary.main" sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, mt: 0.5 }}>
              MSSV: {patronInfo.mssv}
            </Typography>
            {patronInfo.faculty && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {patronInfo.faculty}
              </Typography>
            )}
          </Box>
        )}

        {message && (
          <Typography variant="h6" color={messageColors[status]} sx={{ fontWeight: 700 }}>
            {message}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
