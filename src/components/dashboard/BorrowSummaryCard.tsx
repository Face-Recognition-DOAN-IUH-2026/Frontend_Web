"use client";

import Link from "next/link";
import { Box, Button, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import DashboardCard from "@/components/ui/DashboardCard";
import EmptyState from "@/components/ui/EmptyState";
import type { BorrowRecord } from "@/lib/types";

interface BorrowSummaryCardProps {
  borrowStats: { total: number; active: number; overdue: number } | null;
  borrows: BorrowRecord[];
  loading: boolean;
}

export default function BorrowSummaryCard({ borrowStats, borrows, loading }: BorrowSummaryCardProps) {
  const recentBorrows = [...borrows]
    .sort((a, b) => new Date(b.borrow_at).getTime() - new Date(a.borrow_at).getTime())
    .slice(0, 5);

  return (
    <DashboardCard
      title="Mượn trả"
      subtitle={`${borrowStats?.active ?? 0} đang mượn · ${borrowStats?.overdue ?? 0} quá hạn`}
      actions={
        <Button component={Link} href="/books" endIcon={<ArrowForwardIcon />} size="small">
          Chi tiết
        </Button>
      }
      noPadding
    >
      {borrowStats && (
        <Stack direction="row" spacing={1} sx={{ px: 2.5, pt: 2 }}>
          <Chip size="small" label={`${borrowStats.active} đang mượn`} color="primary" sx={{ fontWeight: 700 }} />
          {borrowStats.overdue > 0 && (
            <Chip size="small" label={`${borrowStats.overdue} quá hạn`} color="error" sx={{ fontWeight: 700 }} />
          )}
        </Stack>
      )}
      {recentBorrows.length === 0 ? (
        <EmptyState
          icon={<BookIcon sx={{ fontSize: 40, color: "text.disabled" }} />}
          title="Không có sách đang mượn"
        />
      ) : (
        <TableContainer sx={{ mt: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Sách</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Ngày mượn</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Hạn trả</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentBorrows.map((record) => {
                const overdue = new Date(record.due_at) < new Date();
                return (
                  <TableRow key={record.id} hover selected={overdue}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.85rem" }} noWrap>
                        {record.book?.title || record.book_id}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.82rem" }}>
                      {new Date(record.borrow_at).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.82rem" }}>
                      {new Date(record.due_at).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={overdue ? "error" : "success"}
                        label={overdue ? "Quá hạn" : "Đúng hạn"}
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: "0.72rem" }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </DashboardCard>
  );
}
