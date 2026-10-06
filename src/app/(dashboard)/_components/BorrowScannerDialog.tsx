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
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import CameraAltIcon from "@mui/icons-material/CameraAltOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import ErrorIcon from "@mui/icons-material/ReportOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScannerOutlined";

import api, { getErrorMessage } from "@/lib/api-client";
import type { BookWithStats } from "@/lib/types";
import { getAlertSeverity } from "@/lib/alert-utils";
import { slideInRight, successPop } from "@/lib/animations";
import type { BorrowCartItem } from "./borrow/types";
import type { SlipReceiptItem } from "./borrow/BorrowSlipReceipt";
import { toSlipReceiptItems } from "./borrow/BorrowSlipReceipt";

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

function toScannedItem(item: BorrowCartItem): ScannedBorrowItem {
  return {
    barcode: item.barcode,
    isbn: item.isbn,
    loading: false,
    can_borrow: item.can_borrow,
    reason: item.reason ?? null,
    // Cart books come from lookupBorrowSlip (serializeBookWithStats) at runtime,
    // even though BorrowCartItem declares the base BookInfo type.
    book: (item.book as BookWithStats | null) ?? null,
    copy_id: item.copy_id ?? null,
    book_id: item.book_id ?? null,
    copy_barcode: item.copy_barcode ?? null,
  };
}

export default function BorrowScannerDialog({
  open,
  patronId,
  maxItems,
  initialItems,
  onClose,
  onSuccess,
}: {
  open: boolean;
  patronId: string;
  maxItems?: number;
  initialItems?: BorrowCartItem[];
  onClose: () => void;
  onSuccess: (result: { message: string; count: number; items: SlipReceiptItem[] }) => void;
}) {
  const initialItemsRef = useRef<BorrowCartItem[]>([]);
  initialItemsRef.current = initialItems ?? [];
  const initializedRef = useRef(false);
  const html5QrCodeRef = useRef<any>(null);
  const lastScannedRef = useRef<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scanned, setScanned] = useState<ScannedBorrowItem[]>([]);
  const scannedRef = useRef<ScannedBorrowItem[]>([]);
  scannedRef.current = scanned;
  // Debug: last raw decoded value (shown in UI so user can see if camera reads OK)
  const [debugRaw, setDebugRaw] = useState<string | null>(null);

  const [lookingUp, setLookingUp] = useState(false);
  const [createError, setCreateError] = useState("");
  const [scanToast, setScanToast] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [manualIsbn, setManualIsbn] = useState("");
  const [successResult, setSuccessResult] = useState<{ message: string; bookCount: number; items: SlipReceiptItem[] } | null>(null);

  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      const qr = html5QrCodeRef.current;
      html5QrCodeRef.current = null;
      try {
        if (qr.isScanning) {
          await qr.stop();
        }
        qr.clear();
      } catch (e) {
        console.warn("Error stopping Html5Qrcode:", e);
      }
    }
    setCameraReady(false);
  }, []);

  const lookupItem = useCallback(async (barcode: string, isbn: string) => {
    setScanned((prev) => prev.map((item) =>
      item.barcode === barcode ? { ...item, loading: true } : item
    ));
    try {
      const isCopy = /^LIB/i.test(barcode.replace(/[-\s]/g, ""));
      const result = await api.lookupBorrowSlip({
        patron_id: patronId,
        items: [{ barcode, isbn: isCopy ? undefined : isbn }],
      });
      const normBarcode = barcode.replace(/[-\s]/g, "").toLowerCase();
      const item = result.items.find((i) => {
        const iBarcode = (i.barcode || "").replace(/[-\s]/g, "").toLowerCase();
        const iCopyBarcode = (i.copy?.barcode || "").replace(/[-\s]/g, "").toLowerCase();
        const iIsbn = (i.isbn || "").replace(/[-\s]/g, "").toLowerCase();
        return iBarcode === normBarcode || iCopyBarcode === normBarcode || iIsbn === normBarcode;
      }) || result.items[0];

      if (!item) {
        lastScannedRef.current = null;
        setScanned((prev) => prev.filter((i) => i.barcode !== barcode));
        setLookupError(`Mã sách "${barcode}" không tồn tại trong thư viện`);
        return;
      }
      if (!item.can_borrow) {
        lastScannedRef.current = null;
        setScanned((prev) => prev.filter((i) => i.barcode !== barcode));
        const msg = item.reason || 'Sách không thể mượn';
        const title = item.book?.title || '';
        setLookupError(title && !msg.includes(title) ? `"${title}": ${msg}` : msg);
        return;
      }

      // Check if book title is already in other scanned items
      if (item.book?.id) {
        const isDuplicateTitle = scannedRef.current.some(
          (s) => s.barcode !== barcode && s.book_id === item.book?.id
        );
        if (isDuplicateTitle) {
          lastScannedRef.current = null;
          setScanned((prev) => prev.filter((i) => i.barcode !== barcode));
          setLookupError(`Đầu sách "${item.book?.title}" đã có trong danh sách mượn. Không thể mượn nhiều bản sao cùng đầu sách.`);
          return;
        }
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
      setScanToast(`✓ Đã nhận: ${item.book?.title || barcode}`);
    } catch {
      lastScannedRef.current = null;
      setScanned((prev) => prev.filter((item) => item.barcode !== barcode));
      setLookupError(`Lỗi tra cứu: ${barcode}`);
    }
  }, [patronId]);

  const addScanned = useCallback((rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed || trimmed.length < 3) return;
    const normKey = trimmed.replace(/[-\s]/g, "").toLowerCase();

    // Check if already in scanned list
    const isDuplicate = scannedRef.current.some((item) => {
      const itemBarcode = item.barcode.replace(/[-\s]/g, "").toLowerCase();
      const itemCopyBarcode = (item.copy_barcode || "").replace(/[-\s]/g, "").toLowerCase();
      const itemIsbn = (item.isbn || "").replace(/[-\s]/g, "").toLowerCase();
      return itemBarcode === normKey || itemCopyBarcode === normKey || itemIsbn === normKey;
    });

    if (isDuplicate) {
      setScanToast(`⚠️ Sách/Mã "${trimmed}" đã có trong danh sách`);
      return;
    }

    if (lastScannedRef.current === normKey) return;
    lastScannedRef.current = normKey;
    setTimeout(() => {
      if (lastScannedRef.current === normKey) {
        lastScannedRef.current = null;
      }
    }, 1500);

    if (maxItems !== undefined && scannedRef.current.length >= maxItems) {
      setScanToast(`Chỉ được mượn tối đa ${maxItems} cuốn`);
      return;
    }

    setScanToast(`Đang tra cứu: ${trimmed}`);
    setScanned((prev) => [
      ...prev,
      {
        barcode: trimmed,
        isbn: trimmed,
        loading: true,
        can_borrow: false,
        reason: null,
        book: null,
        copy_id: null,
        book_id: null,
        copy_barcode: null,
      },
    ]);
    lookupItem(trimmed, trimmed);
  }, [lookupItem, maxItems]);

  const validateIsbn13 = (digits: string): boolean => {
    if (!digits.startsWith('978') && !digits.startsWith('979')) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(digits[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    return check === parseInt(digits[12], 10);
  };

  const isValidCode = (text: string): boolean => {
    const clean = text.replace(/[-\s]/g, "");
    // 1. Copy barcode: LIB-<isbn>-<seq> (e.g. LIB-9780140328721-001)
    if (/^LIB\d{11,18}$/i.test(clean)) return true;
    // 2. Glued barcode without LIB prefix: e.g. 9780140328721001 (14-17 digits)
    if (/^\d{14,17}$/.test(clean) && (clean.startsWith('978') || clean.startsWith('979'))) {
      return validateIsbn13(clean.slice(0, 13));
    }
    // 3. EAN-13: 13 digits starting 978/979 with valid checksum
    if (/^\d{13}$/.test(clean)) return validateIsbn13(clean);
    // 4. ISBN-10: 10 chars
    if (/^\d{9}[\dX]$/i.test(clean)) return true;
    return false;
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      setScanned([]);
      setCameraError("");
      setCreateError("");
      setScanToast("");
      setSuccessResult(null);
      lastScannedRef.current = null;
      initializedRef.current = false;
      return;
    }

    if (!initializedRef.current) {
      initializedRef.current = true;
      setScanned(initialItemsRef.current.map(toScannedItem));
    }

    let active = true;

    (async () => {
      try {
        setCameraError("");
        setCameraReady(false);

        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (!active) return;

        // Ensure container is rendered
        await new Promise((r) => setTimeout(r, 200));
        if (!active) return;

        const container = document.getElementById("borrow-camera-reader");
        if (!container) return;

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ];

        const qr = new Html5Qrcode("borrow-camera-reader", {
          formatsToSupport,
          verbose: false,
        });
        html5QrCodeRef.current = qr;

        // Configuration:
        // - DO NOT pass qrbox so canvas uses full 1280x720 video resolution
        //   (long Code 128 barcodes have ~286 modules; downsizing to a small box makes bars blend together)
        // - Disable Windows BarcodeDetector to avoid 0118521823333 corruption
        const config = {
          fps: 20,
          disableFlip: false,
          experimentalFeatures: { useBarCodeDetectorIfSupported: false },
          videoConstraints: {
            facingMode: { ideal: "environment" },
            width: { min: 1024, ideal: 1280, max: 1920 },
            height: { min: 720, ideal: 720, max: 1080 },
            focusMode: { ideal: "continuous" },
          },
        };

        let cooldownUntil = 0;

        // Choose camera: prefer environment/back camera if mobile, or first camera on desktop/laptop
        let cameraIdOrConfig: any = { facingMode: "environment" };
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            const backCam = cameras.find((c: any) => /back|rear|environment/i.test(c.label));
            cameraIdOrConfig = backCam ? backCam.id : cameras[0].id;
          }
        } catch { /* fallback to facingMode */ }

        await qr.start(
          cameraIdOrConfig,
          config,
          (decodedText: string) => {
            if (!active) return;
            if (Date.now() < cooldownUntil) return;

            const clean = decodedText.trim();
            setDebugRaw(clean);
            console.debug("[Scanner] decoded:", clean);

            if (isValidCode(clean)) {
              cooldownUntil = Date.now() + 1500;
              addScanned(clean);
            }
          },
          () => {} // silent on frame decode failure
        );

        if (active) {
          setCameraReady(true);
        } else {
          qr.stop().catch(() => {});
        }
      } catch (err: any) {
        if (!active) return;
        console.error("Html5Qrcode start error:", err);
        const errStr = String(err?.message || err);
        if (errStr.includes("NotAllowed") || errStr.includes("Permission")) {
          setCameraError("Không có quyền truy cập camera. Hãy cấp quyền camera cho trình duyệt.");
        } else if (errStr.includes("NotFound") || errStr.includes("DevicesNotFoundError")) {
          setCameraError("Không tìm thấy camera trên thiết bị.");
        } else {
          setCameraError("Không thể bật camera: " + errStr);
        }
      }
    })();

    return () => {
      active = false;
      stopCamera();
    };
  }, [open, stopCamera, addScanned]);

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
        setSuccessResult({ message: confirmResult.message, bookCount: validItems.length, items: toSlipReceiptItems(validItems) });
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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const validCount = scanned.filter((item) => item.can_borrow).length;
  const totalScanned = scanned.length;
  const currentStep = successResult ? 2 : lookingUp ? 1 : 0;

  return (
    <>
      <Dialog
        open={open}
        onClose={lookingUp ? undefined : onClose}
        fullWidth
        maxWidth="xl"
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <QrCodeScannerIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Quét ISBN sách</Typography>
            </Stack>
            {!lookingUp && !successResult && (
              <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
            )}
          </Stack>
          <Stepper
            activeStep={currentStep}
            sx={{
              mt: 1.5,
              "& .MuiStepIcon-root.Mui-active": { color: "primary.main" },
              "& .MuiStepIcon-root.Mui-completed": { color: "secondary.main" },
            }}
          >
            {["Quét sách", "Xác nhận", "Hoàn tất"].map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {successResult ? (
            <Stack spacing={2} sx={{ alignItems: "center", py: 4, textAlign: "center" }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  bgcolor: "success.light",
                  color: "success.dark",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 36 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Tạo phiếu mượn thành công
              </Typography>
              <Typography color="text.secondary">
                {successResult.bookCount} cuốn sách đã được thêm vào phiếu
              </Typography>
              <Button
                variant="contained"
                  onClick={() => {
                    setSuccessResult(null);
                    setScanned([]);
                    onSuccess({ message: successResult.message, count: successResult.bookCount, items: successResult.items });
                    onClose();
                  }}
                sx={{ mt: 1, borderRadius: 2 }}
              >
                Đóng
              </Button>
            </Stack>
          ) : (
          <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", md: "row" }, flex: 1, overflow: "hidden" }}>
            <Box sx={{ width: { md: "50%" }, display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <Paper
                variant="outlined"
                sx={{
                  position: "relative",
                  overflow: "hidden",
                  bgcolor: "black",
                  width: "100%",
                  aspectRatio: { xs: "16/9", md: "4/3" },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 2,
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
                      id="borrow-camera-reader"
                      sx={{
                        width: "100%",
                        height: "100%",
                        position: "relative",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        "& video": {
                          width: "100% !important",
                          height: "100% !important",
                          objectFit: "cover !important",
                        },
                        "& #borrow-camera-reader__scan_region": {
                          display: "flex !important",
                          alignItems: "center !important",
                          justifyContent: "center !important",
                        },
                        "& #borrow-camera-reader__dashboard_section_csr": {
                          display: "none !important",
                        },
                      }}
                    />
                    {!cameraReady && (
                      <Stack
                        sx={{
                          position: "absolute",
                          inset: 0,
                          bgcolor: "rgba(0,0,0,.7)",
                          color: "common.white",
                          alignItems: "center",
                          justifyContent: "center",
                          zIndex: 5,
                        }}
                        spacing={1}
                      >
                        <CircularProgress size={28} color="inherit" />
                        <Typography variant="body2">Đang kết nối camera...</Typography>
                      </Stack>
                    )}
                    {debugRaw && (
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 8,
                          left: 8,
                          right: 8,
                          bgcolor: "rgba(0,0,0,0.8)",
                          color: "#4eff91",
                          borderRadius: 1,
                          px: 1,
                          py: 0.5,
                          fontFamily: "monospace",
                          fontSize: 12,
                          textAlign: "center",
                          zIndex: 10,
                          pointerEvents: "none",
                        }}
                      >
                        {"📷"} {debugRaw}
                      </Box>
                    )}
                  </>
                )}
              </Paper>

              
            </Box>

            <Stack spacing={1.5} sx={{ flex: 1, overflow: "auto" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <QrCodeScannerIcon color="primary" sx={{ fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                  {totalScanned > 0 ? `Đã quét (${totalScanned} cuốn)` : "Sách đã quét"}
                </Typography>
              </Stack>

              {createError ? <Alert severity={getAlertSeverity(createError)} onClose={() => setCreateError("")}>{createError}</Alert> : null}

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
                      Nhập mã sách thủ công
                    </Button>
                  </Stack>
                </Paper>
              ) : null}

              <TextField
                size="small"
                placeholder="Quét hoặc nhập mã bản sao (VD: LIB-9780140328721-001) hoặc ISBN..."
                value={manualIsbn}
                onChange={(e) => setManualIsbn(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manualIsbn.trim()) {
                    e.preventDefault();
                    addScanned(manualIsbn.trim());
                    setManualIsbn("");
                  }
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <QrCodeScannerIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  },
                }}
                fullWidth
              />

              {scanned.length === 0 ? (
                <Alert severity="info" sx={{ flex: 1, display: "flex", alignItems: "center" }}>
                  Đưa mã vạch sách (ISBN hoặc mã bản sao LIB-...) vào trước camera, hoặc nhập mã ở trên.
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
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={lookingUp}>Hủy</Button>
          {!successResult && (
            <Button
              variant="contained"
              disabled={lookingUp || validCount === 0}
              onClick={handleCreateSlip}
            >
              {lookingUp ? "Đang xử lý..." : `Tạo phiếu mượn (${validCount} cuốn)`}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}