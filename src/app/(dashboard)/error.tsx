'use client';

import { useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 3, sm: 8 },
        textAlign: 'center',
      }}
    >
      <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        Lỗi hệ thống
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
        {error.message || 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.'}
      </Typography>
      <Button variant="contained" onClick={reset}>
        Thử lại
      </Button>
    </Box>
  );
}
