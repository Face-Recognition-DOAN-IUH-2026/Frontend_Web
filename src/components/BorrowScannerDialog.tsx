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
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import CameraAltIcon from "@mui/icons-material/CameraAltOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScannerOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type { BookWithStats } from "@/lib/types";

interface ScannedBorrowItem {
  isbn: string;
  lookup: BookWithStats | null;
  loading: boolean;
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
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [scanToast, setScanToast] = useState("");

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

  const lookupIsbn = useCallback(async (isbn: string) => {
    setScanned((prev) => prev.map((item) =>
      item.isbn === isbn ? { ...item, loading: true } : item
    ));
    try {
      const book = await api.lookupBookByIsbn(isbn);
      setScanned((prev) => prev.map((item) =>
        item.isbn === isbn ? { ...item, lookup: book, loading: false } : item
      ));
    } catch {
      setScanned((prev) => prev.filter((item) => item.isbn !== isbn));
      setScanToast(`Không tìm thấy sách: ${isbn}`);
    }
  }, []);

  const addScanned = useCallback((isbn: string) => {
    if (!/^\d{10,13}$/.test(isbn.replace(/-/g, ""))) return;
    const normalized = isbn.replace(/-/g, "");
    lastScannedRef.current = normalized;
    setScanToast(normalized);
    setScanned((prev) => {
      if (prev.some((item) => item.isbn === normalized)) {
        setScanToast(`Sách ${normalized} đã có trong danh sách`);
        return prev;
      }
      if (maxItems !== undefined && prev.length >= maxItems) {
        setScanToast(`Chỉ được mượn tối đa ${maxItems} cuốn`);
        return prev;
      }
      return [...prev, { isbn: normalized, lookup: null, loading: true }];
    });
    lookupIsbn(normalized);
  }, [lookupIsbn, maxItems]);

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

  const removeItem = (isbn: string) => {
    setScanned((prev) => prev.filter((item) => item.isbn !== isbn));
  };

  const handleCreateSlip = async () => {
    const valid = scanned.filter((item) => item.lookup);
    if (!valid.length || !patronId) return;
    setCreating(true);
    setCreateError("");
    try {
      const items = valid.map((item) => ({ barcode: item.isbn, isbn: item.isbn }));
      const result = await api.createBorrowSlip({ patron_id: patronId, items });
      if (result.status === "success") {
        stopCamera();
        setScanned([]);
        onSuccess(result.message);
        onClose();
      }
    } catch (err) {
      const detail = getErrorMessage(err);
      const removedIsbns: string[] = [];
      const toastMsg = detail;
      setScanned((prev) => {
        const matchTitle = detail.match(/^Sach "(.+)" da duoc doc gia nay muon$/);
        if (matchTitle) {
          const title = matchTitle[1];
          const filtered = prev.filter((item) => {
            if (item.lookup?.title === title) {
              removedIsbns.push(item.isbn);
              return false;
            }
            return true;
          });
          return filtered;
        }
        const matchBarcode = detail.match(/^(?:Ma vach|Ban sao) ([^\s]+) (?:da duoc quet trong phieu muon nay|dang duoc muon)$/);
        if (matchBarcode) {
          const barcode = matchBarcode[1];
          const filtered = prev.filter((item) => {
            if (item.isbn === barcode) {
              removedIsbns.push(item.isbn);
              return false;
            }
            return true;
          });
          return filtered;
        }
        const matchUnavailable = detail.match(/^Sach "(.+)" da het ban co the muon$/);
        if (matchUnavailable) {
          const title = matchUnavailable[1];
          const filtered = prev.filter((item) => {
            if (item.lookup?.title === title) {
              removedIsbns.push(item.isbn);
              return false;
            }
            return true;
          });
          return filtered;
        }
        return prev;
      });
      if (removedIsbns.length > 0) {
        setScanToast(toastMsg);
      } else {
        setCreateError(detail);
      }
    } finally {
      setCreating(false);
    }
  };

  const validCount = scanned.filter((item) => item.lookup).length;

  return (
    <>
      <Dialog open={open} onClose={creating ? undefined : onClose} fullWidth maxWidth="xl">
        <DialogTitle>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <QrCodeScannerIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Quét ISBN sách</Typography>
            </Stack>
            {!creating && (
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
                  {scanned.length > 0 ? `Đã quét (${scanned.length} cuốn)` : "Sách đã quét"}
                </Typography>
              </Stack>

              {createError ? <Alert severity="error" onClose={() => setCreateError("")}>{createError}</Alert> : null}

              {scanned.length === 0 ? (
                <Alert severity="info" sx={{ flex: 1, display: "flex", alignItems: "center" }}>
                  Đưa mã vạch ISBN vào camera. Sách sẽ xuất hiện tại đây.
                </Alert>
              ) : (
                scanned.map((item) => {
                  const isLastScanned = item.isbn === lastScannedRef.current;
                  return (
                    <Paper
                      key={item.isbn}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderColor: isLastScanned ? "primary.main" : undefined,
                        bgcolor: isLastScanned ? "action.hover" : undefined,
                      }}
                    >
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                        {item.lookup?.cover_url ? (
                          <Box
                            component="img"
                            src={item.lookup.cover_url}
                            alt={item.lookup.title}
                            sx={{ width: 40, height: 56, objectFit: "cover", borderRadius: 0.5, flexShrink: 0 }}
                          />
                        ) : (
                          <Avatar variant="rounded" sx={{ width: 40, height: 56, bgcolor: "background.default", flexShrink: 0 }}>
                            <BookIcon />
                          </Avatar>
                        )}
                        <Stack spacing={0.3} sx={{ flex: 1, minWidth: 0 }}>
                          {item.loading ? (
                            <Typography variant="body2" color="text.secondary">Đang tra cứu...</Typography>
                          ) : item.lookup ? (
                            <>
                              <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap>
                                {item.lookup.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {item.lookup.author || "-"}
                              </Typography>
                              <Typography variant="caption" sx={{ fontFamily: "monospace", color: "primary.main" }}>
                                {item.isbn}
                              </Typography>
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexWrap: "wrap", mt: 0.5 }}>
                                <Chip size="small" variant="outlined" label={`Kho: ${item.lookup.total_copies}`} sx={{ height: 20, fontSize: 11 }} />
                                <Chip size="small" variant="outlined" color="success" label={`Sẵn: ${item.lookup.available_copies}`} sx={{ height: 20, fontSize: 11 }} />
                              </Stack>
                            </>
                          ) : null}
                        </Stack>
                        <IconButton size="small" color="error" onClick={() => removeItem(item.isbn)} sx={{ mt: 0.5 }}>
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
          <Button onClick={onClose} disabled={creating}>Hủy</Button>
          <Button
            variant="contained"
            disabled={creating || validCount === 0}
            onClick={handleCreateSlip}
          >
            {creating ? "Đang tạo phiếu mượn..." : `Tạo phiếu mượn (${validCount} cuốn)`}
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
