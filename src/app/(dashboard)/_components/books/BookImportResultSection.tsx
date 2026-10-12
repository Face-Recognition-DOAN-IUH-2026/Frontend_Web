"use client";

import React from "react";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/PrintOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import type { BookImportResultRow } from "@/lib/types";
import { BarcodeRangeList } from "./BarcodeRangeList";

export interface BookImportResultSectionProps {
  showResults: boolean;
  importResults: BookImportResultRow[] | null;
  onPrintBarcodes: () => void;
  canPrint?: boolean;
  onClose?: () => void;
}

function statusColor(status: string): "success" | "info" | "warning" | "error" | "default" {
  if (["new", "imported"].includes(status)) return "success";
  if (["updated"].includes(status)) return "info";
  if (["exists", "skipped"].includes(status)) return "default";
  if (["warning"].includes(status)) return "warning";
  return "error";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    exists: "Đã có",
    new: "Mới",
    warning: "Cảnh báo",
    invalid: "Lỗi",
    imported: "Thành công",
    updated: "Cập nhật",
    skipped: "Bỏ qua",
    error: "Lỗi",
  };
  return labels[status] || status;
}

export function BookImportResultSection({
  showResults,
  importResults,
  onPrintBarcodes,
  canPrint = true,
  onClose,
}: BookImportResultSectionProps) {
  if (!showResults || !importResults) return null;

  const importedCount = importResults.filter((r) => r.status === "imported" || r.status === "new").length;

  return (
    <Dialog
      open={Boolean(showResults && importResults)}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: "background.paper" } } }}
    >
      <DialogTitle
        component="div"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "divider",
          pb: 1.5,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <CheckCircleOutlinedIcon color="success" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Kết quả nhập kho sách
          </Typography>
          <Chip size="small" color="primary" label={`${importResults.length} dòng`} sx={{ fontWeight: 700 }} />
        </Stack>
        {onClose && (
          <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ p: 2.5 }}>
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 360, overflowX: "auto", borderRadius: 2 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper", zIndex: 3, whiteSpace: "nowrap" }}>
                  ISBN
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper", zIndex: 3, minWidth: 180 }}>
                  Tên sách
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, bgcolor: "background.paper", zIndex: 3, whiteSpace: "nowrap" }}>
                  Số lượng
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper", zIndex: 3, minWidth: 160, whiteSpace: "nowrap" }}>
                  Barcode mẫu
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper", zIndex: 3, whiteSpace: "nowrap" }}>
                  Trạng thái
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper", zIndex: 3, minWidth: 140 }}>
                  Thông báo
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {importResults.map((row, index) => (
                <TableRow key={`${row.isbn}-${index}`} selected={row.status === "error" || row.status === "warning"}>
                  <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>
                    {row.isbn || "-"}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{row.title || "-"}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    {row.quantity}
                  </TableCell>
                  <TableCell>
                    <BarcodeRangeList barcodes={row.barcodes} />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" color={statusColor(row.status)} label={statusLabel(row.status)} />
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>{row.message || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider" }}>
        {importResults.some((row) => row.status === "imported" || row.status === "warning") && (
          <Tooltip title={!canPrint ? "Bạn không có quyền in ấn mã vạch sách" : ""}>
            <span>
              <Button
                variant="outlined"
                disabled={!canPrint}
                startIcon={<PrintIcon />}
                onClick={onPrintBarcodes}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                In mã vạch vừa tạo
              </Button>
            </span>
          </Tooltip>
        )}
        {onClose && (
          <Button variant="contained" onClick={onClose} sx={{ textTransform: "none", fontWeight: 700 }}>
            Hoàn tất & Đóng
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

