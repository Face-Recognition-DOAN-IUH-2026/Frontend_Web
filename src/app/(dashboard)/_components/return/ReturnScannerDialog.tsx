"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import CameraAltIcon from "@mui/icons-material/CameraAltOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScannerOutlined";
import VideocamIcon from "@mui/icons-material/VideocamOutlined";
import api from "@/lib/api-client";
import type { BorrowRecord, StaffPatronActiveBorrowsResponse } from "@/lib/types";
import { CONDITION_LABELS, CopyCondition, getConditionColor } from "@/lib/constants/copy";
import { estimateOverdueFine, estimateDamageFee, FineConfigDto } from "@/lib/fee-estimate";
import { useBarcodeOCR } from "@/lib/hooks/useBarcodeOCR";

const RAW_CAM_URL = process.env.NEXT_PUBLIC_BORROW_CAM_URL;
const BORROW_CAM_URL = RAW_CAM_URL ? `/api/camera/proxy?url=${encodeURIComponent(RAW_CAM_URL)}` : undefined;

export interface ScannedReturnItem {
  isbn: string;
  record: BorrowRecord;
  condition: string;
}

export const RETURN_CONDITION_OPTIONS: Array<{
  value: CopyCondition;
  label: string;
  desc: string;
}> = [
  {
    value: "good",
    label: "Bình thường / Tốt",
    desc: "Không phạt (0 đ)",
  },
  {
    value: "new",
    label: "Còn mới nguyên vẹn",
    desc: "Không phạt (0 đ)",
  },
  {
    value: "minor_damage",
    label: "Hư hỏng nhẹ",
    desc: "Phạt 30% giá sách + 5.000 đ",
  },
  {
    value: "major_damage",
    label: "Hư hỏng nặng",
    desc: "Phạt 70% giá sách + 10.000 đ",
  },
  {
    value: "lost",
    label: "Mất sách",
    desc: "Đền bù 100% giá sách + 10.000 đ",
  },
];

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
  fineConfig?: FineConfigDto | null;
  onBatchComplete: () => Promise<void>;
  showNotice: (type: "success" | "warning" | "error" | "info", msg: string, duration?: number) => void;
}

export default function ReturnScannerDialog({
  open,
  onClose,
  detail,
  fineConfig,
  onBatchComplete,
  showNotice,
}: ReturnScannerDialogProps) {
  const [camMode, setCamMode] = useState<"webcam" | "ip">("webcam");
  const [scannedReturns, setScannedReturns] = useState<ScannedReturnItem[]>([]);
  const [batchReturning, setBatchReturning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [imgReady, setImgReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [manualCode, setManualCode] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const readerRef = useRef<any>(null);

  /**
   * `showNotice` là callback prop: nếu parent truyền bằng arrow inline thì
   * identity đổi mỗi lần render → các callback nội bộ (handleScanned,
   * handleOcrRecognized) đổi identity theo → effect camera bị chạy lại và
   * khởi động lại decoder. Giữ callback mới nhất trong ref để các callback
   * nội bộ luôn ổn định.
   */
  const showNoticeRef = useRef(showNotice);
  showNoticeRef.current = showNotice;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // OCR fallback state
  const [ocrMode, setOcrMode] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const ocrFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stop camera & polling
  const stopWebcam = useCallback(() => {
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch {}
      readerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
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
    stopWebcam();
    stopScanning();
    stopPolling();
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, [stopWebcam, stopScanning, stopPolling]);

  // Start webcam
  const startWebcam = useCallback(async () => {
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
      if (err.name === "NotAllowedError") setCameraError("Chưa cấp quyền camera. Vui lòng cho phép trình duyệt truy cập camera máy tính.");
      else if (err.name === "NotFoundError") setCameraError("Không tìm thấy camera trên máy tính.");
      else setCameraError("Không thể bật camera máy: " + (err.message || "Lỗi không xác định"));
    }
  }, []);

  // IP Camera frame loader
  const loadNextFrame = useCallback(() => {
    if (!imgRef.current || loadingRef.current || !BORROW_CAM_URL) return;
    loadingRef.current = true;
    const sep = BORROW_CAM_URL.includes("?") ? "&" : "?";
    imgRef.current.src = `${BORROW_CAM_URL}${sep}_t=${Date.now()}`;
  }, [BORROW_CAM_URL]);

  // Handle scanned barcode / ISBN
  const handleScanned = useCallback((rawCode: string) => {
    const cleaned = rawCode.trim();
    const normalized = cleaned.replace(/[-\s]/g, "");
    if (normalized.length < 4) return;
    if (normalized === lastScannedRef.current) return;
    lastScannedRef.current = normalized;

    // Hủy OCR fallback khi barcode được quét thành công
    if (ocrFallbackTimerRef.current) {
      clearTimeout(ocrFallbackTimerRef.current);
      ocrFallbackTimerRef.current = null;
      setOcrMode(false);
      setOcrStatus("idle");
    }

    let toast = "";
    let toastType: "success" | "warning" = "warning";
    setScannedReturns((prev) => {
      if (prev.some((item) => item.isbn === normalized || item.isbn === cleaned)) {
        toast = `Sách "${cleaned}" đã có trong danh sách trả`;
        toastType = "warning";
        return prev;
      }

      // Check matching record in detail.records
      const normTarget = normalized.toLowerCase();
      const isCopyBarcode = /^lib/i.test(normTarget);

      // 1. Check exact match
      const match = detail?.records.find((r) => {
        const recordIsbn = (r.book?.isbn || "").replace(/[-\s]/g, "").toLowerCase();
        const copyBarcode = ((r as any).copy?.barcode || (r as any).barcode || "").replace(/[-\s]/g, "").toLowerCase();

        if (isCopyBarcode) {
          // If scanned a copy barcode (e.g. LIB-9780140328721-074), MUST match the exact copy barcode!
          return copyBarcode === normTarget;
        }

        // If scanned a pure ISBN (printed on the book cover), match by ISBN:
        return recordIsbn === normTarget;
      });

      if (match) {
        toast = `Đã nhận diện: ${match.book?.title || cleaned}`;
        toastType = "success";
        const initialCondition = (match as any).copy?.condition || "good";
        return [...prev, { isbn: cleaned, record: match, condition: initialCondition }];
      }

      // If user scanned a copy barcode, check if patron borrowed another copy of this same title
      if (isCopyBarcode) {
        const libMatch = normTarget.match(/^lib(\d{10,13})/i);
        const scannedIsbn = libMatch ? libMatch[1] : "";
        const otherCopyRecord = detail?.records.find((r) => {
          const recordIsbn = (r.book?.isbn || "").replace(/[-\s]/g, "").toLowerCase();
          return recordIsbn === scannedIsbn;
        });

        if (otherCopyRecord) {
          const actualBarcode = (otherCopyRecord as any).copy?.barcode || (otherCopyRecord as any).barcode || "khác";
          toast = `⚠️ Nhầm bản sao! Độc giả đang mượn bản sao "${actualBarcode}", không phải bản sao "${cleaned}"`;
          toastType = "warning";
          return prev;
        }
      }

      toast = `Độc giả này không mượn sách có mã: ${cleaned}`;
      toastType = "warning";
      return prev;
    });

    if (toast) {
      showNoticeRef.current(toastType, toast, toastType === "warning" ? 3.5 : 2);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastScannedRef.current = null;
    }, 1200);
  }, [detail]);

  // OCR recognized handler (stable callback)
  const handleOcrRecognized = useCallback(
    (code: string, type: "copy" | "isbn") => {
      setOcrStatus("ready");
      setOcrMode(false);
      if (ocrFallbackTimerRef.current) {
        clearTimeout(ocrFallbackTimerRef.current);
        ocrFallbackTimerRef.current = null;
      }
      handleScanned(code);
      showNoticeRef.current("success", `OCR nhận diện: ${code}`, 2);
    },
    [handleScanned],
  );

  // OCR options (định nghĩa ổn định để tránh tạo mới mỗi render)
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

  // Khởi tạo OCR worker khi component mount (chạy 1 lần)
  useEffect(() => {
    void initOcr();
  }, [initOcr]);

  // Dialog open/close lifecycle
  useEffect(() => {
    if (!open) {
      stopAll();
      setCameraError("");
      setImgReady(false);
      setScannedReturns([]);
      setManualCode("");
      lastScannedRef.current = null;
      setOcrMode(false);
      setOcrStatus("idle");
      if (ocrFallbackTimerRef.current) {
        clearTimeout(ocrFallbackTimerRef.current);
        ocrFallbackTimerRef.current = null;
      }
      terminateOcr();
      return;
    }

    if (camMode === "webcam") {
      startWebcam();

      // Auto-fallback OCR: nếu không quét được barcode nào trong 3 giây, bật OCR
      if (!scannedReturns.length) {
        ocrFallbackTimerRef.current = setTimeout(() => {
          if (videoRef.current) {
            setOcrMode(true);
            setOcrStatus("loading");
            void runOcrOnVideo(videoRef.current).catch(() => {
              setOcrStatus("error");
              setOcrMode(false);
            });
          }
        }, 3000);
      }
    } else {
      setImgReady(false);
      setCameraError("");
      loadNextFrame();
    }

    return () => {
      stopAll();
      if (ocrFallbackTimerRef.current) {
        clearTimeout(ocrFallbackTimerRef.current);
        ocrFallbackTimerRef.current = null;
      }
    };
  }, [open, camMode, stopAll, startWebcam, loadNextFrame, runOcrOnVideo]);

  // Decode barcode from Webcam video
  useEffect(() => {
    if (!open || camMode !== "webcam" || !cameraReady || !videoRef.current) return;
    let active = true;
    let animId: number | null = null;

    (async () => {
      // 1. Native BarcodeDetector (only if browser/OS actually supports code_128 or ean_13)
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
                    if (val) handleScanned(val);
                  }
                } catch {}
              }
              if (active) animId = requestAnimationFrame(detectNative);
            };
            animId = requestAnimationFrame(detectNative);
            usedNative = true;
          }
        } catch {
          usedNative = false;
        }
      }

      if (usedNative) return;

      // 2. Fallback to ZXing with Hints
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
          delayBetweenScanAttempts: 150,
          delayBetweenScanSuccess: 1000,
        });
        readerRef.current = reader;
        reader.decodeFromVideoElement(videoRef.current!, (result, _err) => {
          if (!active) return;
          if (result) {
            const code = result.getText();
            handleScanned(code);
          }
        });
      } catch (err) {
        console.error("Failed to decode webcam with ZXing:", err);
      }
    })();
    return () => {
      active = false;
      if (animId) cancelAnimationFrame(animId);
      if (readerRef.current) {
        try { readerRef.current.reset(); } catch {}
        readerRef.current = null;
      }
    };
  }, [open, camMode, cameraReady, handleScanned]);

  // Decode barcode from IP camera image
  useEffect(() => {
    if (!open || camMode !== "ip" || !imgReady || !imgRef.current) return;
    stopScanning();
    intervalRef.current = setInterval(async () => {
      if (!imgRef.current) return;
      const img = imgRef.current;
      if (!img.complete || !(img.naturalWidth || img.width)) return;
      try {
        if (!readerRef.current) {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          readerRef.current = new BrowserMultiFormatReader();
        }
        const result = await readerRef.current.decodeFromImageElement(img);
        if (result) handleScanned(result.getText());
      } catch {}
    }, 200);
    return () => stopScanning();
  }, [open, camMode, imgReady, handleScanned, stopScanning]);

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
        await api.staffReturnBorrowRecord(item.record.id, null, item.condition || "good");
        ok++;
      } catch {
        fail++;
      }
    }
    setBatchReturning(false);
    onClose();
    setScannedReturns([]);
    showNoticeRef.current(
      fail > 0 ? "warning" : "success",
      `Trả ${ok} sách thành công${fail > 0 ? `, ${fail} thất bại` : ""}`
    );
    await onBatchComplete();
  };

  const totalBorrowCount = detail?.records.length || 0;

  return (
    <Dialog open={open} onClose={batchReturning ? undefined : onClose} fullWidth maxWidth="xl">
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <QrCodeScannerIcon color="primary" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Quét mã vạch trả sách</Typography>
              {detail?.patron ? (
                <Typography variant="caption" color="text.secondary">
                  Độc giả: <strong>{detail.patron.full_name}</strong> ({detail.patron.student_code}) — Đang mượn {totalBorrowCount} sách
                </Typography>
              ) : null}
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            {/* Toggle Camera Mode */}
            <ToggleButtonGroup
              size="small"
              value={camMode}
              exclusive
              onChange={(_, newMode) => {
                if (newMode) setCamMode(newMode);
              }}
              sx={{ bgcolor: "background.paper" }}
            >
              <ToggleButton value="webcam" sx={{ px: 1.5, py: 0.5, textTransform: "none", fontWeight: 700 }}>
                <VideocamIcon fontSize="small" sx={{ mr: 0.5 }} /> Camera máy tính
              </ToggleButton>
              <ToggleButton value="ip" sx={{ px: 1.5, py: 0.5, textTransform: "none", fontWeight: 600 }}>
                <CameraAltIcon fontSize="small" sx={{ mr: 0.5 }} /> Camera IP
              </ToggleButton>
            </ToggleButtonGroup>

            {!batchReturning ? (
              <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
            ) : null}
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Box sx={{ display: "flex", gap: 2.5, flexDirection: { xs: "column", md: "row" }, flex: 1, minHeight: 0 }}>
          {/* Left Column: Camera Viewfinder & Manual Input */}
          <Box sx={{ width: { md: "50%" }, flexShrink: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ position: "relative", width: "100%", aspectRatio: "4/3", bgcolor: "#000", borderRadius: 2, overflow: "hidden", boxShadow: 2 }}>
              {/* Webcam View */}
              {camMode === "webcam" ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: cameraReady ? "block" : "none",
                    }}
                  />
                  {!cameraReady && !cameraError ? (
                    <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.7)", color: "common.white", alignItems: "center", justifyContent: "center" }} spacing={1}>
                      <CircularProgress size={32} color="inherit" />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Đang kết nối camera máy tính...</Typography>
                    </Stack>
                  ) : null}
                </>
              ) : (
                /* IP Camera View */
                <>
                  <Box
                    component="img"
                    ref={imgRef}
                    {...(BORROW_CAM_URL ? { src: BORROW_CAM_URL } : {})}
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
                      <Typography variant="body2">Đang kết nối IP camera...</Typography>
                    </Stack>
                  ) : null}
                </>
              )}

              {/* Error Overlay */}
              {cameraError ? (
                <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.85)", color: "common.white", alignItems: "center", justifyContent: "center", p: 3 }} spacing={1.5}>
                  <CameraAltIcon sx={{ fontSize: 44, color: "error.light" }} />
                  <Typography variant="body2" sx={{ textAlign: "center", color: "error.light", fontWeight: 600 }}>{cameraError}</Typography>
                  <Button
                    variant="outlined"
                    color="inherit"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                      setCameraError("");
                      if (camMode === "webcam") startWebcam();
                      else loadNextFrame();
                    }}
                    sx={{ textTransform: "none" }}
                  >
                    Thử lại
                  </Button>
                </Stack>
              ) : null}

              {/* Scanning Crosshair Overlay */}
              {(cameraReady || imgReady) && !cameraError ? (
                <Box
                  sx={{
                    position: "absolute",
                    inset: "20% 15%",
                    border: "2px dashed rgba(255,255,255,0.7)",
                    borderRadius: 2,
                    pointerEvents: "none",
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)",
                  }}
                />
              ) : null}

              {/* OCR Status Indicator */}
              {ocrMode && videoRef.current && (
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

              {/* Badge Top Left */}
              <Box sx={{ position: "absolute", top: 10, left: 10, px: 1.2, py: 0.4, bgcolor: "rgba(0,0,0,.65)", borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: "common.white", fontSize: 11, fontWeight: 700 }}>
                  {camMode === "webcam" ? "🎥 Camera máy tính (Webcam)" : "📡 Camera IP"}
                </Typography>
              </Box>
            </Box>

            {/* Manual Code Input Bar */}
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 0.5, display: "block" }}>
                Hoặc nhập tay mã ISBN / Barcode trên bìa sách:
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Nhập 10-13 số ISBN hoặc barcode..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && manualCode.trim()) {
                      handleScanned(manualCode.trim());
                      setManualCode("");
                    }
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "6px" } }}
                />
                <Button
                  variant="contained"
                  onClick={() => {
                    if (manualCode.trim()) {
                      handleScanned(manualCode.trim());
                      setManualCode("");
                    }
                  }}
                  disabled={!manualCode.trim()}
                  sx={{ textTransform: "none", fontWeight: 700, borderRadius: "6px", whiteSpace: "nowrap" }}
                >
                  Nhận sách
                </Button>
                {videoRef.current && (
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
                          void runOcrOnVideo(videoRef.current!).catch(() => {
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
              </Stack>
            </Paper>
          </Box>

          {/* Right Column: Scanned Books for Return */}
          <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <QrCodeScannerIcon color="primary" sx={{ fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  {scannedReturns.length > 0 ? `Sách đã nhận diện để trả (${scannedReturns.length} cuốn)` : "Sách đã nhận diện để trả"}
                </Typography>
              </Stack>
              {scannedReturns.length > 0 ? (
                <Chip size="small" color="success" icon={<CheckCircleIcon />} label={`${scannedReturns.length} cuốn sẵn sàng`} />
              ) : null}
            </Stack>

            {scannedReturns.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Đưa mã vạch ISBN sau bìa sách trước camera máy tính (hoặc nhập mã ở khung bên trái). Hệ thống sẽ tự động đối chiếu với danh sách sách độc giả đang mượn.
              </Alert>
            ) : (
              scannedReturns.map((item) => (
                <Paper key={item.isbn} variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: "background.paper" }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                    {item.record.book?.cover_url ? (
                      <Box
                        component="img"
                        src={item.record.book.cover_url}
                        alt={item.record.book.title}
                        sx={{ width: 44, height: 60, objectFit: "cover", borderRadius: 1, flexShrink: 0 }}
                      />
                    ) : (
                      <Avatar variant="rounded" sx={{ width: 44, height: 60, bgcolor: "action.hover", flexShrink: 0 }}>
                        <BookIcon color="action" />
                      </Avatar>
                    )}
                    <Stack spacing={0.4} sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                        {item.record.book?.title || item.record.book_id}
                      </Typography>
                      {item.record.book?.author ? (
                        <Typography variant="caption" color="text.secondary" noWrap>{item.record.book.author}</Typography>
                      ) : null}
                      <Typography variant="caption" sx={{ fontFamily: "JetBrains Mono, monospace", color: "primary.main", fontWeight: 700 }}>
                        Mã: {item.isbn}
                      </Typography>
                      {(() => {
                        const overdueDays = Math.max(0, -daysUntil(item.record.due_at));
                        const overdueFine = estimateOverdueFine(overdueDays, fineConfig);
                        const bookPrice = (item.record as any).book?.price ?? null;
                        const damageFee = estimateDamageFee(item.condition || "good", bookPrice, fineConfig);
                        const itemTotal = overdueFine + damageFee;
                        const currentCondition = (item.condition as CopyCondition) || "good";

                        return (
                          <>
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", pt: 0.5 }}>
                              {dueChip(item.record)}
                              <Chip
                                size="small"
                                color={getConditionColor(currentCondition)}
                                variant="outlined"
                                label={CONDITION_LABELS[currentCondition] || currentCondition}
                                sx={{ height: 20, fontSize: 11 }}
                              />
                            </Stack>
                            <Select
                              value={item.condition || "good"}
                              onChange={(e) => updateCondition(item.isbn, e.target.value)}
                              fullWidth
                              size="small"
                              sx={{ mt: 1, borderRadius: 1 }}
                            >
                              {RETURN_CONDITION_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                  <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                                    <span>{opt.label}</span>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: opt.value === "good" || opt.value === "new" ? "success.main" : "error.main",
                                        ml: 1,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {opt.desc}
                                    </Typography>
                                  </Box>
                                </MenuItem>
                              ))}
                            </Select>
                            {itemTotal > 0 ? (
                              <Paper
                                variant="outlined"
                                sx={{
                                  p: 1,
                                  mt: 0.8,
                                  bgcolor: "warning.50",
                                  borderColor: "warning.300",
                                  borderRadius: 1,
                                }}
                              >
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 0.5 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                                    Phí phạt ước tính:
                                  </Typography>
                                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                                    {overdueFine > 0 && (
                                      <Chip
                                        size="small"
                                        color="error"
                                        variant="outlined"
                                        label={`Trễ: ${overdueFine.toLocaleString("vi-VN")} đ`}
                                        sx={{ height: 20, fontSize: 11 }}
                                      />
                                    )}
                                    {damageFee > 0 && (
                                      <Chip
                                        size="small"
                                        color="warning"
                                        variant="outlined"
                                        label={`Hư hỏng: ${damageFee.toLocaleString("vi-VN")} đ`}
                                        sx={{ height: 20, fontSize: 11 }}
                                      />
                                    )}
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: "error.main", ml: 0.5 }}>
                                      Tổng = {itemTotal.toLocaleString("vi-VN")} đ
                                    </Typography>
                                  </Stack>
                                </Stack>
                              </Paper>
                            ) : null}
                          </>
                        );
                      })()}
                    </Stack>
                    <IconButton size="small" color="error" onClick={() => removeScanned(item.isbn)} sx={{ mt: 0.5 }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Paper>
              ))
            )}

            {/* List of remaining books borrowed by this patron */}
            {detail?.records && detail.records.length > 0 ? (
              <Box sx={{ mt: 1 }}>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                  Tất cả sách độc giả đang mượn ({detail.records.length} cuốn):
                </Typography>
                <Stack spacing={1}>
                  {detail.records.map((r) => {
                    const isScanned = scannedReturns.some((s) => s.record.id === r.id);
                    return (
                      <Paper
                        key={r.id}
                        variant="outlined"
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          opacity: isScanned ? 0.5 : 1,
                          bgcolor: isScanned ? "action.hover" : "background.default",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1,
                        }}
                      >
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
                          {isScanned ? (
                            <CheckCircleIcon color="success" fontSize="small" />
                          ) : (
                            <BookIcon color="action" fontSize="small" />
                          )}
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                              {r.book?.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ISBN: {r.book?.isbn || "N/A"} {(r as any).copy?.barcode ? `| Barcode: ${(r as any).copy.barcode}` : ""}
                            </Typography>
                          </Box>
                        </Stack>
                        {!isScanned ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleScanned(r.book?.isbn || (r as any).copy?.barcode || r.id)}
                            sx={{ textTransform: "none", fontSize: 12, borderRadius: 1, py: 0.2 }}
                          >
                            Chọn trả
                          </Button>
                        ) : (
                          <Chip size="small" color="success" label="Đã quét" sx={{ height: 22, fontSize: 11 }} />
                        )}
                      </Paper>
                    );
                  })}
                </Stack>
              </Box>
            ) : null}
          </Stack>
        </Box>
      </DialogContent>

      {(() => {
        const totalBatchDue = scannedReturns.reduce((sum, item) => {
          const overdueDays = Math.max(0, -daysUntil(item.record.due_at));
          const overdueFine = estimateOverdueFine(overdueDays, fineConfig);
          const bookPrice = (item.record as any).book?.price ?? null;
          const damageFee = estimateDamageFee(item.condition || "good", bookPrice, fineConfig);
          return sum + overdueFine + damageFee;
        }, 0);

        return (
          <DialogActions sx={{ px: 2.5, py: 1.5, justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {totalBatchDue > 0 ? (
                <>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "error.main" }}>
                    Tổng phí phạt ước tính: {totalBatchDue.toLocaleString("vi-VN")} đ
                  </Typography>
                  <Chip size="small" color="error" label="Cần thu phí" sx={{ height: 22, fontSize: 11, fontWeight: 700 }} />
                </>
              ) : null}
            </Box>
            <Stack direction="row" spacing={1}>
              <Button onClick={onClose} disabled={batchReturning} sx={{ textTransform: "none" }}>Đóng</Button>
              <Button
                variant="contained"
                color={totalBatchDue > 0 ? "warning" : "success"}
                disabled={batchReturning || scannedReturns.length === 0}
                onClick={handleBatchReturn}
                startIcon={batchReturning ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                sx={{ textTransform: "none", fontWeight: 700, borderRadius: 1.5, px: 2.5 }}
              >
                {batchReturning ? "Đang trả sách..." : `Xác nhận trả (${scannedReturns.length} cuốn)`}
              </Button>
            </Stack>
          </DialogActions>
        );
      })()}
    </Dialog>
  );
}
