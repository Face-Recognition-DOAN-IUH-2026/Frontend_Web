"use client";

import React from "react";
import { Box, Chip, Stack, Typography, alpha, useTheme } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

interface LegendItem {
  label: string;
  color: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
  description?: string;
}

const ITEMS: LegendItem[] = [
  {
    label: "Đang trực",
    color: "#10b981",
    bgLight: "rgba(16, 185, 129, 0.12)",
    bgDark: "rgba(16, 185, 129, 0.18)",
    borderLight: "rgba(16, 185, 129, 0.35)",
    borderDark: "rgba(16, 185, 129, 0.45)",
  },
  {
    label: "Hôm nay",
    color: "#f59e0b",
    bgLight: "rgba(245, 158, 11, 0.12)",
    bgDark: "rgba(245, 158, 11, 0.18)",
    borderLight: "rgba(245, 158, 11, 0.35)",
    borderDark: "rgba(245, 158, 11, 0.45)",
  },
  {
    label: "Sắp tới",
    color: "#3b82f6",
    bgLight: "rgba(59, 130, 246, 0.1)",
    bgDark: "rgba(59, 130, 246, 0.15)",
    borderLight: "rgba(59, 130, 246, 0.3)",
    borderDark: "rgba(59, 130, 246, 0.4)",
  },
  {
    label: "Đã qua",
    color: "#94a3b8",
    bgLight: "rgba(148, 163, 184, 0.1)",
    bgDark: "rgba(148, 163, 184, 0.12)",
    borderLight: "rgba(148, 163, 184, 0.25)",
    borderDark: "rgba(148, 163, 184, 0.3)",
  },
  {
    label: "Thiếu người",
    color: "#f97316",
    bgLight: "rgba(249, 115, 22, 0.12)",
    bgDark: "rgba(249, 115, 22, 0.18)",
    borderLight: "rgba(249, 115, 22, 0.35)",
    borderDark: "rgba(249, 115, 22, 0.45)",
  },
  {
    label: "Đã hủy",
    color: "#ef4444",
    bgLight: "rgba(239, 68, 68, 0.12)",
    bgDark: "rgba(239, 68, 68, 0.18)",
    borderLight: "rgba(239, 68, 68, 0.35)",
    borderDark: "rgba(239, 68, 68, 0.45)",
  },
];

export default function TimetableLegend() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: "center",
        flexWrap: "wrap",
        gap: 1,
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mr: 0.5 }}>
        <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            color: "text.secondary",
            textTransform: "uppercase",
            letterSpacing: 0.6,
            fontSize: "0.72rem",
          }}
        >
          CHÚ THÍCH TRẠNG THÁI:
        </Typography>
      </Stack>

      {ITEMS.map((item) => (
        <Chip
          key={item.label}
          size="small"
          icon={
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: item.color,
                boxShadow: `0 0 6px ${alpha(item.color, 0.6)}`,
                ml: "4px !important",
              }}
            />
          }
          label={item.label}
          sx={{
            height: 24,
            fontSize: "0.74rem",
            fontWeight: 700,
            bgcolor: isDark ? item.bgDark : item.bgLight,
            color: isDark ? "#fff" : "text.primary",
            border: `1px solid ${isDark ? item.borderDark : item.borderLight}`,
            borderRadius: "6px",
            transition: "all 0.2s ease",
            "&:hover": {
              bgcolor: isDark ? alpha(item.color, 0.25) : alpha(item.color, 0.18),
              borderColor: item.color,
            },
          }}
        />
      ))}
    </Stack>
  );
}
