"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Alert, Box, Button, Checkbox, FormControlLabel, LinearProgress, Stack, TextField, Typography } from "@mui/material";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import FaceIcon from "@mui/icons-material/FaceOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import VideocamIcon from "@mui/icons-material/VideocamOutlined";
import CircularProgress from "@mui/material/CircularProgress";
import CameraCapture from "@/components/camera-capture";
import JobPoll from "@/components/job-poll";
import { useAuth } from "@/lib/auth-context";
import api, { getErrorMessage } from "@/lib/api-client";
import type { TaskResult } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import DashboardCard from "@/components/ui/DashboardCard";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import EmptyState from "@/components/ui/EmptyState";
import { staggerSx } from "@/lib/useStaggeredAnimation";

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

function BorrowVerifyFlow({ studentCode, onDone }: { studentCode: string; onDone: () => void }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
      if (!ctx) { setError("Canvas context error"); setVerifying(false); return; }
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => { if (b) resolve(b); else reject(new Error("toBlob failed")); }, "image/jpeg", 0.85);
      });
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

      const lookupResult = await api.lookupPatron(studentCode);
      if (!lookupResult.exists || !lookupResult.patron) { setError("Không tìm thấy độc giả"); setVerifying(false); return; }
      if (lookupResult.is_expired) { setError("Thẻ độc giả đã hết hạn"); setVerifying(false); return; }
      if (lookupResult.is_locked) { setError("Thẻ độc giả đã bị khóa"); setVerifying(false); return; }

      const verifyResult = await api.verifyFace(file, lookupResult.patron.id, true);

      let attempts = 0;
      const maxAttempts = 30;
      while (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000));
        const taskStatus = await api.getTaskStatus(verifyResult.job_id);
        if (taskStatus.status === "SUCCESS" && taskStatus.result) {
          if (taskStatus.result.verified) {
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
              setTimeout(() => router.push("/borrow"), 1000);
              return;
            } catch (err: any) {
              const status = err?.response?.status || err?.status;
              if (status === 403) { setError("Độc giả chưa ở trong thư viện hoặc thẻ đã bị khóa."); }
              else { setError(getErrorMessage(err) || "Không thể kiểm tra thông tin độc giả"); }
              setVerifying(false);
              return;
            }
          }
          setError("Khuôn mặt không khớp với độc giả này");
          setVerifying(false);
          return;
        }
        if (taskStatus.status === "FAILURE" || taskStatus.status === "ERROR") {
          setError(taskStatus.result?.error || taskStatus.result?.detail || "Xác minh thất bại");
          setVerifying(false);
          return;
        }
        attempts++;
      }
      setError("Hết thời gian chờ xác minh");
      setVerifying(false);
    } catch (err) {
      setError(getErrorMessage(err) || "Lỗi xác minh khuôn mặt");
      setVerifying(false);
    }
  }, [studentCode, stopCamera, router, setError, setVerifying, setSuccess]);

  return (
    <Stack spacing={3} sx={{ maxWidth: 920, mx: "auto" }}>
      <Box sx={staggerSx(0)}>
        <PageHeader
          title="Xác minh khuôn mặt"
          subtitle={`Độc giả: ${studentCode}`}
          icon={VerifiedUserOutlinedIcon}
          gradient="linear-gradient(135deg, #064e3b 0%, #059669 50%, #10b981 100%)"
          backHref="/borrow"
        />
      </Box>

      {error ? (
        <Box sx={staggerSx(1)}>
          <Alert severity="error" sx={{ width: "100%" }} onClose={() => setError("")}>{error}</Alert>
        </Box>
      ) : null}

      <Box sx={staggerSx(1)}>
        <DashboardCard>
          <Stack spacing={2.5} sx={{ alignItems: "center" }}>
            {success ? (
              <Stack spacing={2} sx={{ alignItems: "center", py: 4, width: "100%" }}>
                <CircularProgress size={48} color="success" />
                <Typography variant="h6" color="success.main" sx={{ fontWeight: 900 }}>Xác minh thành công!</Typography>
                <Typography variant="body2" color="text.secondary">Đang chuyển về trang mượn sách...</Typography>
              </Stack>
            ) : (
              <Box sx={{ width: "100%", position: "relative", borderRadius: 1, overflow: "hidden", bgcolor: "black" }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "auto", display: "block", transform: "scaleX(-1)" }} />
                {!cameraReady && !cameraError ? (
                  <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.55)", color: "common.white", alignItems: "center", justifyContent: "center" }} spacing={1}>
                    <CircularProgress size={28} color="inherit" />
                    <Typography variant="body2">Đang khởi động camera...</Typography>
                  </Stack>
                ) : null}
                {cameraError ? (
                  <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.75)", color: "error.main", alignItems: "center", justifyContent: "center", p: 3 }} spacing={1}>
                    <VideocamIcon sx={{ fontSize: 48 }} />
                    <Typography variant="body2" sx={{ textAlign: "center" }}>{cameraError}</Typography>
                    <Button size="small" variant="outlined" color="inherit" onClick={() => { setCameraError(""); streamRef.current = null; }}>
                      Thử lại
                    </Button>
                  </Stack>
                ) : null}
                {verifying && cameraReady ? (
                  <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.5)", alignItems: "center", justifyContent: "center" }} spacing={1}>
                    <CircularProgress size={28} color="inherit" />
                    <Typography variant="body2" sx={{ color: "common.white" }}>Đang xác minh...</Typography>
                  </Stack>
                ) : null}
              </Box>
            )}

            {!success ? (
              <Stack direction="row" spacing={1.5} sx={{ width: "100%" }}>
                <Button variant="outlined" fullWidth startIcon={<VerifiedUserOutlinedIcon />} onClick={() => router.push("/borrow")} disabled={verifying}>
                  Quay lại
                </Button>
                <Button variant="contained" fullWidth startIcon={verifying ? undefined : <FaceIcon />} onClick={handleVerify} disabled={verifying || !cameraReady || !!cameraError}>
                  {verifying ? "Đang xác minh..." : "Xác minh ngay"}
                </Button>
              </Stack>
            ) : null}
          </Stack>
        </DashboardCard>
      </Box>
    </Stack>
  );
}

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const studentCode = searchParams.get("student_code") || "";
  const { accessToken } = useAuth();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [targetUserId, setTargetUserId] = useState("");
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TaskResult | null>(null);

  useEffect(() => {
    if (accessToken) {
      const payload = decodeJwt(accessToken);
      if (payload?.sub) setTargetUserId(payload.sub);
    }
  }, [accessToken]);

  const handleCapture = (file: File) => {
    setImageFile(file);
    setResult(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!imageFile || !targetUserId) return;
    setError("");
    setIsLoading(true);
    setJobId(null);
    try {
      const res = await api.verifyFace(imageFile, targetUserId, consent);
      setJobId(res.job_id);
    } catch (err: any) {
      setError(getErrorMessage(err) || "Xác thực thất bại.");
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

  if (studentCode) return <BorrowVerifyFlow studentCode={studentCode} onDone={() => {}} />;

  return (
    <Stack spacing={3} sx={{ maxWidth: 920, mx: "auto" }}>
      <Box sx={staggerSx(0)}>
        <PageHeader
          title="Xác minh khuôn mặt"
          subtitle="So khớp ảnh hiện tại với hồ sơ khuôn mặt của một người dùng cụ thể."
          icon={VerifiedUserOutlinedIcon}
          gradient="linear-gradient(135deg, #134e4a 0%, #0d9488 50%, #14b8a6 100%)"
        />
      </Box>

      {error ? (
        <Box sx={staggerSx(1)}>
          <Alert severity="error">{error}</Alert>
        </Box>
      ) : null}

      {jobId ? (
        <Box sx={staggerSx(1)}>
          <DashboardCard>
            <JobPoll
              jobId={jobId}
              onComplete={(value) => { setResult(value); setIsLoading(false); setJobId(null); }}
              onError={(message) => { setError(message); setIsLoading(false); setJobId(null); }}
            />
          </DashboardCard>
        </Box>
      ) : result ? (
        <Box sx={staggerSx(1)}>
          <DashboardCard>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                {result.verified ? <CheckCircleOutlineOutlinedIcon color="success" sx={{ fontSize: 44 }} /> : <ErrorOutlineOutlinedIcon color="error" sx={{ fontSize: 44 }} />}
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 850 }}>
                    {result.verified ? "Xác thực thành công" : "Xác thực thất bại"}
                  </Typography>
                  {result.score != null ? (
                    <Typography color="text.secondary">Độ tin cậy: {(Number(result.score) * 100).toFixed(1)}%</Typography>
                  ) : null}
                </Box>
              </Stack>
              {result.score != null ? (
                <LinearProgress variant="determinate" value={Math.min(Number(result.score) * 100, 100)} color={result.verified ? "success" : "error"} sx={{ height: 8, borderRadius: 99 }} />
              ) : null}
              {result.error ? <Alert severity="error">{result.error}</Alert> : null}
              <Button startIcon={<RestartAltOutlinedIcon />} variant="outlined" onClick={reset} sx={{ alignSelf: "flex-start" }}>
                Thử lại
              </Button>
            </Stack>
          </DashboardCard>
        </Box>
      ) : (
        <Box sx={staggerSx(1)}>
          <DashboardCard>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <CameraCapture onCapture={handleCapture} />
                <TextField
                  label="User ID"
                  value={targetUserId}
                  onChange={(event) => setTargetUserId(event.target.value)}
                  placeholder="User ID cần xác thực"
                  required
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <FormControlLabel
                  control={<Checkbox checked={consent} onChange={(event) => setConsent(event.target.checked)} />}
                  label="Tôi đồng ý cho hệ thống xử lý dữ liệu khuôn mặt để xác thực."
                />
                <Button type="submit" variant="contained" disabled={!imageFile || !targetUserId || !consent || isLoading} fullWidth>
                  {isLoading ? "Đang gửi..." : "Xác thực khuôn mặt"}
                </Button>
              </Stack>
            </Box>
          </DashboardCard>
        </Box>
      )}
    </Stack>
  );
}
