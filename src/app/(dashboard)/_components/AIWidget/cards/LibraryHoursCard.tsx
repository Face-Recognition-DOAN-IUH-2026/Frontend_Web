"use client";

import React from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import AccessTimeFilledIcon from "@mui/icons-material/AccessTimeFilled";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export interface LibraryScheduleItem {
  days: string;
  hours: string;
}

export interface LibraryScheduleData {
  schedule: LibraryScheduleItem[];
  note?: string;
}

interface LibraryHoursCardProps {
  data: LibraryScheduleData;
}

function normalizeDays(days: string): string {
  return days
    .replace(/Monday\s*-\s*Friday/i, "Thứ Hai - Thứ Sáu")
    .replace(/Saturday\s*-\s*Sunday/i, "Thứ Bảy - Chủ Nhật")
    .replace(/Monday/i, "Thứ Hai")
    .replace(/Tuesday/i, "Thứ Ba")
    .replace(/Wednesday/i, "Thứ Tư")
    .replace(/Thursday/i, "Thứ Năm")
    .replace(/Friday/i, "Thứ Sáu")
    .replace(/Saturday/i, "Thứ Bảy")
    .replace(/Sunday/i, "Chủ Nhật");
}

export default function LibraryHoursCard({ data }: LibraryHoursCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const scheduleList = Array.isArray(data?.schedule) ? data.schedule : [];
  const note = data?.note;

  return (
    <Card
      elevation={0}
      sx={{
        maxWidth: 380,
        width: "100%",
        my: 1,
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: isDark ? alpha("#2980B9", 0.3) : alpha("#1E6091", 0.2),
        background: isDark
          ? "linear-gradient(145deg, rgba(20, 35, 55, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)"
          : "linear-gradient(145deg, rgba(240, 247, 255, 0.9) 0%, rgba(255, 255, 255, 0.98) 100%)",
        boxShadow: isDark
          ? "0 4px 20px rgba(0, 0, 0, 0.4)"
          : "0 4px 16px rgba(30, 96, 145, 0.08)",
        overflow: "hidden",
      }}
    >
      {/* Header bar */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          background: isDark
            ? "linear-gradient(90deg, rgba(41, 128, 185, 0.25) 0%, rgba(15, 60, 92, 0.25) 100%)"
            : "linear-gradient(90deg, rgba(30, 96, 145, 0.12) 0%, rgba(41, 128, 185, 0.06) 100%)",
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AccessTimeFilledIcon
            sx={{
              color: isDark ? "#60A5FA" : "#1E6091",
              fontSize: 20,
            }}
          />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.2 }}>
            Lịch mở cửa thư viện IUH
          </Typography>
        </Box>
        <Chip
          label="Chính thức"
          size="small"
          sx={{
            height: 20,
            fontSize: "0.7rem",
            fontWeight: 600,
            bgcolor: isDark ? alpha("#10B981", 0.2) : alpha("#10B981", 0.12),
            color: isDark ? "#34D399" : "#059669",
            border: "1px solid",
            borderColor: isDark ? alpha("#10B981", 0.3) : alpha("#10B981", 0.25),
          }}
        />
      </Box>

      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Stack spacing={1.25}>
          {scheduleList.map((item, idx) => {
            const displayDays = normalizeDays(item.days);
            const isWeekend =
              displayDays.includes("Thứ Bảy") || displayDays.includes("Chủ Nhật");

            return (
              <Box
                key={idx}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1.25,
                  borderRadius: 1.5,
                  bgcolor: isDark
                    ? alpha("#FFFFFF", 0.04)
                    : alpha("#F1F5F9", 0.75),
                  border: "1px solid",
                  borderColor: isDark
                    ? alpha("#FFFFFF", 0.06)
                    : alpha("#E2E8F0", 0.8),
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: isDark
                      ? alpha("#FFFFFF", 0.07)
                      : alpha("#E2E8F0", 0.9),
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CalendarTodayOutlinedIcon
                    sx={{
                      fontSize: 16,
                      color: isWeekend
                        ? isDark
                          ? "#F59E0B"
                          : "#D97706"
                        : isDark
                        ? "#94A3B8"
                        : "#64748B",
                    }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {displayDays}
                  </Typography>
                </Box>

                <Chip
                  label={item.hours}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                    bgcolor: isWeekend
                      ? isDark
                        ? alpha("#F59E0B", 0.2)
                        : alpha("#F59E0B", 0.12)
                      : isDark
                      ? alpha("#2563EB", 0.2)
                      : alpha("#2563EB", 0.1),
                    color: isWeekend
                      ? isDark
                        ? "#FBBF24"
                        : "#B45309"
                      : isDark
                      ? "#93C5FD"
                      : "#1D4ED8",
                    border: "1px solid",
                    borderColor: isWeekend
                      ? isDark
                        ? alpha("#F59E0B", 0.3)
                        : alpha("#F59E0B", 0.25)
                      : isDark
                      ? alpha("#2563EB", 0.3)
                      : alpha("#2563EB", 0.2),
                  }}
                />
              </Box>
            );
          })}
        </Stack>

        {note && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1,
                p: 1,
                borderRadius: 1.5,
                bgcolor: isDark
                  ? alpha("#D97706", 0.1)
                  : alpha("#FEF3C7", 0.7),
                border: "1px solid",
                borderColor: isDark
                  ? alpha("#D97706", 0.2)
                  : alpha("#FDE68A", 0.8),
              }}
            >
              <InfoOutlinedIcon
                sx={{
                  fontSize: 16,
                  color: isDark ? "#FBBF24" : "#B45309",
                  mt: "2px",
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: isDark ? "#FDE68A" : "#92400E",
                  lineHeight: 1.4,
                  fontWeight: 500,
                }}
              >
                {note}
              </Typography>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
