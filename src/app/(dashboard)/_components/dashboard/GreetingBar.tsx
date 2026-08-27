"use client";

import { useEffect, useState } from "react";
import { Box, Chip, IconButton, Stack, Tooltip, Typography, useTheme } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import NightlightOutlinedIcon from "@mui/icons-material/NightlightOutlined";
import WbTwilightOutlinedIcon from "@mui/icons-material/WbTwilightOutlined";
import SensorIcon from "@mui/icons-material/SensorsOutlined";
import { fadeInUp } from "@/lib/animations";

interface GreetingBarProps {
  userName: string;
  onRefresh: () => void;
  liveConnected: boolean;
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Chào buổi sáng", icon: <WbSunnyOutlinedIcon sx={{ fontSize: 18, color: "#f59e0b" }} /> };
  if (hour >= 12 && hour < 18) return { text: "Chào buổi chiều", icon: <WbTwilightOutlinedIcon sx={{ fontSize: 18, color: "#f97316" }} /> };
  return { text: "Chào buổi tối", icon: <NightlightOutlinedIcon sx={{ fontSize: 18, color: "#6366f1" }} /> };
}

export default function GreetingBar({ userName, onRefresh, liveConnected }: GreetingBarProps) {
  const theme = useTheme();
  const [timeStr, setTimeStr] = useState<string>("");
  const greeting = getTimeGreeting();

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
        gap: 1.5,
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 20px -4px rgba(0, 0, 0, 0.05)",
        animation: `${fadeInUp} 0.4s ease-out`,
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        {greeting.icon}
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.2 }}>
            {greeting.text}, {userName}!
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize" }}>
            {today} {timeStr ? `· ${timeStr}` : ""}
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", width: { xs: "100%", sm: "auto" }, justifyContent: "space-between" }}>
        <Chip
          icon={<SensorIcon sx={{ fontSize: "15px !important" }} />}
          label={liveConnected ? "Dữ liệu thời gian thực" : "Tự động làm mới"}
          size="small"
          sx={{
            bgcolor: liveConnected ? "rgba(16, 185, 129, 0.1)" : "action.hover",
            color: liveConnected ? "#059669" : "text.secondary",
            border: "1px solid",
            borderColor: liveConnected ? "rgba(16, 185, 129, 0.3)" : "divider",
            fontWeight: 700,
            fontSize: "0.75rem",
          }}
        />
        <Tooltip title="Làm mới toàn bộ dữ liệu">
          <IconButton
            onClick={onRefresh}
            size="small"
            sx={{
              border: "1px solid",
              borderColor: "divider",
              transition: "transform 0.2s ease",
              "&:hover": { transform: "rotate(45deg)", bgcolor: "action.hover" },
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}

