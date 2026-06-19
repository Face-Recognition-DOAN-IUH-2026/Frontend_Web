"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertTitle,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  InputAdornment,
  LinearProgress,
  Slide,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import BadgeIcon from "@mui/icons-material/BadgeOutlined";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
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

const MAX_BORROW_BOOKS = 3;
const RAW_CAM_URL = process.env.NEXT_PUBLIC_BORROW_CAM_URL || "http://192.168.1.13:8080/video";
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
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h5" sx={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 1 }}>
          <BookIcon color="primary" />
          Tạo phiếu mượn sách
        </Typography>
        {patronId && (
          <Button variant="outlined" color="error" size="small" onClick={handleClearPatron}>
            Hủy phiên mượn
          </Button>
        )}
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
        <Grid size={{ xs: 12, md: 5, lg: 4 }} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Card variant="outlined" sx={{ flex: patronId ? "0 0 auto" : 1 }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 1 }}>
                  <BadgeIcon fontSize="small" color="primary" />
                  Xác minh độc giả
                </Typography>

                <TextField
                  value={patronCode}
                  onChange={(e) => setPatronCode(e.target.value)}
                  placeholder="Nhập mã số sinh viên..."
                  size="medium"
                  fullWidth
                  disabled={!!patronId}
                />

                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => { if (!patronId) startWebcam(); }}
                  disabled={faceVerifyDisabled}
                  startIcon={<FaceIcon />}
                  size="large"
                >
                  Xác minh mặt
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {patronId ? (
            <Card
              variant="outlined"
              sx={{
                flex: "0 0 auto",
                borderLeft: 4,
                borderLeftColor: overdueCount > 0 ? "error.main" : "success.main",
              }}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar sx={{ width: 48, height: 48, bgcolor: "primary.main" }}>
                      {patronName?.[0]?.toUpperCase() || "?"}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900 }} noWrap>
                        {patronName || patronId}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {patronCode}
                      </Typography>
                    </Box>
                    <Chip size="small" color="success" label="Đã xác minh" icon={<CheckCircleIcon />} />
                  </Box>

                  <Divider />

                  <Stack spacing={1}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" color="text.secondary">Số sách đã mượn</Typography>
                      <Chip size="small" color={activeCount >= MAX_BORROW_BOOKS ? "error" : "default"} label={`${activeCount}/${MAX_BORROW_BOOKS}`} />
                    </Box>
                    <LinearProgress variant="determinate" value={(activeCount / MAX_BORROW_BOOKS) * 100} color={activeCount >= MAX_BORROW_BOOKS ? "error" : "primary"} sx={{ borderRadius: 2, height: 6 }} />

                    {overdueCount > 0 && (
                      <Alert severity="error" sx={{ py: 0.5 }}>
                        <WarningIcon fontSize="small" sx={{ mr: 0.5 }} />
                        Có {overdueCount} cuốn sách quá hạn
                      </Alert>
                    )}

                    <Typography variant="body2" color={remaining > 0 ? "text.secondary" : "error"}>
                      {remaining > 0 ? `Có thể mượn thêm ${remaining} cuốn` : "Đã đạt giới hạn mượn"}
                    </Typography>
                  </Stack>

                  <Divider />

                  <Button variant="contained" size="large" fullWidth startIcon={<QrCodeScannerIcon />} disabled={!canBorrow} onClick={() => setScannerOpen(true)} sx={{ animation: `${fadeInUp} 0.3s ease-out` }}>
                    {canBorrow ? "Quét mã vạch sách" : overdueCount > 0 ? "Cần trả sách quá hạn" : "Đã đạt giới hạn"}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <Card variant="outlined" sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CardContent>
                <Stack spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}>
                  <BadgeIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                    Nhập MSSV hoặc quét khuôn mặt<br />để xác minh độc giả
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          )}

          {patronId && patronCode.trim() && (
            <Box sx={{ flex: "0 0 auto", animation: `${fadeInUp} 0.4s ease-out` }}>
              <BookRecommendations studentCode={patronCode.trim()} />
            </Box>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 7, lg: 8 }} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Card variant="outlined" sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", p: { xs: 1, md: 2 } }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                {patronId ? <CameraAltIcon color="primary" /> : <VideocamIcon color="primary" />}
                <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                  {patronId ? "Quét mã vạch sách" : "Xác minh khuôn mặt"}
                </Typography>
              </Stack>

              {patronId ? (
                <Box sx={{ flex: 1, bgcolor: "black", borderRadius: 1, overflow: "hidden", position: "relative", minHeight: 300 }}>
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
                <Box sx={{ flex: 1, bgcolor: "black", borderRadius: 1, overflow: "hidden", position: "relative", minHeight: 400 }}>
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
            </CardContent>
          </Card>
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

      <Snackbar open={!!snackbar} autoHideDuration={3200} onClose={() => setSnackbar(null)} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        {snackbar ? (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)} sx={{ animation: `${slideInRight} 0.3s ease-out`, boxShadow: 4 }}>
            {snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
