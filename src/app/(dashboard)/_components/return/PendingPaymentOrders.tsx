"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Chip,
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
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ConfirmDialog from "@/app/(dashboard)/_components/ui/ConfirmDialog";
import { getPermissionDeniedReason } from "@/lib/permission-context";
import type { PendingPaymentOrder } from "@/lib/types/borrow";

interface PendingPaymentOrdersProps {
  items: PendingPaymentOrder[];
  loading: boolean;
  confirmingCode: string | null;
  canUpdateBorrow: boolean;
  onRefresh: () => void;
  onConfirm: (orderCode: string) => void;
}

export default function PendingPaymentOrders({
  items,
  loading,
  confirmingCode,
  canUpdateBorrow,
  onRefresh,
  onConfirm,
}: PendingPaymentOrdersProps) {
  const [pendingConfirm, setPendingConfirm] = useState<PendingPaymentOrder | null>(null);

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 2,
        bgcolor: (t) => (t.palette.mode === "dark" ? "background.paper" : "#ffffff"),
      }}
    >
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <PendingActionsIcon color="info" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Đơn SePay chờ đối soát
          </Typography>
          <Chip
            label={`${items.length} đơn`}
            size="small"
            color={items.length > 0 ? "info" : "default"}
            sx={{ fontWeight: 700 }}
          />
        </Stack>
        <Button
          size="small"
          variant="text"
          onClick={onRefresh}
          disabled={loading}
          sx={{ textTransform: "none" }}
        >
          Làm mới
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Độc giả đã chuyển khoản nhưng webhook ngân hàng chưa báo về? Đối chiếu sao kê TK MB{" "}
        <Box component="span" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
          0395324779
        </Box>{" "}
        theo mã GD rồi bấm xác nhận để gạch nợ.
      </Typography>

      {items.length === 0 ? (
        <Box sx={{ py: 3, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Không có đơn SePay nào đang chờ đối soát.
          </Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Mã GD</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Độc giả</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Số tiền</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tạo lúc</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.orderCode} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                      {item.orderCode}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.patron?.full_name || "—"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.patron?.student_code || item.patron?.id}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 800, color: "primary.main" }}>
                      {Number(item.amount || 0).toLocaleString("vi-VN")} đ
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={item.status === "pending" ? "Chờ CK" : "Hết hạn QR"}
                      color={item.status === "pending" ? "warning" : "default"}
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN") : "—"}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={!canUpdateBorrow ? getPermissionDeniedReason("borrows", "update") : "Chỉ bấm sau khi đã thấy tiền trên sao kê"}>
                      <span>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<CheckCircleIcon fontSize="small" />}
                          disabled={!canUpdateBorrow || confirmingCode === item.orderCode}
                          onClick={() => setPendingConfirm(item)}
                          sx={{ textTransform: "none", fontWeight: 700, borderRadius: 1.5 }}
                        >
                          {confirmingCode === item.orderCode ? "Đang xử lý..." : "Đã nhận tiền"}
                        </Button>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        title="Xác nhận đã nhận chuyển khoản"
        message={
          pendingConfirm
            ? `Xác nhận đã thấy ${Number(pendingConfirm.amount || 0).toLocaleString("vi-VN")} đ (mã ${pendingConfirm.orderCode}) trên sao kê ngân hàng? Hệ thống sẽ gạch nợ và mở khóa thẻ độc giả.`
            : ""
        }
        confirmLabel="Xác nhận đã nhận tiền"
        onConfirm={() => {
          const target = pendingConfirm;
          setPendingConfirm(null);
          if (target) onConfirm(target.orderCode);
        }}
        onCancel={() => setPendingConfirm(null)}
        loading={pendingConfirm !== null && confirmingCode === pendingConfirm.orderCode}
        severity="info"
      />
    </Paper>
  );
}
