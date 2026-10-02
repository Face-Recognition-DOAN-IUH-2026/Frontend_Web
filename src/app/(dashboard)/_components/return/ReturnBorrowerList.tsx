"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
  List,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AlertIcon from "@mui/icons-material/WarningAmberOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScannerOutlined";
import UsersIcon from "@mui/icons-material/GroupsOutlined";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import AvatarUser from "@/app/(dashboard)/_components/ui/AvatarUser";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import SearchField from "@/app/(dashboard)/_components/ui/SearchField";
import type { StaffActiveBorrowerSummary } from "@/lib/types";

export type BorrowerFilter = "all" | "overdue" | "active";

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function borrowerName(borrower: StaffActiveBorrowerSummary) {
  return borrower.patron.full_name || borrower.patron.student_code || "Không rõ tên";
}

interface ReturnBorrowerListProps {
  filteredBorrowers: StaffActiveBorrowerSummary[];
  selectedStudentCode: string | null;
  onSelectBorrower: (code: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  filter: BorrowerFilter;
  onFilterChange: (filter: BorrowerFilter) => void;
  loading: boolean;
  selectedBorrower: StaffActiveBorrowerSummary | null;
  onOpenScanner: () => void;
  onOpenOverdueGuide: () => void;
}

export default function ReturnBorrowerList({
  filteredBorrowers,
  selectedStudentCode,
  onSelectBorrower,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  loading,
  selectedBorrower,
  onOpenScanner,
  onOpenOverdueGuide,
}: ReturnBorrowerListProps) {
  return (
    <Stack spacing={2}>
      <DashboardCard>
        <Stack spacing={2}>
          <SearchField
            value={search}
            onChange={onSearchChange}
            placeholder="Tìm theo MSSV hoặc tên..."
          />

          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={filter}
            onChange={(_, value) => value && onFilterChange(value)}
            sx={{
              "& .MuiToggleButton-root": {
                px: 2,
                py: 0.6,
                borderRadius: "20px!important",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.78rem",
                border: "1px solid",
                borderColor: "divider",
              },
            }}
          >
            <ToggleButton value="all">Tất cả</ToggleButton>
            <ToggleButton value="overdue">Quá hạn</ToggleButton>
            <ToggleButton value="active">Đúng hạn</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </DashboardCard>

      {loading ? (
        <DashboardCard>
          <LoadingOverlay loading message="Đang tải danh sách độc giả..." />
        </DashboardCard>
      ) : filteredBorrowers.length === 0 ? (
        <DashboardCard>
          <EmptyState
            icon={<UsersIcon sx={{ fontSize: 48, opacity: 0.3 }} />}
            title="Không tìm thấy độc giả phù hợp"
          />
        </DashboardCard>
      ) : (
        <List disablePadding sx={{ flex: 1, maxHeight: 420, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
          {filteredBorrowers.map((borrower) => {
            const selected = borrower.patron.student_code === selectedStudentCode;
            const hasOverdue = borrower.overdue_count > 0;
            return (
              <Paper
                key={borrower.patron.id}
                variant="outlined"
                onClick={() => onSelectBorrower(borrower.patron.student_code)}
                sx={{
                  cursor: "pointer",
                  p: 1.5,
                  borderRadius: 2,
                  borderLeft: 4,
                  borderLeftColor: hasOverdue ? "error.main" : "success.main",
                  borderColor: selected ? "primary.main" : "divider",
                  bgcolor: selected ? "action.selected" : "background.paper",
                  transition: "all .15s",
                  "&:hover": { borderColor: "primary.light", transform: "translateY(-1px)", boxShadow: 1 },
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <AvatarUser
                    user={borrower.patron}
                    name={borrowerName(borrower)}
                    role="patron"
                    size={36}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13 }} noWrap>
                      {borrowerName(borrower)}
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: "monospace", display: "block", color: "text.secondary" }}>
                      {borrower.patron.student_code}
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mt: 0.3 }}>
                      <Chip size="small" label={`${borrower.total_borrowed} sách`} sx={{ height: 18, fontSize: 10 }} />
                      {hasOverdue ? (
                        <Chip size="small" color="error" label={`${borrower.overdue_count} quá hạn`} sx={{ height: 18, fontSize: 10 }} />
                      ) : (
                        <Chip size="small" color="success" label="Tốt" sx={{ height: 18, fontSize: 10 }} />
                      )}
                    </Stack>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: "right", flexShrink: 0 }}>
                    {formatDate(borrower.nearest_due_at)}
                  </Typography>
                </Stack>
              </Paper>
            );
          })}
        </List>
      )}

      {selectedBorrower ? (
        <DashboardCard
          title={borrowerName(selectedBorrower)}
          subtitle={selectedBorrower.patron.student_code}
          actions={<Chip size="small" color="success" label="Đang mượn" icon={<CheckCircleIcon />} />}
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Chip size="small" color="primary" label={`${selectedBorrower.total_borrowed} sách`} />
              {selectedBorrower.overdue_count > 0 ? (
                <Chip size="small" color="error" label={`${selectedBorrower.overdue_count} quá hạn`} />
              ) : null}
            </Stack>

            {selectedBorrower.overdue_count > 0 ? (
              <>
                <Alert severity="error" sx={{ py: 0.5 }}>
                  <AlertIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Có {selectedBorrower.overdue_count} cuốn sách quá hạn
                </Alert>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onOpenOverdueGuide}
                  sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
                >
                  Xem hướng dẫn xử lý
                </Button>
              </>
            ) : null}

            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<QrCodeScannerIcon />}
              onClick={onOpenScanner}
            >
              Quét mã vạch trả sách
            </Button>
          </Stack>
        </DashboardCard>
      ) : null}
    </Stack>
  );
}
