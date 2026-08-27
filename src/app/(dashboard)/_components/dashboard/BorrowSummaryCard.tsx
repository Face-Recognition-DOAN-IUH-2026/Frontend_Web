"use client";

import Link from "next/link";
import {
  Avatar,
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
  useTheme,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmberOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import type { BorrowRecord } from "@/lib/types";

interface BorrowSummaryCardProps {
  borrowStats: { total: number; active: number; overdue: number } | null;
  borrows: BorrowRecord[];
  loading: boolean;
}

export default function BorrowSummaryCard({ borrowStats, borrows, loading }: BorrowSummaryCardProps) {
  const theme = useTheme();
  const recentBorrows = [...borrows]
    .sort((a, b) => new Date(b.borrow_at).getTime() - new Date(a.borrow_at).getTime())
    .slice(0, 5);

  return (
    <DashboardCard
      title="Hoạt động Mượn sách"
      subtitle={`${borrowStats?.active ?? 0} đang mượn · ${borrowStats?.overdue ?? 0} quá hạn`}
      actions={
        <Button component={Link} href="/books" endIcon={<ArrowForwardIcon />} size="small" sx={{ fontWeight: 700 }}>
          Chi tiết
        </Button>
      }
      noPadding
    >
      {borrowStats && (
        <Stack direction="row" spacing={1} sx={{ px: 2.5, pt: 2, pb: 1 }}>
          <Chip
            size="small"
            label={`${borrowStats.active} cuốn đang mượn`}
            color="primary"
            sx={{ fontWeight: 700, fontSize: "0.75rem" }}
          />
          {borrowStats.overdue > 0 ? (
            <Chip
              size="small"
              icon={<WarningAmberIcon sx={{ fontSize: "14px !important" }} />}
              label={`${borrowStats.overdue} quá hạn`}
              color="error"
              sx={{ fontWeight: 700, fontSize: "0.75rem" }}
            />
          ) : (
            <Chip
              size="small"
              icon={<CheckCircleOutlineIcon sx={{ fontSize: "14px !important" }} />}
              label="0 quá hạn"
              color="success"
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: "0.75rem" }}
            />
          )}
        </Stack>
      )}

      {recentBorrows.length === 0 ? (
        <EmptyState
          icon={<BookIcon sx={{ fontSize: 40, color: "text.disabled" }} />}
          title="Không có sách nào đang mượn"
        />
      ) : (
        <TableContainer sx={{ mt: 0.5 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: theme.palette.mode === "dark" ? "rgba(30, 41, 59, 0.4)" : "rgba(248, 250, 252, 0.6)" }}>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>Sách</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>Ngày mượn</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>Hạn trả</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>Trạng thái</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentBorrows.map((record) => {
                const overdue = new Date(record.due_at) < new Date();
                const bookTitle = record.book?.title || `Sách #${record.book_id.slice(0, 8)}`;
                const author = record.book?.author;

                return (
                  <TableRow
                    key={record.id}
                    hover
                    sx={{
                      transition: "background-color 0.15s ease",
                      bgcolor: overdue
                        ? theme.palette.mode === "dark"
                          ? "rgba(239, 68, 68, 0.08)"
                          : "rgba(254, 242, 242, 0.6)"
                        : "transparent",
                    }}
                  >
                    <TableCell sx={{ py: 1.25 }}>
                      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 1.5,
                            bgcolor: overdue ? "error.main" : "primary.main",
                            color: "#fff",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                          }}
                        >
                          <BookIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Box sx={{ minWidth: 0, maxWidth: { xs: 120, sm: 180, md: 220 } }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.82rem" }} noWrap title={bookTitle}>
                            {bookTitle}
                          </Typography>
                          {author && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", display: "block" }} noWrap>
                              {author}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
                      {new Date(record.borrow_at).toLocaleDateString("vi-VN")}
                    </TableCell>

                    <TableCell sx={{ fontSize: "0.78rem", fontWeight: overdue ? 700 : 500, color: overdue ? "error.main" : "text.primary" }}>
                      {new Date(record.due_at).toLocaleDateString("vi-VN")}
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        color={overdue ? "error" : "success"}
                        label={overdue ? "Quá hạn" : "Đang mượn"}
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.68rem",
                          height: 22,
                          bgcolor: overdue ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
                          color: overdue ? "#dc2626" : "#059669",
                          border: "1px solid",
                          borderColor: overdue ? "rgba(239, 68, 68, 0.25)" : "rgba(16, 185, 129, 0.25)",
                        }}
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

