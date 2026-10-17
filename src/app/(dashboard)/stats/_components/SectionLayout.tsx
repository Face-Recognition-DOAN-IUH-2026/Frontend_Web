"use client";

import { Stack, Box, Typography, Paper, Divider } from "@mui/material";
import { ReactNode } from "react";

interface SectionLayoutProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  kpiCards?: ReactNode;
  sx?: object;
}

export default function SectionLayout({
  title,
  subtitle,
  icon,
  actions,
  children,
  kpiCards,
  sx,
}: SectionLayoutProps) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden", ...sx }}>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          px: 2.5,
          py: 1.5,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "action.hover",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
          {icon && (
            <Box sx={{ color: "primary.main", fontSize: 24 }}>{icon}</Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary" }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
        {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
      </Stack>

      {kpiCards && (
        <>
          <Divider variant="inset" component="div" sx={{ mb: 0 }} />
          <Box sx={{ p: 2 }}>{kpiCards}</Box>
          <Divider variant="inset" component="div" sx={{ mb: 0 }} />
        </>
      )}

      <Box sx={{ flex: 1, p: 2 }}>{children}</Box>
    </Paper>
  );
}