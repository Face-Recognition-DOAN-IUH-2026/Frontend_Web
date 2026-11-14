"use client";
import { Box, Button, Stack, Typography } from "@mui/material";
import WifiOffIcon from "@mui/icons-material/WifiOffOutlined";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";

interface PageErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export default function PageErrorState({
  title = "Không thể tải dữ liệu",
  message = "Đã xảy ra lỗi kết nối đến máy chủ. Vui lòng thử lại.",
  onRetry,
}: PageErrorStateProps) {
  return (
    <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", py: 10, px: 3 }}>
      <Stack spacing={2.5} sx={{ alignItems: "center", maxWidth: 380, textAlign: "center" }}>
        <WifiOffIcon sx={{ fontSize: 64, color: "text.disabled" }} />
        <Stack spacing={1}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>{message}</Typography>
        </Stack>
        {onRetry && (
          <Button variant="contained" onClick={onRetry} startIcon={<RefreshIcon />} sx={{ borderRadius: 2.5, fontWeight: 700 }}>
            Thử lại
          </Button>
        )}
      </Stack>
    </Box>
  );
}
