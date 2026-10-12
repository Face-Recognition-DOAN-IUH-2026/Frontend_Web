"use client";

import { Box, Paper, Stack, Typography } from "@mui/material";
import UsersIcon from "@mui/icons-material/GroupsOutlined";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import AlertIcon from "@mui/icons-material/WarningAmberOutlined";

interface ReturnMetricsProps {
  totals: {
    borrowers: number;
    books: number;
    overdue: number;
  };
}

export default function ReturnMetricsBar({ totals }: ReturnMetricsProps) {
  const items = [
    {
      key: "borrowers",
      label: "Độc giả đang mượn",
      value: totals.borrowers,
      icon: <UsersIcon sx={{ fontSize: 20, color: "primary.main" }} />,
      color: "primary.main",
      accentColor: "#8B0000",
    },
    {
      key: "books",
      label: "Sách đang mượn",
      value: totals.books,
      icon: <BookIcon sx={{ fontSize: 20, color: "secondary.main" }} />,
      color: "secondary.main",
      accentColor: "#0A2540",
    },
    {
      key: "overdue",
      label: "Sách quá hạn",
      value: totals.overdue,
      icon: <AlertIcon sx={{ fontSize: 20, color: totals.overdue > 0 ? "error.main" : "text.secondary" }} />,
      color: totals.overdue > 0 ? "error.main" : "text.secondary",
      accentColor: totals.overdue > 0 ? "#dc2626" : "#64748b",
    },
  ];

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
      {items.map((item) => (
        <Paper
          key={item.key}
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: "background.paper",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "border-color 0.2s ease",
            "&:hover": {
              borderColor: item.accentColor,
            },
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>
              {item.label}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.25, color: item.color }}>
              {item.value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 1.5,
              bgcolor: "action.hover",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {item.icon}
          </Box>
        </Paper>
      ))}
    </Box>
  );
}
