"use client";

import React from "react";
import { Box, Paper, Skeleton, Stack } from "@mui/material";
import DashboardCard from "./DashboardCard";

interface StatSectionSkeletonProps {
  title?: string;
  chartHeight?: number;
  chartLayout?: "single" | "split";
  showChips?: boolean;
}

/**
 * Reusable Skeleton loader for dashboard stat sections.
 * Matches exact dimensions and grid layout to eliminate Cumulative Layout Shift (CLS = 0).
 */
export default function StatSectionSkeleton({
  title,
  chartHeight = 280,
  chartLayout = "single",
  showChips = false,
}: StatSectionSkeletonProps) {
  return (
    <DashboardCard
      title={title}
      subtitle="Đang tải dữ liệu và biểu đồ phân tích..."
      actions={<Skeleton variant="rounded" width={80} height={30} sx={{ borderRadius: 1.5 }} />}
    >
      <Stack spacing={3} data-testid="stat-section-skeleton">
        {/* 4 KPI Cards Skeleton */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
            gap: 2,
          }}
        >
          {Array.from({ length: 4 }).map((_, idx) => (
            <Paper
              key={idx}
              variant="outlined"
              sx={{
                borderRadius: 2,
                p: 2,
                bgcolor: "background.paper",
                borderLeft: "3px solid",
                borderColor: "divider",
              }}
            >
              {/* Icon avatar + label */}
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
                <Skeleton variant="rounded" width={36} height={36} sx={{ borderRadius: 1 }} />
                <Skeleton variant="text" width="60%" height={16} />
              </Stack>
              {/* Big value */}
              <Skeleton variant="text" width="75%" height={36} sx={{ mb: 0.5 }} />
              {/* Delta / subtext */}
              <Skeleton variant="text" width="50%" height={14} />
            </Paper>
          ))}
        </Box>

        {/* Optional Condition Chips Row */}
        {showChips && (
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: "action.hover",
              border: 1,
              borderColor: "divider",
            }}
          >
            <Skeleton variant="text" width={180} height={20} sx={{ mb: 1.5 }} />
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  width={110 + (i % 3) * 20}
                  height={32}
                  sx={{ borderRadius: 4 }}
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Chart Skeleton */}
        {chartLayout === "split" ? (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "5fr 7fr" }, gap: 3 }}>
            <Box>
              <Skeleton variant="text" width={160} height={22} sx={{ mb: 1.5 }} />
              <Skeleton
                variant="rounded"
                width="100%"
                height={chartHeight}
                sx={{ borderRadius: 2 }}
              />
            </Box>
            <Box>
              <Skeleton variant="text" width={220} height={22} sx={{ mb: 1.5 }} />
              <Skeleton
                variant="rounded"
                width="100%"
                height={chartHeight}
                sx={{ borderRadius: 2 }}
              />
            </Box>
          </Box>
        ) : (
          <Box sx={{ width: "100%", pt: 1 }}>
            <Skeleton variant="text" width={200} height={22} sx={{ mb: 1.5 }} />
            <Skeleton
              variant="rounded"
              width="100%"
              height={chartHeight}
              sx={{ borderRadius: 2 }}
            />
          </Box>
        )}
      </Stack>
    </DashboardCard>
  );
}
