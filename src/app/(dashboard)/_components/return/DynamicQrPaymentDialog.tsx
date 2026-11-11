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
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
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
  const [simulating, setSimulating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const handleCopy = (text: string, field: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

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
          onSuccessRef.current(order.orderCode);
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
  }, [order?.orderCode, status]);

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

  const handleSimulatePayment = async () => {
    if (!order?.orderCode || simulating) return;
    try {
      setSimulating(true);
      await api.simulatePaymentOrder(order.orderCode);
      setStatus("completed");
      if (pollingRef.current) clearInterval(pollingRef.current);
      setTimeout(() => {
        onSuccessRef.current(order.orderCode);
      }, 1500);
    } catch (err: any) {
      console.error("Simulation failed:", err);
    } finally {
      setSimulating(false);
    }
  };

  if (!open || !order) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const bankAccount = order.accountNumber || "0395324779";
  const bankName = order.bankName || "MB Bank (Ngân hàng Quân đội)";
  const accountHolder = order.accountName || "THU VIEN DAI HOC CONG NGHIEP TPHCM";
  const transferMsg = order.transferContent || order.orderCode;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, textAlign: "center", pb: 1 }}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "center" }} spacing={1}>
          <QrCode2Icon color="primary" />
          <span>Thanh toán Chuyển khoản (SePay / VietQR)</span>
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
              Hệ thống đã tự động gạch nợ và kích hoạt lại thẻ độc giả.
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
          <Stack spacing={2.5} sx={{ alignItems: "center" }}>
            {/* QR Image Card */}
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
                Chuẩn Napas 247 · SePay / VietQR
              </Typography>
            </Paper>

            {/* Amount and Patron info */}
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
            </Box>

            {/* Bank details card with copy buttons */}
            <Paper
              variant="outlined"
              sx={{
                width: "100%",
                maxWidth: 420,
                p: 2,
                borderRadius: 2,
                bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"),
                textAlign: "left",
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Thông tin chuyển khoản thủ công
              </Typography>

              <Divider sx={{ my: 1 }} />

              <Stack spacing={1}>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" color="text.secondary">Ngân hàng:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{bankName}</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" color="text.secondary">Số tài khoản:</Typography>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 800 }}>
                      {bankAccount}
                    </Typography>
                    <Tooltip title={copiedField === "acc" ? "Đã chép!" : "Sao chép"}>
                      <IconButton size="small" onClick={() => handleCopy(bankAccount, "acc")}>
                        {copiedField === "acc" ? <CheckIcon fontSize="inherit" color="success" /> : <ContentCopyIcon fontSize="inherit" />}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" color="text.secondary">Chủ tài khoản:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{accountHolder}</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" color="text.secondary">Nội dung CK:</Typography>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 800, color: "primary.main" }}>
                      {transferMsg}
                    </Typography>
                    <Tooltip title={copiedField === "msg" ? "Đã chép!" : "Sao chép"}>
                      <IconButton size="small" onClick={() => handleCopy(transferMsg, "msg")}>
                        {copiedField === "msg" ? <CheckIcon fontSize="inherit" color="success" /> : <ContentCopyIcon fontSize="inherit" />}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Stack>
            </Paper>

            {/* Countdown timer */}
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: timeLeft < 120 ? "error.main" : "text.secondary" }}>
              <AccessTimeIcon fontSize="small" />
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                Hết hạn sau: {timeFormatted}
              </Typography>
            </Stack>

            {/* Polling Indicator */}
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}>
              <CircularProgress size={14} thickness={5} />
              <Typography variant="caption" sx={{ fontStyle: "italic" }}>
                {checking ? "Đang kiểm tra kết quả..." : "Đang chờ độc giả chuyển khoản..."}
              </Typography>
            </Stack>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2.5 }}>
        {status === "pending" ? (
          <Button
            size="small"
            color="secondary"
            variant="text"
            startIcon={<PlayArrowIcon fontSize="small" />}
            onClick={handleSimulatePayment}
            disabled={simulating}
            sx={{ textTransform: "none", fontSize: "0.8rem", color: "text.secondary" }}
          >
            {simulating ? "Đang giả lập..." : "Demo: Giả lập đã chuyển khoản"}
          </Button>
        ) : <Box />}

        <Button onClick={onClose} variant="outlined" sx={{ minWidth: 100, borderRadius: 2 }}>
          {status === "completed" ? "Đóng" : "Hủy bỏ"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
