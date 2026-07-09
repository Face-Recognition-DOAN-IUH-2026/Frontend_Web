"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import Spin from "antd/es/spin";
import antdMsg from "antd/es/message";

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
import GateIcon from "@mui/icons-material/VideocamOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import { useTaskSSE } from "@/lib/hooks/useTaskSSE";
import CameraFeed from "@/app/(kiosk)/gate/_components/CameraFeed";
import { useColorMode } from "@/lib/mui-theme";
import { fadeInUp, shimmer, slideInRight, successPop } from "@/lib/animations";
import type { AccessLogPublic, CameraEvent, KioskResult, PatronLookupResult } from "@/lib/types";

interface TodayCounts {
  entries: number;
  exits: number;
  no_match: number;
  spoof: number;
}

type Step = "idle" | "verify" | "result";

const _ENTRY_CAM = process.env.NEXT_PUBLIC_ENTRY_CAM;
if (!_ENTRY_CAM) throw new Error("NEXT_PUBLIC_ENTRY_CAM is not set");
const ENTRY_CAM: string = _ENTRY_CAM;
const _EXIT_CAM = process.env.NEXT_PUBLIC_EXIT_CAM;
if (!_EXIT_CAM) throw new Error("NEXT_PUBLIC_EXIT_CAM is not set");
const EXIT_CAM: string = _EXIT_CAM;
const ENTRY_CAM_ID = process.env.NEXT_PUBLIC_ENTRY_CAM_ID || "entry_gate";
const EXIT_CAM_ID = process.env.NEXT_PUBLIC_EXIT_CAM_ID || "exit_gate";
const HISTORY_LIMIT = 8;

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

function resultStatus(result: KioskResult | null) {
  if (!result) return "processing";
  if (result.success) return "success";
  if (result.message?.toLowerCase().includes("đăng ký tại quầy")) return "unregistered";
  return "error";
}

export default function GatePage() {
  const router = useRouter();
  const theme = useTheme();
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

  useEffect(() => {
    const cached = window.localStorage.getItem("gate_today_counts");
    if (!cached) return;
    try {
      setTodayCounts(JSON.parse(cached) as TodayCounts);
    } catch {
      setTodayCounts({ entries: 0, exits: 0, no_match: 0, spoof: 0 });
    }
  }, []);

  const showToast = useCallback((severity: "success" | "warning" | "error" | "info", msg: string) => {
    antdMsg[severity](msg, 6);
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
      if (success && lookup?.patron?.id) {
        api.confirmEntry(lookup.patron.id).catch(() => {});
      }
    } else if (sseState.status === "FAILURE" || sseState.status === "ERROR" || sseState.status === "TIMEOUT") {
      const message = sseState.error || "Xác thực thất bại.";
      setResult({ success: false, message, patron: null, job_id: null });
      setStep("result");
      setLoading(false);
      setStatusText("");
      showToast("error", message);
      if (lookup?.patron?.id) {
        api.revertPending(lookup.patron.id).catch(() => {});
      }
    } else if (sseState.status === "WAITING") {
      setStatusText("Đang xử lý...");
    }
  }, [sseState.status, sseState.result, sseState.error, lookup, mssv, showToast]);

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
    setStatusText("Đang tra cứu...");
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
          message: "Tài khoản chưa được đăng ký khuôn mặt. Vui lòng đăng ký tại quầy.",
          patron: response.patron,
          job_id: null,
        });
      } else if (response.exists && response.is_expired) {
        setStep("result");
        setResult({ success: false, message: "Thẻ hội viên đã hết hạn.", patron: response.patron, job_id: null });
      } else {
        setStep("result");
        setResult({ success: false, message: "Không tìm thấy tài khoản. Vui lòng đăng ký tại quầy.", patron: null, job_id: null });
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
      setStatusText("Đang xác thực khuôn mặt...");
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

  useEffect(() => {
    if (!approvalEventCode) return;
    if (approvalTimer <= 0) return;
    const t = setInterval(() => setApprovalTimer((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [approvalEventCode, approvalTimer]);

  const reset = () => {
    setStep("idle");
    setMssv("");
    setMssvInput("");
    setLookup(null);
    setResult(null);
    setApprovalEventCode(null);
    setApprovalTimer(300);
    stopCamera();
  };

  useEffect(() => {
    api.getStats().then((stats) => {
      if (!stats) return;
      const fresh: TodayCounts = { entries: stats.today_entries ?? 0, exits: stats.today_exits ?? 0, no_match: 0, spoof: 0 };
      setTodayCounts(fresh);
      localStorage.setItem("gate_today_counts", JSON.stringify(fresh));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.getRecentLogs()
      .then((response) => setRecentLogs(response.items.slice(0, HISTORY_LIMIT * 2)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem("gate_today_counts", JSON.stringify(todayCounts));
  }, [todayCounts]);

  useEffect(() => {
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
        addRecentLog(buildLogFromEvent(event));
        showToast(
          type === "entry" ? "success" : "warning",
          `${event.full_name || "Độc giả"} - ${type === "entry" ? "Vào" : "Ra"} thư viện`,
        );
        setTodayCounts((prev) => ({
          ...prev,
          [type === "entry" ? "entries" : "exits"]: prev[type === "entry" ? "entries" : "exits"] + 1,
        }));
      } else if (event.status === "no_match") {
        setTodayCounts((prev) => ({ ...prev, no_match: prev.no_match + 1 }));
        showToast("info", "Khuôn mặt mới - không nhận diện được.");
      } else if (event.status === "spoof") {
        setTodayCounts((prev) => ({ ...prev, spoof: prev.spoof + 1 }));
        showToast("error", "Phát hiện giả mạo!");
      }
    });
    return cleanup;
  }, [addRecentLog, showToast]);

  const entryLogs = recentLogs.filter((log) => log.access_type === "entry").slice(0, HISTORY_LIMIT);
  const exitLogs = recentLogs.filter((log) => log.access_type === "exit").slice(0, HISTORY_LIMIT);
  const currentResultStatus = resultStatus(result);

  const renderHistoryColumn = (
    title: string,
    subtitle: string,
    logs: AccessLogPublic[],
    type: "entry" | "exit",
  ) => {
    const Icon = type === "entry" ? LoginOutlinedIcon : LogoutOutlinedIcon;
    const color = type === "entry" ? "success" : "warning";

    return (
      <Paper variant="outlined" sx={{ overflow: "hidden", height: "100%" }}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", bgcolor: "action.hover" }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
            <Avatar sx={{ bgcolor: `${color}.main`, color: `${color}.contrastText`, width: 40, height: 40 }}>
              <Icon fontSize="small" />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 850 }}>{title}</Typography>
              <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
            </Box>
          </Stack>
          <Typography variant="h5" color={`${color}.main`} sx={{ fontWeight: 900 }}>{logs.length}</Typography>
        </Stack>

        <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}>
          {logs.length === 0 ? (
            <Box sx={{ px: 2, py: 4, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Chưa có lượt {type === "entry" ? "vào" : "ra"} gần đây
              </Typography>
            </Box>
          ) : (
            logs.map((log) => {
              const confidence = formatConfidence(log.confidence);
              return (
                <Stack key={log.id} direction="row" spacing={1.5} sx={{ px: 2, py: 1.5, alignItems: "flex-start", justifyContent: "space-between" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ fontWeight: 750 }}>{log.patron_name || "Không rõ tên"}</Typography>
                    <Stack direction="row" spacing={1.25} sx={{ flexWrap: "wrap", mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>{log.student_code || "---"}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatGateTime(log.access_time)}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>{log.camera_id || "-"}</Typography>
                    </Stack>
                  </Box>
                  {confidence ? (
                    <Chip size="small" color={color} label={confidence} sx={{ animation: `${successPop} 0.35s ease-out` }} />
                  ) : (
                    <ShieldOutlinedIcon color="disabled" fontSize="small" />
                  )}
                </Stack>
              );
            })
          )}
        </Stack>
      </Paper>
    );
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      <Box sx={{ maxWidth: 1500, mx: "auto", p: { xs: 2, md: 3 } }}>
        <Box sx={{ mb: 3 }}>
          <Button startIcon={<ArrowBackOutlinedIcon />} onClick={() => router.push("/dashboard")} sx={{ mb: 1, textTransform: "none" }}>
            Quay lại Dashboard
          </Button>
          <Box
            sx={{
              p: 3,
              borderRadius: 3,
              background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
              border: "1px solid",
              borderColor: "rgba(99,102,241,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box sx={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", bgcolor: "rgba(99,102,241,0.08)", pointerEvents: "none" }} />
            <Box sx={{ position: "absolute", bottom: -60, left: 200, width: 220, height: 220, borderRadius: "50%", bgcolor: "rgba(99,102,241,0.05)", pointerEvents: "none" }} />

            <Stack direction="row" spacing={2} sx={{ zIndex: 1, alignItems: "center" }}>
              <Avatar sx={{ bgcolor: "rgba(99,102,241,0.3)", width: 52, height: 52, border: "1px solid rgba(99,102,241,0.5)" }}>
                <GateIcon sx={{ color: "#a5b4fc", fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#e0e7ff" }}>Cổng Thư Viện</Typography>
                <Typography variant="body2" sx={{ color: "rgba(199,210,254,0.7)", mt: 0.3 }}>
                  Theo dõi camera vào/ra và xác thực độc giả tại kiosk
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} sx={{ zIndex: 1, alignItems: "center" }}>
              <Paper sx={{ px: 2, py: 1, borderRadius: 2, bgcolor: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", textAlign: "center" }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#6ee7b7", lineHeight: 1 }}>{todayCounts.entries}</Typography>
                <Typography variant="caption" sx={{ color: "rgba(110,231,183,0.7)", fontWeight: 600 }}>Vào</Typography>
              </Paper>
              <Paper sx={{ px: 2, py: 1, borderRadius: 2, bgcolor: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", textAlign: "center" }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#fcd34d", lineHeight: 1 }}>{todayCounts.exits}</Typography>
                <Typography variant="caption" sx={{ color: "rgba(252,211,77,0.7)", fontWeight: 600 }}>Ra</Typography>
              </Paper>
              <IconButton onClick={toggleMode} sx={{ color: "#a5b4fc", border: "1px solid rgba(165,180,252,0.3)", "&:hover": { bgcolor: "rgba(165,180,252,0.1)" } }}>
                {mode === "dark" ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
              </IconButton>
            </Stack>
          </Box>
        </Box>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }} sx={{ animation: `${fadeInUp} 0.4s ease-out`, animationFillMode: "both" }}>
                <CameraFeed src={ENTRY_CAM} cameraId={ENTRY_CAM_ID} label="Cổng vào" overlay={entryOverlay} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }} sx={{ animation: `${fadeInUp} 0.4s ease-out`, animationDelay: "0.1s", animationFillMode: "both" }}>
                <CameraFeed src={EXIT_CAM} cameraId={EXIT_CAM_ID} label="Cổng ra" overlay={exitOverlay} />
              </Grid>
            </Grid>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }} sx={{ animation: `${fadeInUp} 0.45s ease-out`, animationDelay: "0.2s", animationFillMode: "both" }}>
            <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
              {step === "idle" && (
                <Stack spacing={2.5} sx={{ textAlign: "center" }}>
                  <Avatar sx={{ mx: "auto", width: 64, height: 64, bgcolor: "primary.main", color: "primary.contrastText" }}>
                    <PersonSearchOutlinedIcon fontSize="large" />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 850 }}>Chào mừng</Typography>
                    <Typography color="text.secondary">Nhập MSSV để xác thực khuôn mặt.</Typography>
                  </Box>
                  <TextField
                    value={mssvInput}
                    onChange={(event) => setMssvInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleLookup(mssvInput);
                    }}
                    disabled={loading}
                    placeholder="Nhập MSSV..."
                    fullWidth
                    autoFocus
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        bgcolor: "background.paper",
                        textAlign: "center",
                        "&:hover": {
                          "& fieldset": { borderColor: "primary.main" },
                        },
                      },
                    }}
                    slotProps={{
                      htmlInput: {
                        style: {
                          textAlign: "center",
                          fontFamily: "monospace",
                          fontSize: 20,
                          letterSpacing: 1,
                        },
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => handleLookup(mssvInput)}
                    disabled={loading || !mssvInput.trim()}
                    fullWidth
                    sx={{
                      background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
                      borderRadius: 2,
                      fontWeight: 700,
                      textTransform: "none",
                      "&:hover": {
                        background: "linear-gradient(135deg, #818cf8 0%, #6366f1 100%)",
                      },
                    }}
                  >
                    Tra cứu
                  </Button>
                  {loading && (
                    <Stack spacing={1.25} sx={{ alignItems: "center" }}>
                      <Spin size="small" />
                      <Typography variant="body2" color="text.secondary">{statusText || "Đang xử lý..."}</Typography>
                    </Stack>
                  )}
                </Stack>
              )}

              {step === "verify" && (
                <Stack spacing={2}>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h5" sx={{ fontWeight: 850 }}>Xác thực khuôn mặt</Typography>
                    <Typography color="text.secondary">{lookup?.patron?.full_name || mssv}</Typography>
                  </Box>
                  <Paper variant="outlined" sx={{ position: "relative", overflow: "hidden", aspectRatio: "4 / 3", bgcolor: "common.black" }}>
                    <Box component="video" ref={videoRef} autoPlay playsInline muted sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
                      <Box sx={{ width: 140, height: 140, border: 2, borderColor: "primary.main", borderRadius: "50%", opacity: 0.75 }} />
                    </Box>
                    {loading && (
                      <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.65)", color: "common.white", alignItems: "center", justifyContent: "center" }} spacing={1.25}>
                        <Spin size="large" />
                        <Typography variant="body2">{statusText}</Typography>
                      </Stack>
                    )}
                  </Paper>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<CheckCircleOutlineOutlinedIcon />}
                    onClick={handleVerify}
                    disabled={loading}
                    fullWidth
                    sx={{
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      borderRadius: 2,
                      fontWeight: 700,
                      textTransform: "none",
                      "&:hover": {
                        background: "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
                      },
                    }}
                  >
                    Xác thực
                  </Button>
                  <Button onClick={reset} disabled={loading} fullWidth>Hủy</Button>
                </Stack>
              )}

              {step === "result" && !approvalEventCode && (
                <Stack spacing={2.5} sx={{ textAlign: "center" }}>
                  <Avatar
                    sx={{
                      mx: "auto",
                      width: 72,
                      height: 72,
                      bgcolor: currentResultStatus === "success" ? "success.main" : currentResultStatus === "unregistered" ? "warning.main" : "error.main",
                      color: currentResultStatus === "success" ? "success.contrastText" : currentResultStatus === "unregistered" ? "warning.contrastText" : "error.contrastText",
                      animation: `${successPop} 0.45s ease-out`,
                    }}
                  >
                    {currentResultStatus === "success" ? <CheckCircleOutlineOutlinedIcon fontSize="large" /> : <ErrorOutlineOutlinedIcon fontSize="large" />}
                  </Avatar>
                  {result?.patron && (
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 850 }}>{result.patron.full_name}</Typography>
                      <Typography color="primary.main" sx={{ fontFamily: "monospace", fontWeight: 800 }}>{result.patron.student_code || result.patron.id}</Typography>
                    </Box>
                  )}
                  {result?.message && (
                    <Alert severity={currentResultStatus === "success" ? "success" : currentResultStatus === "unregistered" ? "warning" : "error"}>
                      {result.message}
                    </Alert>
                  )}
                  {result?.confidence != null && (
                    <Stack spacing={1}>
                      <LinearProgress variant="determinate" value={Math.round(result.confidence * 100)} color={currentResultStatus === "success" ? "success" : "warning"} sx={{ height: 8, borderRadius: 99 }} />
                      <Typography variant="caption" color="text.secondary">Độ tin cậy {Math.round(result.confidence * 100)}%</Typography>
                    </Stack>
                  )}
                  <Button
                    variant="contained"
                    startIcon={<RestartAltOutlinedIcon />}
                    onClick={reset}
                    fullWidth
                    sx={{
                      background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
                      borderRadius: 2,
                      fontWeight: 700,
                      textTransform: "none",
                      "&:hover": {
                        background: "linear-gradient(135deg, #818cf8 0%, #6366f1 100%)",
                      },
                    }}
                  >
                    Thử lại
                  </Button>
                </Stack>
              )}

              {step === "result" && approvalEventCode && (
                <Stack spacing={2.5} sx={{ textAlign: "center" }}>
                  <Avatar
                    sx={{ mx: "auto", width: 72, height: 72, bgcolor: "warning.main", color: "warning.contrastText" }}
                  >
                    <ErrorOutlineOutlinedIcon fontSize="large" />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 850 }}>Xác thực thất bại</Typography>
                    <Typography color="text.secondary">Vui lòng ra quầy thủ thư để được hỗ trợ</Typography>
                  </Box>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
                    <Typography variant="overline" color="text.secondary">Mã phiên</Typography>
                    <Typography variant="h3" sx={{ fontWeight: 900, fontFamily: "monospace", letterSpacing: 4 }}>
                      {approvalEventCode}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Còn {Math.floor(approvalTimer / 60)}:{(approvalTimer % 60).toString().padStart(2, "0")} trước khi hết hạn
                    </Typography>
                  </Paper>
                  {result?.patron && (
                    <Box>
                      <Typography variant="h6">{result.patron.full_name}</Typography>
                      <Typography color="primary.main" sx={{ fontFamily: "monospace" }}>{result.patron.student_code || result.patron.id}</Typography>
                    </Box>
                  )}
                  <Button
                    variant="contained"
                    startIcon={<RestartAltOutlinedIcon />}
                    onClick={reset}
                    fullWidth
                    sx={{ background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                  >
                    Quay lại
                  </Button>
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>

        <Grid container spacing={2.5} sx={{ mt: 2.5 }}>
          <Grid size={{ xs: 12, md: 6 }} sx={{ animation: `${slideInRight} 0.4s ease-out`, animationFillMode: "both" }}>
            {renderHistoryColumn("Lịch sử vào", "Các lượt vừa qua cổng vào", entryLogs, "entry")}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }} sx={{ animation: `${slideInRight} 0.4s ease-out`, animationDelay: "0.1s", animationFillMode: "both" }}>
            {renderHistoryColumn("Lịch sử ra", "Các lượt vừa qua cổng ra", exitLogs, "exit")}
          </Grid>
        </Grid>

        <Box sx={{ position: "fixed", bottom: 16, left: 16, zIndex: 1000 }}>
          <Alert severity="success" icon={<Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "success.main" }} />} sx={{ py: 0 }}>
            Hệ thống đang hoạt động
          </Alert>
        </Box>
      </Box>
    </Box>
  );
}
