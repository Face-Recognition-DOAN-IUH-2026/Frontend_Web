"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Menu,
  MenuItem,
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
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import ConfirmDialog from "@/app/(dashboard)/_components/ui/ConfirmDialog";
import { getPermissionDeniedReason } from "@/lib/permission-context";

interface FinesLedgerProps {
  items: any[];
  payingFineId: string | null;
  canUpdateBorrow: boolean;
  onRefresh: () => void;
  onPayCash: (recordId: string) => void;
  onOpenQr: (item: any) => void;
}

export default function FinesLedger({
  items,
  payingFineId,
  canUpdateBorrow,
  onRefresh,
  onPayCash,
  onOpenQr,
}: FinesLedgerProps) {
  const [fineMenu, setFineMenu] = useState<{ anchor: HTMLElement; item: any } | null>(null);
  const [pendingPay, setPendingPay] = useState<any | null>(null);

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
          <ReceiptLongIcon color="warning" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Khoản phí chưa thu (Sổ nợ)
          </Typography>
          <Chip
            label={`${items.length} khoản`}
            size="small"
            color={items.length > 0 ? "warning" : "default"}
            sx={{ fontWeight: 700 }}
          />
        </Stack>
        <Button
          size="small"
          variant="text"
          onClick={onRefresh}
          sx={{ textTransform: "none" }}
        >
          Làm mới
        </Button>
      </Stack>

      {items.length === 0 ? (
        <Box sx={{ py: 3, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Hiện không có khoản phí phạt hay hư hỏng nào chưa thu.
          </Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Độc giả</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sách & Mã vạch</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Phí trễ hạn</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Phí hư hỏng</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Tổng nợ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Ngày trả</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.record_id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.patron?.full_name || "—"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.patron?.student_code || item.patron?.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.book?.title || "—"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.barcode || item.book?.isbn || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {Number(item.overdue_fine || 0).toLocaleString("vi-VN")} đ
                  </TableCell>
                  <TableCell align="right">
                    {Number(item.damage_fee || 0).toLocaleString("vi-VN")} đ
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 800, color: "error.main" }}>
                      {Number(item.total || 0).toLocaleString("vi-VN")} đ
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {item.return_at ? new Date(item.return_at).toLocaleDateString("vi-VN") : "—"}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={!canUpdateBorrow ? getPermissionDeniedReason("borrows", "update") : ""}>
                      <span>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          disabled={!canUpdateBorrow || payingFineId === item.record_id}
                          onClick={(e) => setFineMenu({ anchor: e.currentTarget, item })}
                          sx={{ textTransform: "none", fontWeight: 700, borderRadius: 1.5 }}
                        >
                          {payingFineId === item.record_id ? "Đang thu..." : "Thu phí"}
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
      <Menu
        anchorEl={fineMenu?.anchor ?? null}
        open={Boolean(fineMenu)}
        onClose={() => setFineMenu(null)}
      >
        <MenuItem
          onClick={() => {
            const target = fineMenu?.item;
            setFineMenu(null);
            if (target) setPendingPay(target);
          }}
        >
          Tiền mặt
        </MenuItem>
        <MenuItem
          onClick={() => {
            const target = fineMenu?.item;
            setFineMenu(null);
            if (target) onOpenQr(target);
          }}
        >
          <QrCode2Icon fontSize="small" sx={{ mr: 1 }} /> Quét mã SePay
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={Boolean(pendingPay)}
        title="Xác nhận thu phí"
        message={
          pendingPay
            ? `Thu ${Number(pendingPay.total || 0).toLocaleString("vi-VN")} đ tiền mặt cho ${pendingPay.patron?.full_name || "độc giả"} (${pendingPay.patron?.student_code || pendingPay.patron?.id})?`
            : ""
        }
        confirmLabel="Thu phí"
        onConfirm={() => {
          const target = pendingPay;
          setPendingPay(null);
          if (target) onPayCash(target.record_id);
        }}
        onCancel={() => setPendingPay(null)}
        loading={Boolean(pendingPay) && payingFineId === pendingPay.record_id}
        severity="info"
      />
    </Paper>
  );
}
