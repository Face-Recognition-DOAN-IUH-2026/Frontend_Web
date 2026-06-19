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
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import ErrorIcon from "@mui/icons-material/ReportOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScannerOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type { BookWithStats } from "@/lib/types";
import { slideInRight, successPop } from "@/lib/animations";
import IPCameraStream from "./IPCameraStream";

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

interface Props {
  open: boolean;
  patronId: string;
  patronName: string;
  maxItems?: number;
  cameraUrl: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function BorrowIPCameraDialog({
  open,
  patronId,
  patronName,
  maxItems,
  cameraUrl,
  onClose,
  onSuccess,
}: Props) {
  const [scanned, setScanned] = useState<ScannedBorrowItem[]>([]);
  const [lookingUp, setLookingUp] = useState(false);
  const [createError, setCreateError] = useState("");
  const [scanToast, setScanToast] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const lastScannedRef = useRef<string | null>(null);

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
        const msg = item.reason || "Sách không thể mượn";
        const title = item.book?.title || "";
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
      setScanned([]);
      setCreateError("");
      setScanToast("");
      lastScannedRef.current = null;
    }
  }, [open]);

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
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Quét mã vạch sách (IP Camera)
              </Typography>
            </Stack>
            {!lookingUp && (
              <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
            )}
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", md: "row" }, flex: 1, overflow: "hidden" }}>
            <Box sx={{ width: { md: "50%" }, flexShrink: 0 }}>
              <IPCameraStream
                cameraUrl={cameraUrl}
                onBarcodeDetected={addScanned}
              />
            </Box>

            <Stack spacing={1.5} sx={{ flex: 1, overflow: "auto" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <QrCodeScannerIcon color="primary" sx={{ fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                  {totalScanned > 0 ? `Đã quét (${totalScanned} cuốn)` : "Sách đã quét"}
                </Typography>
              </Stack>

              {createError ? <Alert severity="error" onClose={() => setCreateError("")}>{createError}</Alert> : null}

              {scanned.length === 0 ? (
                <Alert severity="info" sx={{ flex: 1, display: "flex", alignItems: "center" }}>
                  Đưa mã vạch vào camera. Sách sẽ xuất hiện tại đây.
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
      >
        {scanToast ? (
          <Alert
            severity="success"
            onClose={() => setScanToast("")}
            sx={{
              animation: `${slideInRight} 0.3s ease-out`,
              boxShadow: 4,
            }}
          >
            {scanToast}
          </Alert>
        ) : undefined}
      </Snackbar>

      <Dialog open={!!lookupError} onClose={() => setLookupError(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Thông báo</DialogTitle>
        <DialogContent>
          <Typography>{lookupError}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLookupError(null)} variant="contained">Đóng</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}