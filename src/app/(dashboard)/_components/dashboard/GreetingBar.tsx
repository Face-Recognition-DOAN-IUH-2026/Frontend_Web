"use client";

import { useEffect, useState } from "react";
import { Box, Chip, IconButton, Stack, Tooltip, Typography, alpha, useTheme } from "@mui/material";
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
  if (hour >= 5 && hour < 12) return { text: "Chào buổi sáng", icon: <WbSunnyOutlinedIcon sx={{ fontSize: 20, color: "#f59e0b" }} /> };
  if (hour >= 12 && hour < 18) return { text: "Chào buổi chiều", icon: <WbTwilightOutlinedIcon sx={{ fontSize: 20, color: "#f97316" }} /> };
  return { text: "Chào buổi tối", icon: <NightlightOutlinedIcon sx={{ fontSize: 20, color: "#D4AF37" }} /> };
}

export default function GreetingBar({ userName, onRefresh, liveConnected }: GreetingBarProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [timeStr, setTimeStr] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

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
        gap: 2,
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: isDark ? alpha(theme.palette.divider, 0.4) : alpha(theme.palette.primary.main, 0.1),
        bgcolor: isDark ? alpha(theme.palette.background.paper, 0.7) : "background.paper",
        backdropFilter: "blur(12px)",
        boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 4px 20px rgba(0,0,0,0.03)",
        animation: `${fadeInUp} 0.4s ease-out`,
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: isDark ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.primary.main, 0.08),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          {greeting.icon}
        </Box>
        <Box>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 800,
              color: "text.primary",
              lineHeight: 1.2,
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
            }}
          >
            {greeting.text}, {userName}!
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize", display: "flex", alignItems: "center", gap: 0.75 }}>
            <span>{today}</span>
            {timeStr && (
              <>
                <Box component="span" sx={{ width: 3, height: 3, borderRadius: "50%", bgcolor: "text.disabled" }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{timeStr}</span>
              </>
            )}
          </Typography>
        </Box>
      </Stack>

      <Stack
        direction="row"
        spacing={1.25}
        sx={{
          alignItems: "center",
          width: { xs: "100%", sm: "auto" },
          justifyContent: { xs: "space-between", sm: "flex-end" },
        }}
      >
        <Chip
          icon={
            <Box sx={{ position: "relative", width: 10, height: 10, mr: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: liveConnected ? "#10b981" : "#94a3b8",
                  position: "absolute",
                  top: 1,
                  left: 1,
                }}
              />
              {liveConnected && (
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    bgcolor: "rgba(16, 185, 129, 0.35)",
                    position: "absolute",
                    top: -2,
                    left: -2,
                    animation: "pulseRing 2s infinite ease-out",
                    "@keyframes pulseRing": {
                      "0%": { transform: "scale(0.8)", opacity: 1 },
                      "100%": { transform: "scale(2.2)", opacity: 0 },
                    },
                  }}
                />
              )}
            </Box>
          }
          label={liveConnected ? "WebSocket Trực Tiếp" : "Tự động đồng bộ"}
          size="small"
          sx={{
            bgcolor: liveConnected
              ? isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)"
              : "action.hover",
            color: liveConnected ? "#10b981" : "text.secondary",
            border: "1px solid",
            borderColor: liveConnected ? "rgba(16, 185, 129, 0.3)" : "divider",
            fontWeight: 700,
            fontSize: "0.74rem",
            px: 0.5,
          }}
        />
        <Tooltip title="Làm mới toàn bộ dữ liệu">
          <IconButton
            onClick={handleRefreshClick}
            size="small"
            sx={{
              border: "1px solid",
              borderColor: "divider",
              transition: "transform 0.5s ease",
              transform: isRefreshing ? "rotate(360deg)" : "none",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
