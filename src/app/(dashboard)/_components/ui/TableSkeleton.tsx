"use client";

import { Box, Paper, Skeleton, Stack } from "@mui/material";

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  height?: number;
}

export default function TableSkeleton({
  columns = 5,
  rows = 6,
  height = 40,
}: TableSkeletonProps) {
  const colWidths = ["20%", "30%", "15%", "15%", "20%"];

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper" }}>
      {/* Header row */}
      <Stack direction="row" spacing={2} sx={{ pb: 1.5, mb: 1.5, borderBottom: 1, borderColor: "divider" }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Box key={i} sx={{ width: colWidths[i % colWidths.length], flexShrink: 0 }}>
            <Skeleton variant="text" height={24} width="70%" />
          </Box>
        ))}
      </Stack>

      {/* Body rows */}
      <Stack spacing={1.5}>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <Stack
            key={rowIdx}
            direction="row"
            spacing={2}
            sx={{
              py: 0.75,
              alignItems: "center",
              borderBottom: rowIdx < rows - 1 ? "1px solid" : "none",
              borderColor: "divider",
            }}
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Box key={colIdx} sx={{ width: colWidths[colIdx % colWidths.length], flexShrink: 0 }}>
                <Skeleton
                  variant="rounded"
                  height={height - 16}
                  width={colIdx === 0 ? "85%" : colIdx === 1 ? "95%" : "60%"}
                  sx={{ borderRadius: 1 }}
                />
              </Box>
            ))}
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}
