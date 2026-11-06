"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLongOutlined";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmberOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type { PatronFineItem, PaymentOrderResponse } from "@/lib/types";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import DynamicQrPaymentDialog from "@/app/(dashboard)/_components/return/DynamicQrPaymentDialog";

export interface PatronDebtSectionProps {
  patronName?: string;
  studentCode?: string;
  onNotice?: (type: "success" | "warning" | "error" | "info", msg: string) => void;
}

export default function PatronDebtSection({
  patronName,
  studentCode,
  onNotice,
}: PatronDebtSectionProps) {
  const [fines, setFines] = useState<PatronFineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [qrOrder, setQrOrder] = useState<PaymentOrderResponse | null>(null);

  // Ref giữ onNotice mới nhất → loadFines ổn định identity, effect tải phí nợ
  // không chạy lại mỗi lần parent render với arrow inline.
  const onNoticeRef = useRef(onNotice);
  onNoticeRef.current = onNotice;

  const loadFines = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getMyUnpaidFines();
      setFines(data);
    } catch (err: any) {
      // Best-effort load
      onNoticeRef.current?.("error", getErrorMessage(err) || "Không thể tải danh sách phí nợ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFines();
  }, [loadFines]);

  const totalDebt = fines.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

  const handlePay = async (recordIds: string[]) => {
    if (recordIds.length === 0) return;
    setPaying(true);
    try {
      const order = await api.createPaymentOrder({
        record_ids: recordIds,
        payment_method: "vietqr",
      });
      setQrOrder(order);
    } catch (err: any) {
      onNoticeRef.current?.("error", getErrorMessage(err) || "Không thể tạo mã VietQR thanh toán");
    } finally {
      setPaying(false);
    }
  };

  const handlePaymentSuccess = async (orderCode: string) => {
    setQrOrder(null);
    onNoticeRef.current?.("success", `Thanh toán VietQR thành công! (Mã GD: ${orderCode}). Thẻ thư viện đã được mở khóa.`);
    await loadFines();
  };

  return (
    <DashboardCard
      title="Khoản Phí Phạt & Nợ Thư Viện"
      actions={
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Chip
            size="small"
            label={fines.length > 0 ? `Đang nợ: ${totalDebt.toLocaleString("vi-VN")} đ` : "Không có nợ"}
            color={fines.length > 0 ? "error" : "success"}
            variant="filled"
            sx={{ fontWeight: 700 }}
          />
          <Tooltip title="Làm mới">
            <span>
              <IconButton size="small" onClick={loadFines} disabled={loading}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      }
    >
      {loading ? (
        <Stack sx={{ alignItems: "center", py: 4 }} spacing={1.5}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">
            Đang kiểm tra dữ liệu công nợ thư viện...
          </Typography>
        </Stack>
      ) : fines.length === 0 ? (
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            p: 3,
            textAlign: "center",
            borderRadius: 2.5,
            bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(46, 125, 50, 0.08)" : "rgba(46, 125, 50, 0.04)"),
            borderColor: "success.light",
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 44, color: "success.main", mb: 1 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "success.main" }}>
            Tài khoản của bạn không có khoản nợ nào!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Bạn không có khoản phạt trễ hạn hay phí bồi hoàn nào chưa thanh toán. Thẻ thư viện đang ở trạng thái tốt.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Bạn đang có {fines.length} khoản phí chưa thanh toán với tổng số tiền{" "}
              <Box component="span" sx={{ color: "error.main", fontWeight: 800 }}>
                {totalDebt.toLocaleString("vi-VN")} đ
              </Box>
              . Vui lòng thanh toán trực tuyến qua VietQR để thẻ thư viện không bị gián đoạn.
            </Typography>
          </Alert>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: "action.hover" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Tài liệu / Sách</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Ngày trả</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Phạt trễ hạn</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Phí bồi hoàn</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Tổng tiền</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fines.map((item) => (
                  <TableRow key={item.record_id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.book?.title || "Sách thư viện"}
                      </Typography>
                      {item.barcode ? (
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                          Mã vạch: {item.barcode}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {item.return_at ? new Date(item.return_at).toLocaleDateString("vi-VN") : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color={item.overdue_fine > 0 ? "error.main" : "text.secondary"}>
                        {Number(item.overdue_fine || 0).toLocaleString("vi-VN")} đ
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color={item.damage_fee > 0 ? "warning.main" : "text.secondary"}>
                        {Number(item.damage_fee || 0).toLocaleString("vi-VN")} đ
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 800, color: "primary.main" }}>
                        {Number(item.total || 0).toLocaleString("vi-VN")} đ
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        size="small"
                        color="primary"
                        startIcon={<QrCode2Icon />}
                        disabled={paying}
                        onClick={() => handlePay([item.record_id])}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 1.5, py: 0.5 }}
                      >
                        Quét VietQR
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: "center", pt: 1 }} spacing={1.5}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <ReceiptLongIcon color="action" />
              <Typography variant="body2" color="text.secondary">
                Hệ thống tự động gạch nợ sau khi chuyển khoản thành công chuẩn Napas 247.
              </Typography>
            </Stack>

            {fines.length > 1 && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<QrCode2Icon />}
                disabled={paying}
                onClick={() => handlePay(fines.map((f) => f.record_id))}
                sx={{ borderRadius: 2, fontWeight: 800, textTransform: "none", px: 3 }}
              >
                Thanh toán tất cả ({totalDebt.toLocaleString("vi-VN")} đ)
              </Button>
            )}
          </Stack>
        </Stack>
      )}

      <DynamicQrPaymentDialog
        open={!!qrOrder}
        order={qrOrder}
        patronName={patronName}
        studentCode={studentCode}
        onClose={() => setQrOrder(null)}
        onSuccess={handlePaymentSuccess}
      />
    </DashboardCard>
  );
}
