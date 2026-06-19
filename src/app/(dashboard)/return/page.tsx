"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertTitle,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  MenuItem,
  Paper,
  Select,
  Slide,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AlertIcon from "@mui/icons-material/WarningAmberOutlined";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import CameraAltIcon from "@mui/icons-material/CameraAltOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScannerOutlined";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import UsersIcon from "@mui/icons-material/GroupsOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import { fadeInUp, slideInRight, successPop } from "@/lib/animations";
import type { BorrowRecord, StaffActiveBorrowerSummary, StaffPatronActiveBorrowsResponse } from "@/lib/types";

const RAW_CAM_URL = process.env.NEXT_PUBLIC_BORROW_CAM_URL || "http://192.168.1.13:8080/video";
const BORROW_CAM_URL = `/api/camera/proxy?url=${encodeURIComponent(RAW_CAM_URL)}`;

type BorrowerFilter = "all" | "overdue" | "active";

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

function borrowerName(borrower: StaffActiveBorrowerSummary) {
  return borrower.patron.full_name || borrower.patron.student_code || "Không rõ tên";
}

function dueChip(record: BorrowRecord) {
  const left = daysUntil(record.due_at);
  if (left < 0) return <Chip size="small" color="error" label={`Quá hạn ${Math.abs(left)} ngày`} />;
  if (left <= 2) return <Chip size="small" color="warning" label="Sắp đến hạn" />;
  return <Chip size="small" color="success" label="Đúng hạn" />;
}

interface ScannedReturnItem {
  isbn: string;
  record: BorrowRecord;
  condition: string;
}

export default function ReturnPage() {
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
  const [snackbar, setSnackbar] = useState<{ severity: "success" | "error" | "warning"; message: string } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedReturns, setScannedReturns] = useState<ScannedReturnItem[]>([]);
  const [batchReturning, setBatchReturning] = useState(false);
  const [scanToast, setScanToast] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);
  const readerRef = useRef<any>(null);
  const [imgReady, setImgReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (selectedStudentCode) loadPatronDetail(selectedStudentCode);
    else setDetail(null);
    setScannedReturns([]);
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
      setSnackbar({ severity: "success", message: "Trả sách thành công" });
      setCondition("");
      setConfirmRecord(null);
      await loadBorrowers();
      if (selectedStudentCode) await loadPatronDetail(selectedStudentCode);
    } catch (err: any) {
      setSnackbar({ severity: "error", message: getErrorMessage(err) || "Trả sách thất bại" });
    } finally {
      setReturningId(null);
    }
  };

  const handleBatchReturn = async () => {
    if (!scannedReturns.length) return;
    setBatchReturning(true);
    let ok = 0;
    let fail = 0;
    for (const item of scannedReturns) {
      try {
        await api.staffReturnBorrowRecord(item.record.id, item.condition || null);
        ok++;
      } catch {
        fail++;
      }
    }
    setBatchReturning(false);
    setScannerOpen(false);
    setScannedReturns([]);
    setSnackbar({
      severity: fail > 0 ? "warning" : "success",
      message: `Trả ${ok} sách thành công${fail > 0 ? `, ${fail} thất bại` : ""}`,
    });
    await loadBorrowers();
    if (selectedStudentCode) await loadPatronDetail(selectedStudentCode);
  };

  const updateCondition = (isbn: string, value: string) => {
    setScannedReturns((prev) => prev.map((item) =>
      item.isbn === isbn ? { ...item, condition: value } : item
    ));
  };

  const removeScanned = (isbn: string) => {
    setScannedReturns((prev) => prev.filter((item) => item.isbn !== isbn));
  };

  const handleScanned = useCallback((isbn: string) => {
    const normalized = isbn.replace(/-/g, "");
    if (!/^\d{10,13}$/.test(normalized)) return;
    if (normalized === lastScannedRef.current) return;
    lastScannedRef.current = normalized;

    let toast = "";
    setScannedReturns((prev) => {
      if (prev.some((item) => item.isbn === normalized)) {
        toast = `Sách ${normalized} đã có trong danh sách`;
        return prev;
      }
      const match = detail?.records.find((r) => {
        const recordIsbn = (r.book?.isbn || "").replace(/-/g, "");
        return recordIsbn === normalized;
      });
      if (match) {
        toast = `Đã thêm: ${match.book?.title || normalized}`;
        return [...prev, { isbn: normalized, record: match, condition: "" }];
      }
      toast = `Không tìm thấy sách đang mượn: ${normalized}`;
      return prev;
    });
    setScanToast(toast);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastScannedRef.current = null;
    }, 2000);
  }, [detail]);

  const stopScanning = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopReader = useCallback(() => {
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch {}
      readerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!scannerOpen) {
      stopScanning();
      setCameraError("");
      setImgReady(false);
      setScannedReturns([]);
      return;
    }
    setImgReady(false);
    setCameraError("");
  }, [scannerOpen, stopScanning]);

  useEffect(() => {
    if (!imgReady || !imgRef.current) return;
    stopScanning();
    intervalRef.current = setInterval(async () => {
      if (!imgRef.current) return;
      if (!readerRef.current) return;
      const img = imgRef.current;
      if (!img.complete) return;
      try {
        const result = await readerRef.current.decodeFromImageElement(img);
        if (result) {
          handleScanned(result.getText());
        }
      } catch {}
    }, 200);
    return () => stopScanning();
  }, [imgReady, handleScanned, stopScanning]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (!active) return;
        readerRef.current = new BrowserMultiFormatReader();
      } catch (err) {
        console.error("Failed to load ZXing:", err);
      }
    })();
    return () => { active = false; stopReader(); };
  }, []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "calc(100vh - 120px)" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h5" sx={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 1 }}>
          <BookIcon color="primary" />
          Trả sách
        </Typography>
        {selectedStudentCode && (
          <Button variant="outlined" color="error" size="small" onClick={() => { setSelectedStudentCode(null); setDetail(null); }}>
            Hủy chọn
          </Button>
        )}
      </Box>

      {error ? (
        <Slide direction="down" in={!!error} timeout={250}>
          <Alert severity="error" onClose={() => setError("")} sx={{ animation: `${slideInRight} 0.25s ease-out` }}>
            <AlertTitle>Lỗi</AlertTitle>
            {error}
          </Alert>
        </Slide>
      ) : null}

      <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <Grid size={{ xs: 12, md: 5, lg: 4 }} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Card variant="outlined" sx={{ flex: "0 0 auto" }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <UsersIcon color="primary" />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Danh sách độc giả</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {totals.borrowers} độc giả | {totals.books} sách | {totals.overdue} quá hạn
                    </Typography>
                  </Box>
                  <Button size="small" startIcon={<RefreshIcon />} onClick={loadBorrowers} disabled={loadingBorrowers} />
                </Stack>

                <TextField
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm theo MSSV hoặc tên..."
                  fullWidth
                  size="small"
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                    },
                  }}
                />

                <ToggleButtonGroup exclusive fullWidth size="small" value={filter} onChange={(_, value) => value && setFilter(value)}>
                  <ToggleButton value="all">Tất cả</ToggleButton>
                  <ToggleButton value="overdue">Quá hạn</ToggleButton>
                  <ToggleButton value="active">Đúng hạn</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            </CardContent>
          </Card>

          {loadingBorrowers ? (
            <Card variant="outlined" sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CircularProgress />
            </Card>
          ) : filteredBorrowers.length === 0 ? (
            <Card variant="outlined" sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CardContent>
                <Stack spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}>
                  <UsersIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                  <Typography>Không tìm thấy độc giả phù hợp</Typography>
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <List disablePadding sx={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
              {filteredBorrowers.map((borrower) => {
                const selected = borrower.patron.student_code === selectedStudentCode;
                const hasOverdue = borrower.overdue_count > 0;
                return (
                  <Paper
                    key={borrower.patron.id}
                    variant="outlined"
                    onClick={() => setSelectedStudentCode(borrower.patron.student_code)}
                    sx={{
                      cursor: "pointer",
                      p: 1.5,
                      borderLeft: 4,
                      borderLeftColor: hasOverdue ? "error.main" : "success.main",
                      borderColor: selected ? "primary.main" : "divider",
                      bgcolor: selected ? "action.selected" : undefined,
                      transition: "all .15s",
                      "&:hover": { borderColor: "primary.light" },
                    }}
                  >
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: hasOverdue ? "error.main" : "success.main", fontSize: 13, fontWeight: 700 }}>
                        {borrowerName(borrower)[0]?.toUpperCase() || "?"}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontWeight: 900, fontSize: 14 }} noWrap>{borrowerName(borrower)}</Typography>
                        <Typography variant="caption" sx={{ fontFamily: "monospace", display: "block" }}>
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
            <Card
              variant="outlined"
              sx={{
                flex: "0 0 auto",
                borderLeft: 4,
                borderLeftColor: selectedBorrower.overdue_count > 0 ? "error.main" : "success.main",
              }}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar sx={{ width: 48, height: 48, bgcolor: "primary.main" }}>
                      {selectedBorrower.patron.full_name?.[0]?.toUpperCase() || "?"}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900 }} noWrap>
                        {borrowerName(selectedBorrower)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedBorrower.patron.student_code}
                      </Typography>
                    </Box>
                    <Chip size="small" color="success" label="Đang mượn" icon={<CheckCircleIcon />} />
                  </Box>

                  <Divider />

                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                      <Chip size="small" color="primary" label={`${selectedBorrower.total_borrowed} sách`} />
                      {selectedBorrower.overdue_count > 0 && (
                        <Chip size="small" color="error" label={`${selectedBorrower.overdue_count} quá hạn`} />
                      )}
                    </Stack>

                    {selectedBorrower.overdue_count > 0 && (
                      <Alert severity="error" sx={{ py: 0.5 }}>
                        <AlertIcon fontSize="small" sx={{ mr: 0.5 }} />
                        Có {selectedBorrower.overdue_count} cuốn sách quá hạn
                      </Alert>
                    )}

                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      startIcon={<QrCodeScannerIcon />}
                      onClick={() => setScannerOpen(true)}
                      sx={{ animation: `${fadeInUp} 0.3s ease-out` }}
                    >
                      Quét mã vạch trả sách
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ) : null}
        </Grid>

        <Grid size={{ xs: 12, md: 7, lg: 8 }} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {selectedBorrower ? (
            <Card variant="outlined" sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", p: { xs: 1, md: 2 }, overflow: "auto" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                  <BookIcon color="primary" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                    Sách cần trả
                  </Typography>
                  {detail && (
                    <Chip size="small" label={`${detail.total} cuốn`} sx={{ ml: "auto" }} />
                  )}
                </Stack>

                {loadingDetail ? (
                  <Stack sx={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <CircularProgress />
                  </Stack>
                ) : !detail || detail.records.length === 0 ? (
                  <Stack sx={{ flex: 1, alignItems: "center", justifyContent: "center" }} spacing={1}>
                    <CheckCircleIcon sx={{ fontSize: 48, color: "success.main" }} />
                    <Typography color="success.main" sx={{ fontWeight: 900 }}>Độc giả đã trả hết sách</Typography>
                  </Stack>
                ) : (
                  <Stack spacing={1.5}>
                    {detail.records.map((record) => (
                      <Paper key={record.id} variant="outlined" sx={{ p: 1.5, borderLeft: isOverdue(record) ? 4 : 0, borderLeftColor: "error.main" }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                          {record.book?.cover_url ? (
                            <Box component="img" src={record.book.cover_url} alt={record.book.title} sx={{ width: 40, height: 56, objectFit: "cover", borderRadius: 0.5, flexShrink: 0 }} />
                          ) : (
                            <Avatar variant="rounded" sx={{ width: 40, height: 56, bgcolor: "background.default", flexShrink: 0 }}>
                              <BookIcon />
                            </Avatar>
                          )}
                          <Stack spacing={0.3} sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap>{record.book?.title || record.book_id}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>{record.book?.author || "-"}</Typography>
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}>
                              <Typography variant="caption" sx={{ fontFamily: "monospace", color: "primary.main" }}>{record.book?.isbn}</Typography>
                              {dueChip(record)}
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              Mượn: {formatDate(record.borrow_at)} | Hạn: {formatDate(record.due_at)}
                            </Typography>
                          </Stack>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircleIcon />}
                            disabled={!!returningId}
                            onClick={() => setConfirmRecord(record)}
                            sx={{ flexShrink: 0 }}
                          >
                            Trả
                          </Button>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card variant="outlined" sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CardContent>
                <Stack spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}>
                  <UsersIcon sx={{ fontSize: 72, opacity: 0.3 }} />
                  <Typography variant="body1" sx={{ fontWeight: 900 }}>Chọn độc giả để xem sách cần trả</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                    Chọn một độc giả từ danh sách bên trái
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      <Dialog open={scannerOpen} onClose={batchReturning ? undefined : () => setScannerOpen(false)} fullWidth maxWidth="xl">
        <DialogTitle>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <QrCodeScannerIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Quét mã vạch trả sách (IP Camera)</Typography>
            </Stack>
            {!batchReturning && (
              <IconButton size="small" onClick={() => setScannerOpen(false)}><CloseIcon fontSize="small" /></IconButton>
            )}
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", md: "row" }, flex: 1, overflow: "hidden" }}>
            <Box sx={{ width: { md: "50%" }, flexShrink: 0 }}>
              <Box sx={{ position: "relative", width: "100%", aspectRatio: "4/3", bgcolor: "black", borderRadius: 1, overflow: "hidden" }}>
                {cameraError ? (
                  <Stack spacing={1.5} sx={{ alignItems: "center", justifyContent: "center", height: "100%", color: "grey.300", p: 3 }}>
                    <CameraAltIcon sx={{ fontSize: 48 }} />
                    <Typography sx={{ textAlign: "center" }}>{cameraError}</Typography>
                  </Stack>
                ) : (
                  <>
                    <Box component="img" ref={imgRef} src={BORROW_CAM_URL} onLoad={() => setImgReady(true)} onError={() => setCameraError("Không thể kết nối IP Camera")} alt="IP Camera" sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    {!imgReady && !cameraError && (
                      <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.55)", color: "common.white", alignItems: "center", justifyContent: "center" }} spacing={1}>
                        <CircularProgress size={28} color="inherit" />
                        <Typography variant="body2">Đang kết nối camera...</Typography>
                      </Stack>
                    )}
                    <Box sx={{ position: "absolute", top: 8, left: 8, px: 1, py: 0.5, bgcolor: "rgba(0,0,0,.6)", borderRadius: 0.5 }}>
                      <Typography variant="caption" sx={{ color: "common.white", fontSize: 11 }}>IP Camera</Typography>
                    </Box>
                  </>
                )}
              </Box>
            </Box>

            <Stack spacing={1.5} sx={{ flex: 1, overflow: "auto" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <QrCodeScannerIcon color="primary" sx={{ fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                  {scannedReturns.length > 0 ? `Đã quét (${scannedReturns.length} cuốn)` : "Sách đã quét"}
                </Typography>
              </Stack>

              {scannedReturns.length === 0 ? (
                <Alert severity="info" sx={{ flex: 1, display: "flex", alignItems: "center" }}>
                  Đưa mã vạch vào camera. Sách sẽ xuất hiện tại đây.
                </Alert>
              ) : (
                scannedReturns.map((item) => (
                  <Paper key={item.isbn} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                      {item.record.book?.cover_url ? (
                        <Box component="img" src={item.record.book.cover_url} alt={item.record.book.title} sx={{ width: 40, height: 56, objectFit: "cover", borderRadius: 0.5, flexShrink: 0 }} />
                      ) : (
                        <Avatar variant="rounded" sx={{ width: 40, height: 56, bgcolor: "background.default", flexShrink: 0 }}>
                          <BookIcon />
                        </Avatar>
                      )}
                      <Stack spacing={0.3} sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap>{item.record.book?.title || item.record.book_id}</Typography>
                        {item.record.book?.author && (
                          <Typography variant="caption" color="text.secondary" noWrap>{item.record.book.author}</Typography>
                        )}
                        <Typography variant="caption" sx={{ fontFamily: "monospace", color: "primary.main" }}>{item.isbn}</Typography>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                          {dueChip(item.record)}
                          {item.condition && <Chip size="small" variant="outlined" label={item.condition} />}
                        </Stack>
                        <Select value={item.condition} onChange={(e) => updateCondition(item.isbn, e.target.value)} displayEmpty fullWidth size="small" sx={{ mt: 0.5 }}>
                          <MenuItem value="">Tình trạng (tuỳ chọn)</MenuItem>
                          <MenuItem value="Còn mới">Còn mới</MenuItem>
                          <MenuItem value="Bình thường">Bình thường</MenuItem>
                          <MenuItem value="Sách cũ">Sách cũ</MenuItem>
                          <MenuItem value="Rách bìa">Rách bìa</MenuItem>
                          <MenuItem value="Rách trang">Rách trang</MenuItem>
                          <MenuItem value="Thiếu trang">Thiếu trang</MenuItem>
                          <MenuItem value="Ẩm mốc">Ẩm mốc</MenuItem>
                          <MenuItem value="Viết/bôi bẩn">Viết/bôi bẩn</MenuItem>
                          <MenuItem value="Hư hỏng nặng">Hư hỏng nặng</MenuItem>
                        </Select>
                      </Stack>
                      <IconButton size="small" color="error" onClick={() => removeScanned(item.isbn)} sx={{ mt: 0.5 }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Paper>
                ))
              )}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScannerOpen(false)} disabled={batchReturning}>Đóng</Button>
          <Button variant="contained" color="success" disabled={batchReturning || scannedReturns.length === 0} onClick={handleBatchReturn}>
            {batchReturning ? "Đang trả sách..." : `Xác nhận trả (${scannedReturns.length} cuốn)`}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirmRecord} onClose={() => { setConfirmRecord(null); setCondition(""); }}>
        <DialogTitle>Xác nhận trả sách</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Trả sách "{confirmRecord?.book?.title || confirmRecord?.book_id}" cho độc giả {detail?.patron.full_name || detail?.patron.student_code}?
          </DialogContentText>
          <Select value={condition} onChange={(e) => setCondition(e.target.value)} displayEmpty fullWidth size="small">
            <MenuItem value="">Tình trạng sách (tuỳ chọn)</MenuItem>
            <MenuItem value="Còn mới">Còn mới</MenuItem>
            <MenuItem value="Bình thường">Bình thường</MenuItem>
            <MenuItem value="Sách cũ">Sách cũ</MenuItem>
            <MenuItem value="Rách bìa">Rách bìa</MenuItem>
            <MenuItem value="Rách trang">Rách trang</MenuItem>
            <MenuItem value="Thiếu trang">Thiếu trang</MenuItem>
            <MenuItem value="Ẩm mốc">Ẩm mốc</MenuItem>
            <MenuItem value="Viết/bôi bẩn">Viết/bôi bẩn</MenuItem>
            <MenuItem value="Hư hỏng nặng">Hư hỏng nặng</MenuItem>
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirmRecord(null); setCondition(""); }}>Hủy</Button>
          <Button variant="contained" color="success" onClick={handleReturnRecord} disabled={!!returningId}>
            {returningId ? "Đang trả..." : "Xác nhận trả"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={3200} onClose={() => setSnackbar(null)} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        {snackbar ? (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)} sx={{ animation: `${slideInRight} 0.3s ease-out`, boxShadow: 4 }}>
            {snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>

      <Snackbar open={!!scanToast} autoHideDuration={2000} onClose={() => setScanToast("")} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity="success" onClose={() => setScanToast("")} sx={{ animation: `${successPop} 0.3s ease-out`, boxShadow: 4 }}>
            {scanToast}
          </Alert>
      </Snackbar>
    </Box>
  );
}