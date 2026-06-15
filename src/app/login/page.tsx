"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import FaceRetouchingNaturalOutlinedIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import { useAuth } from "@/lib/auth-context";
import api, { getErrorMessage } from "@/lib/api-client";

type LoginMode = "password" | "face";

export default function LoginPage() {
  const theme = useTheme();
  const { login, setAuthFromToken } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [success, setSuccess] = useState(false);
  const faceFailCountRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCaptureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOn(false);
    setCameraReady(false);
  }, []);

  const resetFaceState = () => {
    setImagePreview(null);
  };

  const startCamera = useCallback(async () => {
    try {
      setError("");
      setCameraReady(false);
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraOn(true);
    } catch (err: any) {
      if (err.name === "NotAllowedError") setError("Không có quyền truy cập camera. Hãy cấp quyền camera rồi thử lại.");
      else if (err.name === "NotFoundError") setError("Không tìm thấy camera trên thiết bị.");
      else setError("Không thể truy cập camera.");
      setIsCameraOn(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!isCameraOn || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const onReady = () => setCameraReady(true);
    video.onloadedmetadata = onReady;
    video.onplaying = onReady;
    video.onerror = () => setError("Camera gặp lỗi.");
    video.srcObject = streamRef.current;
    if (video.readyState >= 2) onReady();
    readyTimeoutRef.current = setTimeout(() => setCameraReady(true), 3000);
    return () => {
      if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
      if (autoCaptureTimeoutRef.current) clearTimeout(autoCaptureTimeoutRef.current);
      video.onloadedmetadata = null;
      video.onplaying = null;
      video.onerror = null;
      video.srcObject = null;
    };
  }, [isCameraOn]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const doFaceLogin = useCallback(async (file: File) => {
    setError("");
    setIsLoading(true);
    try {
      const res = await api.faceLogin(file);
      if (!res.access_token) throw new Error("Backend did not return access_token");
      const payload = JSON.parse(atob(res.access_token.split(".")[1]));
      const userEmail = payload?.email || "";
      const role = ((payload?.roles as string[])?.[0]) || "user";
      setAuthFromToken(res.access_token, res.refresh_token, userEmail, role);
      setSuccess(true);
      setIsLoading(false);
      faceFailCountRef.current = 0;
      setTimeout(() => router.push("/dashboard"), 500);
    } catch (err: any) {
      const msg = getErrorMessage(err) || "Đăng nhập thất bại.";
      setError(msg);
      setIsLoading(false);
      const newCount = faceFailCountRef.current + 1;
      faceFailCountRef.current = newCount;
      if (newCount >= 2) {
        setMode("password");
        faceFailCountRef.current = 0;
        resetFaceState();
        stopCamera();
        setError(`${msg} Chuyển sang đăng nhập bằng mật khẩu.`);
      } else {
        resetFaceState();
        startCamera();
      }
    }
  }, [router, setAuthFromToken, startCamera, stopCamera]);

  const capturePhoto = useCallback((callback?: (file: File) => void) => {
    const video = videoRef.current;
    if (!video || !cameraReady || video.videoWidth === 0 || video.videoHeight === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "face.jpg", { type: "image/jpeg" });
      setImagePreview(canvas.toDataURL("image/jpeg"));
      callback?.(file);
    }, "image/jpeg", 0.9);
  }, [cameraReady]);

  const autoCapture = useCallback(() => {
    capturePhoto((file) => {
      stopCamera();
      doFaceLogin(file);
    });
  }, [capturePhoto, doFaceLogin, stopCamera]);

  useEffect(() => {
    if (cameraReady && mode === "face" && !imagePreview && !isLoading) {
      autoCaptureTimeoutRef.current = setTimeout(autoCapture, 1500);
    }
    return () => {
      if (autoCaptureTimeoutRef.current) clearTimeout(autoCaptureTimeoutRef.current);
    };
  }, [cameraReady, mode, imagePreview, isLoading, autoCapture]);

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(getErrorMessage(err) || "Đăng nhập thất bại.");
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (_event: React.MouseEvent<HTMLElement>, value: LoginMode | null) => {
    if (!value) return;
    setMode(value);
    setError("");
    resetFaceState();
    faceFailCountRef.current = 0;
    if (value === "password") stopCamera();
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        p: 2,
        bgcolor: "background.default",
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          width: "100%",
          maxWidth: 460,
          p: 4,
          background: `linear-gradient(180deg, ${theme.palette.background.paper}, ${theme.palette.background.default})`,
        }}
      >
        <Stack spacing={3}>
          <Stack spacing={1.25} sx={{ alignItems: "center", textAlign: "center" }}>
            <Box sx={{ width: 58, height: 58, borderRadius: 2, bgcolor: "primary.main", color: "primary.contrastText", display: "grid", placeItems: "center" }}>
              <AutoStoriesOutlinedIcon fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: 0 }}>THƯ VIỆN IUH</Typography>
              <Typography color="text.secondary">Đăng nhập vào hệ thống quản lý</Typography>
            </Box>
          </Stack>

          <ToggleButtonGroup value={mode} exclusive onChange={switchMode} fullWidth color="primary">
            <ToggleButton value="password">Mật khẩu</ToggleButton>
            <ToggleButton value="face">Khuôn mặt</ToggleButton>
          </ToggleButtonGroup>

          {error && <Alert severity="error">{error}</Alert>}

          {success ? (
            <Alert icon={<CheckCircleOutlineOutlinedIcon />} severity="success">
              Đăng nhập thành công. Đang chuyển hướng...
            </Alert>
          ) : isLoading ? (
            <Stack sx={{ py: 5, alignItems: "center" }} spacing={2}>
              <CircularProgress />
              <Typography color="text.secondary">{mode === "face" ? "Đang xác thực khuôn mặt..." : "Đang đăng nhập..."}</Typography>
            </Stack>
          ) : mode === "password" ? (
            <Box component="form" onSubmit={handlePasswordSubmit}>
              <Stack spacing={2}>
                <TextField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required fullWidth />
                <TextField label="Mật khẩu" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required fullWidth />
                <Button type="submit" variant="contained" startIcon={<LoginOutlinedIcon />} size="large" fullWidth>
                  Đăng nhập
                </Button>
              </Stack>
            </Box>
          ) : (
            <Stack spacing={2}>
              <Paper
                variant="outlined"
                sx={{ aspectRatio: "16 / 9", overflow: "hidden", bgcolor: "black", display: "grid", placeItems: "center", position: "relative" }}
              >
                {imagePreview ? (
                  <Box component="img" src={imagePreview} alt="Ảnh khuôn mặt" sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : isCameraOn ? (
                  <>
                    <Box component="video" ref={videoRef} autoPlay playsInline muted sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    {!cameraReady && (
                      <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.55)", color: "common.white", alignItems: "center", justifyContent: "center" }}>
                        <CircularProgress color="inherit" size={26} />
                        <Typography variant="body2" sx={{ mt: 1 }}>Đang kết nối camera...</Typography>
                      </Stack>
                    )}
                    {cameraReady && (
                      <Box sx={{ position: "absolute", width: 190, height: 190, border: 2, borderColor: "primary.main", borderRadius: "50%", opacity: 0.7 }} />
                    )}
                  </>
                ) : (
                  <Stack spacing={1} sx={{ alignItems: "center", color: "grey.300" }}>
                    <FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: 42 }} />
                    <Typography>Bật camera để đăng nhập bằng khuôn mặt</Typography>
                  </Stack>
                )}
              </Paper>

              {imagePreview ? (
                <Button variant="outlined" onClick={() => { resetFaceState(); startCamera(); }}>
                  Chụp lại
                </Button>
              ) : !isCameraOn ? (
                <Button variant="contained" startIcon={<PhotoCameraOutlinedIcon />} onClick={startCamera}>
                  Bật camera
                </Button>
              ) : (
                <Button color="error" variant="outlined" startIcon={<StopCircleOutlinedIcon />} onClick={stopCamera}>
                  Tắt camera
                </Button>
              )}
            </Stack>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
