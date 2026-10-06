"use client";

import React from "react";
import { Box, Button, Stack, Tooltip, Typography, alpha, useTheme } from "@mui/material";
import PrintIcon from "@mui/icons-material/PrintOutlined";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";

import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import BookRecommendations from "@/app/(dashboard)/_components/BookRecommendations";
import { fadeInUp } from "@/lib/animations";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import { usePermission, getPermissionDeniedReason } from "@/lib/permission-context";

export interface BorrowStepSuccessProps {
  slipSuccess: { message: string; count: number };
  patronName: string;
  patronCode: string;
  dueDateStr: string;
  handleClearSession: () => void;
  onPrintReceipt: () => void;
}

export function BorrowStepSuccess({
  slipSuccess,
  patronName,
  patronCode,
  dueDateStr,
  handleClearSession,
  onPrintReceipt,
}: BorrowStepSuccessProps) {
  const theme = useTheme();
  const { can } = usePermission();
  const canPrintBorrow = can("borrows", "print");

  return (
    <Stack spacing={3} sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      <DashboardCard>
        <Stack spacing={2.5} sx={{ alignItems: "center", textAlign: "center", py: 4, px: 2 }}>
          <Box
            sx={{
              width: 76,
              height: 76,
              borderRadius: "50%",
              bgcolor: alpha(theme.palette.success.main, 0.12),
              color: "success.main",
              display: "grid",
              placeItems: "center",
              boxShadow: `0 0 0 8px ${alpha(theme.palette.success.main, 0.05)}`,
            }}
          >
            <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 44 }} />
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, fontFamily: "Space Grotesk, sans-serif" }}>
              Lập phiếu mượn sách thành công!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 540, mx: "auto", lineHeight: 1.6 }}>
              Đã mượn thành công <strong>{slipSuccess.count}</strong> cuốn sách cho độc giả{" "}
              <strong>{patronName}</strong> (MSSV: {patronCode}). Hạn trả sách: <strong>{dueDateStr}</strong>.
            </Typography>
          </Box>

          <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<RefreshIcon />}
              onClick={handleClearSession}
              sx={{
                borderRadius: 2.5,
                fontWeight: 700,
                textTransform: "none",
                px: 3.5,
                py: 1.2,
                boxShadow: "0 4px 14px rgba(139, 0, 0, 0.25)",
              }}
            >
              Tạo lượt mượn mới
            </Button>

            <Tooltip title={!canPrintBorrow ? getPermissionDeniedReason("borrows", "print") : ""}>
              <span>
                <Button
                  variant="outlined"
                  size="large"
                  disabled={!canPrintBorrow}
                  startIcon={<PrintIcon />}
                  onClick={() => {
                    if (!canPrintBorrow) return;
                    onPrintReceipt();
                  }}
                  sx={{
                    borderRadius: 2.5,
                    fontWeight: 700,
                    textTransform: "none",
                    px: 3,
                    borderColor: "divider",
                  }}
                >
                  In biên nhận
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </DashboardCard>

      {/* AI Book Recommendations for this Patron */}
      {patronCode.trim() && (
        <Box sx={{ ...staggerSx(2), animation: `${fadeInUp} 0.4s ease-out` }}>
          <BookRecommendations studentCode={patronCode.trim()} />
        </Box>
      )}
    </Stack>
  );
}
