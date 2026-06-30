"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertTitle,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Slide,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import BadgeIcon from "@mui/icons-material/BadgeOutlined";
import BorrowIcon from "@mui/icons-material/AssignmentIndOutlined";
import CameraAltIcon from "@mui/icons-material/CameraAltOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import FaceIcon from "@mui/icons-material/FaceOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScannerOutlined";
import VideocamIcon from "@mui/icons-material/VideocamOutlined";
import WarningIcon from "@mui/icons-material/WarningAmberOutlined";
import BorrowIPCameraDialog from "@/components/BorrowIPCameraDialog";
import BookRecommendations from "@/components/BookRecommendations";
import api, { getErrorMessage } from "@/lib/api-client";
import { fadeInUp, slideInRight } from "@/lib/animations";
import NoticeSnackbar from "@/components/ui/NoticeSnackbar";

const MAX_BORROW_BOOKS = 3;
const RAW_CAM_URL = process.env.NEXT_PUBLIC_BORROW_CAM_URL || "http://192.168.1.6:8080/video";
const BORROW_CAM_URL = `/api/camera/proxy?url=${encodeURIComponent(RAW_CAM_URL)}`;

export default function BorrowPage() {
  const [patronCode, setPatronCode] = useState("");
  const [patronId, setPatronId] = useState<string | null>(null);
  const [patronName, setPatronName] = useState("");
  const [activeCount, setActiveCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [error, setError] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ severity: "success" | "error" | "warning"; message: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [faceScanning, setFaceScanning] = useState(false);

  const remaining = MAX_BORROW_BOOKS - activeCount;
  const canBorrow = remaining > 0 && overdueCount === 0;

  const setPatron = useCallback((code: string, id: string, name: string) => {
    setPatronCode(code);
    setPatronId(id);
    setPatronName(name);
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const startWebcam = useCallback(async () => {
    setCameraError("");
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
  }, []);

  useEffect(() => {
    if (!patronId && patronCode.trim()) {
      startWebcam();
    } else if (patronId) {
      stopCamera();
    }
    return () => stopCamera();
  }, [patronId, patronCode, startWebcam, stopCamera]);

  const handleFaceVerify = useCallback(async () => {
    if (!videoRef.current || !patronCode.trim()) return;
    setFaceScanning(true);
    setError("");

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setError("Canvas context error"); setFaceScanning(false); return; }
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => { if (b) resolve(b); else reject(new Error("toBlob failed")); }, "image/jpeg", 0.85);
      });
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

      const lookupResult = await api.lookupPatron(patronCode.trim());
      if (!lookupResult.exists || !lookupResult.patron) {
        setError("Không tìm thấy độc giả"); setFaceScanning(false); return;
      }
      if (lookupResult.is_expired) {
        setError("Thẻ độc giả đã hết hạn"); setFaceScanning(false); return;
      }
      const verifyResult = await api.verifyFace(file, lookupResult.patron.id, true);

      let attempts = 0;
      const maxAttempts = 30;
      while (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000));
        const taskStatus = await api.getTaskStatus(verifyResult.job_id);
        if (taskStatus.status === "SUCCESS" && taskStatus.result) {
          if (taskStatus.result.verified) {
            try {
              const data = await api.getActiveBorrowsByStudentCode(patronCode.trim());
              stopCamera();
              setPatron(patronCode.trim(), data.patron.id, data.patron.full_name || data.patron.student_code);
              setActiveCount(data.total);
              setOverdueCount(data.overdue_count);
              setSnackbar({ severity: "success", message: `Đã xác minh khuôn mặt: ${data.patron.full_name || data.patron.student_code}` });
              setFaceScanning(false);
              return;
            } catch (err: any) {
              const status = err?.response?.status || err?.status;
              if (status === 403) {
                setError("Độc giả chưa ở trong thư viện hoặc thẻ đã bị khóa.");
              } else {
                setError(getErrorMessage(err) || "Không thể kiểm tra thông tin độc giả");
              }
              setFaceScanning(false);
              return;
            }
          }
          setError("Khuôn mặt không khớp với độc giả này");
          setFaceScanning(false);
          return;
        }
        if (taskStatus.status === "FAILURE" || taskStatus.status === "ERROR") {
          setError(taskStatus.result?.error || taskStatus.result?.detail || "Xác minh thất bại");
          setFaceScanning(false);
          return;
        }
        attempts++;
      }
      setError("Hết thời gian chờ xác minh");
      setFaceScanning(false);
    } catch (err) {
      setError(getErrorMessage(err) || "Lỗi xác minh khuôn mặt");
      setFaceScanning(false);
    }
  }, [patronCode, stopCamera, setPatron]);

  const handleScanSuccess = useCallback((message: string) => {
    setSnackbar({ severity: "success", message });
    setTimeout(() => window.location.reload(), 1500);
  }, []);

  const handleClearPatron = () => {
    setPatronId(null);
    setPatronName("");
    setActiveCount(0);
    setOverdueCount(0);
    setPatronCode("");
  };

  const faceVerifyDisabled = faceScanning || !patronCode.trim() || !!patronId;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "calc(100vh - 120px)" }}>
      {/* Gradient Header */}
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
            <BorrowIcon sx={{ color: "#a5b4fc", fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#e0e7ff" }}>Tạo phiếu mượn sách</Typography>
            <Typography variant="body2" sx={{ color: "rgba(199,210,254,0.7)", mt: 0.3 }}>
              {patronId ? `Đang mượn: ${patronName} — ${activeCount}/${MAX_BORROW_BOOKS} sách` : "Quét khuôn mặt hoặc nhập MSSV để bắt đầu"}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ zIndex: 1 }}>
          {patronId && (
            <Button variant="outlined" size="small" onClick={handleClearPatron}
              sx={{ color: "#a5b4fc", borderColor: "rgba(165,180,252,0.4)", "&:hover": { borderColor: "#a5b4fc", bgcolor: "rgba(165,180,252,0.08)" } }}>
              Hủy phiên
            </Button>
          )}
        </Stack>
      </Box>

      {error ? (
        <Slide direction="down" in={!!error} timeout={250}>
          <Alert severity="error" onClose={() => setError("")} sx={{ animation: `${slideInRight} 0.25s ease-out` }}>
            <AlertTitle>Lỗi</AlertTitle>
            {error}
          </Alert>
        </Slide>
      ) : null}

      <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <Grid size={{ xs: 12, md: 5, lg: 4 }} sx={{ display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", minHeight: 0 }}>
          {/* Patron Verification Section */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, borderColor: "divider" }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Avatar sx={{ bgcolor: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", width: 36, height: 36 }}>
                  <BadgeIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Xác minh độc giả</Typography>
              </Stack>
              <TextField
                value={patronCode}
                onChange={(e) => setPatronCode(e.target.value)}
                placeholder="Nhập mã số sinh viên..."
                size="small"
                fullWidth
                disabled={!!patronId}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "background.paper", "&:hover": { "& fieldset": { borderColor: "primary.main" } } } }}
              />
              <Button
                variant="contained"
                fullWidth
                onClick={() => { if (!patronId) startWebcam(); }}
                disabled={faceVerifyDisabled}
                startIcon={<FaceIcon />}
                sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none", background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)", "&:hover": { background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)", transform: "translateY(-1px)" }, transition: "all 0.2s" }}
              >
                Xác minh khuôn mặt
              </Button>
            </Stack>
          </Paper>

          {patronId ? (
            /* Patron Info Card */
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 3,
                borderLeft: 4,
                borderLeftColor: overdueCount > 0 ? "error.main" : "success.main",
                animation: `${fadeInUp} 0.4s ease-out`,
                "&:hover": { boxShadow: 2 },
                transition: "box-shadow 0.2s",
              }}
            >
              <Stack spacing={2}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar sx={{ width: 48, height: 48, background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
                    {patronName?.[0]?.toUpperCase() || "?"}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }} noWrap>{patronName || patronId}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>{patronCode}</Typography>
                  </Box>
                  <Chip size="small" color="success" label="Đã xác minh" icon={<CheckCircleIcon />} sx={{ fontWeight: 600 }} />
                </Box>
                <Divider />
                <Stack spacing={1}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Số sách đã mượn</Typography>
                    <Chip size="small" color={activeCount >= MAX_BORROW_BOOKS ? "error" : "primary"} label={`${activeCount}/${MAX_BORROW_BOOKS}`} sx={{ fontWeight: 700 }} />
                  </Box>
                  <LinearProgress variant="determinate" value={(activeCount / MAX_BORROW_BOOKS) * 100} color={activeCount >= MAX_BORROW_BOOKS ? "error" : "primary"} sx={{ borderRadius: 2, height: 6, bgcolor: "action.hover", "& .MuiLinearProgress-bar": { borderRadius: 2 } }} />
                  {overdueCount > 0 && (
                    <Alert severity="error" sx={{ py: 0.5, borderRadius: 2 }}>
                      <WarningIcon fontSize="small" sx={{ mr: 0.5 }} />
                      Có {overdueCount} cuốn sách quá hạn
                    </Alert>
                  )}
                  <Typography variant="body2" color={remaining > 0 ? "text.secondary" : "error"} sx={{ fontWeight: 600 }}>
                    {remaining > 0 ? `Có thể mượn thêm ${remaining} cuốn` : "Đã đạt giới hạn mượn"}
                  </Typography>
                </Stack>
                <Divider />
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<QrCodeScannerIcon />}
                  disabled={!canBorrow}
                  onClick={() => setScannerOpen(true)}
                  sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none", py: 1.5, background: canBorrow ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : undefined, "&:hover": canBorrow ? { background: "linear-gradient(135deg, #059669 0%, #047857 100%)" } : {} }}
                >
                  {canBorrow ? "Quét mã vạch sách" : overdueCount > 0 ? "Cần trả sách quá hạn" : "Đã đạt giới hạn"}
                </Button>
              </Stack>
            </Paper>
          ) : (
            /* Empty State */
            <Paper variant="outlined" sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3, borderColor: "divider", minHeight: 200 }}>
              <Stack spacing={1.5} sx={{ alignItems: "center", color: "text.secondary" }}>
                <BadgeIcon sx={{ fontSize: 56, opacity: 0.2 }} />
                <Typography variant="body1" sx={{ fontWeight: 700, textAlign: "center" }}>
                  Nhập MSSV hoặc quét khuôn mặt<br />để xác minh độc giả
                </Typography>
              </Stack>
            </Paper>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 7, lg: 8 }} sx={{ display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", minHeight: 0 }}>
          {/* Camera/Video Area */}
          <Paper variant="outlined" sx={{ display: "flex", flexDirection: "column", p: { xs: 1, md: 2 }, borderRadius: 3, borderColor: "divider" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
              {patronId ? <CameraAltIcon color="primary" /> : <VideocamIcon color="primary" />}
              <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                {patronId ? "Quét mã vạch sách" : "Xác minh khuôn mặt"}
              </Typography>
            </Stack>

            {patronId ? (
              <Box sx={{ bgcolor: "black", borderRadius: 3, overflow: "hidden", position: "relative", minHeight: 300 }}>
                <Stack spacing={2} sx={{ alignItems: "center", justifyContent: "center", height: "100%", color: "grey.400", p: 4 }}>
                  <QrCodeScannerIcon sx={{ fontSize: 72, opacity: 0.3 }} />
                  <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center" }}>
                    {"Bấm nút \"Quét mã vạch sách\" để mở IP Camera"}
                  </Typography>
                  <Button variant="outlined" color="inherit" startIcon={<QrCodeScannerIcon />} onClick={() => setScannerOpen(true)} disabled={!canBorrow}>
                    Mở IP Camera
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Box sx={{ bgcolor: "black", borderRadius: 3, overflow: "hidden", position: "relative", minHeight: 400 }}>
                {cameraError ? (
                  <Stack spacing={1.5} sx={{ alignItems: "center", justifyContent: "center", height: "100%", color: "grey.300", p: 3 }}>
                    <VideocamIcon sx={{ fontSize: 48 }} />
                    <Typography sx={{ textAlign: "center" }}>{cameraError}</Typography>
                    <Button size="small" variant="outlined" color="inherit" onClick={startWebcam}>Thử lại</Button>
                  </Stack>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", transform: "scaleX(-1)" }}
                    />
                    {!cameraReady && (
                      <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.55)", color: "common.white", alignItems: "center", justifyContent: "center" }} spacing={1}>
                        <CircularProgress size={28} color="inherit" />
                        <Typography variant="body2">Đang khởi động camera...</Typography>
                      </Stack>
                    )}
                    {faceScanning && cameraReady && (
                      <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.5)", alignItems: "center", justifyContent: "center" }} spacing={1}>
                        <CircularProgress size={28} color="inherit" />
                        <Typography variant="body2" sx={{ color: "common.white" }}>Đang xác minh...</Typography>
                      </Stack>
                    )}
                    <Stack direction="row" spacing={1} sx={{ position: "absolute", bottom: 12, left: 12, right: 12, justifyContent: "center" }}>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={startWebcam}
                        disabled={cameraReady}
                        sx={{ display: cameraReady ? "none" : undefined }}
                      >
                        Mở camera
                      </Button>
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={<FaceIcon />}
                        onClick={handleFaceVerify}
                        disabled={!cameraReady || faceScanning || !patronCode.trim()}
                        sx={{ display: cameraReady ? undefined : "none", minWidth: 200 }}
                      >
                        {faceScanning ? "Đang xác minh..." : "Xác minh khuôn mặt"}
                      </Button>
                    </Stack>
                  </>
                )}
              </Box>
            )}
          </Paper>

          {patronId && patronCode.trim() && (
            <Box sx={{ animation: `${fadeInUp} 0.4s ease-out` }}>
              <BookRecommendations studentCode={patronCode.trim()} />
            </Box>
          )}
        </Grid>
      </Grid>

      <BorrowIPCameraDialog
        open={scannerOpen}
        patronId={patronId || ""}
        patronName={patronName}
        maxItems={remaining > 0 ? remaining : undefined}
        cameraUrl={BORROW_CAM_URL}
        onClose={() => setScannerOpen(false)}
        onSuccess={handleScanSuccess}
      />

      <NoticeSnackbar
        open={!!snackbar}
        message={snackbar?.message || ""}
        severity={snackbar?.severity || "success"}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      />
    </Box>
  );
}
