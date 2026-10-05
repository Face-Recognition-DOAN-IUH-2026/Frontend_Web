"use client";

import React from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PrintIcon from "@mui/icons-material/Print";
import { QRCodeSVG } from "qrcode.react";
import type { BorrowRecord } from "@/lib/types";

export interface ReturnReceiptProps {
  record: BorrowRecord | null;
  patron?: { full_name?: string | null; student_code?: string | null } | null;
  onClose: () => void;
}

export default function ReturnReceipt({ record, patron, onClose }: ReturnReceiptProps) {
  if (!record) return null;

  const totalDue = Number(
    record.total_due ??
    ((Number(record.fine_amount) || 0) + (Number(record.damage_fee) || 0))
  );

  const isPaid = Boolean(record.fine_paid || record.payment_ref || totalDue === 0);
  const paymentMethodLabel =
    record.payment_method === "qr_code" || record.payment_method === "vietqr"
      ? "Chuyển khoản VietQR"
      : record.payment_method === "cash"
      ? "Tiền mặt"
      : totalDue > 0
      ? "Ghi nhận nợ (Chưa thu)"
      : "Miễn phí";

  const returnConditionLabel =
    record.return_condition === "good"
      ? "Tốt / Bình thường"
      : record.return_condition === "damaged"
      ? "Hư hỏng / Rách"
      : record.return_condition === "lost"
      ? "Mất sách"
      : record.return_condition || "Bình thường";

  const transactionDate = record.paid_at
    ? new Date(record.paid_at).toLocaleString("vi-VN")
    : record.return_at
    ? new Date(record.return_at).toLocaleString("vi-VN")
    : new Date().toLocaleString("vi-VN");

  const patronDisplayName = patron?.full_name
    ? `${patron.full_name} (${patron.student_code || ""})`
    : patron?.student_code ?? "—";

  const refCode = record.payment_ref || `RET-${record.id.slice(0, 8).toUpperCase()}`;

  const rows: Array<{ label: string; value: string; strong?: boolean; color?: string }> = [
    { label: "Mã giao dịch", value: refCode },
    { label: "Thời gian", value: transactionDate },
    { label: "Độc giả", value: patronDisplayName },
    { label: "Nhan đề sách", value: record.book?.title ?? record.book_id },
    { label: "Tình trạng sách", value: returnConditionLabel },
    {
      label: "Phạt trễ hạn",
      value: `${Number(record.fine_amount ?? 0).toLocaleString("vi-VN")} đ`,
    },
    {
      label: "Phí bồi hoàn / Hư hỏng",
      value: `${Number(record.damage_fee ?? 0).toLocaleString("vi-VN")} đ`,
    },
    {
      label: "Tổng tiền",
      value: `${totalDue.toLocaleString("vi-VN")} đ`,
      strong: true,
      color: "primary.main",
    },
    { label: "Phương thức", value: paymentMethodLabel },
  ];

  return (
    <Dialog
      open={!!record}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      sx={{
        "@media print": {
          "& .MuiBackdrop-root": { display: "none" },
          "& .MuiDialog-container": { height: "auto" },
          "& .MuiPaper-root": {
            boxShadow: "none",
            m: 0,
            p: 0,
            maxWidth: "100%",
            width: "100%",
          },
        },
      }}
    >
      <DialogTitle component="div" sx={{ textAlign: "center", pb: 0 }}>
        <Typography component="div" variant="caption" sx={{ textTransform: "uppercase", fontWeight: 700, color: "text.secondary" }}>
          Trường Đại học Công nghiệp TP.HCM
        </Typography>
        <Typography component="div" variant="subtitle1" sx={{ fontWeight: 800, color: "primary.main", mt: 0.25 }}>
          THƯ VIỆN THÔNG MINH IUH
        </Typography>
        <Typography component="div" variant="body2" sx={{ fontWeight: 700, mt: 0.5, color: "text.primary" }}>
          BIÊN LAI TRẢ SÁCH & THU PHÍ
        </Typography>
        <Box sx={{ mt: 1, display: "flex", justifyContent: "center" }}>
          <Chip
            size="small"
            icon={<CheckCircleIcon />}
            label={isPaid ? "ĐÃ THANH TOÁN" : "CHƯA THANH TOÁN (SỔ NỢ)"}
            color={isPaid ? "success" : "warning"}
            variant="filled"
            sx={{ fontWeight: 700, fontSize: "0.75rem" }}
          />
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2, pb: 1 }}>
        <Divider sx={{ my: 1.5, borderStyle: "dashed" }} />
        <Stack spacing={1.25}>
          {rows.map((r) => (
            <Stack key={r.label} direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 110 }}>
                {r.label}:
              </Typography>
              <Typography
                variant="body2"
                align="right"
                sx={{
                  fontWeight: r.strong ? 800 : 500,
                  color: r.color ?? "text.primary",
                  fontSize: r.strong ? "1rem" : "0.85rem",
                  wordBreak: "break-word",
                  maxWidth: "65%",
                }}
              >
                {r.value}
              </Typography>
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ my: 1.5, borderStyle: "dashed" }} />

        <Stack sx={{ alignItems: "center", my: 1 }} spacing={0.5}>
          <QRCodeSVG value={refCode} size={96} />
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}>
            {refCode}
          </Typography>
        </Stack>

        <Typography variant="caption" color="text.secondary" align="center" sx={{ display: "block", fontStyle: "italic", mt: 1 }}>
          Cảm ơn bạn đã sử dụng dịch vụ Thư viện IUH!
        </Typography>
      </DialogContent>

      <DialogActions className="no-print" sx={{ justifyContent: "space-between", px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>
          Đóng
        </Button>
        <Button
          onClick={() => window.print()}
          variant="contained"
          startIcon={<PrintIcon />}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          In biên lai
        </Button>
      </DialogActions>
    </Dialog>
  );
}

