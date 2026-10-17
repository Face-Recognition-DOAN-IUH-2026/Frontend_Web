"use client";

import { Paper, Typography, Box, Stack } from "@mui/material";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number;
  actions?: React.ReactNode;
  sx?: object;
}

export default function ChartCard({
  title,
  subtitle,
  children,
  height = 300,
  actions,
  sx,
}: ChartCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        ...sx,
      }}
    >
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
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary" }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
      </Stack>
      <Box
        style={{
          flex: 1,
          height,
          minHeight: height,
        }}
        sx={{
          p: 2,
          width: "100%",
          display: "flex",
          alignItems: "stretch",
        }}
      >
        {children}
      </Box>
    </Paper>
  );
}