"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertTitle,
  Badge,
  Box,
  Button,
  Grid,
  Paper,
  Slide,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import ReturnIcon from "@mui/icons-material/AssignmentReturnOutlined";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturnOutlined";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLongOutlined";
import QrCode2Icon from "@mui/icons-material/QrCode2Outlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmberOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import { slideInRight } from "@/lib/animations";
import { getAlertSeverity, getAlertTitle } from "@/lib/alert-utils";
import { usePermission } from "@/lib/permission-context";
import { useToast } from "@/lib/toast-context";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import OverdueGuideModal from "@/app/(dashboard)/_components/OverdueGuideModal";
import type { BorrowRecord, StaffActiveBorrowerSummary, StaffPatronActiveBorrowsResponse } from "@/lib/types";
import type { PaymentOrderResponse } from "@/lib/types/borrow";
import type { PendingPaymentOrder } from "@/lib/types/borrow";

import {
  ReturnMetricsBar,
  ReturnBorrowerList,
  type BorrowerFilter,
  ReturnActiveBorrows,
  ReturnScannerDialog,
  ReturnConfirmDialog,
  ReturnReceipt,
  DynamicQrPaymentDialog,
  FinesLedger,
  PendingPaymentOrders,
} from "@/app/(dashboard)/_components/return";

export default function ReturnPage() {
  const { toast } = useToast();
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
  const [pendingOrders, setPendingOrders] = useState<PendingPaymentOrder[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [confirmingCode, setConfirmingCode] = useState<string | null>(null);
  const [qrSourceItem, setQrSourceItem] = useState<any | null>(null);
  const [qrOrder, setQrOrder] = useState<PaymentOrderResponse | null>(null);
  const [qrPatronInfo, setQrPatronInfo] = useState<{ name?: string; studentCode?: string }>({});
  const [activeTab, setActiveTab] = useState<number>(0);

  const showNotice = useCallback((type: "success" | "warning" | "error" | "info", msg: string, _duration?: number) => {
    toast(msg, type);
  }, [toast]);

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

  const loadPendingOrders = useCallback(async () => {
    setLoadingPending(true);
    try {
      const rows = await api.listPendingPaymentOrders(50);
      setPendingOrders(rows);
    } catch {
      setPendingOrders([]);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    api.getBorrowConfig()
      .then((cfg) => setFineConfig(cfg.fine ?? null))
      .catch(() => setFineConfig(null));
    void loadUnpaidFines();
    void loadPendingOrders();
  }, [loadUnpaidFines, loadPendingOrders]);

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

  const selectedPatronDebts = useMemo(() => {
    if (!selectedStudentCode && !detail?.patron?.id) return [];
    return unpaidFines.filter(
      (f) =>
        (selectedStudentCode && f.patron?.student_code === selectedStudentCode) ||
        (detail?.patron?.id && f.patron_id === detail.patron.id) ||
        (detail?.patron?.id && f.patron?.id === detail.patron.id)
    );
  }, [unpaidFines, selectedStudentCode, detail?.patron?.id]);

  const totalPatronDebt = useMemo(() => {
    return selectedPatronDebts.reduce((sum, item) => {
      const fine = Number(item.total_due ?? item.total ?? ((Number(item.overdue_fine ?? item.fine_amount) || 0) + (Number(item.damage_fee) || 0))) || 0;
      return sum + fine;
    }, 0);
  }, [selectedPatronDebts]);

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
      void loadPendingOrders();
      await loadBorrowers();
      if (selectedStudentCode) await loadPatronDetail(selectedStudentCode);
    } catch (err: any) {
      showNoticeRef.current("error", getErrorMessage(err) || "Lỗi khi thu phí");
    } finally {
      setPayingFineId(null);
    }
  };

  const handleOpenQrPayment = async (item: any) => {
    if (!item?.patron?.id) {
      showNoticeRef.current("error", "Thiếu thông tin độc giả, không thể tạo mã thanh toán SePay");
      return;
    }
    try {
      const order = await api.createPaymentOrder({
        patron_id: item.patron?.id,
        record_ids: [item.record_id],
        payment_method: "sepay",
      });
      setQrPatronInfo({
        name: item.patron?.full_name || undefined,
        studentCode: item.patron?.student_code || undefined,
      });
      setQrOrder(order);
      setQrSourceItem(item);
    } catch (err: any) {
      showNoticeRef.current("error", getErrorMessage(err) || "Không thể tạo mã thanh toán SePay");
    }
  };

  const handleQrPaymentSuccess = async (orderCode: string) => {
    setQrOrder(null);
    setQrSourceItem(null);
    showNoticeRef.current("success", `Thanh toán SePay thành công! (Mã GD: ${orderCode})`);
    void loadUnpaidFines();
    void loadPendingOrders();
    await loadBorrowers();
    if (selectedStudentCode) await loadPatronDetail(selectedStudentCode);
  };

  const handleConfirmOrder = async (orderCode: string) => {
    setConfirmingCode(orderCode);
    try {
      const res = await api.confirmPaymentOrder(orderCode);
      if (res.activatedPatrons && res.activatedPatrons.length > 0) {
        showNoticeRef.current("success", `Đã xác nhận nhận tiền đơn ${orderCode}. Thẻ độc giả đã được mở khóa!`);
      } else {
        showNoticeRef.current("success", `Đã xác nhận nhận tiền đơn ${orderCode}, nợ đã được gạch.`);
      }
      void loadUnpaidFines();
      void loadPendingOrders();
      await loadBorrowers();
      if (selectedStudentCode) await loadPatronDetail(selectedStudentCode);
    } catch (err: any) {
      showNoticeRef.current("error", getErrorMessage(err) || "Xác nhận nhận tiền thất bại");
    } finally {
      setConfirmingCode(null);
    }
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
            payment_method: "sepay",
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

      {/* Thanh Tabs phân chia chức năng: Quầy trả sách | Sổ nợ | Đơn SePay */}
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          borderRadius: 2,
          bgcolor: "background.paper",
          overflow: "visible",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            px: 2,
            minHeight: 52,
            overflow: "visible",
            "& .MuiTabs-scroller": {
              overflow: "visible !important",
            },
            "& .MuiTabs-indicator": {
              bgcolor: "#8B0000",
              height: 3,
              borderRadius: "3px 3px 0 0",
            },
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.95rem",
              minHeight: 52,
              py: 1.25,
              px: 2.5,
              overflow: "visible",
              color: "text.secondary",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                color: "#8B0000",
                bgcolor: "rgba(139, 0, 0, 0.04)",
              },
              "&.Mui-selected": {
                color: "#8B0000",
                fontWeight: 800,
                "& .MuiSvgIcon-root": {
                  color: "#8B0000",
                },
              },
            },
          }}
        >
          <Tab
            icon={<AssignmentReturnIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label="Quầy trả sách"
          />
          <Tab
            icon={<ReceiptLongIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                <span>Sổ nợ phí phạt</span>
                {unpaidFines.length > 0 && (
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "#8B0000",
                      color: "#ffffff",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      height: 18,
                      minWidth: 18,
                      px: 0.6,
                      borderRadius: "9px",
                      boxShadow: "0 2px 4px rgba(139, 0, 0, 0.25)",
                    }}
                  >
                    {unpaidFines.length > 99 ? "99+" : unpaidFines.length}
                  </Box>
                )}
              </Box>
            }
          />
          <Tab
            icon={<QrCode2Icon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                <span>Đơn SePay chờ đối soát</span>
                {pendingOrders.length > 0 && (
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "#E65100",
                      color: "#ffffff",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      height: 18,
                      minWidth: 18,
                      px: 0.6,
                      borderRadius: "9px",
                      boxShadow: "0 2px 4px rgba(230, 81, 0, 0.25)",
                    }}
                  >
                    {pendingOrders.length > 99 ? "99+" : pendingOrders.length}
                  </Box>
                )}
              </Box>
            }
          />
        </Tabs>
      </Paper>

      {/* TAB 0: QUẦY TRẢ SÁCH (Check-in) */}
      {activeTab === 0 && (
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
            <Stack spacing={2}>
              {/* Cảnh báo nợ nếu độc giả đang chọn có phí phạt chưa nộp */}
              {selectedPatronDebts.length > 0 && (
                <Alert
                  severity="error"
                  variant="filled"
                  icon={<WarningAmberIcon />}
                  sx={{
                    borderRadius: 2,
                    alignItems: "center",
                    boxShadow: "0 4px 12px rgba(211,47,47,0.25)",
                    "& .MuiAlert-message": { flex: 1 },
                  }}
                  action={
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => void handlePayFine(selectedPatronDebts[0].record_id || selectedPatronDebts[0].id, "cash")}
                        disabled={!canUpdateBorrow || !!payingFineId}
                        sx={{
                          color: "error.main",
                          fontWeight: 800,
                          textTransform: "none",
                          bgcolor: "white",
                          "&:hover": { bgcolor: "#f5f5f5" },
                        }}
                      >
                        Thu tiền mặt ({totalPatronDebt.toLocaleString("vi-VN")} đ)
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => void handleOpenQrPayment(selectedPatronDebts[0])}
                        disabled={!canUpdateBorrow}
                        sx={{
                          color: "white",
                          fontWeight: 700,
                          textTransform: "none",
                          borderColor: "rgba(255,255,255,0.7)",
                          "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" },
                        }}
                      >
                        Tạo mã SePay
                      </Button>
                    </Stack>
                  }
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Độc giả đang có {selectedPatronDebts.length} khoản nợ chưa thanh toán (Tổng: {totalPatronDebt.toLocaleString("vi-VN")} đ)
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9, display: "block" }}>
                    Chính sách: Độc giả phải thanh toán 100% nợ trước khi có thể mượn sách mới.
                  </Typography>
                </Alert>
              )}

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
            </Stack>
          </Grid>
        </Grid>
      )}

      {/* TAB 1: SỔ NỢ PHÍ PHẠT TOÀN THƯ VIỆN */}
      {activeTab === 1 && (
        <FinesLedger
          items={unpaidFines}
          payingFineId={payingFineId}
          canUpdateBorrow={canUpdateBorrow}
          onRefresh={() => void loadUnpaidFines()}
          onPayCash={(recordId) => void handlePayFine(recordId, "cash")}
          onOpenQr={(item) => void handleOpenQrPayment(item)}
        />
      )}

      {/* TAB 2: ĐƠN SEPAY CHỜ XỬ LÝ / ĐỐI SOÁT */}
      {activeTab === 2 && (
        <PendingPaymentOrders
          items={pendingOrders}
          loading={loadingPending}
          confirmingCode={confirmingCode}
          canUpdateBorrow={canUpdateBorrow}
          onRefresh={() => void loadPendingOrders()}
          onConfirm={(orderCode) => void handleConfirmOrder(orderCode)}
        />
      )}

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
        onClose={() => { setQrOrder(null); setQrSourceItem(null); }}
        onSuccess={handleQrPaymentSuccess}
        onRegenerate={() => { if (qrSourceItem) void handleOpenQrPayment(qrSourceItem); }}
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

    </Stack>
  );
}
