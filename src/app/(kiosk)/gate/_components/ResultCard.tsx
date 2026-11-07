"use client";

import { Avatar, Box, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import CancelIcon from "@mui/icons-material/Cancel";
import LoginIcon from "@mui/icons-material/LoginOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import PulseAnimation from "./PulseAnimation";

export interface ResultCardProps {
  status: "success" | "error" | "unregistered" | "processing";
  patronInfo?: {
    fullName: string;
    mssv: string;
    faculty?: string;
  };
  message?: string;
  accessType?: "entry" | "exit";
  confidence?: number | null;
}

type PulseColor = "emerald" | "red" | "blue" | "none";

const statusConfig: Record<
  string,
  {
    borderColor: string;
    bgColor: string;
    pulseColor: PulseColor;
    iconColor: string;
    icon: React.ReactNode;
  }
> = {
  success: {
    borderColor: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.08)",
    pulseColor: "emerald",
    iconColor: "#10b981",
    icon: <CheckCircleIcon sx={{ fontSize: 64 }} />,
  },
  error: {
    borderColor: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.08)",
    pulseColor: "red",
    iconColor: "#ef4444",
    icon: <ErrorIcon sx={{ fontSize: 64 }} />,
  },
  unregistered: {
    borderColor: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.08)",
    pulseColor: "blue",
    iconColor: "#f59e0b",
    icon: <CancelIcon sx={{ fontSize: 64 }} />,
  },
  processing: {
    borderColor: "primary.main",
    bgColor: "rgba(139, 0, 0, 0.05)",
    pulseColor: "none",
    iconColor: "primary.main",
    icon: <CircularProgress size={52} sx={{ color: "primary.main" }} />,
  },
};

const messageColors: Record<string, string> = {
  success: "#059669",
  error: "#dc2626",
  unregistered: "#d97706",
  processing: "text.secondary",
};

export default function ResultCard({
  status,
  patronInfo,
  message,
  accessType,
  confidence,
}: ResultCardProps) {
  const config = statusConfig[status];

  return (
    <Box
      sx={{
        position: "relative",
        border: 2,
        borderColor: config.borderColor,
        bgcolor: config.bgColor,
        backdropFilter: "blur(12px)",
        borderRadius: 3.5,
        p: { xs: 2.5, sm: 3 },
        textAlign: "center",
        transition: "all 0.3s ease",
        boxShadow:
          status === "success"
            ? "0 8px 30px rgba(16, 185, 129, 0.2)"
            : status === "error"
            ? "0 8px 30px rgba(239, 68, 68, 0.2)"
            : "0 4px 20px rgba(0, 0, 0, 0.08)",
      }}
    >
      {config.pulseColor !== "none" && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <PulseAnimation color={config.pulseColor} />
        </Box>
      )}

      <Box sx={{ position: "relative", zIndex: 1 }}>
        {accessType && (
          <Box sx={{ mb: 1.5 }}>
            <Chip
              size="small"
              icon={
                accessType === "entry" ? (
                  <LoginIcon sx={{ fontSize: 16 }} />
                ) : (
                  <LogoutIcon sx={{ fontSize: 16 }} />
                )
              }
              label={accessType === "entry" ? "CỔNG VÀO THƯ VIỆN" : "CỔNG RA THƯ VIỆN"}
              sx={{
                bgcolor: accessType === "entry" ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)",
                color: accessType === "entry" ? "#059669" : "#2563eb",
                border: "1px solid",
                borderColor: accessType === "entry" ? "rgba(16,185,129,0.3)" : "rgba(59,130,246,0.3)",
                fontWeight: 800,
                fontSize: "0.72rem",
                letterSpacing: 0.5,
              }}
            />
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5, color: config.iconColor }}>
          {config.icon}
        </Box>

        {patronInfo && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "center", mb: 1 }}>
              <Avatar
                sx={{
                  bgcolor: status === "success" ? "#10b981" : "primary.main",
                  color: "white",
                  fontWeight: 800,
                  width: 44,
                  height: 44,
                  fontSize: "1.1rem",
                }}
              >
                {patronInfo.fullName.slice(0, 1).toUpperCase()}
              </Avatar>
              <Box sx={{ textAlign: "left" }}>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  {patronInfo.fullName}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    color: "primary.main",
                    letterSpacing: 1,
                  }}
                >
                  {patronInfo.mssv}
                </Typography>
              </Box>
            </Stack>

            {patronInfo.faculty && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {patronInfo.faculty}
              </Typography>
            )}

            {confidence != null && (
              <Stack
                direction="row"
                spacing={0.75}
                sx={{ alignItems: "center", justifyContent: "center", mt: 1 }}
              >
                <ShieldOutlinedIcon sx={{ fontSize: 16, color: "#10b981" }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#059669" }}>
                  Độ tin cậy nhận diện: {Math.round(confidence * 100)}%
                </Typography>
              </Stack>
            )}
          </Box>
        )}

        {message && (
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 800,
              color: messageColors[status],
              letterSpacing: 0.25,
            }}
          >
            {message}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
