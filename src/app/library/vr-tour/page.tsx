'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Box, CircularProgress, Typography } from '@mui/material';

const VRViewer = dynamic(() => import('@/app/library/vr-tour/_components/VRViewer'), {
  ssr: false,
  loading: () => (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        bgcolor: "#020617",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CircularProgress size={48} sx={{ color: "primary.light", mb: 2 }} />
      <Typography variant="h6" color="common.white" sx={{ fontWeight: 700 }}>
        Đang tải không gian tham quan 3D...
      </Typography>
      <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>
        Vui lòng chờ trong giây lát
      </Typography>
    </Box>
  ),
});

export default function VRTourPage() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Box
        sx={{
          width: "100vw",
          height: "100vh",
          bgcolor: "#020617",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress size={48} sx={{ color: "primary.light", mb: 2 }} />
        <Typography variant="h6" color="common.white" sx={{ fontWeight: 700 }}>
          Đang tải không gian tham quan 3D...
        </Typography>
        <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>
          Vui lòng chờ trong giây lát
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="main" sx={{ width: "100vw", height: "100vh", overflow: "hidden", bgcolor: "common.black" }}>
      <VRViewer />
    </Box>
  );
}
