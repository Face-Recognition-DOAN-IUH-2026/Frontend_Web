"use client";

import { Box, Skeleton, Stack, Paper } from "@mui/material";

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  columns?: number;
  showHeader?: boolean;
}

export default function TableSkeleton({ rows = 8, cols, columns = 5, showHeader = true }: TableSkeletonProps) {
  const columnCount = cols ?? columns;
  return (
    <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
      {showHeader && (
        <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
          <Stack direction="row" spacing={2}>
            {Array.from({ length: columnCount }).map((_, i) => (
              <Skeleton key={i} width={i === 0 ? 180 : 100} height={20} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        </Box>
      )}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <Box
          key={rowIdx}
          sx={{
            px: 2, py: 1.5,
            borderBottom: rowIdx < rows - 1 ? "1px solid" : "none",
            borderColor: "divider",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Skeleton variant="rectangular" width={16} height={16} sx={{ borderRadius: 0.5, flexShrink: 0 }} />
            {Array.from({ length: columnCount - 1 }).map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                width={colIdx === 0 ? "75%" : "45%"}
                height={16}
                sx={{ borderRadius: 1 }}
              />
            ))}
          </Stack>
        </Box>
      ))}
    </Paper>
  );
}
