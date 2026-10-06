"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import api from "@/lib/api-client";
import type { PaymentOrderResponse } from "@/lib/types/borrow";
import { QRCodeSVG } from "qrcode.react";

export interface DynamicQrPaymentDialogProps {
  open: boolean;
  order: PaymentOrderResponse | null;
  patronName?: string;
  studentCode?: string;
  onClose: () => void;
  onSuccess: (orderCode: string) => void;
  onRegenerate?: () => void;
}

export default function DynamicQrPaymentDialog({
  open,
  order,
  patronName,
  studentCode,
  onClose,
  onSuccess,
  onRegenerate,
}: DynamicQrPaymentDialogProps) {
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60); // 15 mins in seconds
  const [status, setStatus] = useState<"pending" | "completed" | "expired">("pending");
  const [checking, setChecking] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate initial time left from order.expiresAt
  useEffect(() => {
    if (order?.expiresAt) {
      const expTime = new Date(order.expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expTime - Date.now()) / 1000));
      setTimeLeft(diff);
      setStatus(diff > 0 ? "pending" : "expired");
    } else {
      setTimeLeft(15 * 60);
      setStatus("pending");
    }
  }, [order]);

  // Countdown timer
  useEffect(() => {
    if (!open || status !== "pending") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus("expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, status]);

  // Polling payment status every 2.5s
  const checkStatus = useCallback(async () => {
    if (!order?.orderCode || status !== "pending") return;
    try {
      setChecking(true);
      const res = await api.getPaymentOrderStatus(order.orderCode);
      if (res.status === "completed") {
        setStatus("completed");
        if (pollingRef.current) clearInterval(pollingRef.current);
        setTimeout(() => {
          onSuccess(order.orderCode);
        }, 1500);
      } else if (res.status === "expired") {
        setStatus("expired");
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    } catch {
      // Best-effort check
    } finally {
      setChecking(false);
    }
  }, [order?.orderCode, status, onSuccess]);

  useEffect(() => {
    if (!open || !order?.orderCode || status !== "pending") {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    pollingRef.current = setInterval(() => {
      void checkStatus();
    }, 2500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [open, order?.orderCode, status, checkStatus]);

  if (!open || !order) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, textAlign: "center", pb: 1 }}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "center" }} spacing={1}>
          <QrCode2Icon color="primary" />
          <span>Thanh toán Phí phạt qua VietQR</span>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ textAlign: "center" }}>
        {status === "completed" ? (
          <Box sx={{ py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 72, color: "success.main", mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: "success.main" }}>
              Thanh toán thành công!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Hệ thống đã tự động gạch nợ và cập nhật trạng thái thẻ độc giả.
            </Typography>
          </Box>
        ) : status === "expired" ? (
          <Box sx={{ py: 3 }}>
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              Đơn thanh toán đã hết hạn. Vui lòng đóng và tạo lại mã QR mới.
            </Alert>
            {onRegenerate ? (
              <Button onClick={onRegenerate} variant="contained" sx={{ borderRadius: 2, fontWeight: 700 }}>
                Tạo mã mới
              </Button>
            ) : null}
          </Box>
        ) : (
          <Stack spacing={2} sx={{ alignItems: "center" }}>
            <Paper
              elevation={0}
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: "#ffffff",
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              }}
            >
              {order.qrUrl ? (
                <Box
                  component="img"
                  src={order.qrUrl}
                  alt={`VietQR ${order.orderCode}`}
                  sx={{ width: 220, height: 220, objectFit: "contain", borderRadius: 1 }}
                />
              ) : (
                <QRCodeSVG value={order.qrData || order.orderCode} size={200} />
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, fontWeight: 600 }}>
                Chuẩn Napas 247 · VietQR
              </Typography>
            </Paper>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Số tiền thanh toán
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "primary.main", my: 0.25 }}>
                {Number(order.amount).toLocaleString("vi-VN")} đ
              </Typography>
              {patronName ? (
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {patronName} {studentCode ? `(${studentCode})` : ""}
                </Typography>
              ) : null}
              <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                Mã GD: {order.orderCode}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: timeLeft < 120 ? "error.main" : "text.secondary" }}>
              <AccessTimeIcon fontSize="small" />
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                Hết hạn sau: {timeFormatted}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary", mt: 0.5 }}>
              <CircularProgress size={14} thickness={5} />
              <Typography variant="caption" sx={{ fontStyle: "italic" }}>
                {checking ? "Đang kiểm tra kết quả..." : "Đang chờ độc giả chuyển khoản..."}
              </Typography>
            </Stack>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pb: 2.5 }}>
        <Button onClick={onClose} variant="outlined" sx={{ minWidth: 120, borderRadius: 2 }}>
          {status === "completed" ? "Đóng" : "Hủy bỏ"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
