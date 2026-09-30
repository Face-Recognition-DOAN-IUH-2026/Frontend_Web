"use client";

import React from "react";
import { Box, Paper, Skeleton, Typography, useTheme } from "@mui/material";
import { ALL_RESOURCES } from "@/lib/types";

export interface CompactMetricBarProps {
  loading: boolean;
  selectedRole: string;
  metrics: {
    totalRoles: number;
    allowedPagesCount: number;
    totalRoutes: number;
    activeCrudActionsCount: number;
    totalStaff: number;
  };
}

export function CompactMetricBar({
  loading,
  selectedRole,
  metrics,
}: CompactMetricBarProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Paper
      elevation={0}
      sx={{
        my: 2.5,
        borderRadius: "4px",
        border: "1px solid",
        borderColor: isDark ? "divider" : "#E2E8F0",
        bgcolor: isDark ? "background.paper" : "#FFFFFF",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
      }}
    >
      {/* Metric 1 */}
      <Box
        sx={{
          p: 2,
          borderRight: { sm: "1px solid", xs: "none" },
          borderBottom: { xs: "1px solid", md: "none" },
          borderColor: isDark ? "divider" : "#E2E8F0",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontFamily: "'Source Sans 3', sans-serif",
            color: isDark ? "#94A3B8" : "#64748B",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontSize: "0.72rem",
          }}
        >
          Vai trò hệ thống
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mt: 0.5 }}>
          <Typography
            sx={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 800,
              fontSize: "1.75rem",
              color: isDark ? "#F8FAFC" : "#0F172A",
              lineHeight: 1,
            }}
          >
            {loading ? <Skeleton width={40} /> : metrics.totalRoles}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: theme.palette.primary.main, fontWeight: 700 }}
          >
            roles
          </Typography>
        </Box>
      </Box>

      {/* Metric 2 */}
      <Box
        sx={{
          p: 2,
          borderRight: { md: "1px solid", xs: "none" },
          borderBottom: { xs: "1px solid", md: "none" },
          borderColor: isDark ? "divider" : "#E2E8F0",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontFamily: "'Source Sans 3', sans-serif",
            color: isDark ? "#94A3B8" : "#64748B",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontSize: "0.72rem",
          }}
        >
          Trang được cấp [{selectedRole}]
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mt: 0.5 }}>
          <Typography
            sx={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 800,
              fontSize: "1.75rem",
              color: isDark ? "#F8FAFC" : "#0F172A",
              lineHeight: 1,
            }}
          >
            {loading ? (
              <Skeleton width={50} />
            ) : (
              `${metrics.allowedPagesCount}/${metrics.totalRoutes}`
            )}
          </Typography>
          <Typography variant="caption" sx={{ color: "#059669", fontWeight: 700 }}>
            routes
          </Typography>
        </Box>
      </Box>

      {/* Metric 3 */}
      <Box
        sx={{
          p: 2,
          borderRight: { sm: "1px solid", xs: "none" },
          borderBottom: { xs: "1px solid", sm: "none" },
          borderColor: isDark ? "divider" : "#E2E8F0",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontFamily: "'Source Sans 3', sans-serif",
            color: isDark ? "#94A3B8" : "#64748B",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontSize: "0.72rem",
          }}
        >
          Hành động CRUD kích hoạt
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mt: 0.5 }}>
          <Typography
            sx={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 800,
              fontSize: "1.75rem",
              color: isDark ? "#F8FAFC" : "#0F172A",
              lineHeight: 1,
            }}
          >
            {loading ? (
              <Skeleton width={50} />
            ) : (
              `${metrics.activeCrudActionsCount}/${ALL_RESOURCES.length * 4}`
            )}
          </Typography>
          <Typography variant="caption" sx={{ color: "#D97706", fontWeight: 700 }}>
            actions
          </Typography>
        </Box>
      </Box>

      {/* Metric 4 */}
      <Box sx={{ p: 2 }}>
        <Typography
          variant="caption"
          sx={{
            fontFamily: "'Source Sans 3', sans-serif",
            color: isDark ? "#94A3B8" : "#64748B",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontSize: "0.72rem",
          }}
        >
          Nhân sự / Tài khoản
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mt: 0.5 }}>
          <Typography
            sx={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 800,
              fontSize: "1.75rem",
              color: isDark ? "#F8FAFC" : "#0F172A",
              lineHeight: 1,
            }}
          >
            {loading ? <Skeleton width={40} /> : metrics.totalStaff}
          </Typography>
          <Typography variant="caption" sx={{ color: isDark ? "#94A3B8" : "#64748B" }}>
            tài khoản
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
