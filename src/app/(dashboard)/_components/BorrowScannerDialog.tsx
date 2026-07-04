"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import CameraAltIcon from "@mui/icons-material/CameraAltOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import ErrorIcon from "@mui/icons-material/ReportOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScannerOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type { BookWithStats } from "@/lib/types";
import { slideInRight, successPop } from "@/lib/animations";

interface ScannedBorrowItem {
  barcode: string;
  isbn: string;
  loading: boolean;
  can_borrow: boolean;
  reason: string | null;
  book: BookWithStats | null;
  copy_id: string | null;
  book_id: string | null;
  copy_barcode: string | null;
}

export default function BorrowScannerDialog({
  open,
  patronId,
  maxItems,
  onClose,
  onSuccess,
}: {
  open: boolean;
  patronId: string;
  maxItems?: number;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<any>(null);
  const lastScannedRef = useRef<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scanned, setScanned] = useState<ScannedBorrowItem[]>([]);
  const [lookingUp, setLookingUp] = useState(false);
  const [createError, setCreateError] = useState("");
  const [scanToast, setScanToast] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [manualIsbn, setManualIsbn] = useState("");

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

  const lookupItem = useCallback(async (barcode: string, isbn: string) => {
    setScanned((prev) => prev.map((item) =>
      item.barcode === barcode ? { ...item, loading: true } : item
    ));
    try {
      const result = await api.lookupBorrowSlip({
        patron_id: patronId,
        items: [{ barcode, isbn }],
      });
      const item = result.items.find((i) => i.barcode === barcode);
      if (!item) {
        setScanned((prev) => prev.filter((i) => i.barcode !== barcode));
        setLookupError(`Sách ISBN ${barcode} không tồn tại trong thư viện`);
        return;
      }
      if (!item.can_borrow) {
        setScanned((prev) => prev.filter((i) => i.barcode !== barcode));
        const msg = item.reason || 'Sách không thể mượn';
        const title = item.book?.title || '';
        setLookupError(title ? `"${title}": ${msg}` : `${msg} (ISBN: ${barcode})`);
        return;
      }
      setScanned((prev) => prev.map((i) =>
        i.barcode === barcode ? {
          ...i,
          loading: false,
          can_borrow: item.can_borrow,
          reason: item.reason,
          book: item.book,
          copy_id: item.copy?.id || null,
          book_id: item.book?.id || null,
          copy_barcode: item.copy?.barcode || null,
        } : i
      ));
    } catch {
      setScanned((prev) => prev.filter((item) => item.barcode !== barcode));
      setLookupError(`Lỗi tra cứu: ${barcode}`);
    }
  }, [patronId]);

  const addScanned = useCallback((isbn: string) => {
    if (!/^\d{10,13}$/.test(isbn.replace(/-/g, ""))) return;
    const normalized = isbn.replace(/-/g, "");
    lastScannedRef.current = normalized;
    setScanToast(normalized);
    setScanned((prev) => {
      if (prev.some((item) => item.barcode === normalized)) {
        setScanToast(`Sách ${normalized} đã có trong danh sách`);
        return prev;
      }
      if (maxItems !== undefined && prev.length >= maxItems) {
        setScanToast(`Chỉ được mượn tối đa ${maxItems} cuốn`);
        return prev;
      }
      return [...prev, {
        barcode: normalized,
        isbn: normalized,
        loading: true,
        can_borrow: false,
        reason: null,
        book: null,
        copy_id: null,
        book_id: null,
        copy_barcode: null,
      }];
    });
    lookupItem(normalized, normalized);
  }, [lookupItem, maxItems]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setScanned([]);
      setCameraError("");
      setCreateError("");
      setScanToast("");
      lastScannedRef.current = null;
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
        if (err.name === "NotAllowedError") setCameraError("Không có quyền truy cập camera. Hãy cấp quyền camera cho trình duyệt.");
        else if (err.name === "NotFoundError") setCameraError("Không tìm thấy camera trên thiết bị.");
        else setCameraError("Không thể khởi động camera.");
      }
    })();
    return () => { active = false; };
  }, [open, stopCamera]);

  useEffect(() => {
    if (!cameraReady || !videoRef.current || !open) return;
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
              addScanned(code);
            }
          }
        });
      } catch {}
    })();
    return () => { active = false; };
  }, [cameraReady, open, addScanned]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const removeItem = (barcode: string) => {
    setScanned((prev) => prev.filter((item) => item.barcode !== barcode));
  };

  const handleCreateSlip = async () => {
    const validItems = scanned.filter((item) => item.can_borrow && item.book_id && item.copy_id);
    if (!validItems.length || !patronId) return;
    setCreateError("");
    try {
      const confirmResult = await api.confirmBorrowSlip({
        patron_id: patronId,
        items: validItems.map((item) => ({
          barcode: item.copy_barcode || item.barcode,
          isbn: item.isbn,
          book_id: item.book_id!,
          copy_id: item.copy_id!,
        })),
      });
      if (confirmResult.status === "success") {
        stopCamera();
        setScanned([]);
        onSuccess(confirmResult.message);
        onClose();
      }
    } catch (err) {
      const detail = getErrorMessage(err);
      const removedBarcodes: string[] = [];
      const toastMsg = detail;

      const matchTitle = detail.match(/^Sach "(.+)" da duoc doc gia nay muon$/);
      if (matchTitle) {
        const title = matchTitle[1];
        setScanned((prev) => {
          const filtered = prev.filter((item) => {
            if (item.book?.title === title) {
              removedBarcodes.push(item.barcode);
              return false;
            }
            return true;
          });
          return filtered;
        });
      } else {
        const matchBarcode = detail.match(/^(?:Ban sao|Ma vach) ([^\s]+) (?:dang duoc muon|khong ton tai)/);
        if (matchBarcode) {
          const barcode = matchBarcode[1];
          setScanned((prev) => {
            const filtered = prev.filter((item) => {
              if (item.barcode === barcode || item.barcode.includes(barcode)) {
                removedBarcodes.push(item.barcode);
                return false;
              }
              return true;
            });
            return filtered;
          });
        } else {
          setCreateError(detail);
        }
      }
      if (removedBarcodes.length > 0) {
        setScanToast(toastMsg);
      }
    }
  };

  const validCount = scanned.filter((item) => item.can_borrow).length;
  const totalScanned = scanned.length;

  return (
    <>
      <Dialog open={open} onClose={lookingUp ? undefined : onClose} fullWidth maxWidth="xl">
        <DialogTitle>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <QrCodeScannerIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Quét ISBN sách</Typography>
            </Stack>
            {!lookingUp && (
              <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
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
                width: { md: "50%" },
                aspectRatio: { xs: "16/9", md: "4/3" },
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {cameraError ? (
                <Stack spacing={1} sx={{ alignItems: "center", color: "grey.300", p: 3 }}>
                  <CameraAltIcon sx={{ fontSize: 42 }} />
                  <Typography>{cameraError}</Typography>
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
                  {totalScanned > 0 ? `Đã quét (${totalScanned} cuốn)` : "Sách đã quét"}
                </Typography>
              </Stack>

              {createError ? <Alert severity="error" onClose={() => setCreateError("")}>{createError}</Alert> : null}

              {lookupError ? (
                <Paper variant="outlined" sx={{ p: 1.5, borderColor: "error.main", bgcolor: "error.50" }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <ErrorIcon color="error" sx={{ fontSize: 20 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "error.900", flex: 1 }}>
                        {lookupError}
                      </Typography>
                      <IconButton size="small" onClick={() => setLookupError(null)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setManualIsbn("");
                        setLookupError(null);
                      }}
                      sx={{ textTransform: "none", fontWeight: 600, alignSelf: "flex-start" }}
                    >
                      Nhập ISBN thủ công
                    </Button>
                  </Stack>
                </Paper>
              ) : null}

              <TextField
                size="small"
                placeholder="Nhập ISBN thủ công..."
                value={manualIsbn}
                onChange={(e) => setManualIsbn(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manualIsbn.trim()) {
                    addScanned(manualIsbn.trim());
                    setManualIsbn("");
                  }
                }}
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />

              {scanned.length === 0 ? (
                <Alert severity="info" sx={{ flex: 1, display: "flex", alignItems: "center" }}>
                  Đưa mã vạch ISBN vào camera. Sách sẽ xuất hiện tại đây.
                </Alert>
              ) : (
                scanned.map((item) => {
                  const isLastScanned = item.barcode === lastScannedRef.current;
                  const hasError = !item.loading && !item.can_borrow;
                  const isSuccess = !item.loading && item.can_borrow;
                  return (
                    <Paper
                      key={item.barcode}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderColor: isLastScanned ? "primary.main" : hasError ? "error.main" : undefined,
                        bgcolor: isLastScanned ? "action.hover" : hasError ? "error.50" : undefined,
                        animation: isSuccess
                          ? `${successPop} 0.4s ease-out`
                          : isLastScanned
                          ? `${slideInRight} 0.3s ease-out`
                          : undefined,
                      }}
                    >
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                        {item.loading ? (
                          <Avatar variant="rounded" sx={{ width: 40, height: 56, bgcolor: "background.default", flexShrink: 0 }}>
                            <CircularProgress size={20} />
                          </Avatar>
                        ) : item.book?.cover_url ? (
                          <Box
                            component="img"
                            src={item.book.cover_url}
                            alt={item.book.title}
                            sx={{ width: 40, height: 56, objectFit: "cover", borderRadius: 0.5, flexShrink: 0 }}
                          />
                        ) : (
                          <Avatar variant="rounded" sx={{ width: 40, height: 56, bgcolor: hasError ? "error.main" : "background.default", flexShrink: 0 }}>
                            {hasError ? <ErrorIcon fontSize="small" /> : <BookIcon />}
                          </Avatar>
                        )}
                        <Stack spacing={0.3} sx={{ flex: 1, minWidth: 0 }}>
                          {item.loading ? (
                            <Typography variant="body2" color="text.secondary">Đang tra cứu...</Typography>
                          ) : item.can_borrow && item.book ? (
                            <>
                              <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap>
                                {item.book.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {item.book.author || "-"}
                              </Typography>
                              <Typography variant="caption" sx={{ fontFamily: "monospace", color: "primary.main" }}>
                                {item.barcode}
                              </Typography>
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexWrap: "wrap", mt: 0.5 }}>
                                <Chip size="small" variant="outlined" label={`Kho: ${item.book.total_copies}`} sx={{ height: 20, fontSize: 11 }} />
                                <Chip size="small" variant="outlined" color="success" label={`Sẵn: ${item.book.available_copies}`} sx={{ height: 20, fontSize: 11 }} />
                              </Stack>
                            </>
                          ) : (
                            <>
                              <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap color="error">
                                {item.book?.title || item.barcode}
                              </Typography>
                              {item.reason && (
                                <Typography variant="caption" color="error">
                                  {item.reason}
                                </Typography>
                              )}
                            </>
                          )}
                        </Stack>
                        <IconButton size="small" color="error" onClick={() => removeItem(item.barcode)} sx={{ mt: 0.5 }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Paper>
                  );
                })
              )}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={lookingUp}>Hủy</Button>
          <Button
            variant="contained"
            disabled={lookingUp || validCount === 0}
            onClick={handleCreateSlip}
          >
            {lookingUp ? "Đang xử lý..." : `Tạo phiếu mượn (${validCount} cuốn)`}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!scanToast}
        autoHideDuration={2000}
        onClose={() => setScanToast("")}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        message={
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <CheckCircleIcon sx={{ fontSize: 18 }} />
            <span>{scanToast}</span>
          </Stack>
        }
      />
    </>
  );
}