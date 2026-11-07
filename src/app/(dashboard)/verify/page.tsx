"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTaskSSE } from "@/lib/hooks/useTaskSSE";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import FaceIcon from "@mui/icons-material/FaceOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import VideocamIcon from "@mui/icons-material/VideocamOutlined";
import PersonSearchOutlinedIcon from "@mui/icons-material/PersonSearchOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckIcon from "@mui/icons-material/Check";
import CameraCapture from "@/app/(dashboard)/_components/camera-capture";
import JobPoll from "@/app/(dashboard)/_components/job-poll";
import { useAuth } from "@/lib/auth-context";
import api, { getErrorMessage } from "@/lib/api-client";
import type { TaskResult, PatronPublic } from "@/lib/types";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import { getAlertSeverity } from "@/lib/alert-utils";
import { useToast } from "@/lib/toast-context";

function decodeJwt(token: string): { sub: string } | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/** Luồng xác minh tức thời khi mượn sách có mã sinh viên (?student_code=...) */
function BorrowVerifyFlow({ studentCode, onDone }: { studentCode: string; onDone: () => void }) {
  const router = useRouter();
  const theme = useTheme();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [patronData, setPatronData] = useState<any | null>(null);
  const { state: sseState, start: startSSE, reset: resetSSE } = useTaskSSE(30000);

  // Load patron info
  useEffect(() => {
    (async () => {
      try {
        const res = await api.lookupPatron(studentCode);
        if (res.exists && res.patron) {
          setPatronData(res.patron);
        }
      } catch {
        // silent fail
      }
    })();
  }, [studentCode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setCameraReady(true);
        }
      } catch (err: any) {
        if (err.name === "NotAllowedError") setCameraError("Không có quyền truy cập camera.");
        else if (err.name === "NotFoundError") setCameraError("Không tìm thấy camera.");
        else setCameraError("Không thể khởi động camera.");
      }
    })();
    return () => stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    return () => resetSSE();
  }, [resetSSE]);

  useEffect(() => {
    if (sseState.status === "SUCCESS" && sseState.result) {
      if (sseState.result.verified) {
        (async () => {
          try {
            const data = await api.getActiveBorrowsByStudentCode(studentCode);
            stopCamera();
            sessionStorage.setItem("verifiedPatron", JSON.stringify({
              student_code: studentCode,
              patron_id: data.patron.id,
              full_name: data.patron.full_name || data.patron.student_code,
              total: data.total,
              overdue_count: data.overdue_count,
            }));
            setSuccess(true);
            toast.success("Xác thực khuôn mặt thành công!");
            setTimeout(() => router.push("/borrow"), 1200);
          } catch (err: any) {
            const status = err?.response?.status || err?.status;
            const errMsg = status === 403 ? "Độc giả chưa ở trong thư viện hoặc thẻ đã bị khóa." : (getErrorMessage(err) || "Không thể kiểm tra thông tin độc giả");
            setError(errMsg);
            toast.error(errMsg);
            setVerifying(false);
          }
        })();
        return;
      }
      setError("Khuôn mặt không khớp với hồ sơ của bạn đọc này.");
      toast.error("Khuôn mặt không khớp với hồ sơ.");
      setVerifying(false);
      return;
    }
    if (sseState.status === "FAILURE" || sseState.status === "ERROR" || sseState.status === "TIMEOUT") {
      const errMsg = sseState.error || "Xác minh thất bại. Vui lòng thử lại.";
      setError(errMsg);
      toast.error(errMsg);
      setVerifying(false);
      return;
    }
  }, [sseState, studentCode, stopCamera, router, toast]);

  const handleVerify = useCallback(async () => {
    if (!videoRef.current) return;
    setVerifying(true);
    setError("");

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setError("Lỗi xử lý canvas"); setVerifying(false); return; }
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => { if (b) resolve(b); else reject(new Error("toBlob failed")); }, "image/jpeg", 0.9);
      });
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

      const lookupResult = await api.lookupPatron(studentCode);
      if (!lookupResult.exists || !lookupResult.patron) { setError("Không tìm thấy độc giả"); setVerifying(false); return; }
      if (lookupResult.is_expired) { setError("Thẻ độc giả đã hết hạn"); setVerifying(false); return; }
      if (lookupResult.is_locked) { setError("Thẻ độc giả đã bị khóa"); setVerifying(false); return; }

      const verifyResult = await api.verifyFace(file, lookupResult.patron.id, true);
      startSSE(verifyResult.job_id);
    } catch (err) {
      setError(getErrorMessage(err) || "Lỗi kết nối xác minh");
      setVerifying(false);
    }
  }, [studentCode, setError, setVerifying, startSSE]);

  return (
    <Stack spacing={3} sx={{ maxWidth: 1040, mx: "auto" }}>
      <PageHeader
        title="Xác thực khuôn mặt bạn đọc"
        subtitle={`Quy trình mượn sách · Đối chiếu khuôn mặt sinh viên: ${studentCode}`}
        icon={VerifiedUserOutlinedIcon}
        gradient="linear-gradient(135deg, #0A2540 0%, #0F3C5C 50%, #8B0000 100%)"
        backHref="/borrow"
      />

      {error ? (
        <Alert severity={getAlertSeverity(error)} sx={{ borderRadius: 2.5 }} onClose={() => setError("")}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "7fr 5fr" }, gap: 3 }}>
        {/* Left: Camera Feed with Biometric HUD */}
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            p: 2,
            bgcolor: "background.paper",
            boxShadow: (t) => t.palette.mode === "dark" ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.05)",
          }}
        >
          {success ? (
            <Stack spacing={2.5} sx={{ alignItems: "center", py: 8, textAlign: "center" }}>
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  bgcolor: "rgba(16, 185, 129, 0.12)",
                  color: "success.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 44 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "success.main" }}>
                  Xác thực danh tính thành công!
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Đã xác nhận đúng bạn đọc · Đang tự động chuyển sang phiếu mượn...
                </Typography>
              </Box>
              <CircularProgress size={28} sx={{ color: "success.main", mt: 1 }} />
            </Stack>
          ) : (
            <Box
              sx={{
                position: "relative",
                borderRadius: 2.5,
                overflow: "hidden",
                bgcolor: "#0A0E17",
                aspectRatio: "4 / 3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", height: "100%", objectFit: "contain", transform: "scaleX(-1)" }}
              />

              {/* Loading / Error States */}
              {!cameraReady && !cameraError ? (
                <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.7)", color: "#fff", alignItems: "center", justifyContent: "center" }} spacing={1.5}>
                  <CircularProgress size={32} sx={{ color: "#D4AF37" }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Đang kết nối camera đối chiếu...</Typography>
                </Stack>
              ) : null}

              {cameraError ? (
                <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.85)", color: "error.main", alignItems: "center", justifyContent: "center", p: 3 }} spacing={1.5}>
                  <VideocamIcon sx={{ fontSize: 48 }} />
                  <Typography variant="body2" sx={{ textAlign: "center", color: "#fff" }}>{cameraError}</Typography>
                  <Button size="small" variant="outlined" color="inherit" onClick={() => { setCameraError(""); streamRef.current = null; }}>
                    Thử lại
                  </Button>
                </Stack>
              ) : null}

              {/* Biometric HUD Overlay */}
              {cameraReady && !cameraError && !verifying ? (
                <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Box sx={{ position: "absolute", top: 16, left: 16, width: 20, height: 20, borderTop: "3px solid #D4AF37", borderLeft: "3px solid #D4AF37" }} />
                  <Box sx={{ position: "absolute", top: 16, right: 16, width: 20, height: 20, borderTop: "3px solid #D4AF37", borderRight: "3px solid #D4AF37" }} />
                  <Box sx={{ position: "absolute", bottom: 16, left: 16, width: 20, height: 20, borderBottom: "3px solid #D4AF37", borderLeft: "3px solid #D4AF37" }} />
                  <Box sx={{ position: "absolute", bottom: 16, right: 16, width: 20, height: 20, borderBottom: "3px solid #D4AF37", borderRight: "3px solid #D4AF37" }} />

                  <Box
                    sx={{
                      width: "50%",
                      height: "70%",
                      borderRadius: "50%",
                      border: "2px dashed rgba(212, 175, 55, 0.8)",
                      boxShadow: "0 0 20px rgba(212, 175, 55, 0.2)",
                    }}
                  />
                </Box>
              ) : null}

              {/* Processing State */}
              {verifying ? (
                <Stack
                  sx={{
                    position: "absolute",
                    inset: 0,
                    bgcolor: "rgba(10, 14, 23, 0.75)",
                    backdropFilter: "blur(4px)",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                  }}
                  spacing={2}
                >
                  <CircularProgress size={44} sx={{ color: "#D4AF37" }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Đang phân tích khuôn mặt...</Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>Đang đối sánh vector 512D với hồ sơ</Typography>
                </Stack>
              ) : null}
            </Box>
          )}

          {!success ? (
            <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={() => router.push("/borrow")} disabled={verifying} sx={{ borderRadius: 2, fontWeight: 700 }}>
                Quay lại
              </Button>
              <Button
                variant="contained"
                fullWidth
                startIcon={<FaceIcon />}
                onClick={handleVerify}
                disabled={verifying || !cameraReady || !!cameraError}
                sx={{
                  borderRadius: 2,
                  fontWeight: 800,
                  bgcolor: "#8B0000",
                  "&:hover": { bgcolor: "#6b0000" },
                }}
              >
                {verifying ? "Đang xác thực..." : "Xác nhận nhận diện ngay"}
              </Button>
            </Stack>
          ) : null}
        </Paper>

        {/* Right: Patron Info Card */}
        <Stack spacing={2.5}>
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 3,
              p: 2.5,
              bgcolor: "background.paper",
              borderColor: "divider",
            }}
          >
            <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary", letterSpacing: "0.08em" }}>
              THÔNG TIN BẠN ĐỌC ĐỐI CHIẾU
            </Typography>

            <Stack direction="row" spacing={2} sx={{ alignItems: "center", mt: 1.5, mb: 2 }}>
              <Avatar
                src={patronData?.avatar_url || undefined}
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: "rgba(139, 0, 0, 0.1)",
                  color: "#8B0000",
                  fontWeight: 800,
                  fontSize: "1.25rem",
                }}
              >
                {patronData?.full_name?.slice(0, 1) || studentCode.slice(0, 1)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }} noWrap>
                  {patronData?.full_name || "Đang tải tên..."}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  MSSV: <strong>{studentCode}</strong>
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            <Stack spacing={1}>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography variant="caption" color="text.secondary">Lớp / Đơn vị:</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>{patronData?.class_name || "Chưa cập nhật"}</Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography variant="caption" color="text.secondary">Trạng thái thẻ:</Typography>
                <Chip
                  size="small"
                  label={patronData?.status === "active" ? "Thẻ đang hoạt động" : "Bình thường"}
                  color="success"
                  sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }}
                />
              </Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography variant="caption" color="text.secondary">Quy trình:</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main" }}>Mượn tài liệu thư viện</Typography>
              </Stack>
            </Stack>
          </Paper>

          {/* AI Security Notice */}
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 3,
              p: 2,
              bgcolor: (t) => t.palette.mode === "dark" ? "rgba(10, 37, 64, 0.3)" : "rgba(10, 37, 64, 0.03)",
              borderColor: "rgba(10, 37, 64, 0.15)",
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
              <ShieldOutlinedIcon sx={{ color: "#0A2540", fontSize: 24, mt: 0.25 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
                  Bảo mật sinh trắc học
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, lineHeight: 1.5 }}>
                  Hệ thống xác thực 1:1 kiểm tra khuôn mặt của bạn đọc với mẫu vector đã đăng ký nhằm đảm bảo chính chủ trước khi xuất phiếu mượn sách.
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Stack>
  );
}

export default function VerifyPage() {
  const { toast } = useToast();
  const router = useRouter();
  const theme = useTheme();
  const searchParams = useSearchParams();
  const studentCodeParam = searchParams.get("student_code") || "";
  const { accessToken, user } = useAuth();

  const [tabMode, setTabMode] = useState<"patron" | "userid">("patron");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [targetUserId, setTargetUserId] = useState("");
  const [studentCodeInput, setStudentCodeInput] = useState("");
  const [lookedUpPatron, setLookedUpPatron] = useState<PatronPublic | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [consent, setConsent] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TaskResult | null>(null);

  // Auto fill user ID if token exists
  useEffect(() => {
    if (accessToken) {
      const payload = decodeJwt(accessToken);
      if (payload?.sub && !targetUserId) {
        setTargetUserId(payload.sub);
      }
    }
  }, [accessToken, targetUserId]);

  // Quick lookup patron by student code
  const handleLookupPatron = async (codeToLookup?: string) => {
    const code = codeToLookup || studentCodeInput.trim();
    if (!code) return;
    setLookingUp(true);
    setError("");
    try {
      const res = await api.lookupPatron(code);
      if (res.exists && res.patron) {
        setLookedUpPatron(res.patron);
        setTargetUserId(res.patron.id);
        toast.success(`Đã tìm thấy bạn đọc: ${res.patron.full_name}`);
      } else {
        setLookedUpPatron(null);
        setError("Không tìm thấy bạn đọc với mã số này");
        toast.error("Không tìm thấy bạn đọc");
      }
    } catch (err) {
      setLookedUpPatron(null);
      const msg = getErrorMessage(err) || "Không thể tìm kiếm bạn đọc";
      setError(msg);
      toast.error(msg);
    } finally {
      setLookingUp(false);
    }
  };

  const handleCapture = (file: File) => {
    setImageFile(file);
    setResult(null);
    setError("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!imageFile || !targetUserId) {
      setError("Vui lòng chọn ảnh khuôn mặt và chỉ định người dùng cần xác minh.");
      return;
    }
    setError("");
    setIsLoading(true);
    setJobId(null);
    try {
      const res = await api.verifyFace(imageFile, targetUserId, consent);
      setJobId(res.job_id);
    } catch (err: any) {
      setError(getErrorMessage(err) || "Gửi yêu cầu xác thực thất bại.");
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setImageFile(null);
    setJobId(null);
    setError("");
    setIsLoading(false);
  };

  // If student_code is present in URL, render the specialized BorrowVerifyFlow
  if (studentCodeParam) {
    return <BorrowVerifyFlow studentCode={studentCodeParam} onDone={() => {}} />;
  }

  const confidenceScore = result?.score != null ? Number(result.score) : null;
  const confidencePercent = confidenceScore != null ? (confidenceScore * 100).toFixed(1) : null;

  return (
    <Stack spacing={3} sx={{ maxWidth: 1120, mx: "auto" }}>
      {/* Header */}
      <Box sx={staggerSx(0)}>
        <PageHeader
          title="Xác thực khuôn mặt 1:1"
          subtitle="So khớp ảnh chân dung trực tiếp với mẫu vector khuôn mặt của một bạn đọc hoặc nhân sự cụ thể."
          icon={VerifiedUserOutlinedIcon}
          gradient="linear-gradient(135deg, #0A2540 0%, #0F3C5C 40%, #8B0000 100%)"
          actions={
            <Stack direction="row" spacing={1}>
              <Chip
                icon={<CheckCircleOutlineOutlinedIcon sx={{ fontSize: 16 }} />}
                label="Độ chính xác 99.8%"
                size="small"
                sx={{ bgcolor: "rgba(16, 185, 129, 0.1)", color: "#10b981", fontWeight: 700 }}
              />
              <Chip
                icon={<ShieldOutlinedIcon sx={{ fontSize: 16 }} />}
                label="Anti-Spoofing AI"
                size="small"
                sx={{ bgcolor: "rgba(212, 175, 55, 0.1)", color: "#D4AF37", fontWeight: 700 }}
              />
            </Stack>
          }
        />
      </Box>

      {error ? (
        <Box sx={staggerSx(1)}>
          <Alert severity={getAlertSeverity(error)} sx={{ borderRadius: 2.5 }} onClose={() => setError("")}>
            {error}
          </Alert>
        </Box>
      ) : null}

      {/* Main Content Area */}
      {jobId ? (
        <Box sx={staggerSx(1)}>
          <Paper
            variant="outlined"
            sx={{
              p: 4,
              borderRadius: 3.5,
              bgcolor: "background.paper",
              textAlign: "center",
              boxShadow: (t) => t.palette.mode === "dark" ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.05)",
            }}
          >
            <JobPoll
              jobId={jobId}
              onComplete={(value) => {
                setResult(value);
                setIsLoading(false);
                setJobId(null);
                if (value?.verified) {
                  toast.success("Xác thực khuôn mặt thành công!");
                } else {
                  toast.error("Khuôn mặt không khớp với hồ sơ!");
                }
              }}
              onError={(message) => {
                setError(message);
                setIsLoading(false);
                setJobId(null);
                toast.error(message);
              }}
            />
          </Paper>
        </Box>
      ) : result ? (
        /* Detailed Result Card */
        <Box sx={staggerSx(1)}>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              borderRadius: 3.5,
              bgcolor: "background.paper",
              borderWidth: 2,
              borderColor: result.verified ? "success.main" : "error.main",
              boxShadow: result.verified
                ? "0 4px 24px rgba(16, 185, 129, 0.12)"
                : "0 4px 24px rgba(239, 68, 68, 0.12)",
            }}
          >
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "7fr 5fr" }, gap: 3, alignItems: "center" }}>
              {/* Left Result Badge */}
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      bgcolor: result.verified ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                      color: result.verified ? "success.main" : "error.main",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {result.verified ? (
                      <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 36 }} />
                    ) : (
                      <ErrorOutlineOutlinedIcon sx={{ fontSize: 36 }} />
                    )}
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: result.verified ? "success.main" : "error.main" }}>
                      {result.verified ? "XÁC THỰC THÀNH CÔNG (TRÙNG KHỚP)" : "XÁC THỰC THẤT BẠI (KHÔNG KHỚP)"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {result.verified
                        ? "Khuôn mặt chụp đối chiếu trùng khớp với hồ sơ lưu trữ trong cơ sở dữ liệu."
                        : "Đặc trưng sinh trắc học không trùng khớp với hồ sơ đích đã chỉ định."}
                    </Typography>
                  </Box>
                </Stack>

                {/* Confidence Score Bar */}
                {confidencePercent != null ? (
                  <Box sx={{ mt: 1, p: 2, borderRadius: 2.5, bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", border: 1, borderColor: "divider" }}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", mb: 1, alignItems: "center" }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                        ĐỘ TIN CẬY SINH TRẮC HỌC (CONFIDENCE SCORE)
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900, color: result.verified ? "success.main" : "error.main" }}>
                        {confidencePercent}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(Number(confidencePercent), 100)}
                      color={result.verified ? "success" : "error"}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75, fontSize: "0.7rem" }}>
                      Ngưỡng chuẩn chấp thuận: <strong>≥ 75.0%</strong> · Thuật toán InsightFace ArcFace 512D
                    </Typography>
                  </Box>
                ) : null}

                {result.error ? (
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {result.error}
                  </Alert>
                ) : null}

                <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
                  <Button
                    startIcon={<RestartAltOutlinedIcon />}
                    variant="outlined"
                    onClick={reset}
                    sx={{ borderRadius: 2, fontWeight: 700 }}
                  >
                    Xác thực lượt mới
                  </Button>
                  {result.verified && lookedUpPatron?.student_code ? (
                    <Button
                      variant="contained"
                      startIcon={<MenuBookOutlinedIcon />}
                      onClick={() => router.push(`/borrow?student_code=${lookedUpPatron.student_code}`)}
                      sx={{
                        borderRadius: 2,
                        fontWeight: 800,
                        bgcolor: "#8B0000",
                        "&:hover": { bgcolor: "#6b0000" },
                      }}
                    >
                      Tạo phiếu mượn sách
                    </Button>
                  ) : null}
                </Stack>
              </Stack>

              {/* Right: Target Patron Details */}
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: (t) => t.palette.mode === "dark" ? "rgba(15, 23, 42, 0.4)" : "rgba(248, 250, 252, 0.8)",
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary" }}>
                  THÔNG TIN ĐỐI CHIẾU
                </Typography>

                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mt: 1.5, mb: 2 }}>
                  <Avatar
                    src={lookedUpPatron?.avatar_url || undefined}
                    sx={{ width: 48, height: 48, bgcolor: "primary.main", fontWeight: 800 }}
                  >
                    {lookedUpPatron?.full_name?.slice(0, 1) || "U"}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                      {lookedUpPatron?.full_name || "Người dùng ID: " + targetUserId.slice(0, 8) + "..."}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                      {lookedUpPatron?.student_code ? `MSSV: ${lookedUpPatron.student_code}` : `ID: ${targetUserId}`}
                    </Typography>
                  </Box>
                </Stack>

                <Stack spacing={1} sx={{ fontSize: "0.75rem" }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="caption" color="text.secondary">Thời gian đối soát:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {new Date().toLocaleTimeString("vi-VN")} - {new Date().toLocaleDateString("vi-VN")}
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="caption" color="text.secondary">Trạng thái bảo mật:</Typography>
                    <Chip
                      size="small"
                      label={result.verified ? "Hợp lệ" : "Từ chối"}
                      color={result.verified ? "success" : "error"}
                      sx={{ height: 18, fontSize: "0.62rem", fontWeight: 800 }}
                    />
                  </Stack>
                </Stack>
              </Paper>
            </Box>
          </Paper>
        </Box>
      ) : (
        /* Standalone Verification Form (2 Columns) */
        <Box component="form" onSubmit={handleSubmit} sx={staggerSx(1)}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "5fr 7fr" }, gap: 3 }}>
            {/* Left Column: Target Selector & Consent */}
            <Stack spacing={2.5}>
              {/* Mode Selector Tabs */}
              <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5, bgcolor: "background.paper" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                  1. Chỉ định người dùng đối chiếu
                </Typography>

                <Tabs
                  value={tabMode}
                  onChange={(_, val) => {
                    setTabMode(val);
                    setError("");
                  }}
                  sx={{
                    minHeight: 38,
                    mb: 2,
                    "& .MuiTab-root": { minHeight: 38, py: 0.5, fontSize: "0.78rem", fontWeight: 700, textTransform: "none" },
                  }}
                >
                  <Tab label="Mã sinh viên" value="patron" />
                  <Tab label="User ID hệ thống" value="userid" />
                </Tabs>

                {tabMode === "patron" ? (
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1}>
                      <TextField
                        placeholder="Nhập mã sinh viên (VD: 22664321)"
                        size="small"
                        fullWidth
                        value={studentCodeInput}
                        onChange={(e) => setStudentCodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleLookupPatron();
                          }
                        }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleLookupPatron()}
                        disabled={lookingUp || !studentCodeInput.trim()}
                        sx={{ borderRadius: 2, minWidth: 80, fontWeight: 700 }}
                      >
                        {lookingUp ? <CircularProgress size={18} color="inherit" /> : "Tìm"}
                      </Button>
                    </Stack>

                    {/* Patron Preview Card if Found */}
                    {lookedUpPatron ? (
                      <Box
                        sx={{
                          p: 1.75,
                          borderRadius: 2.5,
                          bgcolor: (t) => t.palette.mode === "dark" ? "rgba(139, 0, 0, 0.12)" : "rgba(139, 0, 0, 0.04)",
                          border: "1px solid",
                          borderColor: "rgba(139, 0, 0, 0.2)",
                        }}
                      >
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                          <Avatar
                            src={lookedUpPatron.avatar_url || undefined}
                            sx={{ width: 44, height: 44, bgcolor: "#8B0000", fontWeight: 800 }}
                          >
                            {lookedUpPatron.full_name?.slice(0, 1)}
                          </Avatar>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                              {lookedUpPatron.full_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              MSSV: {lookedUpPatron.student_code} · {lookedUpPatron.class_name || "Thư viện"}
                            </Typography>
                          </Box>
                          <Chip size="small" label="Đã chọn" color="success" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                        </Stack>
                      </Box>
                    ) : null}
                  </Stack>
                ) : (
                  <Stack spacing={1.5}>
                    <TextField
                      label="User ID"
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      placeholder="Nhập UUID người dùng"
                      size="small"
                      required
                      fullWidth
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    {user?.id ? (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setTargetUserId(user.id);
                          toast.info("Đã điền User ID của bạn.");
                        }}
                        sx={{ alignSelf: "flex-start", borderRadius: 2, fontSize: "0.72rem", fontWeight: 700 }}
                      >
                        Dùng User ID tài khoản hiện tại ({user.full_name || user.email})
                      </Button>
                    ) : null}
                  </Stack>
                )}
              </Paper>

              {/* Consent & Policy Card */}
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  p: 2.5,
                  bgcolor: "background.paper",
                  borderColor: "divider",
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                  2. Thỏa thuận dữ liệu sinh trắc học
                </Typography>

                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: (t) => t.palette.mode === "dark" ? "rgba(10, 37, 64, 0.4)" : "rgba(10, 37, 64, 0.04)",
                    border: "1px solid rgba(10, 37, 64, 0.15)",
                    mb: 1.5,
                  }}
                >
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
                    <LockOutlinedIcon sx={{ fontSize: 18, color: "#0A2540", mt: 0.25 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                      Dữ liệu ảnh khuôn mặt chỉ được trích xuất vector 512D tạm thời trong RAM để đối soát và tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
                    </Typography>
                  </Stack>
                </Box>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.82rem" }}>
                      Tôi đồng ý cho hệ thống xử lý dữ liệu khuôn mặt để xác thực 1:1.
                    </Typography>
                  }
                />
              </Paper>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={!imageFile || !targetUserId || !consent || isLoading}
                startIcon={<VerifiedUserOutlinedIcon />}
                fullWidth
                sx={{
                  borderRadius: 2.5,
                  fontWeight: 800,
                  py: 1.5,
                  bgcolor: "#8B0000",
                  "&:hover": { bgcolor: "#6b0000" },
                  boxShadow: "0 4px 14px rgba(139, 0, 0, 0.3)",
                }}
              >
                {isLoading ? "Đang gửi yêu cầu xác thực..." : "Tiến hành xác thực khuôn mặt"}
              </Button>
            </Stack>

            {/* Right Column: Camera Capture & Instructions */}
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 3,
                p: 2.5,
                bgcolor: "background.paper",
                borderColor: "divider",
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                Chụp hoặc tải ảnh đối soát
              </Typography>

              <CameraCapture
                title="Chụp ảnh chân dung người cần xác thực"
                overlayGuide="face"
                onCapture={handleCapture}
                onClear={() => setImageFile(null)}
              />

              {/* AI capture tips */}
              <Box
                sx={{
                  mt: 2.5,
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.02)",
                  border: "1px dashed",
                  borderColor: "divider",
                }}
              >
                <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mb: 1 }}>
                  <LightbulbOutlinedIcon sx={{ color: "#D4AF37", fontSize: 18 }} />
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "text.primary" }}>
                    HƯỚNG DẪN ĐẠT ĐỘ CHUẨN XÁC CAO NHẤT
                  </Typography>
                </Stack>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1 }}>
                  {[
                    "Khoảng cách 40 – 60cm từ camera",
                    "Ánh sáng đều, không ngược sáng",
                    "Nhìn thẳng, mắt ngang tầm ống kính",
                    "Không đeo kính râm hoặc khẩu trang",
                  ].map((tip, idx) => (
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }} key={idx}>
                      <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#D4AF37" }} />
                      <Typography variant="caption" color="text.secondary">
                        {tip}
                      </Typography>
                    </Stack>
                  ))}
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>
      )}
    </Stack>
  );
}
