"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertTitle,
  Button,
  Grid,
  Slide,
  Snackbar,
  Stack,
} from "@mui/material";
import ReturnIcon from "@mui/icons-material/AssignmentReturnOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import { slideInRight } from "@/lib/animations";
import { getAlertSeverity, getAlertTitle } from "@/lib/alert-utils";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import OverdueGuideModal from "@/app/(dashboard)/_components/OverdueGuideModal";
import type { BorrowRecord, StaffActiveBorrowerSummary, StaffPatronActiveBorrowsResponse } from "@/lib/types";

import {
  ReturnMetricsBar,
  ReturnBorrowerList,
  type BorrowerFilter,
  ReturnActiveBorrows,
  ReturnScannerDialog,
  ReturnConfirmDialog,
} from "@/app/(dashboard)/_components/return";

export default function ReturnPage() {
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "warning" | "error" | "info";
  }>({
    open: false,
    message: "",
    severity: "info",
  });
  const [borrowers, setBorrowers] = useState<StaffActiveBorrowerSummary[]>([]);
  const [selectedStudentCode, setSelectedStudentCode] = useState<string | null>(null);
  const [detail, setDetail] = useState<StaffPatronActiveBorrowsResponse | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<BorrowerFilter>("all");
  const [loadingBorrowers, setLoadingBorrowers] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [confirmRecord, setConfirmRecord] = useState<BorrowRecord | null>(null);
  const [condition, setCondition] = useState("");
  const [error, setError] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [overdueGuideOpen, setOverdueGuideOpen] = useState(false);

  const showNotice = useCallback((type: "success" | "warning" | "error" | "info", msg: string, _duration?: number) => {
    setSnackbar({
      open: true,
      message: msg,
      severity: type,
    });
  }, []);

  const showNoticeRef = useRef(showNotice);
  useEffect(() => {
    showNoticeRef.current = showNotice;
  }, [showNotice]);

  const loadBorrowers = useCallback(async () => {
    setLoadingBorrowers(true);
    setError("");
    try {
      const data = await api.getActiveBorrowers();
      setBorrowers(data.items);
      setSelectedStudentCode((current) => {
        if (current && data.items.some((item) => item.patron.student_code === current)) return current;
        return data.items[0]?.patron.student_code ?? null;
      });
    } catch (err: any) {
      setError(getErrorMessage(err) || "Không thể tải danh sách độc giả đang mượn");
    } finally {
      setLoadingBorrowers(false);
    }
  }, []);

  const loadPatronDetail = useCallback(async (studentCode: string) => {
    setLoadingDetail(true);
    setError("");
    try {
      const data = await api.getActiveBorrowsByStudentCode(studentCode);
      setDetail(data);
    } catch (err: any) {
      setDetail(null);
      setError(getErrorMessage(err) || "Không thể tải sách đang mượn của độc giả");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    loadBorrowers();
  }, [loadBorrowers]);

  useEffect(() => {
    if (selectedStudentCode) {
      loadPatronDetail(selectedStudentCode);
    } else {
      setDetail(null);
    }
  }, [selectedStudentCode, loadPatronDetail]);

  const filteredBorrowers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return borrowers.filter((borrower) => {
      const matchesSearch = !q
        || borrower.patron.student_code.toLowerCase().includes(q)
        || (borrower.patron.full_name || "").toLowerCase().includes(q);
      const matchesFilter = filter === "all"
        || (filter === "overdue" && borrower.overdue_count > 0)
        || (filter === "active" && borrower.overdue_count === 0);
      return matchesSearch && matchesFilter;
    });
  }, [borrowers, filter, search]);

  const totals = useMemo(() => ({
    borrowers: borrowers.length,
    books: borrowers.reduce((sum, item) => sum + item.total_borrowed, 0),
    overdue: borrowers.reduce((sum, item) => sum + item.overdue_count, 0),
  }), [borrowers]);

  const selectedBorrower = useMemo(
    () => borrowers.find((item) => item.patron.student_code === selectedStudentCode) ?? null,
    [borrowers, selectedStudentCode],
  );

  const handleReturnRecord = async () => {
    if (!confirmRecord) return;
    setReturningId(confirmRecord.id);
    setError("");
    try {
      await api.staffReturnBorrowRecord(confirmRecord.id, condition || null);
      showNoticeRef.current("success", "Trả sách thành công");
      setCondition("");
      setConfirmRecord(null);
      await loadBorrowers();
      if (selectedStudentCode) await loadPatronDetail(selectedStudentCode);
    } catch (err: any) {
      showNoticeRef.current("error", getErrorMessage(err) || "Trả sách thất bại");
    } finally {
      setReturningId(null);
    }
  };

  const handleBatchComplete = async () => {
    await loadBorrowers();
    if (selectedStudentCode) await loadPatronDetail(selectedStudentCode);
  };

  const statBadges = `${totals.borrowers} độc giả | ${totals.books} sách đang mượn | ${totals.overdue} quá hạn`;

  const headerActions = selectedStudentCode ? (
    <Button
      variant="outlined"
      size="small"
      onClick={() => { setSelectedStudentCode(null); setDetail(null); }}
      sx={{
        color: "text.primary",
        borderColor: "divider",
        "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
      }}
    >
      Hủy chọn
    </Button>
  ) : null;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Trả sách"
        icon={ReturnIcon}
        statBadges={statBadges}
        onRefresh={loadBorrowers}
        actions={headerActions}
      />

      <ReturnMetricsBar totals={totals} />

      {error ? (
        <Slide direction="down" in={!!error} timeout={250}>
          <Alert
            severity={getAlertSeverity(error)}
            onClose={() => setError("")}
            sx={{ animation: `${slideInRight} 0.25s ease-out`, borderRadius: 2 }}
          >
            <AlertTitle>{getAlertTitle(error)}</AlertTitle>
            {error}
          </Alert>
        </Slide>
      ) : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5, lg: 4 }}>
          <ReturnBorrowerList
            filteredBorrowers={filteredBorrowers}
            selectedStudentCode={selectedStudentCode}
            onSelectBorrower={setSelectedStudentCode}
            search={search}
            onSearchChange={setSearch}
            filter={filter}
            onFilterChange={setFilter}
            loading={loadingBorrowers}
            selectedBorrower={selectedBorrower}
            onOpenScanner={() => setScannerOpen(true)}
            onOpenOverdueGuide={() => setOverdueGuideOpen(true)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 7, lg: 8 }}>
          <ReturnActiveBorrows
            selectedBorrower={selectedBorrower}
            detail={detail}
            loadingDetail={loadingDetail}
            returningId={returningId}
            onConfirmReturn={(record) => setConfirmRecord(record)}
          />
        </Grid>
      </Grid>

      <ReturnScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        detail={detail}
        onBatchComplete={handleBatchComplete}
        showNotice={(type, msg, duration) => showNoticeRef.current(type, msg, duration)}
      />

      <ReturnConfirmDialog
        record={confirmRecord}
        detail={detail}
        condition={condition}
        onConditionChange={setCondition}
        onClose={() => { setConfirmRecord(null); setCondition(""); }}
        onConfirm={handleReturnRecord}
        loading={!!returningId}
      />

      <OverdueGuideModal
        open={overdueGuideOpen}
        onClose={() => setOverdueGuideOpen(false)}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
