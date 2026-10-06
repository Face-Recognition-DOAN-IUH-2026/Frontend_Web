"use client";

import {
  Avatar,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import UsersIcon from "@mui/icons-material/GroupsOutlined";
import { usePermission, getPermissionDeniedReason } from "@/lib/permission-context";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import type { BorrowRecord, StaffActiveBorrowerSummary, StaffPatronActiveBorrowsResponse } from "@/lib/types";
import {
  CONDITION_LABELS,
  COPY_STATUS_LABELS,
  getConditionColor,
  getStatusColor,
  CopyCondition,
  CopyStatus,
} from "@/lib/constants/copy";

function isOverdue(record: BorrowRecord) {
  return new Date(record.due_at) < new Date();
}

function daysUntil(value: string) {
  const today = new Date();
  const due = new Date(value);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function dueChip(record: BorrowRecord) {
  const left = daysUntil(record.due_at);
  if (left < 0) return <Chip size="small" color="error" label={`Quá hạn ${Math.abs(left)} ngày`} sx={{ height: 20, fontSize: 11 }} />;
  if (left <= 2) return <Chip size="small" color="warning" label="Sắp đến hạn" sx={{ height: 20, fontSize: 11 }} />;
  return <Chip size="small" color="success" label="Đúng hạn" sx={{ height: 20, fontSize: 11 }} />;
}

interface ReturnActiveBorrowsProps {
  selectedBorrower: StaffActiveBorrowerSummary | null;
  detail: StaffPatronActiveBorrowsResponse | null;
  loadingDetail: boolean;
  returningId: string | null;
  onConfirmReturn: (record: BorrowRecord) => void;
}

export default function ReturnActiveBorrows({
  selectedBorrower,
  detail,
  loadingDetail,
  returningId,
  onConfirmReturn,
}: ReturnActiveBorrowsProps) {
  const { can } = usePermission();
  const canUpdateBorrow = can("borrows", "update");

  if (!selectedBorrower) {
    return (
      <DashboardCard>
        <EmptyState
          icon={<UsersIcon sx={{ fontSize: 64, opacity: 0.3 }} />}
          title="Chọn độc giả để xem sách cần trả"
          description="Chọn một độc giả từ danh sách bên trái để kiểm tra danh sách sách đang mượn"
        />
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Sách cần trả"
      actions={detail ? <Chip size="small" label={`${detail.total} cuốn`} sx={{ fontWeight: 700 }} /> : null}
    >
      {loadingDetail ? (
        <LoadingOverlay loading message="Đang tải danh sách sách..." />
      ) : !detail || detail.records.length === 0 ? (
        <EmptyState
          icon={<CheckCircleIcon sx={{ fontSize: 56, color: "success.main" }} />}
          title="Độc giả đã trả hết sách"
          description="Hiện tại độc giả này không còn cuốn sách nào đang mượn."
        />
      ) : (
        <Stack spacing={1.5}>
          {detail.records.map((record) => (
            <Paper
              key={record.id}
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 2,
                borderLeft: isOverdue(record) ? 4 : 1,
                borderLeftColor: isOverdue(record) ? "error.main" : "divider",
                bgcolor: "background.paper",
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                {record.book?.cover_url ? (
                  <Box
                    component="img"
                    src={record.book.cover_url}
                    alt={record.book.title}
                    sx={{ width: 44, height: 62, objectFit: "cover", borderRadius: 1, flexShrink: 0 }}
                  />
                ) : (
                  <Avatar variant="rounded" sx={{ width: 44, height: 62, bgcolor: "action.hover", color: "text.secondary", flexShrink: 0 }}>
                    <BookIcon />
                  </Avatar>
                )}
                <Stack spacing={0.4} sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 14 }} noWrap>
                    {record.book?.title || record.book_id}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {record.book?.author || "Chưa rõ tác giả"}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}>
                    <Typography variant="caption" sx={{ fontFamily: "JetBrains Mono, monospace", color: "primary.main", fontWeight: 600 }}>
                      {record.book?.isbn}
                    </Typography>
                    {dueChip(record)}
                    {record.copy?.condition && (
                      <Chip
                        size="small"
                        color={getConditionColor(record.copy.condition)}
                        label={CONDITION_LABELS[record.copy.condition as CopyCondition] || record.copy.condition}
                        sx={{ height: 20, fontSize: 11 }}
                      />
                    )}
                    {record.copy?.status && (
                      <Chip
                        size="small"
                        color={getStatusColor(record.copy.status)}
                        label={COPY_STATUS_LABELS[record.copy.status as CopyStatus] || record.copy.status}
                        sx={{ height: 20, fontSize: 11 }}
                      />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {record.copy?.barcode ? `Mã: ${record.copy.barcode} | ` : ""}Mượn: {formatDate(record.borrow_at)} | Hạn: {formatDate(record.due_at)}
                  </Typography>
                </Stack>
                <Tooltip title={!canUpdateBorrow ? getPermissionDeniedReason("borrows", "update") : ""}>
                  <span>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      disabled={!!returningId || !canUpdateBorrow}
                      onClick={() => {
                        if (!canUpdateBorrow) return;
                        onConfirmReturn(record);
                      }}
                      sx={{ flexShrink: 0, alignSelf: "center", textTransform: "none", fontWeight: 700 }}
                    >
                      Trả
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </DashboardCard>
  );
}
