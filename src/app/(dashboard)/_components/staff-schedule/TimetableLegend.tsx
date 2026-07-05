"use client";

import { Box, Stack, Typography } from "@mui/material";

const ITEMS = [
  { bg: "background.paper",       border: "action.hover",         label: "Đã qua",      variant: "outlined" as const },
  { bg: "rgba(16,185,129,0.08)",  border: "#10b981",              label: "Đang trực",   variant: "filled" as const, accentLeft: true },
  { bg: "background.paper",       border: "action.hover",         label: "Sắp tới",     variant: "outlined" as const },
  { bg: "rgba(245,158,11,0.08)",  border: "#f59e0b",              label: "Hôm nay",     variant: "filled" as const, accentLeft: true },
  { bg: "rgba(251,146,60,0.08)",  border: "rgba(251,146,60,0.35)",label: "Thiếu người", variant: "filled" as const },
  { bg: "rgba(239,68,68,0.06)",   border: "rgba(239,68,68,0.25)", label: "Đã hủy",      variant: "filled" as const },
];

export default function TimetableLegend() {
  return (
    <Stack direction="row" spacing={2} sx={{ pt: 3, borderTop: "1px solid", borderColor: "divider", alignItems: "center", flexWrap: "wrap", gap: 0.5 }}>
      <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", mr: 0.5, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.7rem" }}>
        Chú thích:
      </Typography>
      {ITEMS.map((item) => (
        <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{
            width: 12,
            height: 12,
            borderRadius: 0.5,
            bgcolor: item.bg,
            border: "1px solid",
            borderColor: item.border,
            borderLeftWidth: item.accentLeft ? 3 : 1,
            borderLeftColor: item.accentLeft ? item.border : undefined,
          }} />
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>{item.label}</Typography>
        </Box>
      ))}
    </Stack>
  );
}
