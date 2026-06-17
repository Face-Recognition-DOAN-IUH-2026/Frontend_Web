"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Box, Paper, Typography, Button, Stack, CircularProgress,
  Alert, Divider, Fade, alpha, LinearProgress,
} from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ReplayIcon from "@mui/icons-material/Replay";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
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
}

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

function preprocessImage(imageData: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(imageData);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageDataObj.data;
      for (let i = 0; i < data.length; i += 4) {
        const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
        const val = brightness > 120 ? 255 : 0;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
      ctx.putImageData(imageDataObj, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };
    img.onerror = () => reject(new Error("Không thể đọc ảnh"));
    img.src = imageData;
  });
}

function parseCardText(text: string): Partial<ScannedCardData> {
  const result: Partial<ScannedCardData> = { rawText: text };
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const studentCodeRegex = /(?:MSSV|Mã SV|Mã Số SV|Student Code|Mã số sinh viên|MSV)[:\s]*(\S{4,})/i;
  const fullNameRegex = /(?:Họ[\s]*và[\s]*tên|Full Name|Họ tên|HỌ TÊN|HỌ VÀ TÊN)[:\s]*([A-ZÀ-ỸĂÂĐÊÔƠƯ][A-ZÀ-ỸĂÂĐÊÔƠƯa-zà-ỹăâđêôơưừếệấ]+(?:\s+[A-ZÀ-ỸĂÂĐÊÔƠƯ][A-ZÀ-ỸĂÂĐÊÔƠƯa-zà-ỹăâđêôơưừếệấ]+)+)/i;
  const classNameRegex = /(?:Lớp|Class|LỚP)[:\s]*(\S+)/i;
  const dobRegex = /(?:Ngày sinh|DOB|Birth|Ngày tháng năm sinh|NGÀY SINH|Sinh)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i;
  const courseRegex = /(?:Khóa[\s]*h[oọô]c|Course|Khóa|KHÓA)[:\s]*(.+)/i;
  const addressRegex = /(?:HKTT|Hộ khẩu|Địa chỉ|Address|Hộ khẩu thường trú)[:\s]*(.+)/i;
  const facultyRegex = /(?:Khoa|Faculty|Department|KHOA)[:\s]*(.+)/i;

  for (const line of lines) {
    if (!result.studentCode) {
      const m = line.match(studentCodeRegex);
      if (m) result.studentCode = m[1].replace(/[^A-Za-z0-9]/g, "");
    }
    if (!result.fullName) {
      const m = line.match(fullNameRegex);
      if (m) result.fullName = m[1].trim();
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
    const strictMatch = text.match(/\b(\d{8})\b/);
    if (strictMatch) {
      result.studentCode = strictMatch[1];
    } else {
      const looseMatch = text.match(/\b(\d{7,13})\b/);
      if (looseMatch) result.studentCode = looseMatch[1];
    }
  }

  if (!result.fullName) {
    const candidateLines = lines.filter((line) => {
      const lower = line.toLowerCase();
      if (HEADER_KEYWORDS.some((k) => lower.includes(k))) return false;
      if (/^\d+$/.test(line.trim())) return false;
      if (line.trim().length < 5) return false;
      if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(line.trim())) return false;
      if (line.length < 8) return false;
      return true;
    });

    const nameBySurname = candidateLines.find((l) => {
      const lower = l.toLowerCase().trim();
      return SURNAMES.some(
        (s) => lower.startsWith(s) || lower.startsWith(`${s} `)
      );
    });
    if (nameBySurname) {
      result.fullName = nameBySurname.replace(/^[\d:\s]+/, "").trim();
    }

    if (!result.fullName) {
      const nameByCase = candidateLines.find((l) => {
        const words = l.trim().split(/\s+/);
        if (words.length < 2 || words.length > 6) return false;
        if (!/^[A-ZÀ-ỸĂÂĐÊÔƠƯ]/.test(l.trim())) return false;
        if (/^[A-Z0-9]{4,}$/.test(words[0])) return false;
        return true;
      });
      if (nameByCase) {
        result.fullName = nameByCase.replace(/^[\d:\s]+/, "").trim();
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
      if (allCapsName) result.fullName = allCapsName.trim();
    }
  }

  if (!result.className) {
    const classMatch = text.match(/\b(DH[A-Z]{2,}\d{2,}[A-Z]?)\b/i);
    if (classMatch) result.className = classMatch[1].toUpperCase();
  }

  return result;
}

export default function StudentCardScanner({ onScanned, onError, onSkip }: StudentCardScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [phase, setPhase] = useState<"idle" | "processing" | "confirm">("idle");
  const [ocrResult, setOcrResult] = useState<Partial<ScannedCardData> | null>(null);
  const [error, setError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const workerRef = useRef<Tesseract.Worker | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setOcrProgress(0);
      const worker = await createWorker("vie+eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
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

  const runOcr = useCallback(async (imageData: string): Promise<Partial<ScannedCardData> | null> => {
    if (!workerRef.current) return null;
    try {
      setOcrProgress(0);
      setOcrLoading(true);
      const processed = await preprocessImage(imageData);
      const { data } = await workerRef.current.recognize(processed);
      setOcrLoading(false);
      if (!data?.text) return null;
      return parseCardText(data.text);
    } catch (err: any) {
      setOcrLoading(false);
      onError?.("Lỗi OCR: " + (err.message || ""));
      return null;
    }
  }, [onError]);

  const captureAndOcr = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      setError("Không thể chụp ảnh từ camera");
      return;
    }
    setPhase("processing");
    setError("");
    const parsed = await runOcr(imageSrc);
    if (parsed && parsed.studentCode && parsed.fullName) {
      setOcrResult(parsed);
      setPhase("confirm");
    } else {
      setError("Không thể đọc thông tin từ thẻ. Hãy đảm bảo thẻ rõ nét và đủ ánh sáng.");
      setPhase("idle");
    }
  }, [runOcr]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhase("processing");
    setError("");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      const parsed = await runOcr(dataUrl);
      if (parsed && parsed.studentCode && parsed.fullName) {
        setOcrResult(parsed);
        setPhase("confirm");
      } else {
        setError("Không thể đọc thông tin từ ảnh này");
        setPhase("idle");
      }
    };
    reader.readAsDataURL(file);
  }, [runOcr]);

  const handleConfirm = () => {
    if (ocrResult) {
      onScanned(ocrResult as ScannedCardData);
    }
  };

  const handleRetake = () => {
    setOcrResult(null);
    setError("");
    setPhase("idle");
  };

  const videoConstraints: MediaStreamConstraints["video"] = {
    facingMode: "environment",
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };

  return (
    <Stack spacing={2}>
      {phase === "confirm" && ocrResult ? (
        <Fade in>
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
              <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
                <Button variant="contained" onClick={handleConfirm} fullWidth>
                  Xác nhận
                </Button>
                <Button variant="outlined" startIcon={<ReplayIcon />} onClick={handleRetake} fullWidth>
                  Chụp lại
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Fade>
      ) : (
        <>
          <Paper
            variant="outlined"
            sx={{
              position: "relative",
              overflow: "hidden",
              bgcolor: "black",
              aspectRatio: "4 / 3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.9}
              videoConstraints={videoConstraints}
              onUserMedia={() => setCameraReady(true)}
              onUserMediaError={() => setError("Không thể truy cập camera")}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
            <Box
              sx={{
                position: "absolute",
                inset: "12%",
                border: "2px dashed",
                borderColor: alpha("#fff", 0.5),
                borderRadius: 2,
                pointerEvents: "none",
              }}
            />
            {!cameraReady && (
              <Stack
                sx={{
                  position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.6)",
                  color: "common.white", alignItems: "center", justifyContent: "center",
                }}
                spacing={1}
              >
                <CircularProgress size={28} color="inherit" />
                <Typography variant="body2">Đang kết nối camera...</Typography>
              </Stack>
            )}
            {(phase === "processing" || ocrLoading) && (
              <Stack
                sx={{
                  position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.7)",
                  color: "common.white", alignItems: "center", justifyContent: "center",
                }}
                spacing={1}
              >
                <CircularProgress size={28} color="inherit" />
                <Typography variant="body2">
                  {ocrLoading ? "Đang nhận dạng chữ viết..." : "Đang xử lý ảnh..."}
                </Typography>
                {ocrLoading && (
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
                )}
              </Stack>
            )}
          </Paper>

          {error && <Alert severity="warning">{error}</Alert>}

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<CameraAltIcon />}
              onClick={captureAndOcr}
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
            >
              Tải ảnh
              <input type="file" accept="image/*" onChange={handleFileUpload} hidden />
            </Button>
          </Stack>

          {onSkip && (
            <Button color="inherit" variant="text" onClick={onSkip} fullWidth>
              Bỏ qua quét thẻ
            </Button>
          )}
        </>
      )}
    </Stack>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100, flexShrink: 0 }}>
        {label}:
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value}
      </Typography>
    </Stack>
  );
}
