"use client";

import React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import LocalLibraryIcon from "@mui/icons-material/LocalLibraryOutlined";

import { usePermission, getPermissionDeniedReason } from "@/lib/permission-context";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import { CONDITION_LABELS, getConditionColor, type CopyCondition } from "@/lib/constants/copy";
import type { FineBracket } from "@/lib/fee-estimate";
import type { BorrowCartItem } from "./types";

export interface BorrowStepConfirmProps {
  patronName: string;
  patronCode: string;
  borrowDateStr: string;
  dueDateStr: string;
  cartItems: BorrowCartItem[];
  creatingSlip: boolean;
  handleConfirmBorrowSlip: () => void;
  setCurrentStep: (step: number) => void;
  finePerDay?: number;
  fineBrackets?: FineBracket[];
  maxBorrowDays?: number;
}

export function BorrowStepConfirm({
  patronName,
  patronCode,
  borrowDateStr,
  dueDateStr,
  cartItems,
  creatingSlip,
  handleConfirmBorrowSlip,
  setCurrentStep,
  finePerDay,
  fineBrackets,
  maxBorrowDays,
}: BorrowStepConfirmProps) {
  const { can } = usePermission();
  const canCreateBorrow = can("borrows", "create") || can("borrows", "approve");
  const standardBorrowDays = maxBorrowDays ?? 14;
  const finePerDayStr = Number(finePerDay ?? 5000).toLocaleString("vi-VN");

  const formatBracketRange = (from: number, to: number | null) =>
    to === null || to === undefined ? `${from}+ ngày` : `${from}–${to} ngày`;

  return (
    <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      {/* Left Column: Summary of Patron & Books */}
      <Grid size={{ xs: 12, md: 7 }} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <DashboardCard title="Chi tiết phiếu mượn sách" actions={<LocalLibraryIcon color="primary" />}>
          <Stack spacing={2}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: "4px",
                bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)"),
              }}
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Họ tên độc giả:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>{patronName}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Mã số sinh viên (MSSV):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>
                    {patronCode}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Ngày mượn sách:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
                    {borrowDateStr}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Hạn trả quy định (+{standardBorrowDays} ngày):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: "error.main" }}>
                    {dueDateStr}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Danh sách {cartItems.length} cuốn sách sẽ mượn:
            </Typography>

            <Stack spacing={1} sx={{ maxHeight: 260, overflowY: "auto" }}>
              {cartItems.map((item, idx) => (
                <Box
                  key={item.barcode || idx}
                  sx={{
                    p: 1.2,
                    borderRadius: "4px",
                    border: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 800, color: "text.secondary", width: 24 }}>
                    #{idx + 1}
                  </Typography>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                      {item.book?.title || item.isbn}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Mã bản sao: {item.copy_barcode || item.barcode} • Kệ: {item.shelf_location || "Chung"}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                    {item.condition ? (
                      <Chip
                        size="small"
                        label={CONDITION_LABELS[item.condition as CopyCondition] || item.condition}
                        color={getConditionColor(item.condition)}
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    ) : null}
                    <Chip size="small" color="success" variant="outlined" label="Hợp lệ" sx={{ fontWeight: 600 }} />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Stack>
        </DashboardCard>
      </Grid>

      {/* Right Column: Regulations & Confirm Action */}
      <Grid size={{ xs: 12, md: 5 }} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <DashboardCard title="Quy định & Hoàn tất" actions={<CheckCircleIcon color="success" />}>
          <Stack spacing={2.5}>
            <Alert severity="info" sx={{ borderRadius: "4px" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Lưu ý mượn trả:</Typography>
              <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                • Thời hạn mượn sách tiêu chuẩn: <strong>{standardBorrowDays} ngày</strong>.<br />
                {fineBrackets && fineBrackets.length > 0 ? (
                  <>
                    • Phí phạt quá hạn theo bậc:<br />
                    {fineBrackets.map((b) => (
                      <span key={`${b.from}-${b.to ?? "max"}`} style={{ display: "block", paddingLeft: 8 }}>
                        {formatBracketRange(Number(b.from), b.to)}: <strong>{Number(b.amount).toLocaleString("vi-VN")}đ</strong>
                      </span>
                    ))}
                  </>
                ) : (
                  <>
                    • Phí phạt quá hạn: <strong>{finePerDayStr} đ/ngày/cuốn</strong>.<br />
                  </>
                )}
                • Độc giả có trách nhiệm bảo quản sách nguyên vẹn khi hoàn trả.
              </Typography>
            </Alert>

            <Tooltip title={!canCreateBorrow ? getPermissionDeniedReason("borrows", "create") : ""}>
              <span style={{ width: "100%" }}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={creatingSlip || cartItems.length === 0 || !canCreateBorrow}
                  onClick={() => {
                    if (!canCreateBorrow) return;
                    handleConfirmBorrowSlip();
                  }}
                  sx={{
                    py: 1.6,
                    borderRadius: "4px",
                    fontWeight: 800,
                    fontSize: "1.05rem",
                    textTransform: "none",
                  }}
                >
                  {creatingSlip ? (
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <CircularProgress size={22} color="inherit" />
                      <span>Đang tạo phiếu mượn...</span>
                    </Stack>
                  ) : (
                    `Xác nhận tạo phiếu (${cartItems.length} cuốn)`
                  )}
                </Button>
              </span>
            </Tooltip>

            <Button
              variant="outlined"
              fullWidth
              startIcon={<ArrowBackIcon />}
              onClick={() => setCurrentStep(1)}
              disabled={creatingSlip}
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: "4px" }}
            >
              Quay lại chọn thêm sách
            </Button>
          </Stack>
        </DashboardCard>
      </Grid>
    </Grid>
  );
}
