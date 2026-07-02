"use client";

import { Box, Stack, Typography } from "@mui/material";

const ITEMS = [
  { bg: "rgba(255,255,255,0.04)",       border: "rgba(255,255,255,0.08)",  label: "Đã qua" },
  { bg: "rgba(16,185,129,0.20)",        border: "rgba(16,185,129,0.5)",   label: "Đang trực" },
  { bg: "rgba(99,102,241,0.20)",        border: "rgba(99,102,241,0.5)",    label: "Sắp tới" },
  { bg: "rgba(245,158,11,0.20)",        border: "rgba(245,158,11,0.5)",   label: "Hôm nay" },
  { bg: "rgba(251,146,60,0.20)",        border: "rgba(251,146,60,0.5)",   label: "Thiếu người" },
  { bg: "rgba(239,68,68,0.20)",         border: "rgba(239,68,68,0.5)",    label: "Đã hủy" },
  { bg: "rgba(99,102,241,0.10)",        border: "rgba(99,102,241,0.25)",  label: "Hoàn thành" },
  { bg: "rgba(239,68,68,0.10)",         border: "rgba(239,68,68,0.30)",   label: "Tạm ngưng" },
  { bg: "rgba(245,158,11,0.10)",        border: "rgba(245,158,11,0.30)",  label: "Chờ xác nhận" },
  { bg: "rgba(99,102,241,0.06)",        border: "rgba(99,102,241,0.15)",  label: "Chờ admin xác nhận" },
];

export default function TimetableLegend() {
  return (
    <Stack direction="row" spacing={2} sx={{ pt: 3, borderTop: "1px solid", borderColor: "divider", alignItems: "center", flexWrap: "wrap", gap: 0.5 }}>
      <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", mr: 0.5, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.7rem" }}>
        Chú thích:
      </Typography>
      {ITEMS.map((item) => (
        <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: item.bg, border: `1px solid ${item.border}` }} />
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>{item.label}</Typography>
        </Box>
      ))}
    </Stack>
  );
}
