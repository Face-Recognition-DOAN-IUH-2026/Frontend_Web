'use client';

import { Box, Typography } from '@mui/material';
import Spin from 'antd/es/spin';
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
    bgColor: 'rgba(16,185,129,0.1)',
    pulseColor: 'emerald',
    iconColor: 'success.main',
    icon: <CheckCircleIcon sx={{ fontSize: 64 }} />,
  },
  error: {
    borderColor: 'error.main',
    bgColor: 'rgba(239,68,68,0.1)',
    pulseColor: 'red',
    iconColor: 'error.main',
    icon: <ErrorIcon sx={{ fontSize: 64 }} />,
  },
  unregistered: {
    borderColor: 'primary.main',
    bgColor: 'rgba(59,130,246,0.1)',
    pulseColor: 'blue',
    iconColor: 'primary.main',
    icon: <CancelIcon sx={{ fontSize: 64 }} />,
  },
  processing: {
    borderColor: 'grey.500',
    bgColor: 'rgba(107,114,128,0.1)',
    pulseColor: 'none',
    iconColor: 'grey.500',
    icon: <Spin size="large" />,
  },
};

const messageColors: Record<string, string> = {
  success: 'success.light',
  error: 'error.light',
  unregistered: 'primary.light',
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
        borderRadius: 4,
        p: 4,
        textAlign: 'center',
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
            <Typography variant="h4" color="common.white" sx={{ fontWeight: 700 }}>
              {patronInfo.fullName}
            </Typography>
            <Typography variant="h6" color="primary.light" sx={{ fontFamily: "monospace" }}>
              {patronInfo.mssv}
            </Typography>
            <Typography variant="body1" color="grey.400">
              {patronInfo.faculty}
            </Typography>
          </Box>
        )}

        {message && (
          <Typography variant="h6" color={messageColors[status]}>
            {message}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
