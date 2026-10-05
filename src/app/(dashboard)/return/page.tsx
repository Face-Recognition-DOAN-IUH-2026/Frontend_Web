"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Slide,
  Snackbar,
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
import ReturnIcon from "@mui/icons-material/AssignmentReturnOutlined";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import api, { getErrorMessage } from "@/lib/api-client";
import { slideInRight } from "@/lib/animations";
import { getAlertSeverity, getAlertTitle } from "@/lib/alert-utils";
import { usePermission, getPermissionDeniedReason } from "@/lib/permission-context";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import OverdueGuideModal from "@/app/(dashboard)/_components/OverdueGuideModal";
import type { BorrowRecord, StaffActiveBorrowerSummary, StaffPatronActiveBorrowsResponse } from "@/lib/types";
import type { PaymentOrderResponse } from "@/lib/types/borrow";

import {
  ReturnMetricsBar,
  ReturnBorrowerList,
  type BorrowerFilter,
  ReturnActiveBorrows,
  ReturnScannerDialog,
  ReturnConfirmDialog,
  ReturnReceipt,
  DynamicQrPaymentDialog,
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
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [overdueGuideOpen, setOverdueGuideOpen] = useState(false);

  const [fineConfig, setFineConfig] = useState<any>(null);
  const [receiptRecord, setReceiptRecord] = useState<BorrowRecord | null>(null);
  const [receiptPatron, setReceiptPatron] = useState<{ full_name?: string | null; student_code?: string | null } | null>(null);
  const [unpaidFines, setUnpaidFines] = useState<any[]>([]);
  const [payingFineId, setPayingFineId] = useState<string | null>(null);
  const [qrOrder, setQrOrder] = useState<PaymentOrderResponse | null>(null);
  const [qrPatronInfo, setQrPatronInfo] = useState<{ name?: string; studentCode?: string }>({});

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

  const loadUnpaidFines = useCallback(async () => {
    try {
      const rows = await api.getUnpaidFines();
      setUnpaidFines(rows);
    } catch {
      setUnpaidFines([]);
    }
  }, []);

  useEffect(() => {
    api.getBorrowConfig()
      .then((cfg) => setFineConfig(cfg.fine ?? null))
      .catch(() => setFineConfig(null));
    void loadUnpaidFines();
  }, [loadUnpaidFines]);

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

  const { can } = usePermission();
  const canUpdateBorrow = can("borrows", "update");

  const handlePayFine = async (recordId: string, paymentMethod: "cash" | "qr_code" = "cash") => {
    setPayingFineId(recordId);
    try {
      const res = await api.payFines([recordId], paymentMethod);
      if (res.activated && res.activated.length > 0) {
        showNoticeRef.current("success", "Đã thu phí thành công. Thẻ độc giả đã được tự động mở khóa!");
      } else {
        showNoticeRef.current("success", "Đã thu phí thành công.");
      }
      void loadUnpaidFines();
      await loadBorrowers();
      if (selectedStudentCode) await loadPatronDetail(selectedStudentCode);
    } catch (err: any) {
      showNoticeRef.current("error", getErrorMessage(err) || "Lỗi khi thu phí");
    } finally {
      setPayingFineId(null);
    }
  };

  const handleOpenQrPayment = async (item: any) => {
    try {
      const order = await api.createPaymentOrder({
        patron_id: item.patron.id,
        record_ids: [item.record_id],
        payment_method: "vietqr",
      });
      setQrPatronInfo({
        name: item.patron?.full_name || undefined,
        studentCode: item.patron?.student_code || undefined,
      });
      setQrOrder(order);
    } catch (err: any) {
      showNoticeRef.current("error", getErrorMessage(err) || "Không thể tạo mã thanh toán VietQR");
    }
  };

  const handleQrPaymentSuccess = async (orderCode: string) => {
    setQrOrder(null);
    showNoticeRef.current("success", `Thanh toán VietQR thành công! (Mã GD: ${orderCode})`);
    void loadUnpaidFines();
    await loadBorrowers();
    if (selectedStudentCode) await loadPatronDetail(selectedStudentCode);
  };

  const handleReturnRecord = async (payment?: { isPaidImmediately: boolean; paymentMethod: "cash" | "qr_code" }) => {
    if (!confirmRecord) return;
    setReturningId(confirmRecord.id);
    setError("");
    const isQr = payment?.paymentMethod === "qr_code" && (payment?.isPaidImmediately ?? true);
    try {
      const result = await api.staffReturnBorrowRecord(confirmRecord.id, note || null, condition || "good", {
        is_paid_immediately: isQr ? false : (payment?.isPaidImmediately ?? true),
        payment_method: payment?.paymentMethod ?? "cash",
      });
      showNoticeRef.current("success", "Trả sách thành công");
      setCondition("");
      setNote("");
      setConfirmRecord(null);

      const returnedRec = result.record;
      const totalDue = Number(returnedRec?.total_due ?? ((Number(returnedRec?.fine_amount) || 0) + (Number(returnedRec?.damage_fee) || 0)));

      if (isQr && returnedRec && totalDue > 0) {
        try {
          const order = await api.createPaymentOrder({
            patron_id: returnedRec.patron_id,
            record_ids: [returnedRec.id],
            payment_method: "vietqr",
          });
          setQrPatronInfo({
            name: detail?.patron.full_name || detail?.patron.student_code || undefined,
            studentCode: detail?.patron.student_code || undefined,
          });
          setQrOrder(order);
        } catch {
          showNoticeRef.current("warning", "Đã ghi nhận trả sách. Khoản phí đã được lưu vào sổ nợ.");
          setReceiptPatron(detail?.patron ? { full_name: detail.patron.full_name, student_code: detail.patron.student_code } : null);
          setReceiptRecord(returnedRec);
        }
      } else {
        setReceiptPatron(detail?.patron ? { full_name: detail.patron.full_name, student_code: detail.patron.student_code } : null);
        setReceiptRecord(returnedRec ?? null);
      }

      void loadUnpaidFines();
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
            onConfirmReturn={(record) => {
              setConfirmRecord(record);
              setCondition(record.copy?.condition || "good");
              setNote("");
            }}
          />
        </Grid>
      </Grid>

      {/* Sổ nợ phí phạt (Khoản phí chưa thu) */}
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
              label={`${unpaidFines.length} khoản`}
              size="small"
              color={unpaidFines.length > 0 ? "warning" : "default"}
              sx={{ fontWeight: 700 }}
            />
          </Stack>
          <Button
            size="small"
            variant="text"
            onClick={() => void loadUnpaidFines()}
            sx={{ textTransform: "none" }}
          >
            Làm mới
          </Button>
        </Stack>

        {unpaidFines.length === 0 ? (
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
                {unpaidFines.map((item) => (
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
                      <Stack direction="row" spacing={1} sx={{ justifyContent: "center" }}>
                        <Tooltip title={!canUpdateBorrow ? getPermissionDeniedReason("borrows", "update") : ""}>
                          <span>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              disabled={!canUpdateBorrow || payingFineId === item.record_id}
                              onClick={() => handlePayFine(item.record_id, "cash")}
                              sx={{ textTransform: "none", fontWeight: 700, borderRadius: 1.5 }}
                            >
                              {payingFineId === item.record_id ? "Đang thu..." : "Tiền mặt"}
                            </Button>
                          </span>
                        </Tooltip>
                        <Tooltip title={!canUpdateBorrow ? getPermissionDeniedReason("borrows", "update") : ""}>
                          <span>
                            <Button
                              variant="outlined"
                              color="primary"
                              size="small"
                              startIcon={<QrCode2Icon />}
                              disabled={!canUpdateBorrow || payingFineId === item.record_id}
                              onClick={() => handleOpenQrPayment(item)}
                              sx={{ textTransform: "none", fontWeight: 700, borderRadius: 1.5 }}
                            >
                              Mã VietQR
                            </Button>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <ReturnScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        detail={detail}
        fineConfig={fineConfig}
        onBatchComplete={handleBatchComplete}
        showNotice={(type, msg, duration) => showNoticeRef.current(type, msg, duration)}
      />

      <ReturnConfirmDialog
        record={confirmRecord}
        detail={detail}
        condition={condition}
        note={note}
        fineConfig={fineConfig}
        onConditionChange={setCondition}
        onNoteChange={setNote}
        onClose={() => { setConfirmRecord(null); setCondition(""); setNote(""); }}
        onConfirm={handleReturnRecord}
        loading={!!returningId}
      />

      <DynamicQrPaymentDialog
        open={!!qrOrder}
        order={qrOrder}
        patronName={qrPatronInfo.name}
        studentCode={qrPatronInfo.studentCode}
        onClose={() => setQrOrder(null)}
        onSuccess={handleQrPaymentSuccess}
      />

      <ReturnReceipt
        record={receiptRecord}
        patron={receiptPatron}
        onClose={() => {
          setReceiptRecord(null);
          setReceiptPatron(null);
        }}
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
