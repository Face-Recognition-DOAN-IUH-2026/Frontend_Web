"use client";

import { Avatar, Box, IconButton, Chip, Stack, Tooltip, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SensorIcon from "@mui/icons-material/SensorsOutlined";
import { fadeInUp } from "@/lib/animations";

interface GreetingBarProps {
  userName: string;
  onRefresh: () => void;
  liveConnected: boolean;
}

export default function GreetingBar({ userName, onRefresh, liveConnected }: GreetingBarProps) {
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        p: 2,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        animation: `${fadeInUp} 0.4s ease-out`,
      }}
    >
      <Typography variant="body1" sx={{ fontWeight: 600, color: "text.primary" }}>
        Xin chào, {userName} · {today}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Chip
          icon={<SensorIcon />}
          label={liveConnected ? "Live" : "Auto-refresh"}
          size="small"
          sx={{
            bgcolor: liveConnected ? "rgba(16,185,129,0.15)" : "action.hover",
            color: liveConnected ? "#6ee7b7" : "text.secondary",
            border: "1px solid",
            borderColor: liveConnected ? "rgba(16,185,129,0.3)" : "divider",
            fontWeight: 600,
          }}
        />
        <Tooltip title="Tải lại">
          <IconButton onClick={onRefresh} size="small">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
