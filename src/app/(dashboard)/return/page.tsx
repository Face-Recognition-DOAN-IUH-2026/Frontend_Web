"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
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
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AlertIcon from "@mui/icons-material/WarningAmberOutlined";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import CameraAltIcon from "@mui/icons-material/CameraAltOutlined";
import CheckIcon from "@mui/icons-material/CheckCircleOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScannerOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import UsersIcon from "@mui/icons-material/GroupsOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type { BorrowRecord, StaffActiveBorrowerSummary, StaffPatronActiveBorrowsResponse } from "@/lib/types";

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<any>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scannedReturns, setScannedReturns] = useState<ScannedReturnItem[]>([]);
  const [batchReturning, setBatchReturning] = useState(false);
  const [scanToast, setScanToast] = useState("");

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

  const stopCamera = useCallback(() => {
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch {}
      readerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  const handleScanned = useCallback((isbn: string) => {
    const normalized = isbn.replace(/-/g, "");
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
  }, [detail]);

  useEffect(() => {
    if (!scannerOpen) {
      stopCamera();
      setCameraError("");
      setCameraReady(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        setCameraError("");
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (!active) return;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => { setCameraReady(true); };
        }
      } catch (err: any) {
        if (!active) return;
        if (err.name === "NotAllowedError") setCameraError("Không có quyền truy cập camera.");
        else if (err.name === "NotFoundError") setCameraError("Không tìm thấy camera trên thiết bị.");
        else setCameraError("Không thể khởi động camera.");
      }
    })();
    return () => { active = false; };
  }, [scannerOpen, stopCamera]);

  useEffect(() => {
    if (!cameraReady || !videoRef.current || !scannerOpen) return;
    let active = true;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (!active) return;
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;
        reader.decodeFromVideoElement(videoRef.current!, (result, err) => {
          if (!active) return;
          if (result) {
            const code = result.getText();
            if (/^\d{10,13}$/.test(code.replace(/-/g, ""))) {
              handleScanned(code);
            }
          }
        });
      } catch {}
    })();
    return () => { active = false; };
  }, [cameraReady, scannerOpen, handleScanned]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <Stack spacing={3}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2 }}>
        {[
          { label: "Độc giả đang mượn", value: totals.borrowers, icon: UsersIcon, color: "primary.main" },
          { label: "Sách chưa trả", value: totals.books, icon: BookIcon, color: "success.main" },
          { label: "Sách quá hạn", value: totals.overdue, icon: AlertIcon, color: "error.main" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} variant="outlined">
              <CardContent>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900 }}>{item.label}</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900 }}>{item.value}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: item.color, color: "primary.contrastText" }}>
                    <Icon />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {error ? <Alert severity="error" onClose={() => setError("")}>{error}</Alert> : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "420px minmax(0, 1fr)" }, gap: 3 }}>
        <Paper variant="outlined" sx={{ minHeight: 620, p: 2 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
            <Box>
              <Typography variant="h6">Độc giả đang mượn</Typography>
              <Typography variant="body2" color="text.secondary">Chọn độc giả để xem sách cần trả</Typography>
            </Box>
            <Button startIcon={<RefreshIcon />} onClick={loadBorrowers} disabled={loadingBorrowers}>Tải lại</Button>
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

          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={filter}
            onChange={(_, value) => value && setFilter(value)}
            sx={{ mt: 2 }}
          >
            <ToggleButton value="all">Tất cả</ToggleButton>
            <ToggleButton value="overdue">Quá hạn</ToggleButton>
            <ToggleButton value="active">Đúng hạn</ToggleButton>
          </ToggleButtonGroup>

          <Divider sx={{ my: 2 }} />

          {loadingBorrowers ? (
            <Box sx={{ py: 8, display: "grid", placeItems: "center" }}><CircularProgress /></Box>
          ) : borrowers.length === 0 ? (
            <Alert severity="info">Không có độc giả đang mượn sách.</Alert>
          ) : filteredBorrowers.length === 0 ? (
            <Alert severity="info">Không tìm thấy độc giả phù hợp.</Alert>
          ) : (
            <List disablePadding sx={{ maxHeight: 430, overflowY: "auto" }}>
              {filteredBorrowers.map((borrower) => {
                const selected = borrower.patron.student_code === selectedStudentCode;
                return (
                  <ListItemButton
                    key={borrower.patron.id}
                    selected={selected}
                    onClick={() => setSelectedStudentCode(borrower.patron.student_code)}
                    sx={{ mb: 1, border: 1, borderColor: selected ? "primary.main" : "divider", borderRadius: 1 }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                      <Typography sx={{ fontWeight: 900 }} noWrap>{borrowerName(borrower)}</Typography>
                      <Typography variant="caption" sx={{ display: "block", mt: 0.5, fontFamily: "monospace" }}>
                        {borrower.patron.student_code}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.75, alignItems: "center", justifyContent: "space-between" }}>
                        <Typography variant="caption" color="text.secondary">{borrower.total_borrowed} sách đang mượn</Typography>
                        <Typography variant="caption" color="text.secondary">Hạn gần nhất {formatDate(borrower.nearest_due_at)}</Typography>
                      </Stack>
                    </Box>
                    <Chip
                      size="small"
                      color={borrower.overdue_count > 0 ? "error" : "success"}
                      label={borrower.overdue_count > 0 ? `${borrower.overdue_count} quá hạn` : "Đúng hạn"}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ minHeight: 620, p: 2 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
            <Box>
              <Typography variant="h6">Chi tiết trả sách</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedBorrower ? `${borrowerName(selectedBorrower)} - ${selectedBorrower.patron.student_code}` : "Chọn một độc giả ở danh sách bên trái"}
              </Typography>
            </Box>
            {selectedStudentCode && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<QrCodeScannerIcon />}
                onClick={() => setScannerOpen(true)}
              >
                Quét ISBN
              </Button>
            )}
          </Stack>

          {!selectedStudentCode ? (
            <Alert severity="info">Chọn một độc giả đang mượn để xem sách và xác nhận trả.</Alert>
          ) : loadingDetail ? (
            <Box sx={{ minHeight: 420, display: "grid", placeItems: "center" }}><CircularProgress /></Box>
          ) : !detail || detail.records.length === 0 ? (
            <Alert severity="success">Độc giả này đã trả hết sách.</Alert>
          ) : (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                <Chip color="primary" label={`${detail.total} sách đang mượn`} />
                <Chip color={detail.overdue_count > 0 ? "error" : "success"} label={detail.overdue_count > 0 ? `${detail.overdue_count} quá hạn` : "Không quá hạn"} />
                {detail.patron.email ? <Chip variant="outlined" label={detail.patron.email} /> : null}
              </Stack>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Sách</TableCell>
                      <TableCell>ISBN</TableCell>
                      <TableCell>Ngày mượn</TableCell>
                      <TableCell>Hạn trả</TableCell>
                      <TableCell>Vị trí</TableCell>
                      <TableCell>Trạng thái</TableCell>
                      <TableCell align="right">Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.records.map((record) => (
                      <TableRow key={record.id} selected={isOverdue(record)}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>{record.book?.title || record.book_id}</Typography>
                          {record.book?.author ? <Typography variant="caption" color="text.secondary">{record.book.author}</Typography> : null}
                        </TableCell>
                        <TableCell sx={{ fontFamily: "monospace" }}>{record.book?.isbn || record.book_id}</TableCell>
                        <TableCell>{formatDate(record.borrow_at)}</TableCell>
                        <TableCell>{formatDate(record.due_at)}</TableCell>
                        <TableCell>{record.shelf_location || record.book?.shelf_location || "-"}</TableCell>
                        <TableCell>{dueChip(record)}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<CheckIcon />}
                            disabled={!!returningId}
                            onClick={() => setConfirmRecord(record)}
                          >
                            Xác nhận trả
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </Paper>
      </Box>

      <Dialog open={scannerOpen} onClose={batchReturning ? undefined : () => setScannerOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <QrCodeScannerIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Quét ISBN trả sách</Typography>
            </Stack>
            {!batchReturning && (
              <IconButton size="small" onClick={() => setScannerOpen(false)}><CloseIcon fontSize="small" /></IconButton>
            )}
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", md: "row" }, flex: 1, overflow: "hidden" }}>
            <Paper
              variant="outlined"
              sx={{
                position: "relative",
                overflow: "hidden",
                bgcolor: "black",
                width: { md: "45%" },
                aspectRatio: { xs: "16/9", md: "4/3" },
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {cameraError ? (
                <Stack spacing={1} sx={{ alignItems: "center", color: "grey.300", p: 3, textAlign: "center" }}>
                  <CameraAltIcon sx={{ fontSize: 42 }} />
                  <Typography variant="body2">{cameraError}</Typography>
                </Stack>
              ) : (
                <>
                  <Box
                    component="video"
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    sx={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                  {!cameraReady && (
                    <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.55)", color: "common.white", alignItems: "center", justifyContent: "center" }} spacing={1}>
                      <CircularProgress size={26} color="inherit" />
                      <Typography variant="body2">Đang kết nối camera...</Typography>
                    </Stack>
                  )}
                </>
              )}
            </Paper>

            <Stack spacing={1.5} sx={{ flex: 1, overflow: "auto" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <QrCodeScannerIcon color="primary" sx={{ fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                  {scannedReturns.length > 0 ? `Đã quét (${scannedReturns.length} cuốn)` : "Sách đã quét"}
                </Typography>
              </Stack>

              {scannedReturns.length === 0 ? (
                <Alert severity="info" sx={{ flex: 1, display: "flex", alignItems: "center" }}>
                  Đưa mã vạch ISBN vào camera. Sách sẽ xuất hiện tại đây.
                </Alert>
              ) : (
                scannedReturns.map((item) => (
                  <Paper key={item.isbn} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                      {item.record.book?.cover_url ? (
                        <Box
                          component="img"
                          src={item.record.book.cover_url}
                          alt={item.record.book.title}
                          sx={{ width: 40, height: 56, objectFit: "cover", borderRadius: 0.5, flexShrink: 0 }}
                        />
                      ) : (
                        <Avatar variant="rounded" sx={{ width: 40, height: 56, bgcolor: "background.default", flexShrink: 0 }}>
                          <BookIcon />
                        </Avatar>
                      )}
                      <Stack spacing={0.3} sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap>
                          {item.record.book?.title || item.record.book_id}
                        </Typography>
                        {item.record.book?.author && (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {item.record.book.author}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ fontFamily: "monospace", color: "primary.main" }}>
                          {item.isbn}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                          {dueChip(item.record)}
                          <Typography variant="caption" color="text.secondary">
                            Mượn: {formatDate(item.record.borrow_at)}
                          </Typography>
                        </Stack>
                        <Select
                          value={item.condition}
                          onChange={(e) => updateCondition(item.isbn, e.target.value)}
                          displayEmpty
                          fullWidth
                          size="small"
                          sx={{ mt: 0.5 }}
                        >
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
          <Button
            variant="contained"
            disabled={batchReturning || scannedReturns.length === 0}
            onClick={handleBatchReturn}
          >
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
          <Select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            displayEmpty
            fullWidth
            size="small"
          >
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
          <Button variant="contained" onClick={handleReturnRecord} disabled={!!returningId || !condition}>
            {returningId ? "Đang trả..." : "Xác nhận trả"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={3200} onClose={() => setSnackbar(null)}>
        {snackbar ? <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>{snackbar.message}</Alert> : undefined}
      </Snackbar>

      <Snackbar
        open={!!scanToast}
        autoHideDuration={2000}
        onClose={() => setScanToast("")}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        message={scanToast}
      />
    </Stack>
  );
}
