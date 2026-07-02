"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import { bus } from "@/lib/event-bus";
import api, { retryPendingRequests, cancelPendingRequests } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export default function ReauthOverlay() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"password" | "face">("password");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const unsubRequired = bus.on("auth:required", () => setOpen(true));
    const unsubCancelled = bus.on("auth:cancelled", () => {
      setOpen(false);
      cancelPendingRequests();
    });
    return () => {
      unsubRequired();
      unsubCancelled();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setMode("password");
      setPassword("");
      setError("");
    }
  }, [open]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setError("Không thể mở camera");
      setMode("password");
    }
  }, [stopCamera]);

  useEffect(() => {
    if (mode === "face") startCamera();
    return () => { if (mode === "face") stopCamera(); };
  }, [mode, startCamera, stopCamera]);

  const captureAndLogin = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    if (!blob) return;
    const file = new File([blob], "face.jpg", { type: "image/jpeg" });
    setLoading(true);
    setError("");
    try {
      const res = await api.faceLogin(file);
      if (res.access_token) {
        retryPendingRequests(res.access_token);
        setOpen(false);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Xác thực khuôn mặt thất bại");
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login({ email: user?.email || "", password });
      if (!res.access_token) throw new Error("Không nhận được token");
      retryPendingRequests(res.access_token);
      setOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    cancelPendingRequests();
    setOpen(false);
  };

  if (!open) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
      }}
    >
      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: 3,
          p: 4,
          width: "100%",
          maxWidth: 400,
          mx: 2,
          position: "relative",
        }}
      >
        <IconButton
          onClick={() => { setOpen(false); cancelPendingRequests(); }}
          sx={{ position: "absolute", top: 8, right: 8 }}
          size="small"
        >
          <CloseOutlinedIcon />
        </IconButton>

        <Typography variant="h6" sx={{ textAlign: "center", fontWeight: 700, mb: 0.5 }}>
          Phiên đăng nhập hết hạn
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 3 }}>
          Vui lòng xác thực lại để tiếp tục
        </Typography>

        {error && (
          <Typography color="error" variant="body2" sx={{ textAlign: "center", mb: 2 }}>
            {error}
          </Typography>
        )}

        {mode === "password" ? (
          <Box component="form" onSubmit={handlePasswordSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Email" value={user?.email || ""} disabled size="small" />
            <TextField
              label="Mật khẩu"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              size="small"
              autoFocus
              slotProps={{ htmlInput: { "aria-label": "mật khẩu" } }}
            />
            <Button type="submit" variant="contained" disabled={loading || !password} sx={{ textTransform: "none" }}>
              {loading ? <CircularProgress size={20} /> : "Đăng nhập"}
            </Button>
            <Button
              variant="text"
              onClick={() => setMode("face")}
              startIcon={<CameraAltOutlinedIcon />}
              sx={{ textTransform: "none" }}
            >
              Đăng nhập bằng khuôn mặt
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{
                position: "relative",
                overflow: "hidden",
                borderRadius: 2,
                bgcolor: "common.black",
                aspectRatio: "4 / 3",
              }}
            >
              <Box component="video" ref={videoRef} autoPlay playsInline muted sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </Box>
            <Button
              variant="contained"
              onClick={captureAndLogin}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <CameraAltOutlinedIcon />}
              sx={{ textTransform: "none" }}
            >
              {loading ? "Đang xử lý..." : "Chụp & Xác thực"}
            </Button>
            <Button
              variant="text"
              onClick={() => setMode("password")}
              sx={{ textTransform: "none" }}
            >
              Quay lại đăng nhập mật khẩu
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Button
            color="error"
            size="small"
            startIcon={<LogoutOutlinedIcon />}
            onClick={handleLogout}
            sx={{ textTransform: "none" }}
          >
            Đăng xuất
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
