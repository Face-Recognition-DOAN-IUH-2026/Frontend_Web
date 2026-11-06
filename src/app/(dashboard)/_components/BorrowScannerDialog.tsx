"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
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
import type { BookWithStats, QuickSearchCopy } from "@/lib/types";
import { getAlertSeverity } from "@/lib/alert-utils";
import { slideInRight, successPop } from "@/lib/animations";
import { useBarcodeOCR } from "@/lib/hooks/useBarcodeOCR";
import type { BorrowCartItem } from "./borrow/types";
import type { SlipReceiptItem } from "./borrow/BorrowSlipReceipt";
import { toSlipReceiptItems } from "./borrow/BorrowSlipReceipt";
import SelectBookCopyModal from "./borrow/SelectBookCopyModal";

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
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<any>(null);
  const animIdRef = useRef<number | null>(null);
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
  const [inputVal, setInputVal] = useState("");
  const [pendingIsbn, setPendingIsbn] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ message: string; bookCount: number; items: SlipReceiptItem[] } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Quick search suggestions (fuzzy title/author/ISBN/barcode) for the manual input field
  const [suggestions, setSuggestions] = useState<QuickSearchCopy[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((val: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (val.trim().length === 0) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await api.quickSearchCopies(val, 10);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  // OCR fallback state
  const [ocrMode, setOcrMode] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const ocrFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ocrVideoRef = useRef<HTMLVideoElement | null>(null);

  const stopCamera = useCallback(() => {
    if (animIdRef.current) {
      cancelAnimationFrame(animIdRef.current);
      animIdRef.current = null;
    }
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch {}
      readerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
        };
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Không có quyền truy cập camera. Hãy cấp quyền camera cho trình duyệt.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("Không tìm thấy camera trên thiết bị.");
      } else {
        setCameraError("Không thể bật camera: " + (err.message || String(err)));
      }
    }
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

  const handleSelectSuggestion = useCallback((item: QuickSearchCopy) => {
    setSuggestions([]);
    setManualIsbn(item.barcode);
    addScanned(item.barcode);
  }, [addScanned]);

  // OCR recognized handler (stable callback)
  const handleOcrRecognized = useCallback(
    (code: string, type: "copy" | "isbn") => {
      setOcrStatus("ready");
      setOcrMode(false);
      if (ocrFallbackTimerRef.current) {
        clearTimeout(ocrFallbackTimerRef.current);
        ocrFallbackTimerRef.current = null;
      }
      // Thêm mã đã nhận diện vào danh sách quét
      addScanned(code);
      setScanToast(`✓ OCR nhận diện: ${code}`);
    },
    [addScanned],
  );

  // OCR options (định nghĩa ổn định)
  const ocrOptions = useMemo(
    () => ({
      lang: ["vie", "eng"] as const,
      charWhitelist: "LIB0123456789-",
      intervalMs: 2000,
      onRecognized: handleOcrRecognized,
    }),
    [handleOcrRecognized],
  );

  const {
    state: ocrState,
    runOcrOnVideo,
    init: initOcr,
    terminate: terminateOcr,
  } = useBarcodeOCR(ocrOptions);

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
    // Strip invisible control characters (GS1 FNC1, NUL, CR/LF, etc.)
    const sanitized = text.replace(/[\u0000-\u001f\u007f]/g, "").trim();
    const clean = sanitized.replace(/[-\s]/g, "");
    // 1. Copy barcode: LIB-<isbn>-<seq> (e.g. LIB-9780140328721-001)
    if (/^LIB[A-Z0-9]{5,}/i.test(clean)) return true;
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

  // Khởi tạo OCR worker khi component mount (chạy 1 lần)
  useEffect(() => {
    void initOcr();
  }, [initOcr]);

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
      setOcrMode(false);
      setOcrStatus("idle");
      if (ocrFallbackTimerRef.current) {
        clearTimeout(ocrFallbackTimerRef.current);
        ocrFallbackTimerRef.current = null;
      }
      terminateOcr();
      setInputVal("");
      setManualIsbn("");
      setSuggestions([]);
      return;
    }

    setInputVal("");
    setManualIsbn("");
    setSuggestions([]);

    if (!initializedRef.current) {
      initializedRef.current = true;
      setScanned(initialItemsRef.current.map(toScannedItem));
    }

    startCamera();

    return () => {
      stopCamera();
      if (ocrFallbackTimerRef.current) {
        clearTimeout(ocrFallbackTimerRef.current);
        ocrFallbackTimerRef.current = null;
      }
    };
  }, [open, stopCamera, startCamera, terminateOcr]);

  // Decode barcode from Webcam video
  useEffect(() => {
    if (!open || !cameraReady || !videoRef.current) return;
    let active = true;
    let animId: number | null = null;
    let cooldownUntil = 0;

    // Gán video element cho OCR
    ocrVideoRef.current = videoRef.current;

    // Auto-fallback OCR: sau 8s nếu chưa quét được barcode nào thì kích hoạt OCR
    if (!scanned.length) {
      ocrFallbackTimerRef.current = setTimeout(() => {
        if (active && !scanned.length && videoRef.current) {
          setOcrMode(true);
          setOcrStatus("loading");
          void runOcrOnVideo(videoRef.current).catch(() => {
            setOcrStatus("error");
            setOcrMode(false);
          });
        }
      }, 8000);
    }

    const onDetected = (rawText: string) => {
      if (!active) return;
      if (Date.now() < cooldownUntil) return;

      const clean = rawText.replace(/[\u0000-\u001f\u007f]/g, "").trim();
      setDebugRaw(clean);
      console.debug("[Scanner] decoded:", clean);

      // Hủy OCR fallback nếu barcode decode được
      if (ocrFallbackTimerRef.current) {
        clearTimeout(ocrFallbackTimerRef.current);
        ocrFallbackTimerRef.current = null;
        setOcrMode(false);
      }

      if (isValidCode(clean)) {
        cooldownUntil = Date.now() + 2000;
        const isCopy = /^LIB/i.test(clean.replace(/[-\s]/g, ""));
        if (isCopy) {
          addScanned(clean);
        } else {
          // Là ISBN thuần -> Mở popup chọn bản sao theo hậu tố
          setPendingIsbn(clean);
        }
      } else {
        cooldownUntil = Date.now() + 1000;
        setScanToast(`⚠️ Đã đọc được: "${clean}" nhưng không đúng định dạng sách thư viện (LIB-... hoặc ISBN 13 số)`);
      }
    };

    (async () => {
      // 1. Thử Native BarcodeDetector (Chrome/Edge phần cứng, cực nhạy với Code 128)
      // CHỈ quét Code 128 (mã bản sao LIB-...), EAN-13 (ISBN sách), và QR Code.
      // Tuyệt đối KHÔNG quét EAN-8 / UPC-E vì sẽ gây false positive (nhận nhầm 1 đoạn vạch của Code 128 thành 8 số).
      let usedNative = false;
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
          const supported: string[] = await (window as any).BarcodeDetector.getSupportedFormats?.() || [];
          if (supported.includes("code_128") || supported.includes("ean_13")) {
            const detector = new (window as any).BarcodeDetector({
              formats: supported.filter((f) => [
                "code_128", "ean_13", "qr_code",
              ].includes(f)),
            });
            const detectNative = async () => {
              if (!active || !videoRef.current) return;
              if (videoRef.current.readyState >= 2) {
                try {
                  const barcodes = await detector.detect(videoRef.current);
                  if (active && barcodes && barcodes.length > 0) {
                    const val = barcodes[0].rawValue;
                    if (val) onDetected(val);
                  }
                } catch {}
              }
              if (active) animId = requestAnimationFrame(detectNative);
            };
            animId = requestAnimationFrame(detectNative);
            animIdRef.current = animId;
            usedNative = true;
          }
        } catch {
          usedNative = false;
        }
      }

      if (usedNative) return;

      // 2. Dự phòng: ZXing BrowserMultiFormatReader với TRY_HARDER
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const { BarcodeFormat, DecodeHintType } = await import("@zxing/library");
        if (!active) return;
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.EAN_13,
          BarcodeFormat.QR_CODE,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 100,
          delayBetweenScanSuccess: 1000,
        });
        readerRef.current = reader;
        reader.decodeFromVideoElement(videoRef.current!, (result, _err) => {
          if (!active) return;
          if (result) {
            onDetected(result.getText());
          }
        });
      } catch (err) {
        console.error("Failed to decode webcam with ZXing:", err);
      }
    })();

    return () => {
      active = false;
      if (animId) cancelAnimationFrame(animId);
      if (animIdRef.current) {
        cancelAnimationFrame(animIdRef.current);
        animIdRef.current = null;
      }
      if (readerRef.current) {
        try { readerRef.current.reset(); } catch {}
        readerRef.current = null;
      }
      if (ocrFallbackTimerRef.current) {
        clearTimeout(ocrFallbackTimerRef.current);
        ocrFallbackTimerRef.current = null;
      }
    };
  }, [open, cameraReady, addScanned, runOcrOnVideo]);

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
                    <Button
                      variant="outlined"
                      color="inherit"
                      size="small"
                      onClick={() => {
                        setCameraError("");
                        startCamera();
                      }}
                      sx={{ textTransform: "none", mt: 1 }}
                    >
                      Thử lại
                    </Button>
                  </Stack>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: cameraReady ? "block" : "none",
                      }}
                    />

                    {/* Laser Scanner Viewfinder Overlay */}
                    {cameraReady && (
                      <Box
                        sx={{
                          position: "absolute",
                          inset: "25% 10%",
                          border: "2px dashed rgba(255,255,255,0.75)",
                          borderRadius: 2,
                          pointerEvents: "none",
                          boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Box
                          sx={{
                            width: "90%",
                            height: "2px",
                            bgcolor: "error.main",
                            boxShadow: "0 0 8px red",
                            opacity: 0.85,
                          }}
                        />
                      </Box>
                    )}

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
                    {ocrMode && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          bgcolor: "rgba(0,0,0,0.75)",
                          color: ocrState.status === "loading" ? "#ffeb3b" : ocrState.status === "ready" ? "#4caf50" : "#f44336",
                          borderRadius: 1,
                          px: 1,
                          py: 0.5,
                          fontFamily: "monospace",
                          fontSize: 11,
                          zIndex: 10,
                          pointerEvents: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        {ocrState.status === "loading" && <CircularProgress size={14} sx={{ strokeWidth: 2 }} />}
                        <span>{ocrState.status === "loading" ? "OCR..." : ocrState.status === "ready" ? "OCR sẵn sàng" : "OCR lỗi"}</span>
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

              <Autocomplete<QuickSearchCopy, false, false, true>
                freeSolo
                forcePopupIcon={false}
                options={suggestions}
                loading={isSearching}
                filterOptions={(options) => options}
                getOptionLabel={(option) => (typeof option === "string" ? option : option.barcode)}
                isOptionEqualToValue={(option, value) =>
                  typeof value === "string" ? option.barcode === value : option.id === value.id
                }
                value={null}
                inputValue={inputVal}
                onInputChange={(_, value, reason) => {
                  if (reason === "input") {
                    setInputVal(value);
                    handleSearchChange(value);
                  } else if (reason === "reset" || reason === "clear") {
                    setInputVal("");
                    setSuggestions([]);
                  }
                }}
                onChange={(_, value) => {
                  if (value && typeof value !== "string") {
                    if (!value.is_available) return;
                    setManualIsbn(value.barcode);
                    addScanned(value.barcode);
                    setInputVal("");
                    setSuggestions([]);
                    setTimeout(() => inputRef.current?.focus(), 50);
                  } else if (typeof value === "string") {
                    const code = value.trim();
                    if (!code) return;
                    setManualIsbn(code);
                    setInputVal("");
                    setSuggestions([]);
                    const isCopy = /^LIB/i.test(code.replace(/[-\s]/g, ""));
                    if (isCopy) {
                      addScanned(code);
                    } else if (/^\d{10,13}$/.test(code.replace(/[-\s]/g, ""))) {
                      setPendingIsbn(code);
                    } else {
                      addScanned(code);
                    }
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }
                }}
                getOptionDisabled={(option) => typeof option !== "string" && !option.is_available}
                disabled={lookingUp || !!successResult}
                loadingText="Đang tìm..."
                noOptionsText="Không tìm thấy sách phù hợp"
                slotProps={{
                  popper: {
                    placement: "bottom-start",
                    sx: { zIndex: 1400 },
                  },
                  paper: {
                    sx: { mt: 0.5, borderRadius: 2, border: 1, borderColor: "divider", boxShadow: 3, maxHeight: 260 },
                  },
                }}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;
                  return (
                    <Box
                      component="li"
                      key={key}
                      {...optionProps}
                      sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.2 }}
                    >
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0, flex: 1 }}>
                        <Typography component="span" variant="body2" sx={{ fontWeight: 700, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {option.book?.title || option.barcode}
                        </Typography>
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {option.barcode} | {option.book?.author || "—"} | {option.book?.isbn || "—"}
                        </Typography>
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          Kệ: {option.shelf_location || "Chưa xếp"}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={option.is_available ? "Sẵn sàng" : "Đã mượn / Bảo trì"}
                        color={option.is_available ? "success" : "default"}
                        sx={{ fontSize: "0.68rem", height: 20, fontWeight: 600, minWidth: 70 }}
                      />
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="Quét hoặc nhập mã bản sao (VD: LIB-9780140328721-001) hoặc ISBN..."
                    inputRef={inputRef}
                    slotProps={{
                      ...params.slotProps,
                      input: {
                        ...params.slotProps?.input,
                        startAdornment: (
                          <InputAdornment position="start">
                            <QrCodeScannerIcon fontSize="small" sx={{ color: "text.secondary" }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                )}
              />
              {ocrVideoRef.current && (
                <Button
                  size="small"
                  variant={ocrMode ? "contained" : "outlined"}
                  color="primary"
                  disabled={ocrState.status === "loading"}
                  onClick={() => {
                    setOcrMode((prev) => {
                      const next = !prev;
                      if (next) {
                        setOcrStatus("loading");
                        void runOcrOnVideo(ocrVideoRef.current!).catch(() => {
                          setOcrStatus("error");
                        });
                      } else {
                        setOcrStatus("idle");
                      }
                      return next;
                    });
                  }}
                  sx={{ textTransform: "none", fontWeight: 700, borderRadius: "6px", ml: 1 }}
                >
                  {ocrMode ? "Tắt OCR" : "Bật OCR"}
                </Button>
              )}

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

      <SelectBookCopyModal
        open={Boolean(pendingIsbn)}
        isbn={pendingIsbn}
        onSelectCopy={(barcode) => {
          addScanned(barcode);
          setPendingIsbn(null);
        }}
        onClose={() => setPendingIsbn(null)}
      />
    </>
  );
}