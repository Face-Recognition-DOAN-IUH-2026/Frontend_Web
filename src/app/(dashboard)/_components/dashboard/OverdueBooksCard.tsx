"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Box,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import WarningAmberIcon from "@mui/icons-material/WarningAmberOutlined";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import type { BorrowRecord } from "@/lib/types";

const DAY_MS = 86400000;

interface OverdueRow {
  id: string;
  title: string;
  barcode: string;
  dueDate: string;
  daysOverdue: number;
}

export default function OverdueBooksCard({ borrows }: { borrows: BorrowRecord[] }) {
  const rows: OverdueRow[] = useMemo(() => {
    const now = Date.now();
    return borrows
      .filter((r) => r.status === "borrowed" && r.due_at && new Date(r.due_at).getTime() < now)
      .map((r) => ({
        id: r.id,
        title: r.book?.title || `Sách #${r.book_id.slice(0, 8)}`,
        barcode: r.copy?.barcode || "—",
        dueDate: new Date(r.due_at).toLocaleDateString("vi-VN"),
        daysOverdue: Math.max(1, Math.ceil((now - new Date(r.due_at).getTime()) / DAY_MS)),
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, 8);
  }, [borrows]);

  return (
    <DashboardCard
      title="Sách quá hạn"
      subtitle={rows.length > 0 ? `${rows.length} cuốn cần thu hồi` : undefined}
      actions={
        <Button component={Link} href="/return" endIcon={<ArrowForwardIcon />} size="small">
          Đi đến trang trả sách
        </Button>
      }
      noPadding
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={<WarningAmberIcon sx={{ fontSize: 40, color: "text.disabled" }} />}
          title="Không có sách quá hạn"
          description="Tất cả sách đang mượn đều còn trong hạn"
        />
      ) : (
        <TableContainer sx={{ maxHeight: 320, overflowY: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Sách</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Hạn trả</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Trễ hạn</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap title={row.title}>
                      {row.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                      {row.barcode}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontFamily: "monospace" }}>{row.dueDate}</TableCell>
                  <TableCell align="right">
                    <Chip size="small" color="error" label={`quá hạn ${row.daysOverdue} ngày`} sx={{ fontWeight: 700 }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </DashboardCard>
  );
}
