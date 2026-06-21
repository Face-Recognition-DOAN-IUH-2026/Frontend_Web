"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Box, Paper, Typography, Button, Stack, CircularProgress,
  Alert, Divider, Fade, alpha, LinearProgress, Chip,
} from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ReplayIcon from "@mui/icons-material/Replay";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import Webcam from "react-webcam";
import { createWorker } from "tesseract.js";

export interface ScannedCardData {
  studentCode: string;
  fullName: string;
  className: string | null;
  dateOfBirth: string | null;
  course: string | null;
  permanentAddress: string | null;
  faculty: string | null;
  rawText: string;
}

interface StudentCardScannerProps {
  onScanned: (data: ScannedCardData) => void;
  onError?: (error: string) => void;
  onSkip?: () => void;
  videoSource?: "webcam" | "ipcamera";
  ipCameraUrl?: string;
}

type Phase = "detecting" | "processing" | "confirm";

const MAX_DETECT_ATTEMPTS = 10;
const DETECT_INTERVAL_MS = 4000;

const SURNAMES = [
  "nguyễn", "trần", "lê", "phạm", "huỳnh", "hoàng", "phan",
  "vũ", "võ", "đặng", "bùi", "đỗ", "hồ", "ngô", "dương", "lý",
  "cao", "đinh", "tạ", "châu", "mai", "tô", "hà", "vương",
];

const HEADER_KEYWORDS = [
  "bộ công thương", "trường đại học công nghiệp", "thẻ sinh viên",
  "trường đại học", "đại học công nghiệp", "thành phố hồ chí minh",
  "student card", "student id", "the sinh vien", "cong thuong",
  "sinh viên", "ngày sinh", "khóa học", "hktt",
  "hộ khẩu", "khoa", "lớp", "ngành", "msv", "mssv",
];

function preprocessForOcr(imageData: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const w = Math.min(img.width, 1920);
      const scale = w / img.width;
      canvas.width = w;
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(imageData); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageDataObj.data;
      const weights = [0.299, 0.587, 0.114];
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += weights[0] * data[i] + weights[1] * data[i + 1] + weights[2] * data[i + 2];
      }
      const avgBrightness = sum / (data.length / 4);
      const factor = avgBrightness > 180 ? 1.3 : avgBrightness < 80 ? 1.5 : 1.1;
      for (let i = 0; i < data.length; i += 4) {
        const gray = weights[0] * data[i] + weights[1] * data[i + 1] + weights[2] * data[i + 2];
        const enhanced = Math.min(255, Math.max(0, Math.round((gray - 128) * factor + 128)));
        data[i] = enhanced;
        data[i + 1] = enhanced;
        data[i + 2] = enhanced;
      }
      ctx.putImageData(imageDataObj, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };
    img.onerror = () => resolve(imageData);
    img.src = imageData;
  });
}

function parseCardText(text: string): Partial<ScannedCardData> {
  const result: Partial<ScannedCardData> = { rawText: text };
  const normalized = text.replace(/\r\n/g, "\n").replace(/\t/g, " ");
  const lines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);

  const studentCodeRegex = /(?:MSSV|M[aã]\s*SV|M[aã]\s*S[oố]\s*SV|Student\s*Code|M[aã]\s*s[oố]\s*sinh\s*vi[eê]n|MSV|M\.S\.V)[:\s]*(\S{4,})/i;
  const fullNameRegexWithLabel = /(?:H[oọ]\s*v[aà]\s*t[eê]n|Full\s*Name|H[oọ]\s*t[eê]n|H[oọ]\s*V[AÀ]\s*T[EÊ]N|HỌ\s*TÊN|HỌ\s*VÀ\s*TÊN)[:\s]*(.+)/i;
  const classNameRegex = /(?:L[oớ]p|Class|LỚP)[:\s]*(.+)/i;
  const dobRegex = /(?:NS|Ng[aà]y\s*sinh|DOB|Birth|Ng[aà]y\s*th[aá]ng\s*n[aǎ]m\s*sinh|NGÀY\s*SINH|Sinh)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i;
  const courseRegex = /(?:Kh[oó]a\s*h[oọô]c|Course|Kh[oó]a|KHÓA)[:\s]*(.+)/i;
  const addressRegex = /(?:HKTT|H[oộ]\s*kh[aẩ]u|Đ[iịa]\s*ch[ỉi]|Address|H[oộ]\s*kh[aẩ]u\s*th[öo]ng\s*tr[uú])[:\s]*(.+)/i;
  const facultyRegex = /(?:Khoa|Faculty|Department|KHOA|Ngành)[:\s]*(.+)/i;

  for (const line of lines) {
    if (!result.studentCode) {
      const m = line.match(studentCodeRegex);
      if (m) result.studentCode = m[1].replace(/[^A-Za-z0-9]/g, "");
    }
    if (!result.fullName) {
      const m = line.match(fullNameRegexWithLabel);
      if (m) {
        const name = m[1].trim();
        if (name.length >= 6) result.fullName = name;
      }
    }
    if (!result.className) {
      const m = line.match(classNameRegex);
      if (m) result.className = m[1].trim();
    }
    if (!result.dateOfBirth) {
      const m = line.match(dobRegex);
      if (m) result.dateOfBirth = m[1].trim();
    }
    if (!result.course) {
      const m = line.match(courseRegex);
      if (m) result.course = m[1].trim();
    }
    if (!result.permanentAddress) {
      const m = line.match(addressRegex);
      if (m) result.permanentAddress = m[1].trim();
    }
    if (!result.faculty) {
      const m = line.match(facultyRegex);
      if (m) result.faculty = m[1].trim();
    }
  }

  if (!result.studentCode) {
    const allNums = normalized.match(/\b(\d{6,13})\b/g);
    if (allNums) {
      const validCodes = allNums.filter(n => n.length >= 7 && n.length <= 13);
      if (validCodes.length > 0) {
        result.studentCode = validCodes[validCodes.length - 1];
      }
    }
  }

  if (!result.fullName) {
    const candidateLines = lines.filter((line) => {
      const lower = line.toLowerCase();
      if (HEADER_KEYWORDS.some((k) => lower.includes(k))) return false;
      if (/^\d+$/.test(line.trim())) return false;
      if (line.trim().length < 5) return false;
      if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(line.trim())) return false;
      if (/^(?:DH|CD|CA|KH|CH)[A-Z0-9]+/i.test(line.trim())) return false;
      return true;
    });

    const nameBySurname = candidateLines.find((l) => {
      const lower = l.toLowerCase().trim();
      return SURNAMES.some(
        (s) => lower.startsWith(s) || lower.startsWith(`${s} `)
      );
    });
    if (nameBySurname) {
      const cleaned = nameBySurname.replace(/^[\d:\s]+/, "").trim();
      if (cleaned.length >= 6) result.fullName = cleaned;
    }

    if (!result.fullName) {
      const nameByMixedCase = candidateLines.find((l) => {
        const words = l.trim().split(/\s+/);
        if (words.length < 2 || words.length > 6) return false;
        const firstChar = l.trim()[0];
        if (!/[A-ZÀ-ỸĂÂĐÊÔƠƯ]/.test(firstChar)) return false;
        const hasLower = /[a-zà-ỹăâđêôơưừếệấ]/.test(l);
        const hasUpper = /[A-ZÀ-ỸĂÂĐÊÔƠƯ]/.test(l);
        if (!hasLower || !hasUpper) return false;
        if (/^[A-Z0-9]{4,}$/.test(words[0])) return false;
        return true;
      });
      if (nameByMixedCase) {
        const cleaned = nameByMixedCase.replace(/^[\d:\s]+/, "").trim();
        if (cleaned.length >= 6) result.fullName = cleaned;
      }
    }

    if (!result.fullName) {
      const allCapsName = candidateLines.find((l) => {
        const words = l.trim().split(/\s+/);
        if (words.length < 2 || words.length > 6) return false;
        if (!/^[A-ZÀ-ỸĂÂĐÊÔƠƯ\s]+$/.test(l.trim())) return false;
        if (!/[À-ỸĂÂĐÊÔƠƯ]/.test(l)) return false;
        return true;
      });
      if (allCapsName) {
        const cleaned = allCapsName.trim();
        if (cleaned.length >= 6) result.fullName = cleaned;
      }
    }
  }

  if (!result.course) {
    const yearMatch = normalized.match(/\b(20\d{2}\s*[-–]\s*20\d{2})\b/);
    if (yearMatch) result.course = yearMatch[1];
  }

  if (!result.course) {
    const khoaMatch = normalized.match(/Kh[oó]a\s+(\d{4}(?:\s*[-–]\s*\d{4})?)/i);
    if (khoaMatch) result.course = khoaMatch[1];
  }

  if (!result.course) {
    const kMatch = normalized.match(/\bK\s*(\d{2,4})\b/);
    if (kMatch) result.course = "K" + kMatch[1];
  }

  if (!result.className) {
    const classMatch = normalized.match(/\b(DH|CD|CA|KH|CK)[A-Z0-9]{2,}[A-Z0-9]?\b/gi);
    if (classMatch) result.className = classMatch[0].toUpperCase();
  }

  if (!result.permanentAddress) {
    const addrMatch = normalized.match(/(?:HKTT|Hộ khẩu)[:\s]*(.+?)(?=\s*(?:Khoa|Ngành|Lớp|MSSV|$))/i);
    if (addrMatch) result.permanentAddress = addrMatch[1].trim();
  }

  return result;
}

function phaseLabel(phase: Phase): string {
  switch (phase) {
    case "detecting": return "Đang phát hiện thẻ...";
    case "processing": return "Đang nhận dạng...";
    case "confirm": return "Đọc thẻ thành công";
  }
}

function phaseColor(phase: Phase): "info" | "primary" | "success" {
  switch (phase) {
    case "detecting": return "info";
    case "processing": return "primary";
    case "confirm": return "success";
  }
}

export default function StudentCardScanner({ onScanned, onError, onSkip, videoSource = "webcam", ipCameraUrl }: StudentCardScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const ipCamRef = useRef<HTMLImageElement>(null);
  const [phase, setPhase] = useState<Phase>("detecting");
  const [ocrResult, setOcrResult] = useState<Partial<ScannedCardData> | null>(null);
  const [error, setError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [detectAttempts, setDetectAttempts] = useState(0);
  const workerRef = useRef<Tesseract.Worker | null>(null);
  const isMounted = useRef(true);
  const phaseRef = useRef(phase);
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setOcrProgress(0);
      const worker = await createWorker("vie+eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text" && isMounted.current) {
            setOcrProgress(m.progress || 0);
          }
        },
      });
      if (!cancelled) workerRef.current = worker;
      else worker.terminate();
    })();
    return () => {
      cancelled = true;
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    };
  }, []);

  const runOcr = useCallback(async (imageData: string): Promise<Partial<ScannedCardData> | null> => {
    if (!workerRef.current) return null;
    try {
      setOcrProgress(0);
      setOcrLoading(true);
      const processed = await preprocessForOcr(imageData);
      const { data } = await workerRef.current.recognize(processed);
      setOcrLoading(false);
      if (!data?.text) return null;
      console.log("[OCR] Raw text:", data.text);
      return parseCardText(data.text);
    } catch (err: any) {
      setOcrLoading(false);
      onError?.("Lỗi OCR: " + (err.message || ""));
      return null;
    }
  }, [onError]);

  const captureFrameFromIpCam = useCallback((): string | null => {
    const img = ipCamRef.current;
    if (!img || !img.complete || img.naturalWidth === 0) return null;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.95);
  }, []);

  const checkImageHasContent = useCallback((dataUrl: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const w = Math.min(img.width, 320);
        const h = Math.round((w / img.width) * img.height);
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(true); return; }
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let sum = 0;
        let min = 255;
        let max = 0;
        for (let i = 0; i < data.length; i += 16) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          sum += gray;
          if (gray < min) min = gray;
          if (gray > max) max = gray;
        }
        const pixels = data.length / 16;
        const avg = sum / pixels;
        const contrast = max - min;
        resolve(contrast > 30 && avg > 20 && avg < 240);
      };
      img.onerror = () => resolve(true);
      img.src = dataUrl;
    });
  }, []);

  const attemptAutoDetect = useCallback(async () => {
    if (!isMounted.current || phaseRef.current !== "detecting") return;

    if (videoSource === "ipcamera") {
      if (!ipCamRef.current) {
        if (isMounted.current && phaseRef.current === "detecting") {
          detectTimerRef.current = setTimeout(attemptAutoDetect, DETECT_INTERVAL_MS);
        }
        return;
      }
      try {
        setDetectAttempts((prev) => {
          const next = prev + 1;
          if (next >= MAX_DETECT_ATTEMPTS && isMounted.current) {
            setError("Không thể phát hiện thẻ sau nhiều lần thử. Hãy chụp thủ công hoặc tải ảnh.");
          }
          return next;
        });

        const imageSrc = captureFrameFromIpCam();
        if (!imageSrc) {
          if (isMounted.current && phaseRef.current === "detecting") {
            detectTimerRef.current = setTimeout(attemptAutoDetect, DETECT_INTERVAL_MS);
          }
          return;
        }

        const hasContent = await checkImageHasContent(imageSrc);
        if (!hasContent) {
          if (isMounted.current && phaseRef.current === "detecting") {
            detectTimerRef.current = setTimeout(attemptAutoDetect, DETECT_INTERVAL_MS);
          }
          return;
        }

        setPhase("processing");
        const parsed = await runOcr(imageSrc);

        if (!isMounted.current) return;

        if (parsed && parsed.studentCode && parsed.fullName) {
          setOcrResult(parsed);
          setPhase("confirm");
          return;
        }

        setPhase("detecting");
      } catch (err: any) {
        if (isMounted.current) {
          setPhase("detecting");
        }
      }
      if (isMounted.current && phaseRef.current === "detecting") {
        detectTimerRef.current = setTimeout(attemptAutoDetect, DETECT_INTERVAL_MS);
      }
      return;
    }

    if (!webcamRef.current) {
      if (isMounted.current && phaseRef.current === "detecting") {
        detectTimerRef.current = setTimeout(attemptAutoDetect, DETECT_INTERVAL_MS);
      }
      return;
    }
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        if (isMounted.current && phaseRef.current === "detecting") {
          detectTimerRef.current = setTimeout(attemptAutoDetect, DETECT_INTERVAL_MS);
        }
        return;
      }

      setDetectAttempts((prev) => {
        const next = prev + 1;
        if (next >= MAX_DETECT_ATTEMPTS && isMounted.current) {
          setError("Không thể phát hiện thẻ sau nhiều lần thử. Hãy chụp thủ công hoặc tải ảnh.");
        }
        return next;
      });

      const hasContent = await checkImageHasContent(imageSrc);
      if (!hasContent) {
        if (isMounted.current && phaseRef.current === "detecting") {
          detectTimerRef.current = setTimeout(attemptAutoDetect, DETECT_INTERVAL_MS);
        }
        return;
      }

      setPhase("processing");
      const parsed = await runOcr(imageSrc);

      if (!isMounted.current) return;

      if (parsed && parsed.studentCode && parsed.fullName) {
        setOcrResult(parsed);
        setPhase("confirm");
        return;
      }

      setPhase("detecting");
    } catch (err: any) {
      if (isMounted.current) {
        setPhase("detecting");
      }
    }
    if (isMounted.current && phaseRef.current === "detecting") {
      detectTimerRef.current = setTimeout(attemptAutoDetect, DETECT_INTERVAL_MS);
    }
  }, [runOcr, checkImageHasContent, videoSource, captureFrameFromIpCam]);

  const startDetection = useCallback(() => {
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    setDetectAttempts(0);
    detectTimerRef.current = setTimeout(attemptAutoDetect, 1000);
  }, [attemptAutoDetect]);

  useEffect(() => {
    if (cameraReady && phase === "detecting") {
      startDetection();
    }
    return () => {
      if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    };
  }, [cameraReady, phase, startDetection]);

  const handleManualCapture = useCallback(async () => {
    if (videoSource === "ipcamera" && !ipCamRef.current) return;
    if (videoSource !== "ipcamera" && !webcamRef.current) return;
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    setPhase("processing");
    setError("");
    try {
      let imageSrc: string | null = null;

      if (videoSource === "ipcamera") {
        imageSrc = captureFrameFromIpCam();
      } else {
        imageSrc = webcamRef.current?.getScreenshot() || null;
      }

      if (!imageSrc) {
        setError("Không thể chụp ảnh từ camera");
        setPhase("detecting");
        startDetection();
        return;
      }
      setPhase("processing");
      const parsed = await runOcr(imageSrc);
      if (parsed && isMounted.current) {
        if (parsed.studentCode && parsed.fullName) {
          setOcrResult(parsed);
          setPhase("confirm");
        } else {
          setError("Không thể đọc thông tin từ thẻ. Hãy đảm bảo thẻ rõ nét và đủ ánh sáng.");
          setPhase("detecting");
          startDetection();
        }
      }
    } catch {
      setPhase("detecting");
      startDetection();
    }
  }, [runOcr, startDetection, videoSource, captureFrameFromIpCam]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    setPhase("processing");
    setError("");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      const parsed = await runOcr(dataUrl);
      if (parsed && isMounted.current) {
        if (parsed.studentCode && parsed.fullName) {
          setOcrResult(parsed);
          setPhase("confirm");
        } else {
          setError("Không thể đọc thông tin từ ảnh này");
          setPhase("detecting");
          startDetection();
        }
      }
    };
    reader.readAsDataURL(file);
  }, [runOcr, startDetection]);

  const handleConfirm = () => {
    if (ocrResult) {
      onScanned(ocrResult as ScannedCardData);
    }
  };

  const handleRetake = () => {
    setOcrResult(null);
    setError("");
    setPhase("detecting");
    startDetection();
  };

  const videoConstraints: MediaStreamConstraints["video"] = {
    facingMode: "environment",
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  };

  return (
    <Stack spacing={0}>
      {phase === "confirm" && ocrResult ? (
        <Fade in>
          <Box>
            {/* ── CONFIRM STATE: full-width info panel ── */}
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Stack direction="row" sx={{ alignItems: "center" }} spacing={1}>
                  <CheckCircleIcon color="success" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Thông tin từ thẻ sinh viên
                  </Typography>
                </Stack>
                <Divider />
                <InfoRow label="MSSV" value={ocrResult.studentCode ?? ""} />
                <InfoRow label="Họ tên" value={ocrResult.fullName ?? ""} />
                {ocrResult.className != null && <InfoRow label="Lớp" value={ocrResult.className} />}
                {ocrResult.dateOfBirth != null && <InfoRow label="Ngày sinh" value={ocrResult.dateOfBirth} />}
                {ocrResult.course != null && <InfoRow label="Khóa học" value={ocrResult.course} />}
                {ocrResult.permanentAddress != null && <InfoRow label="HKTT" value={ocrResult.permanentAddress} />}
                {ocrResult.faculty != null && <InfoRow label="Khoa" value={ocrResult.faculty} />}
                {ocrResult.rawText && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ cursor: "pointer", userSelect: "none" }}
                      onClick={(e) => {
                        const el = (e.currentTarget as HTMLElement).nextElementSibling;
                        if (el) (el as HTMLElement).style.display = el?.getAttribute("data-open") === "1" ? "none" : "block";
                        e.currentTarget.setAttribute("data-open", e.currentTarget.getAttribute("data-open") === "1" ? "0" : "1");
                      }}
                    >
                      ▸ Raw OCR text (debug)
                    </Typography>
                    <Box data-open="0" sx={{ display: "none", mt: 1, p: 1.5, bgcolor: "grey.900", borderRadius: 1, maxHeight: 120, overflow: "auto" }}>
                      <Typography variant="caption" sx={{ fontFamily: "monospace", whiteSpace: "pre-wrap", color: "grey.300", fontSize: "0.7rem" }}>
                        {ocrResult.rawText}
                      </Typography>
                    </Box>
                  </Box>
                )}
                <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
                  <Button variant="contained" onClick={handleConfirm} fullWidth>
                    Xác nhận
                  </Button>
                  <Button variant="outlined" startIcon={<ReplayIcon />} onClick={handleRetake} fullWidth>
                    Chụp lại
                  </Button>
                </Stack>
                {onSkip && (
                  <Button color="inherit" variant="text" onClick={onSkip} fullWidth size="small">
                    Nhập thủ công
                  </Button>
                )}
              </Stack>
            </Paper>
          </Box>
        </Fade>
      ) : (
        /* ── SCANNING STATE: side-by-side layout ── */
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 0,
            minHeight: { md: 420 },
          }}
        >
          {/* ── LEFT: Camera panel ── */}
          <Box
            sx={{
              flex: { md: "0 0 55%" },
              position: "relative",
              bgcolor: "common.black",
              borderRadius: { xs: "12px 12px 0 0", md: "12px 0 0 12px" },
              overflow: "hidden",
              minHeight: { xs: 280, md: 420 },
            }}
          >
            {videoSource === "ipcamera" ? (
              <Box
                component="img"
                ref={ipCamRef}
                src={ipCameraUrl}
                alt="IP Camera"
                onLoad={() => setCameraReady(true)}
                onError={() => setError("Không thể kết nối IP Camera")}
                sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              />
            ) : (
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.9}
                videoConstraints={videoConstraints}
                onUserMedia={() => setCameraReady(true)}
                onUserMediaError={() => setError("Không thể truy cập camera")}
                style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              />
            )}

            {/* Card frame overlay */}
            <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <Box sx={{ width: "70%", aspectRatio: "1.6 / 1", position: "relative" }}>
                {/* Corner brackets */}
                {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map((corner) => {
                  const isTop = corner.includes("top");
                  const isLeft = corner.includes("left");
                  return (
                    <Box
                      key={corner}
                      sx={{
                        position: "absolute",
                        width: 28,
                        height: 28,
                        [isTop ? "top" : "bottom"]: -2,
                        [isLeft ? "left" : "right"]: -2,
                        borderColor: "common.white",
                        borderStyle: "solid",
                        borderWidth: 0,
                        [`border${isTop ? "Top" : "Bottom"}Width`]: 3,
                        [`border${isLeft ? "Left" : "Right"}Width`]: 3,
                        borderRadius: isTop && isLeft ? "12px 0 0 0"
                          : isTop && !isLeft ? "0 12px 0 0"
                          : !isTop && isLeft ? "0 0 0 12px"
                          : "0 0 12px 0",
                        opacity: 0.9,
                      }}
                    />
                  );
                })}
              </Box>
            </Box>

            {/* Status badge overlay */}
            {phase !== "confirm" && (
              <Box
                sx={{
                  position: "absolute",
                  top: 16,
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  bgcolor: "rgba(13, 17, 23, 0.85)",
                  px: 2,
                  py: 1,
                  borderRadius: 20,
                  backdropFilter: "blur(4px)",
                }}
              >
                {phase === "detecting" && <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: "#7A8CA8", animation: "pulse-blue 2s ease-in-out infinite" }} />}
                {phase === "processing" && <HourglassBottomIcon sx={{ fontSize: 18, color: "#1A73E8", animation: "pulse-blue 1s ease-in-out infinite" }} />}
                <Typography variant="body2" sx={{ fontWeight: 600, color: "common.white", whiteSpace: "nowrap" }}>
                  {phase === "processing"
                    ? `Đang nhận dạng... ${detectAttempts > 0 ? `(${detectAttempts}/${MAX_DETECT_ATTEMPTS})` : ""}`
                    : phaseLabel(phase)}
                </Typography>
              </Box>
            )}

            {/* Not-ready overlay */}
            {!cameraReady && (
              <Box
                sx={{
                  position: "absolute", inset: 0,
                  bgcolor: "rgba(0,0,0,0.6)",
                  color: "common.white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column", gap: 1,
                }}
              >
                <CircularProgress size={28} color="inherit" />
                <Typography variant="body2">Đang kết nối camera...</Typography>
              </Box>
            )}

            {/* Processing overlay */}
            {phase === "processing" && ocrLoading && (
              <Box
                sx={{
                  position: "absolute", inset: 0,
                  bgcolor: "rgba(0,0,0,0.7)",
                  color: "common.white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column", gap: 1,
                }}
              >
                <CircularProgress size={28} color="inherit" />
                <Typography variant="body2">Đang nhận dạng chữ viết...</Typography>
                <Box sx={{ width: 160 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.max(ocrProgress * 100, 5)}
                    sx={{ borderRadius: 1, height: 4 }}
                  />
                  <Typography variant="caption" sx={{ mt: 0.5, display: "block", textAlign: "center" }}>
                    {Math.round(ocrProgress * 100)}%
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* ── RIGHT: Info panel ── */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              bgcolor: "background.paper",
              borderRadius: { xs: "0 0 12px 12px", md: "0 12px 12px 0" },
              borderLeft: { md: "1px solid" },
              borderTop: { xs: "1px solid", md: "none" },
              borderColor: "divider",
              overflow: "hidden",
            }}
          >
            {/* Panel header */}
            <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.3 }}>
                Thông tin quét được
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                <Chip
                  label={phaseLabel(phase)}
                  color={phaseColor(phase)}
                  size="small"
                  icon={
                    phase === "detecting" ? <RadioButtonUncheckedIcon sx={{ fontSize: 14 }} /> :
                    phase === "processing" ? <HourglassBottomIcon sx={{ fontSize: 14 }} /> :
                    <CheckCircleIcon sx={{ fontSize: 14 }} />
                  }
                  variant="outlined"
                  sx={{ fontWeight: 600, height: 24 }}
                />
              </Stack>
            </Box>

            {/* Fields area */}
            <Box sx={{ flex: 1, px: 2.5, py: 2, overflow: "auto" }}>
              {ocrResult ? (
                <Stack spacing={1.5}>
                  <InfoRow label="MSSV" value={ocrResult.studentCode ?? ""} />
                  <InfoRow label="Họ tên" value={ocrResult.fullName ?? ""} />
                  {ocrResult.className != null && <InfoRow label="Lớp" value={ocrResult.className} />}
                  {ocrResult.dateOfBirth != null && <InfoRow label="Ngày sinh" value={ocrResult.dateOfBirth} />}
                  {ocrResult.course != null && <InfoRow label="Khóa học" value={ocrResult.course} />}
                  {ocrResult.permanentAddress != null && <InfoRow label="HKTT" value={ocrResult.permanentAddress} />}
                  {ocrResult.faculty != null && <InfoRow label="Khoa" value={ocrResult.faculty} />}
                </Stack>
              ) : (
                <Stack spacing={1.5}>
                  {[
                    { label: "MSSV", placeholder: "Đang chờ..." },
                    { label: "Họ tên", placeholder: "Đang chờ..." },
                    { label: "Lớp", placeholder: "—" },
                    { label: "Khóa học", placeholder: "—" },
                    { label: "HKTT", placeholder: "—" },
                  ].map((field) => (
                    <Stack key={field.label} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 72, flexShrink: 0, fontSize: "0.8rem" }}>
                        {field.label}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.disabled", fontStyle: "italic", fontSize: "0.8rem" }}>
                        {field.placeholder}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>

            {/* Error */}
            {error && (
              <Box sx={{ px: 2.5, pb: 1 }}>
                <Alert severity="warning" sx={{ fontSize: "0.8rem" }}>{error}</Alert>
              </Box>
            )}

            {/* Actions */}
            <Box sx={{ px: 2.5, py: 2, borderTop: "1px solid", borderColor: "divider" }}>
              <Stack spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<CameraAltIcon />}
                  onClick={handleManualCapture}
                  disabled={!cameraReady || phase === "processing"}
                  fullWidth
                >
                  Chụp thẻ
                </Button>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadFileIcon />}
                  disabled={phase === "processing"}
                  fullWidth
                >
                  Tải ảnh
                  <input type="file" accept="image/*" onChange={handleFileUpload} hidden />
                </Button>
                {onSkip && (
                  <Button color="inherit" variant="text" onClick={onSkip} fullWidth size="small">
                    Nhập thủ công
                  </Button>
                )}
              </Stack>
            </Box>
          </Box>
        </Box>
      )}
    </Stack>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 72, flexShrink: 0, fontSize: "0.8rem" }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "0.85rem", wordBreak: "break-word" }}>
        {value || "—"}
      </Typography>
    </Stack>
  );
}
