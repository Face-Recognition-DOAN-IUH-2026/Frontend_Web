'use client';

import { useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 3,
        textAlign: 'center',
        bgcolor: 'background.default',
      }}
    >
      <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        Đã xảy ra lỗi
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
        {error.message || 'Không thể tải trang. Vui lòng thử lại.'}
      </Typography>
      <Button variant="contained" onClick={reset}>
        Thử lại
      </Button>
    </Box>
  );
}
