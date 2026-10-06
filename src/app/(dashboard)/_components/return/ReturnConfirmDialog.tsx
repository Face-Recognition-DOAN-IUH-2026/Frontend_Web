"use client";

import React from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { BorrowRecord, StaffPatronActiveBorrowsResponse } from "@/lib/types";
import { usePermission, getPermissionDeniedReason } from "@/lib/permission-context";
import { CONDITION_CODES, CONDITION_LABELS, CopyCondition } from "@/lib/constants/copy";
import { estimateOverdueFine, estimateDamageFee, FineConfigDto } from "@/lib/fee-estimate";

interface PaymentChoice {
  isPaidImmediately: boolean;
  paymentMethod: "cash" | "qr_code";
}

interface ReturnConfirmDialogProps {
  record: BorrowRecord | null;
  detail: StaffPatronActiveBorrowsResponse | null;
  condition: string;
  note?: string;
  fineConfig?: FineConfigDto | null;
  onConditionChange: (val: string) => void;
  onNoteChange?: (val: string) => void;
  onClose: () => void;
  onConfirm: (payment: PaymentChoice) => void;
  loading: boolean;
}

export default function ReturnConfirmDialog({
  record,
  detail,
  condition,
  note = "",
  fineConfig,
  onConditionChange,
  onNoteChange,
  onClose,
  onConfirm,
  loading,
}: ReturnConfirmDialogProps) {
  const { can } = usePermission();
  const canUpdateBorrow = can("borrows", "update");
  const patronName = detail?.patron.full_name || detail?.patron.student_code || "độc giả";
  const [isPaidImmediately, setIsPaidImmediately] = React.useState(true);
  const [paymentMethod, setPaymentMethod] = React.useState<"cash" | "qr_code">("cash");

  const selectedCondition = condition || record?.copy?.condition || "good";

  const overdueDays = record && record.due_at && new Date(record.due_at).getTime() < Date.now()
    ? Math.max(1, Math.ceil((Date.now() - new Date(record.due_at).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const overdueFine = overdueDays > 0 ? estimateOverdueFine(overdueDays, fineConfig) : 0;
  const damageFee = estimateDamageFee(selectedCondition, (record as any)?.book?.price ?? null, fineConfig);
  const isNormalCondition = selectedCondition === "good" || selectedCondition === "new";
  const estimatedTotal = overdueFine + damageFee;
  const hasFee = estimatedTotal > 0;

  return (
    <Dialog open={!!record} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Xác nhận trả sách</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Xác nhận nhận lại sách &quot;<strong>{record?.book?.title || record?.book_id}</strong>&quot; từ độc giả {patronName}?
        </DialogContentText>

        {record && overdueDays > 0 ? (
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Sách đã quá hạn {overdueDays} ngày
            </Typography>
            <Typography variant="body2" sx={{ fontSize: "0.82rem", mt: 0.5 }}>
              Tiền phạt trễ hạn ước tính: <strong>{overdueFine.toLocaleString("vi-VN")} đ</strong>
              {damageFee > 0 ? <> · Phí hư hỏng ước tính: <strong>{damageFee.toLocaleString("vi-VN")} đ</strong></> : null}.
              Thủ thư vui lòng kiểm tra và thu phí (nếu có) trước khi hoàn tất.
            </Typography>
          </Alert>
        ) : null}

        {damageFee > 0 ? (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            Phí hư hỏng ước tính: <strong>{damageFee.toLocaleString("vi-VN")} đ</strong> (theo tình trạng sách đã chọn). Thủ thư vui lòng kiểm tra trước khi hoàn tất.
          </Alert>
        ) : null}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="return-condition-label">Tình trạng sách khi trả</InputLabel>
            <Select
              labelId="return-condition-label"
              id="return-condition-select"
              label="Tình trạng sách khi trả"
              value={selectedCondition}
              onChange={(e) => onConditionChange(e.target.value)}
            >
              {CONDITION_CODES.map((code: CopyCondition) => (
                <MenuItem key={code} value={code}>
                  {CONDITION_LABELS[code]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {hasFee ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <input
              type="checkbox"
              id="pay-immediately"
              checked={isPaidImmediately}
              onChange={(e) => setIsPaidImmediately(e.target.checked)}
            />
            <Typography component="label" htmlFor="pay-immediately" variant="body2">
              Đã thu phí ngay
            </Typography>
          </Box>
          ) : (
          <Typography variant="body2" color="text.secondary">
            Không phát sinh phí — chỉ cần xác nhận trả sách.
          </Typography>
          )}

          {isPaidImmediately && hasFee && !isNormalCondition && (
            <FormControl fullWidth size="small">
              <InputLabel id="payment-method-label">Phương thức thanh toán</InputLabel>
              <Select
                labelId="payment-method-label"
                id="payment-method-select"
                label="Phương thức thanh toán"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as "cash" | "qr_code")}
              >
                <MenuItem value="cash">Tiền mặt</MenuItem>
                <MenuItem value="qr_code">Quét mã QR</MenuItem>
              </Select>
            </FormControl>
          )}

          {hasFee ? (
          <TextField
            label="Ghi chú thêm (tuỳ chọn)"
            value={note}
            onChange={(e) => onNoteChange?.(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
            placeholder="Ghi chú thêm nếu sách có hư hỏng..."
          />
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Hủy</Button>
        <Tooltip title={!canUpdateBorrow ? getPermissionDeniedReason("borrows", "update") : ""}>
          <span>
            <Button
              variant="contained"
              color="success"
              onClick={() => {
                if (!canUpdateBorrow) return;
                onConfirm({ isPaidImmediately, paymentMethod });
              }}
              disabled={loading || !canUpdateBorrow}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {loading ? "Đang trả..." : hasFee ? "Xác nhận trả" : "Hoàn tất"}
            </Button>
          </span>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
}
