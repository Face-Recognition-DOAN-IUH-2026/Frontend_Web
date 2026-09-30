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
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import CameraAltIcon from "@mui/icons-material/CameraAltOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScannerOutlined";
import api from "@/lib/api-client";
import type { BorrowRecord, StaffPatronActiveBorrowsResponse } from "@/lib/types";

const RAW_CAM_URL = process.env.NEXT_PUBLIC_BORROW_CAM_URL || "http://192.168.1.7:8080/shot.jpg";
const BORROW_CAM_URL = `/api/camera/proxy?url=${encodeURIComponent(RAW_CAM_URL)}`;

export interface ScannedReturnItem {
  isbn: string;
  record: BorrowRecord;
  condition: string;
}

function daysUntil(value: string) {
  const today = new Date();
  const due = new Date(value);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

function dueChip(record: BorrowRecord) {
  const left = daysUntil(record.due_at);
  if (left < 0) return <Chip size="small" color="error" label={`Quá hạn ${Math.abs(left)} ngày`} sx={{ height: 20, fontSize: 11 }} />;
  if (left <= 2) return <Chip size="small" color="warning" label="Sắp đến hạn" sx={{ height: 20, fontSize: 11 }} />;
  return <Chip size="small" color="success" label="Đúng hạn" sx={{ height: 20, fontSize: 11 }} />;
}

interface ReturnScannerDialogProps {
  open: boolean;
  onClose: () => void;
  detail: StaffPatronActiveBorrowsResponse | null;
  onBatchComplete: () => Promise<void>;
  showNotice: (type: "success" | "warning" | "error" | "info", msg: string, duration?: number) => void;
}

export default function ReturnScannerDialog({
  open,
  onClose,
  detail,
  onBatchComplete,
  showNotice,
}: ReturnScannerDialogProps) {
  const [scannedReturns, setScannedReturns] = useState<ScannedReturnItem[]>([]);
  const [batchReturning, setBatchReturning] = useState(false);
  const [imgReady, setImgReady] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const imgRef = useRef<HTMLImageElement>(null);
  const readerRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadNextFrame = useCallback(() => {
    if (!imgRef.current || loadingRef.current) return;
    loadingRef.current = true;
    const sep = BORROW_CAM_URL.includes("?") ? "&" : "?";
    imgRef.current.src = `${BORROW_CAM_URL}${sep}_t=${Date.now()}`;
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    loadingRef.current = false;
  }, []);

  const stopScanning = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopAll = useCallback(() => {
    stopScanning();
    stopPolling();
  }, [stopScanning, stopPolling]);

  const stopReader = useCallback(() => {
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch {}
      readerRef.current = null;
    }
  }, []);

  const handleScanned = useCallback((isbn: string) => {
    const normalized = isbn.replace(/-/g, "");
    if (normalized.length < 4) return;
    if (normalized === lastScannedRef.current) return;
    lastScannedRef.current = normalized;

    let toast = "";
    let toastType: "success" | "warning" = "warning";
    setScannedReturns((prev) => {
      if (prev.some((item) => item.isbn === normalized)) {
        toast = `Sách ${normalized} đã có trong danh sách`;
        toastType = "warning";
        return prev;
      }
      const match = detail?.records.find((r) => {
        const recordIsbn = (r.book?.isbn || "").replace(/-/g, "");
        return recordIsbn === normalized;
      });
      if (match) {
        toast = `Đã thêm: ${match.book?.title || normalized}`;
        toastType = "success";
        return [...prev, { isbn: normalized, record: match, condition: "" }];
      }
      toast = `Độc giả không mượn sách: ${normalized}`;
      toastType = "warning";
      return prev;
    });

    if (toast) {
      showNotice(toastType, toast, toastType === "warning" ? 3.5 : 2);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastScannedRef.current = null;
    }, 1200);
  }, [detail, showNotice]);

  useEffect(() => {
    if (!open) {
      stopAll();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      setCameraError("");
      setImgReady(false);
      setScannedReturns([]);
      return;
    }
    setImgReady(false);
    setCameraError("");
    loadNextFrame();
  }, [open, stopAll, loadNextFrame]);

  useEffect(() => {
    if (!imgReady || !imgRef.current) return;
    stopScanning();
    intervalRef.current = setInterval(() => {
      if (!imgRef.current || !readerRef.current) return;
      const img = imgRef.current;
      if (!img.complete || !(img.naturalWidth || img.width)) return;
      readerRef.current.decodeFromImageElement(img)
        .then((result: any) => { if (result) handleScanned(result.getText()); })
        .catch(() => {});
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
  }, [stopReader]);

  const updateCondition = (isbn: string, value: string) => {
    setScannedReturns((prev) => prev.map((item) =>
      item.isbn === isbn ? { ...item, condition: value } : item
    ));
  };

  const removeScanned = (isbn: string) => {
    setScannedReturns((prev) => prev.filter((item) => item.isbn !== isbn));
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
    onClose();
    setScannedReturns([]);
    showNotice(
      fail > 0 ? "warning" : "success",
      `Trả ${ok} sách thành công${fail > 0 ? `, ${fail} thất bại` : ""}`
    );
    await onBatchComplete();
  };

  return (
    <Dialog open={open} onClose={batchReturning ? undefined : onClose} fullWidth maxWidth="xl">
      <DialogTitle>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <QrCodeScannerIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Quét mã vạch trả sách (IP Camera)</Typography>
          </Stack>
          {!batchReturning ? (
            <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
          ) : null}
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 2, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", md: "row" }, flex: 1, overflow: "hidden" }}>
          <Box sx={{ width: { md: "50%" }, flexShrink: 0 }}>
            <Box sx={{ position: "relative", width: "100%", aspectRatio: "4/3", bgcolor: "black", borderRadius: 1, overflow: "hidden" }}>
              <Box
                component="img"
                ref={imgRef}
                src={BORROW_CAM_URL}
                onLoad={() => {
                  loadingRef.current = false;
                  setCameraError("");
                  setImgReady(true);
                  if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
                  pollTimerRef.current = setTimeout(loadNextFrame, 150);
                }}
                onError={() => {
                  loadingRef.current = false;
                  setCameraError("Không thể kết nối IP Camera");
                  setImgReady(false);
                  if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
                  if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
                  reconnectTimerRef.current = setTimeout(() => {
                    setCameraError("");
                    loadNextFrame();
                  }, 3000);
                }}
                alt="IP Camera"
                sx={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
              {!imgReady && !cameraError ? (
                <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.55)", color: "common.white", alignItems: "center", justifyContent: "center" }} spacing={1}>
                  <CircularProgress size={28} color="inherit" />
                  <Typography variant="body2">Đang kết nối camera...</Typography>
                </Stack>
              ) : null}
              {cameraError ? (
                <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.75)", color: "common.white", alignItems: "center", justifyContent: "center", p: 3 }} spacing={1.5}>
                  <CameraAltIcon sx={{ fontSize: 48 }} />
                  <Typography sx={{ textAlign: "center" }}>{cameraError}</Typography>
                  <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                      setCameraError("");
                      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
                      if (imgRef.current) {
                        const sep = BORROW_CAM_URL.includes("?") ? "&" : "?";
                        imgRef.current.src = `${BORROW_CAM_URL}${sep}_t=${Date.now()}`;
                      }
                    }}
                  >
                    Kết nối lại
                  </Button>
                </Stack>
              ) : null}
              <Box sx={{ position: "absolute", top: 8, left: 8, px: 1, py: 0.5, bgcolor: "rgba(0,0,0,.6)", borderRadius: 0.5 }}>
                <Typography variant="caption" sx={{ color: "common.white", fontSize: 11 }}>IP Camera</Typography>
              </Box>
            </Box>
          </Box>

          <Stack spacing={1.5} sx={{ flex: 1, overflow: "auto" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <QrCodeScannerIcon color="primary" sx={{ fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {scannedReturns.length > 0 ? `Đã quét (${scannedReturns.length} cuốn)` : "Sách đã quét"}
              </Typography>
            </Stack>

            {scannedReturns.length === 0 ? (
              <Alert severity="info" sx={{ flex: 1, display: "flex", alignItems: "center" }}>
                Đưa mã vạch vào camera. Sách sẽ xuất hiện tại đây.
              </Alert>
            ) : (
              scannedReturns.map((item) => (
                <Paper key={item.isbn} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
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
                      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                        {item.record.book?.title || item.record.book_id}
                      </Typography>
                      {item.record.book?.author ? (
                        <Typography variant="caption" color="text.secondary" noWrap>{item.record.book.author}</Typography>
                      ) : null}
                      <Typography variant="caption" sx={{ fontFamily: "JetBrains Mono, monospace", color: "primary.main", fontWeight: 600 }}>
                        {item.isbn}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                        {dueChip(item.record)}
                        {item.condition ? <Chip size="small" variant="outlined" label={item.condition} /> : null}
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
        <Button onClick={onClose} disabled={batchReturning}>Đóng</Button>
        <Button
          variant="contained"
          color="success"
          disabled={batchReturning || scannedReturns.length === 0}
          onClick={handleBatchReturn}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {batchReturning ? "Đang trả sách..." : `Xác nhận trả (${scannedReturns.length} cuốn)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
