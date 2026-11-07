"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";

import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import PersonSearchOutlinedIcon from "@mui/icons-material/PersonSearchOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import VolumeOffOutlinedIcon from "@mui/icons-material/VolumeOffOutlined";
import FullscreenOutlinedIcon from "@mui/icons-material/FullscreenOutlined";
import FullscreenExitOutlinedIcon from "@mui/icons-material/FullscreenExitOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import MeetingRoomOutlinedIcon from "@mui/icons-material/MeetingRoomOutlined";
import QrCodeScannerOutlinedIcon from "@mui/icons-material/QrCodeScannerOutlined";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";

import api, { getErrorMessage } from "@/lib/api-client";
import { useTaskSSE } from "@/lib/hooks/useTaskSSE";
import CameraFeed from "@/app/(kiosk)/gate/_components/CameraFeed";
import ChallengeStep from "@/app/(kiosk)/gate/_components/ChallengeStep";
import ResultCard from "@/app/(kiosk)/gate/_components/ResultCard";
import MuiStatCard from "@/app/(dashboard)/_components/ui/MuiStatCard";
import { useColorMode } from "@/lib/mui-theme";
import { fadeInUp, slideInRight, successPop } from "@/lib/animations";
import type { AccessLogPublic, CameraEvent, KioskResult, PatronLookupResult } from "@/lib/types";

interface TodayCounts {
  entries: number;
  exits: number;
  no_match: number;
  spoof: number;
}

type Step = "idle" | "verify" | "challenge" | "result";

const ENTRY_CAM: string = process.env.NEXT_PUBLIC_ENTRY_CAM || "http://192.168.1.102:8080/video";
const EXIT_CAM: string = process.env.NEXT_PUBLIC_EXIT_CAM || "http://192.168.1.102:8080/video";
const ENTRY_CAM_ID = process.env.NEXT_PUBLIC_ENTRY_CAM_ID || "entry_gate";
const EXIT_CAM_ID = process.env.NEXT_PUBLIC_EXIT_CAM_ID || "exit_gate";
const HISTORY_LIMIT = 10;
const LIBRARY_CAPACITY = 200;

function formatGateTime(value?: string) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatConfidence(value?: number | null) {
  if (typeof value !== "number") return null;
  return `${Math.round(value * 100)}%`;
}

function buildLogFromEvent(event: CameraEvent): AccessLogPublic {
  return {
    id: `${event.camera_id}-${event.patron_id || event.student_code || "unknown"}-${Date.now()}`,
    patron_id: event.patron_id || null,
    patron_name: event.full_name || null,
    student_code: event.student_code || null,
    access_type: event.access_type === "exit" ? "exit" : "entry",
    verify_method: "face",
    confidence: event.score ?? null,
    camera_id: event.camera_id,
    access_time: new Date().toISOString(),
    status: event.status,
  };
}

function playGateSound(type: "granted" | "denied", isMuted = false) {
  if (isMuted) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "granted") {
      // Pleasant double ding (880Hz -> 1320Hz)
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else {
      // Gentle warning beep (300Hz -> 180Hz)
      osc.type = "triangle";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // AudioContext autoplay blocked or unsupported
  }
}

function resultStatus(result: KioskResult | null) {
  if (!result) return "processing";
  if (result.success) return "success";
  if (result.message?.toLowerCase().includes("đăng ký tại quầy")) return "unregistered";
  return "error";
}

export default function GatePage() {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { mode, toggleMode } = useColorMode();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const overlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { state: sseState, start: startSSE, reset: resetSSE } = useTaskSSE(120000);

  const [step, setStep] = useState<Step>("idle");
  const [mssv, setMssv] = useState("");
  const [mssvInput, setMssvInput] = useState("");
  const [lookup, setLookup] = useState<PatronLookupResult | null>(null);
  const [result, setResult] = useState<KioskResult | null>(null);
  const [approvalEventCode, setApprovalEventCode] = useState<string | null>(null);
  const [approvalTimer, setApprovalTimer] = useState(300);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  const [recentLogs, setRecentLogs] = useState<AccessLogPublic[]>([]);
  const [entryOverlay, setEntryOverlay] = useState<{ bbox?: [number, number, number, number]; landmarks?: [number, number][]; status?: string } | null>(null);
  const [exitOverlay, setExitOverlay] = useState<{ bbox?: [number, number, number, number]; landmarks?: [number, number][]; status?: string } | null>(null);
  const [todayCounts, setTodayCounts] = useState<TodayCounts>({ entries: 0, exits: 0, no_match: 0, spoof: 0 });
  const [activePatrons, setActivePatrons] = useState<number>(0);
  const [isSseConnected, setIsSseConnected] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [historyTab, setHistoryTab] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>("");

  const [lastScanEvent, setLastScanEvent] = useState<{
    status: "granted" | "denied" | "spoof" | "no_match";
    type: "entry" | "exit";
    name?: string;
    studentCode?: string;
    confidence?: number | null;
    message?: string;
    timestamp: number;
  } | null>(null);

  const [useExitWebcam, setUseExitWebcam] = useState(true);
  const [useEntryWebcam, setUseEntryWebcam] = useState(true);

  const occupancyPct = Math.min(100, Math.round((activePatrons / LIBRARY_CAPACITY) * 100));
  const remainingSeats = Math.max(0, LIBRARY_CAPACITY - activePatrons);
  const isRecentScanActive = !!(lastScanEvent && Date.now() - lastScanEvent.timestamp < 6000);

  // Live system clock in footer
  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date().toLocaleTimeString("vi-VN"));
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const cached = window.localStorage.getItem("gate_today_counts");
    if (!cached) return;
    try {
      setTodayCounts(JSON.parse(cached) as TodayCounts);
    } catch {
      setTodayCounts({ entries: 0, exits: 0, no_match: 0, spoof: 0 });
    }
  }, []);

  const [toast, setToast] = useState<{ severity: "success" | "warning" | "error" | "info"; msg: string } | null>(null);

  const showToast = useCallback((severity: "success" | "warning" | "error" | "info", msg: string) => {
    setToast({ severity, msg });
  }, []);

  const addRecentLog = useCallback((log: AccessLogPublic) => {
    setRecentLogs((prev) => [log, ...prev].slice(0, HISTORY_LIMIT * 2));
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    return () => resetSSE();
  }, [resetSSE]);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      showToast("error", "Không thể mở camera.");
    }
  }, [showToast]);

  // Handle SSE result for kiosk face verification
  useEffect(() => {
    if (sseState.status === "SUCCESS") {
      const taskResult = sseState.result;
      const success = taskResult?.status === "success";
      const confidence = (taskResult as any)?.score ?? (taskResult as any)?.confidence;
      if (!success) {
        api.createKioskApprovalRequest({
          device_id: "kiosk-1",
          patron_id: lookup?.patron?.id || "",
          student_code: mssv,
        }).then((approval) => setApprovalEventCode(approval.event_code)).catch(() => {});
      }
      setResult({
        success: !!success,
        message: success
          ? `Xác thực thành công - ${(taskResult as any)?.access_type === "exit" ? "Ra" : "Vào"} thư viện`
          : "Xác thực khuôn mặt không thành công.",
        patron: lookup?.patron || null,
        job_id: null,
        confidence,
      });
      setStep("result");
      setLoading(false);
      setStatusText("");
      if (success) {
        playGateSound("granted", isMuted);
        if (lookup?.patron?.id && (taskResult as any)?.access_type !== "exit") {
          api.confirmEntry(lookup.patron.id).catch(() => {});
        }
      } else {
        playGateSound("denied", isMuted);
      }
    } else if (sseState.status === "FAILURE" || sseState.status === "ERROR" || sseState.status === "TIMEOUT") {
      const message = sseState.error || "Xác thực thất bại.";
      setResult({ success: false, message, patron: null, job_id: null });
      setStep("result");
      setLoading(false);
      setStatusText("");
      playGateSound("denied", isMuted);
      showToast("error", message);
      if (lookup?.patron?.id) {
        api.revertPending(lookup.patron.id).catch(() => {});
      }
    } else if (sseState.status === "WAITING") {
      setStatusText("Đang xử lý...");
    }
  }, [sseState.status, sseState.result, sseState.error, lookup, mssv, showToast, isMuted]);

  const captureImage = useCallback((): Promise<File> => (
    new Promise((resolve, reject) => {
      const video = videoRef.current;
      if (!video || !video.videoWidth) {
        reject(new Error("Camera chưa sẵn sàng"));
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Không thể tạo canvas"));
        return;
      }
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Không thể tạo ảnh"));
          return;
        }
        resolve(new File([blob], "face_capture.jpg", { type: "image/jpeg" }));
      }, "image/jpeg", 0.9);
    })
  ), []);

  const handleLookup = async (inputMssv: string) => {
    const normalized = inputMssv.trim();
    if (!normalized) return;
    setMssv(normalized);
    setLoading(true);
    setStatusText("Đang tra cứu độc giả...");
    try {
      const response = await api.kioskLookup(normalized);
      setLookup(response);
      if (response.exists && response.has_face && !response.is_expired && response.patron) {
        api.kioskPresence(response.patron.id, normalized, "kiosk-1").catch(() => {});
        setStep("verify");
        setStatusText("Mở camera...");
        await startCamera();
      } else if (response.exists && !response.has_face) {
        setStep("result");
        setResult({
          success: false,
          message: "Tài khoản chưa được đăng ký khuôn mặt. Vui lòng đăng ký tại quầy thủ thư.",
          patron: response.patron,
          job_id: null,
        });
      } else if (response.exists && response.is_expired) {
        setStep("result");
        setResult({ success: false, message: "Thẻ hội viên đã hết hạn hoặc bị khóa.", patron: response.patron, job_id: null });
      } else {
        setStep("result");
        setResult({ success: false, message: "Không tìm thấy mã số này. Vui lòng đăng ký tại quầy.", patron: null, job_id: null });
      }
    } catch (err: any) {
      setStep("result");
      setResult({ success: false, message: getErrorMessage(err) || "Tra cứu thất bại.", patron: null, job_id: null });
    } finally {
      setLoading(false);
      setStatusText("");
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setStatusText("Đang chụp ảnh...");
    try {
      const imageFile = await captureImage();
      stopCamera();
      setStatusText("Đang đối chiếu khuôn mặt AI...");
      const response = await api.kioskEnter(imageFile, mssv);
      if (response.job_id) {
        startSSE(response.job_id);
      } else {
        setResult(response);
        setStep("result");
        setLoading(false);
        setStatusText("");
      }
    } catch (err: any) {
      const message = getErrorMessage(err) || "Xác thực thất bại.";
      setResult({ success: false, message, patron: null, job_id: null });
      setStep("result");
      setLoading(false);
      setStatusText("");
      showToast("error", message);
    }
  };

  const handleChallengeLive = useCallback(() => {
    stopCamera();
    setResult({
      success: true,
      message: "Xác thực thành công (qua kiểm tra sống liveness) - Vào thư viện",
      patron: lookup?.patron || null,
      job_id: null,
    });
    setStep("result");
    setLoading(false);
    setStatusText("");
    playGateSound("granted", isMuted);
    if (lookup?.patron?.id) {
      api.confirmEntry(lookup.patron.id).catch(() => {});
    }
  }, [lookup, stopCamera, isMuted]);

  const handleChallengeSpoof = useCallback((detail: string) => {
    stopCamera();
    playGateSound("denied", isMuted);
    if (lookup?.patron?.id) {
      api.createKioskApprovalRequest({
        device_id: "kiosk-1",
        patron_id: lookup.patron.id,
        student_code: mssv,
      }).then((approval) => setApprovalEventCode(approval.event_code)).catch(() => {});
    }
    setTodayCounts((prev) => ({ ...prev, spoof: prev.spoof + 1 }));
    setResult({
      success: false,
      message: `Phát hiện khuôn mặt giả (${detail}). Vui lòng chờ nhân viên hỗ trợ.`,
      patron: lookup?.patron || null,
      job_id: null,
    });
    setStep("result");
    setLoading(false);
    setStatusText("");
    showToast("error", "Phát hiện khuôn mặt giả mạo.");
  }, [lookup, mssv, stopCamera, showToast, isMuted]);

  const handleChallengeDisabled = useCallback(() => {
    stopCamera();
    setResult({
      success: true,
      message: "Xác thực thành công - Vào thư viện",
      patron: lookup?.patron || null,
      job_id: null,
    });
    setStep("result");
    setLoading(false);
    setStatusText("");
    playGateSound("granted", isMuted);
    if (lookup?.patron?.id) {
      api.confirmEntry(lookup.patron.id).catch(() => {});
    }
  }, [lookup, stopCamera, isMuted]);

  useEffect(() => {
    if (!approvalEventCode) return;
    if (approvalTimer <= 0) return;
    const t = setInterval(() => setApprovalTimer((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [approvalEventCode, approvalTimer]);

  const reset = useCallback(() => {
    setStep("idle");
    setMssv("");
    setMssvInput("");
    setLookup(null);
    setResult(null);
    setApprovalEventCode(null);
    setApprovalTimer(300);
    stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    if (step === "result" && result?.success) {
      const timer = setTimeout(() => {
        reset();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [step, result?.success, reset]);

  const loadData = useCallback(() => {
    api.getStats().then((stats) => {
      if (!stats) return;
      const fresh: TodayCounts = {
        entries: stats.today_entries ?? 0,
        exits: stats.today_exits ?? 0,
        no_match: (stats as { today_no_match?: number }).today_no_match ?? 0,
        spoof: (stats as { today_spoof?: number }).today_spoof ?? 0,
      };
      setTodayCounts(fresh);
      setActivePatrons(stats.active_patrons ?? Math.max(0, (stats.today_entries ?? 0) - (stats.today_exits ?? 0)));
      localStorage.setItem("gate_today_counts", JSON.stringify(fresh));
    }).catch(() => {});

    if (typeof api.getAccessStats === "function") {
      api.getAccessStats().then((a) => {
        setTodayCounts((prev) => ({ ...prev, spoof: a.today_spoof, no_match: a.today_no_match }));
      }).catch(() => {});
    }

    api.getRecentLogs()
      .then((response) => setRecentLogs(response.items.slice(0, HISTORY_LIMIT * 2)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    localStorage.setItem("gate_today_counts", JSON.stringify(todayCounts));
  }, [todayCounts]);

  const recentEventTimestamps = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    setIsSseConnected(true);
    const cleanup = api.connectAccessSSE((event: CameraEvent) => {
      if (event.bbox || event.landmarks) {
        const overlay = { bbox: event.bbox, landmarks: event.landmarks };
        if (event.camera_id === ENTRY_CAM_ID) {
          setEntryOverlay({ ...overlay, status: event.status });
        } else if (event.camera_id === EXIT_CAM_ID) {
          setExitOverlay({ ...overlay, status: event.status });
        }
        if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
        overlayTimeoutRef.current = setTimeout(() => {
          setEntryOverlay(null);
          setExitOverlay(null);
        }, 2000);
      }

      if (event.status === "granted") {
        const type = event.access_type === "entry" ? "entry" : "exit";
        const key = `${event.patron_id || event.student_code || event.full_name || "unknown"}-${type}`;
        const now = Date.now();
        const lastTime = recentEventTimestamps.current.get(key) || 0;
        if (now - lastTime < 5000) {
          return;
        }
        recentEventTimestamps.current.set(key, now);

        playGateSound("granted", isMuted);
        addRecentLog(buildLogFromEvent(event));
        showToast(
          type === "entry" ? "success" : "info",
          `${event.full_name || "Độc giả"} - ${type === "entry" ? "Vào" : "Ra"} thư viện`,
        );
        setTodayCounts((prev) => ({
          ...prev,
          [type === "entry" ? "entries" : "exits"]: prev[type === "entry" ? "entries" : "exits"] + 1,
        }));
        setActivePatrons((prev) => (type === "entry" ? prev + 1 : Math.max(0, prev - 1)));
        setLastScanEvent({
          status: "granted",
          type,
          name: event.full_name || undefined,
          studentCode: event.student_code || undefined,
          confidence: event.score ?? null,
          timestamp: Date.now(),
        });
      } else if (event.status === "wrong_direction") {
        playGateSound("denied", isMuted);
        const dirMsg = event.access_type === "exit"
          ? "Chưa quét vào cổng nên không thể ra!"
          : "Bạn đang ở trong thư viện!";
        showToast("warning", `${event.full_name || "Độc giả"}: ${dirMsg}`);
        setLastScanEvent({
          status: "denied",
          type: event.access_type === "exit" ? "exit" : "entry",
          name: event.full_name || undefined,
          studentCode: event.student_code || undefined,
          confidence: event.score ?? null,
          message: dirMsg,
          timestamp: Date.now(),
        });
      } else if (event.status === "expired") {
        playGateSound("denied", isMuted);
        showToast("error", `${event.full_name || "Độc giả"}: Thẻ hội viên đã hết hạn hoặc bị khóa!`);
        setLastScanEvent({
          status: "denied",
          type: event.access_type === "exit" ? "exit" : "entry",
          name: event.full_name || undefined,
          studentCode: event.student_code || undefined,
          confidence: event.score ?? null,
          message: "THẺ HỘI VIÊN ĐÃ HẾT HẠN HOẶC BỊ KHÓA!",
          timestamp: Date.now(),
        });
      } else if (event.status === "no_match") {
        setTodayCounts((prev) => ({ ...prev, no_match: prev.no_match + 1 }));
        showToast("info", "Khuôn mặt mới - không nhận diện được.");
        setLastScanEvent({
          status: "no_match",
          type: event.access_type === "exit" ? "exit" : "entry",
          confidence: event.score ?? null,
          timestamp: Date.now(),
        });
      } else if (event.status === "spoof") {
        playGateSound("denied", isMuted);
        setTodayCounts((prev) => ({ ...prev, spoof: prev.spoof + 1 }));
        showToast("error", "Phát hiện giả mạo khuôn mặt!");
        setLastScanEvent({
          status: "spoof",
          type: event.access_type === "exit" ? "exit" : "entry",
          confidence: event.score ?? null,
          timestamp: Date.now(),
        });
      }
    });

    return () => {
      setIsSseConnected(false);
      cleanup();
    };
  }, [addRecentLog, showToast, isMuted]);

  const entryLogs = recentLogs.filter((log) => log.access_type === "entry").slice(0, HISTORY_LIMIT);
  const exitLogs = recentLogs.filter((log) => log.access_type === "exit").slice(0, HISTORY_LIMIT);
  const currentResultStatus = resultStatus(result);

  const getCapacityStatus = () => {
    if (occupancyPct >= 90) return { label: "Sắp đầy chỗ", color: "error" as const, bg: "#ef4444" };
    if (occupancyPct >= 70) return { label: "Đông đúc", color: "warning" as const, bg: "#f59e0b" };
    return { label: "Thông thoáng", color: "success" as const, bg: "#10b981" };
  };

  const capStatus = getCapacityStatus();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary", pb: 5 }}>
      <Box sx={{ maxWidth: 1600, mx: "auto", p: { xs: 1.5, sm: 2.5, md: 3 } }}>
        {/* Top Header Banner với IUH Signature Brand */}
        <Box sx={{ mb: 2.5 }}>
          <Box
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              background: "linear-gradient(135deg, #0A2540 0%, #0F3C5C 50%, #0A2540 100%)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
              position: "relative",
              overflow: "hidden",
              border: "1px solid rgba(212, 175, 55, 0.35)",
              boxShadow: "0 10px 30px -5px rgba(10, 37, 64, 0.4)",
            }}
          >
            {/* Subtle Geometric Background Rings */}
            <Box
              sx={{
                position: "absolute",
                top: -50,
                right: -50,
                width: 220,
                height: 220,
                borderRadius: "50%",
                bgcolor: "rgba(212, 175, 55, 0.05)",
                pointerEvents: "none",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: -80,
                left: 240,
                width: 260,
                height: 260,
                borderRadius: "50%",
                bgcolor: "rgba(255, 255, 255, 0.03)",
                pointerEvents: "none",
              }}
            />

            {/* Left: Nút quay lại + Logo IUH + Tên Cổng + Badge SSE Live */}
            <Stack direction="row" spacing={2} sx={{ zIndex: 1, alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
              <Tooltip title="Quay lại Dashboard quản trị">
                <IconButton
                  onClick={() => router.push("/dashboard")}
                  size="small"
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.12)",
                    color: "white",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.25)" },
                  }}
                >
                  <ArrowBackOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Box
                component="img"
                src="/logo.png"
                alt="IUH Logo"
                sx={{
                  height: 46,
                  bgcolor: "white",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                }}
              />

              <Box>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: "#FFFFFF", letterSpacing: 0.5 }}>
                    CỔNG KIỂM SOÁT THƯ VIỆN THÔNG MINH
                  </Typography>

                  {/* Real-time SSE Live Pill */}
                  <Chip
                    size="small"
                    icon={
                      <RadioButtonCheckedIcon
                        sx={{
                          fontSize: "14px !important",
                          color: isSseConnected ? "#34d399 !important" : "#fbbf24 !important",
                          animation: isSseConnected ? "pulse 2s infinite" : "none",
                        }}
                      />
                    }
                    label={isSseConnected ? "LIVE REAL-TIME" : "ĐANG KẾT NỐI..."}
                    sx={{
                      bgcolor: isSseConnected ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                      color: isSseConnected ? "#a7f3d0" : "#fef3c7",
                      border: "1px solid",
                      borderColor: isSseConnected ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.4)",
                      fontWeight: 800,
                      fontSize: "0.7rem",
                      letterSpacing: 0.5,
                    }}
                  />
                </Stack>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", mt: 0.25, fontWeight: 500 }}>
                  Nhận diện khuôn mặt AI tự động · Đối chiếu Geofence & Liveness Passive
                </Typography>
              </Box>
            </Stack>

            {/* Right: Thanh công cụ Kiosk (Âm thanh, Fullscreen, Theme, Tải lại) */}
            <Stack direction="row" spacing={1} sx={{ zIndex: 1, alignItems: "center" }}>
              <Tooltip title={isMuted ? "Bật âm thanh chuông cửa" : "Tắt âm thanh"}>
                <IconButton
                  onClick={() => setIsMuted(!isMuted)}
                  size="small"
                  sx={{
                    color: isMuted ? "#fca5a5" : "#a5b4fc",
                    bgcolor: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.18)" },
                  }}
                >
                  {isMuted ? <VolumeOffOutlinedIcon fontSize="small" /> : <VolumeUpOutlinedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>

              <Tooltip title={isFullscreen ? "Thoát toàn màn hình" : "Chế độ Kiosk Toàn màn hình (F11)"}>
                <IconButton
                  onClick={toggleFullscreen}
                  size="small"
                  sx={{
                    color: "#a5b4fc",
                    bgcolor: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.18)" },
                  }}
                >
                  {isFullscreen ? <FullscreenExitOutlinedIcon fontSize="small" /> : <FullscreenOutlinedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>

              <Tooltip title="Tải lại số liệu">
                <IconButton
                  onClick={loadData}
                  size="small"
                  sx={{
                    color: "#a5b4fc",
                    bgcolor: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.18)" },
                  }}
                >
                  <RefreshOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title={mode === "dark" ? "Chuyển sang Giao diện Sáng" : "Chuyển sang Giao diện Tối"}>
                <IconButton
                  onClick={toggleMode}
                  size="small"
                  sx={{
                    color: "#fde047",
                    bgcolor: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.18)" },
                  }}
                >
                  {mode === "dark" ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        </Box>

        {/* Thanh Gauge Sức Chứa Phòng Đọc (Capacity Bar) */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2.5,
            borderRadius: 2.5,
            bgcolor: "background.paper",
            borderColor: "divider",
            boxShadow: (t) =>
              t.palette.mode === "dark"
                ? "0 4px 20px rgba(0, 0, 0, 0.25)"
                : "0 2px 10px rgba(0, 0, 0, 0.03)",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", mb: 1.25 }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2,
                  bgcolor: alpha(capStatus.bg, 0.12),
                  color: capStatus.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MeetingRoomOutlinedIcon sx={{ fontSize: 22 }} />
              </Box>
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    Sức chứa phòng đọc tự do
                  </Typography>
                  <Chip
                    size="small"
                    label={capStatus.label}
                    color={capStatus.color}
                    sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Tự động cập nhật theo lượt vào/ra thực tế qua cổng kiểm soát
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                <Typography variant="h6" sx={{ fontWeight: 850, lineHeight: 1.1 }}>
                  {activePatrons} / {LIBRARY_CAPACITY} người
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Đạt {occupancyPct}% sức chứa
                </Typography>
              </Box>
              <Chip
                variant="outlined"
                label={`${remainingSeats} chỗ trống`}
                sx={{
                  fontWeight: 800,
                  fontSize: "0.78rem",
                  borderColor: capStatus.bg,
                  color: capStatus.bg,
                  bgcolor: alpha(capStatus.bg, 0.08),
                }}
              />
            </Stack>
          </Stack>

          {/* Visual Progress Bar */}
          <LinearProgress
            variant="determinate"
            value={occupancyPct}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
              "& .MuiLinearProgress-bar": {
                borderRadius: 5,
                bgcolor: capStatus.bg,
                transition: "transform 0.4s ease",
              },
            }}
          />
        </Paper>

        {/* 4 Thẻ KPI Giám Sát Thời Gian Thực (Standard MuiStatCard) */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2, mb: 2.5 }}>
          <MuiStatCard
            label="Đang trong phòng đọc"
            value={activePatrons}
            icon={GroupsOutlinedIcon}
            gradient="linear-gradient(135deg, #0A2540 0%, #0F3C5C 100%)"
            pct={occupancyPct}
            delta={`${occupancyPct}% sức chứa`}
            deltaColor="default"
            index={0}
          />
          <MuiStatCard
            label="Lượt vào hôm nay"
            value={todayCounts.entries}
            icon={LoginOutlinedIcon}
            gradient="linear-gradient(135deg, #059669 0%, #047857 100%)"
            delta="+ Cổng vào chính"
            deltaColor="success"
            index={1}
          />
          <MuiStatCard
            label="Lượt ra hôm nay"
            value={todayCounts.exits}
            icon={LogoutOutlinedIcon}
            gradient="linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)"
            delta="- Cổng ra thư viện"
            deltaColor="default"
            index={2}
          />
          <MuiStatCard
            label="Cảnh báo / Bất thường"
            value={todayCounts.spoof + todayCounts.no_match}
            icon={ShieldOutlinedIcon}
            gradient="linear-gradient(135deg, #DC2626 0%, #991B1B 100%)"
            delta={`${todayCounts.spoof} giả mạo · ${todayCounts.no_match} chưa khớp`}
            deltaColor={todayCounts.spoof > 0 ? "error" : "default"}
            index={3}
          />
        </Box>

        {/* Khung Chính: 2 Luồng Camera (Trái) + Trung Tâm Xử Lý Kiosk (Phải) */}
        <Grid container spacing={2.5}>
          {/* Cột Trái (8/12): 2 Luồng Camera Cổng Vào & Cổng Ra */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }} sx={{ animation: `${fadeInUp} 0.4s ease-out`, animationFillMode: "both" }}>
                <CameraFeed
                  src={ENTRY_CAM}
                  cameraId={ENTRY_CAM_ID}
                  label="Cổng vào chính"
                  useWebcam={useEntryWebcam}
                  onToggleWebcam={() => setUseEntryWebcam((p) => !p)}
                  overlay={entryOverlay}
                  onSpoofDetected={(reason) => {
                    setLastScanEvent({
                      status: "spoof",
                      type: "entry",
                      message: reason || "CẢNH BÁO GIẢ MẠO: Phát hiện ảnh phẳng!",
                      timestamp: Date.now(),
                    });
                    setTodayCounts((prev) => ({ ...prev, spoof: prev.spoof + 1 }));
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }} sx={{ animation: `${fadeInUp} 0.4s ease-out`, animationDelay: "0.1s", animationFillMode: "both" }}>
                <CameraFeed
                  src={EXIT_CAM}
                  cameraId={EXIT_CAM_ID}
                  label="Cổng ra thư viện"
                  useWebcam={useExitWebcam}
                  onToggleWebcam={() => setUseExitWebcam((p) => !p)}
                  overlay={exitOverlay}
                  onSpoofDetected={(reason) => {
                    setLastScanEvent({
                      status: "spoof",
                      type: "exit",
                      message: reason || "CẢNH BÁO GIẢ MẠO: Phát hiện ảnh phẳng!",
                      timestamp: Date.now(),
                    });
                    setTodayCounts((prev) => ({ ...prev, spoof: prev.spoof + 1 }));
                  }}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Cột Phải (4/12): Bảng Điều Khiển Kiosk & Kết Quả Xác Thực */}
          <Grid size={{ xs: 12, lg: 4 }} sx={{ animation: `${fadeInUp} 0.45s ease-out`, animationDelay: "0.2s", animationFillMode: "both" }}>
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 2, sm: 2.5 },
                height: "100%",
                borderRadius: 3,
                bgcolor: "background.paper",
                borderColor: "divider",
                boxShadow: (t) =>
                  t.palette.mode === "dark"
                    ? "0 4px 20px rgba(0, 0, 0, 0.25)"
                    : "0 2px 10px rgba(0, 0, 0, 0.03)",
              }}
            >
              {/* Kết quả nhận diện AI tự động vừa diễn ra trong 6 giây */}
              {isRecentScanActive && step === "idle" && lastScanEvent && (
                <Box sx={{ mb: 2.5, animation: `${fadeInUp} 0.35s ease-out` }}>
                  <ResultCard
                    status={
                      lastScanEvent.status === "granted"
                        ? "success"
                        : lastScanEvent.status === "no_match"
                        ? "unregistered"
                        : "error"
                    }
                    accessType={lastScanEvent.type}
                    confidence={lastScanEvent.confidence}
                    message={
                      lastScanEvent.message || (
                        lastScanEvent.status === "granted"
                          ? (lastScanEvent.type === "entry" ? "XIN MỜI VÀO THƯ VIỆN" : "XIN MỜI RA — HẸN GẶP LẠI")
                          : lastScanEvent.status === "spoof"
                          ? "CẢNH BÁO GIẢ MẠO HÌNH ẢNH!"
                          : "KHUÔN MẶT CHƯA ĐĂNG KÝ TRONG HỆ THỐNG"
                      )
                    }
                    patronInfo={
                      lastScanEvent.name
                        ? {
                            fullName: lastScanEvent.name,
                            mssv: lastScanEvent.studentCode || "",
                            faculty: lastScanEvent.confidence ? `Độ tin cậy AI: ${Math.round(lastScanEvent.confidence * 100)}%` : "",
                          }
                        : undefined
                    }
                  />
                  <Divider sx={{ my: 2 }} />
                </Box>
              )}

              {/* Trạng thái IDLE: Quét tự động & Ô nhập thủ công */}
              {step === "idle" && (
                <Stack spacing={2.5} sx={{ textAlign: "center" }}>
                  {!isRecentScanActive && (
                    <Box sx={{ py: 1 }}>
                      <Box
                        sx={{
                          width: 68,
                          height: 68,
                          mx: "auto",
                          mb: 1.5,
                          borderRadius: "50%",
                          bgcolor: "rgba(10, 37, 64, 0.08)",
                          color: "primary.main",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "2px dashed",
                          borderColor: "primary.main",
                        }}
                      >
                        <PersonSearchOutlinedIcon sx={{ fontSize: 36 }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 850 }}>
                        Nhận diện khuôn mặt AI tự động
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280, mx: "auto", mt: 0.5 }}>
                        Vui lòng đứng thẳng trước camera cổng vào hoặc cổng ra để hệ thống mở cửa.
                      </Typography>
                    </Box>
                  )}

                  {/* Khối Nhập Thủ Công / Quét Thẻ Mã Vạch */}
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"),
                      border: "1px dashed",
                      borderColor: "divider",
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "center", mb: 1.5 }}>
                      <QrCodeScannerOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                      <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Không nhận diện được? Nhập MSSV / Quét thẻ
                      </Typography>
                    </Stack>

                    <TextField
                      value={mssvInput}
                      onChange={(e) => setMssvInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleLookup(mssvInput);
                      }}
                      disabled={loading}
                      placeholder="Nhập MSSV (VD: 20012345)..."
                      fullWidth
                      autoComplete="off"
                      slotProps={{
                        input: {
                          endAdornment: mssvInput ? (
                            <InputAdornment position="end">
                              <IconButton size="small" onClick={() => setMssvInput("")} edge="end">
                                <ClearOutlinedIcon fontSize="small" />
                              </IconButton>
                            </InputAdornment>
                          ) : null,
                        },
                        htmlInput: {
                          style: {
                            textAlign: "center",
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 18,
                            fontWeight: 700,
                            letterSpacing: 1.5,
                            padding: "10px 14px",
                          },
                        },
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          bgcolor: "background.paper",
                          minHeight: 48,
                          "&:hover fieldset": { borderColor: "primary.main" },
                        },
                      }}
                    />

                    <Button
                      variant="contained"
                      onClick={() => handleLookup(mssvInput)}
                      disabled={loading || !mssvInput.trim()}
                      fullWidth
                      sx={{
                        mt: 1.5,
                        minHeight: 46,
                        fontSize: "0.95rem",
                        background: "linear-gradient(135deg, #8B0000 0%, #700000 100%)",
                        borderRadius: 2,
                        fontWeight: 700,
                        textTransform: "none",
                        boxShadow: "0 4px 14px rgba(139,0,0,0.3)",
                        "&:hover": {
                          background: "linear-gradient(135deg, #700000 0%, #500000 100%)",
                        },
                      }}
                    >
                      Xác thực thủ công
                    </Button>
                  </Box>

                  {loading && (
                    <Stack spacing={1} sx={{ alignItems: "center", py: 1 }}>
                      <CircularProgress size={24} sx={{ color: "primary.main" }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {statusText || "Đang xử lý..."}
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              )}

              {/* Trạng thái VERIFY / CHALLENGE: Camera xác thực thủ công */}
              {(step === "verify" || step === "challenge") && (
                <Stack spacing={2}>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h6" sx={{ fontWeight: 850 }}>
                      Xác thực khuôn mặt
                    </Typography>
                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
                      {lookup?.patron?.full_name} ({mssv})
                    </Typography>
                  </Box>

                  <Paper
                    variant="outlined"
                    sx={{
                      position: "relative",
                      overflow: "hidden",
                      aspectRatio: "4 / 3",
                      bgcolor: "#070B14",
                      borderRadius: 3,
                    }}
                  >
                    <Box
                      component="video"
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />

                    {/* Biometric Oval Reticle with Corner Brackets */}
                    <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
                      <Box
                        sx={{
                          width: { xs: 150, sm: 180 },
                          height: { xs: 200, sm: 240 },
                          borderRadius: "48%",
                          border: "2px solid rgba(16, 185, 129, 0.8)",
                          boxShadow: "0 0 20px rgba(16, 185, 129, 0.4), inset 0 0 20px rgba(16, 185, 129, 0.2)",
                        }}
                      />
                    </Box>

                    {loading && (
                      <Stack
                        sx={{
                          position: "absolute",
                          inset: 0,
                          bgcolor: "rgba(7, 11, 20, 0.75)",
                          backdropFilter: "blur(6px)",
                          color: "common.white",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        spacing={1.5}
                      >
                        <CircularProgress size={44} sx={{ color: "#10b981" }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {statusText}
                        </Typography>
                      </Stack>
                    )}
                  </Paper>

                  {step === "verify" ? (
                    <Stack spacing={1.25}>
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={<CheckCircleOutlineOutlinedIcon />}
                        onClick={handleVerify}
                        disabled={loading}
                        fullWidth
                        sx={{
                          minHeight: 46,
                          fontSize: "0.95rem",
                          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          borderRadius: 2,
                          fontWeight: 700,
                          textTransform: "none",
                          "&:hover": {
                            background: "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
                          },
                        }}
                      >
                        Xác thực khuôn mặt
                      </Button>
                      <Button onClick={reset} disabled={loading} fullWidth sx={{ minHeight: 40, borderRadius: 2 }}>
                        Hủy bỏ
                      </Button>
                    </Stack>
                  ) : (
                    <ChallengeStep
                      studentCode={mssv}
                      patronId={lookup?.patron?.id ?? null}
                      captureFrame={captureImage}
                      onLive={handleChallengeLive}
                      onSpoof={handleChallengeSpoof}
                      onDisabled={handleChallengeDisabled}
                      onCancel={reset}
                    />
                  )}
                </Stack>
              )}

              {/* Trạng thái RESULT: Kết quả tra cứu thủ công */}
              {step === "result" && !approvalEventCode && (
                <Stack spacing={2.5} sx={{ textAlign: "center" }}>
                  <Avatar
                    sx={{
                      mx: "auto",
                      width: 68,
                      height: 68,
                      bgcolor: currentResultStatus === "success" ? "success.main" : currentResultStatus === "unregistered" ? "warning.main" : "error.main",
                      color: currentResultStatus === "success" ? "success.contrastText" : currentResultStatus === "unregistered" ? "warning.contrastText" : "error.contrastText",
                      animation: `${successPop} 0.45s ease-out`,
                    }}
                  >
                    {currentResultStatus === "success" ? (
                      <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 38 }} />
                    ) : (
                      <ErrorOutlineOutlinedIcon sx={{ fontSize: 38 }} />
                    )}
                  </Avatar>

                  {result?.patron && (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 850 }}>
                        {result.patron.full_name}
                      </Typography>
                      <Typography color="primary.main" sx={{ fontFamily: "monospace", fontWeight: 800 }}>
                        {result.patron.student_code || result.patron.id}
                      </Typography>
                    </Box>
                  )}

                  {result?.message && (
                    <Alert severity={currentResultStatus === "success" ? "success" : currentResultStatus === "unregistered" ? "warning" : "error"} sx={{ borderRadius: 2 }}>
                      {result.message}
                    </Alert>
                  )}

                  {result?.confidence != null && (
                    <Stack spacing={0.75}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.round(result.confidence * 100)}
                        color={currentResultStatus === "success" ? "success" : "warning"}
                        sx={{ height: 8, borderRadius: 99 }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Độ tin cậy AI: {Math.round(result.confidence * 100)}%
                      </Typography>
                    </Stack>
                  )}

                  <Button
                    variant="contained"
                    startIcon={<RestartAltOutlinedIcon />}
                    onClick={reset}
                    fullWidth
                    sx={{
                      minHeight: 46,
                      fontSize: "0.95rem",
                      background: "linear-gradient(135deg, #8B0000 0%, #700000 100%)",
                      borderRadius: 2,
                      fontWeight: 700,
                      textTransform: "none",
                      boxShadow: "0 4px 14px rgba(139,0,0,0.3)",
                      "&:hover": {
                        background: "linear-gradient(135deg, #700000 0%, #500000 100%)",
                      },
                    }}
                  >
                    Thử lại
                  </Button>
                </Stack>
              )}

              {/* Trạng thái RESULT với Mã Phiên Hỗ Trợ Thủ Thư */}
              {step === "result" && approvalEventCode && (
                <Stack spacing={2} sx={{ textAlign: "center" }}>
                  <Avatar sx={{ mx: "auto", width: 64, height: 64, bgcolor: "warning.main", color: "warning.contrastText" }}>
                    <WarningAmberOutlinedIcon sx={{ fontSize: 36 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 850 }}>
                      Cần hỗ trợ tại quầy
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Vui lòng xuất trình mã phiên này cho thủ thư để mở cổng
                    </Typography>
                  </Box>

                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)") }}>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                      MÃ PHIÊN DUYỆT CỔNG
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: "monospace", letterSpacing: 4, color: "primary.main", my: 0.5 }}>
                      {approvalEventCode}
                    </Typography>
                    <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700 }}>
                      Hết hạn sau: {Math.floor(approvalTimer / 60)}:{(approvalTimer % 60).toString().padStart(2, "0")}
                    </Typography>
                  </Paper>

                  {result?.patron && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{result.patron.full_name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                        {result.patron.student_code || result.patron.id}
                      </Typography>
                    </Box>
                  )}

                  <Button
                    variant="contained"
                    startIcon={<RestartAltOutlinedIcon />}
                    onClick={reset}
                    fullWidth
                    sx={{
                      minHeight: 46,
                      background: "linear-gradient(135deg, #8B0000 0%, #700000 100%)",
                      borderRadius: 2,
                      fontWeight: 700,
                      textTransform: "none",
                    }}
                  >
                    Quay lại
                  </Button>
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Khung Lịch Sử Ra Vào Gần Nhất (Dual Column với Tabs trên mobile) */}
        <Box sx={{ mt: 3 }}>
          <Grid container spacing={2.5}>
            {/* Cột Lịch Sử Vào */}
            <Grid size={{ xs: 12, md: 6 }} sx={{ animation: `${slideInRight} 0.4s ease-out`, animationFillMode: "both" }}>
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  bgcolor: "background.paper",
                  borderColor: "divider",
                  boxShadow: (t) =>
                    t.palette.mode === "dark"
                      ? "0 4px 20px rgba(0, 0, 0, 0.25)"
                      : "0 2px 10px rgba(0, 0, 0, 0.03)",
                }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 2.25,
                    py: 1.5,
                    borderBottom: 1,
                    borderColor: "divider",
                    bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(16, 185, 129, 0.08)" : "rgba(16, 185, 129, 0.04)"),
                  }}
                >
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                    <Avatar sx={{ bgcolor: "#10b981", color: "white", width: 34, height: 34 }}>
                      <LoginOutlinedIcon sx={{ fontSize: 18 }} />
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 800, fontSize: "0.95rem" }}>Lịch sử vào cổng</Typography>
                      <Typography variant="caption" color="text.secondary">Các lượt vừa quét vào thành công</Typography>
                    </Box>
                  </Stack>
                  <Chip
                    size="small"
                    label={`${entryLogs.length} lượt`}
                    sx={{ fontWeight: 800, color: "#10b981", bgcolor: alpha("#10b981", 0.12), height: 22 }}
                  />
                </Stack>

                <Stack divider={<Divider sx={{ borderColor: "divider" }} />}>
                  {entryLogs.length === 0 ? (
                    <Box sx={{ px: 2, py: 4, textAlign: "center" }}>
                      <Typography variant="body2" color="text.secondary">
                        Chưa có lượt vào nào được ghi nhận gần đây.
                      </Typography>
                    </Box>
                  ) : (
                    entryLogs.map((log) => {
                      const confidence = formatConfidence(log.confidence);
                      return (
                        <Stack
                          key={log.id}
                          direction="row"
                          spacing={1.5}
                          sx={{
                            px: 2.25,
                            py: 1.25,
                            alignItems: "center",
                            justifyContent: "space-between",
                            "&:hover": { bgcolor: "action.hover" },
                          }}
                        >
                          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
                            <Avatar sx={{ width: 32, height: 32, fontSize: "0.78rem", fontWeight: 700, bgcolor: "rgba(16,185,129,0.15)", color: "#059669" }}>
                              {(log.patron_name || "Đ")[0].toUpperCase()}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography noWrap sx={{ fontWeight: 750, fontSize: "0.85rem" }}>
                                {log.patron_name || "Độc giả"}
                              </Typography>
                              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mt: 0.25 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                                  {log.student_code || "---"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formatGateTime(log.access_time)}
                                </Typography>
                              </Stack>
                            </Box>
                          </Stack>

                          {confidence ? (
                            <Chip
                              size="small"
                              label={`${confidence} Khớp AI`}
                              sx={{
                                height: 22,
                                fontSize: "0.68rem",
                                fontWeight: 800,
                                bgcolor: "rgba(16,185,129,0.12)",
                                color: "#059669",
                                border: "1px solid rgba(16,185,129,0.25)",
                              }}
                            />
                          ) : (
                            <ShieldOutlinedIcon sx={{ fontSize: 18, color: "text.disabled" }} />
                          )}
                        </Stack>
                      );
                    })
                  )}
                </Stack>
              </Paper>
            </Grid>

            {/* Cột Lịch Sử Ra */}
            <Grid size={{ xs: 12, md: 6 }} sx={{ animation: `${slideInRight} 0.4s ease-out`, animationDelay: "0.1s", animationFillMode: "both" }}>
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  bgcolor: "background.paper",
                  borderColor: "divider",
                  boxShadow: (t) =>
                    t.palette.mode === "dark"
                      ? "0 4px 20px rgba(0, 0, 0, 0.25)"
                      : "0 2px 10px rgba(0, 0, 0, 0.03)",
                }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 2.25,
                    py: 1.5,
                    borderBottom: 1,
                    borderColor: "divider",
                    bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(37, 99, 235, 0.08)" : "rgba(37, 99, 235, 0.04)"),
                  }}
                >
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                    <Avatar sx={{ bgcolor: "#2563eb", color: "white", width: 34, height: 34 }}>
                      <LogoutOutlinedIcon sx={{ fontSize: 18 }} />
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 800, fontSize: "0.95rem" }}>Lịch sử ra cổng</Typography>
                      <Typography variant="caption" color="text.secondary">Các lượt vừa quét ra thành công</Typography>
                    </Box>
                  </Stack>
                  <Chip
                    size="small"
                    label={`${exitLogs.length} lượt`}
                    sx={{ fontWeight: 800, color: "#2563eb", bgcolor: alpha("#2563eb", 0.12), height: 22 }}
                  />
                </Stack>

                <Stack divider={<Divider sx={{ borderColor: "divider" }} />}>
                  {exitLogs.length === 0 ? (
                    <Box sx={{ px: 2, py: 4, textAlign: "center" }}>
                      <Typography variant="body2" color="text.secondary">
                        Chưa có lượt ra nào được ghi nhận gần đây.
                      </Typography>
                    </Box>
                  ) : (
                    exitLogs.map((log) => {
                      const confidence = formatConfidence(log.confidence);
                      return (
                        <Stack
                          key={log.id}
                          direction="row"
                          spacing={1.5}
                          sx={{
                            px: 2.25,
                            py: 1.25,
                            alignItems: "center",
                            justifyContent: "space-between",
                            "&:hover": { bgcolor: "action.hover" },
                          }}
                        >
                          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
                            <Avatar sx={{ width: 32, height: 32, fontSize: "0.78rem", fontWeight: 700, bgcolor: "rgba(37,99,235,0.15)", color: "#2563eb" }}>
                              {(log.patron_name || "Đ")[0].toUpperCase()}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography noWrap sx={{ fontWeight: 750, fontSize: "0.85rem" }}>
                                {log.patron_name || "Độc giả"}
                              </Typography>
                              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mt: 0.25 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                                  {log.student_code || "---"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formatGateTime(log.access_time)}
                                </Typography>
                              </Stack>
                            </Box>
                          </Stack>

                          {confidence ? (
                            <Chip
                              size="small"
                              label={`${confidence} Khớp AI`}
                              sx={{
                                height: 22,
                                fontSize: "0.68rem",
                                fontWeight: 800,
                                bgcolor: "rgba(37,99,235,0.12)",
                                color: "#2563eb",
                                border: "1px solid rgba(37,99,235,0.25)",
                              }}
                            />
                          ) : (
                            <ShieldOutlinedIcon sx={{ fontSize: 18, color: "text.disabled" }} />
                          )}
                        </Stack>
                      );
                    })
                  )}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Thanh Trạng Thái Chân Trang (System Health Status Footer) */}
        <Box
          sx={{
            mt: 3,
            p: 1.5,
            borderRadius: 2,
            bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"),
            border: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10b981", animation: "pulse 2s infinite" }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                Cổng kiểm soát: SẴN SÀNG HOẠT ĐỘNG
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.disabled">·</Typography>
            <Typography variant="caption" color="text.secondary">
              AI Biometric Engine: <strong>InsightFace v2 Active</strong>
            </Typography>
            <Typography variant="caption" color="text.disabled">·</Typography>
            <Typography variant="caption" color="text.secondary">
              SSE Real-Time Stream: <strong style={{ color: isSseConnected ? "#059669" : "#d97706" }}>{isSseConnected ? "Đang đồng bộ" : "Mất kết nối"}</strong>
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <AccessTimeOutlinedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
            <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700, color: "text.secondary" }}>
              {currentTime || "--:--:--"}
            </Typography>
          </Stack>
        </Box>

        {/* Toast Thông Báo */}
        <Snackbar
          open={Boolean(toast)}
          autoHideDuration={5000}
          onClose={() => setToast(null)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          {toast ? (
            <Alert
              onClose={() => setToast(null)}
              severity={toast.severity}
              variant="filled"
              sx={{ width: "100%", borderRadius: 2, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}
            >
              {toast.msg}
            </Alert>
          ) : undefined}
        </Snackbar>
      </Box>
    </Box>
  );
}
