"use client";

import React from "react";
import {
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/PrintOutlined";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import type { BookImportResultRow } from "@/lib/types";

export interface BookImportResultSectionProps {
  showResults: boolean;
  importResults: BookImportResultRow[] | null;
  onPrintBarcodes: () => void;
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
}: BookImportResultSectionProps) {
  if (!showResults || !importResults) return null;

  return (
    <DashboardCard title="Kết quả nhập kho">
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320, overflowX: "auto" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>ISBN</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Tên sách</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Số lượng</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Barcode mẫu</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Thông báo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {importResults.map((row, index) => (
              <TableRow key={`${row.isbn}-${index}`} selected={row.status === "error" || row.status === "warning"}>
                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace" }}>{row.isbn || "-"}</TableCell>
                <TableCell>{row.title || "-"}</TableCell>
                <TableCell>{row.quantity}</TableCell>
                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace" }}>{row.barcodes[0] || "-"}</TableCell>
                <TableCell>
                  <Chip size="small" color={statusColor(row.status)} label={statusLabel(row.status)} />
                </TableCell>
                <TableCell>{row.message || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {importResults.some((row) => row.status === "imported" || row.status === "warning") ? (
        <Button sx={{ mt: 2, textTransform: "none" }} variant="outlined" startIcon={<PrintIcon />} onClick={onPrintBarcodes}>
          In mã vạch vừa tạo
        </Button>
      ) : null}
    </DashboardCard>
  );
}
