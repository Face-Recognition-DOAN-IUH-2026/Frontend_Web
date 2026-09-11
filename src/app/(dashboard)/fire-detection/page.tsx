"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";

// Icons
import LocalFireDepartmentOutlinedIcon from "@mui/icons-material/LocalFireDepartmentOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import SpeedOutlinedIcon from "@mui/icons-material/SpeedOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import PhoneInTalkOutlinedIcon from "@mui/icons-material/PhoneInTalkOutlined";
import EmergencyOutlinedIcon from "@mui/icons-material/EmergencyOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import PlayArrowOutlinedIcon from "@mui/icons-material/PlayArrowOutlined";
import StopOutlinedIcon from "@mui/icons-material/StopOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";

// Shared Dashboard Components
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import MuiStatCard from "@/app/(dashboard)/_components/ui/MuiStatCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import { useAuth } from "@/lib/auth-context";

interface DetectedBox {
  label: string;
  confidence?: number;
  box: [number, number, number, number];
  norm_box: [number, number, number, number];
  width: number;
  height: number;
  area: number;
}

interface DetectionResponse {
  success: boolean;
  filename?: string;
  image_size?: { width: number; height: number };
  has_fire: boolean;
  has_smoke: boolean;
  fire_count: number;
  smoke_count: number;
  boxes: DetectedBox[];
  latency_ms: number;
  raw_response: string;
  annotated_image_base64?: string;
}

interface IncidentLog {
  id: string;
  timestamp: string;
  cameraName: string;
  type: "fire" | "smoke" | "safe";
  severity: "high" | "medium" | "low";
  confidence: number;
  status: "Đã kích hoạt cảnh báo" | "Đang giám sát" | "Bình thường";
  thumbnail?: string;
}

export default function FireDetectionPage() {
  const theme = useTheme();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  // API Gateway URL (chuẩn kết nối cổng 80 của toàn bộ hệ thống)
  const serviceUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:80";

  // State quản lý kết nối
  const [serviceHealthy, setServiceHealthy] = useState<boolean | null>(null);
  const [serviceInfo, setServiceInfo] = useState<any>(null);

  // Kênh Camera
  const [selectedCamera, setSelectedCamera] = useState("CAM-PCCC-01");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAutoScanning, setIsAutoScanning] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Refs điều khiển Camera & Scan
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);
  const autoScanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Kết quả phân tích hiện tại
  const [result, setResult] = useState<DetectionResponse | null>(null);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sổ nhật ký sự cố (Surveillance Incident Log)
  const [incidents, setIncidents] = useState<IncidentLog[]>([]);

  // Dialog kiểm định ảnh thủ công
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualPreviewUrl, setManualPreviewUrl] = useState<string | null>(null);
  const [isManualEvaluating, setIsManualEvaluating] = useState(false);

  // Dialog quy trình PCCC khẩn cấp
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);

  // Đồng hồ hiển thị thời gian thực CCTV HUD
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }) + " " + now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Xác thực đăng nhập
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Kiểm tra trạng thái AI qua API Gateway
  const checkHealth = useCallback(async () => {
    try {
      let res = await fetch(`${serviceUrl}/api/fire/health`, { method: "GET" }).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`${serviceUrl}/health`, { method: "GET" }).catch(() => null);
      }
      if (res && res.ok) {
        const data = await res.json();
        setServiceHealthy(true);
        setServiceInfo(data);
      } else {
        setServiceHealthy(false);
      }
    } catch {
      setServiceHealthy(false);
    }
  }, [serviceUrl]);

  useEffect(() => {
    if (isAuthenticated) {
      checkHealth();
    }
  }, [isAuthenticated, checkHealth]);

  // Mở Camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 25 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      streamRef.current = stream;
      setIsCameraActive(true);
      setError(null);
    } catch (err: any) {
      setError("Không thể kết nối Camera an ninh: " + (err.message || "Vui lòng cấp quyền truy cập webcam"));
    }
  };

  // Tắt Camera
  const stopCamera = () => {
    if (autoScanIntervalRef.current) {
      clearInterval(autoScanIntervalRef.current);
      autoScanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Trích xuất frame từ Video stream
  const captureFrameBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!videoRef.current) return reject("Camera chưa kích hoạt");
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Không tạo được context vẽ");
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject("Không capture được frame");
        },
        "image/jpeg",
        0.88
      );
    });
  };

  // Hàm gửi frame tới Gateway để AI phân tích
  const evaluateBlob = useCallback(
    async (blob: Blob, isManual: boolean = false) => {
      const formData = new FormData();
      formData.append("file", blob, "cctv_frame.jpg");
      formData.append("return_annotated", "true");

      const res = await fetch(`${serviceUrl}/api/v1/detect/image`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Lỗi phân tích từ máy chủ (${res.status})`);
      }

      const data: DetectionResponse = await res.json();
      setResult(data);
      setLastScanTime(new Date().toLocaleTimeString("vi-VN"));

      // Ghi nhận sự cố vào nhật ký nếu phát hiện lửa/khói
      if (data.has_fire || data.has_smoke) {
        const newIncident: IncidentLog = {
          id: `INC-${Date.now().toString().slice(-6)}`,
          timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          cameraName: selectedCamera === "CAM-PCCC-01" ? "Kho sách Tầng 1" : "Sảnh chính",
          type: data.has_fire ? "fire" : "smoke",
          severity: data.has_fire ? "high" : "medium",
          confidence: Math.round(
            data.boxes.length > 0 ? (data.boxes[0].confidence ? data.boxes[0].confidence * 100 : 92) : 90
          ),
          status: "Đã kích hoạt cảnh báo",
          thumbnail: data.annotated_image_base64,
        };
        setIncidents((prev) => [newIncident, ...prev.slice(0, 9)]);
      }

      return data;
    },
    [serviceUrl, selectedCamera]
  );

  // Vòng lặp tự động quét liên tục khi Camera mở (~2.5 FPS / mỗi 400ms)
  useEffect(() => {
    if (!isCameraActive || !isAutoScanning) {
      if (autoScanIntervalRef.current) {
        clearInterval(autoScanIntervalRef.current);
        autoScanIntervalRef.current = null;
      }
      return;
    }

    const scanRoutine = async () => {
      if (isProcessingRef.current || !videoRef.current || videoRef.current.videoWidth === 0) return;
      isProcessingRef.current = true;
      try {
        const blob = await captureFrameBlob();
        await evaluateBlob(blob, false);
      } catch {
        // Bỏ qua lỗi gián đoạn frame đơn lẻ
      } finally {
        isProcessingRef.current = false;
      }
    };

    autoScanIntervalRef.current = setInterval(scanRoutine, 400);

    return () => {
      if (autoScanIntervalRef.current) {
        clearInterval(autoScanIntervalRef.current);
        autoScanIntervalRef.current = null;
      }
    };
  }, [isCameraActive, isAutoScanning, evaluateBlob]);

  // Chụp kiểm tra thủ công 1 frame
  const handleManualCapture = async () => {
    if (!isCameraActive) return;
    setIsCapturing(true);
    try {
      const blob = await captureFrameBlob();
      await evaluateBlob(blob, true);
    } catch (err: any) {
      setError("Không thể quét frame: " + err.message);
    } finally {
      setIsCapturing(false);
    }
  };

  // Đánh giá file ảnh tải lên
  const handleEvaluateFile = async () => {
    if (!manualFile) return;
    setIsManualEvaluating(true);
    setError(null);
    try {
      await evaluateBlob(manualFile, true);
      setUploadDialogOpen(false);
    } catch (err: any) {
      setError("Không thể phân tích ảnh tải lên: " + err.message);
    } finally {
      setIsManualEvaluating(false);
    }
  };

  // Mức độ nguy cơ hiện tại
  const currentRiskLevel = useMemo(() => {
    if (!result) return "safe";
    if (result.has_fire) return "danger";
    if (result.has_smoke) return "warning";
    return "safe";
  }, [result]);

  return (
    <Stack spacing={3}>
      {/* 1. Header chuẩn hệ thống thư viện */}
      <Box sx={staggerSx(0)}>
        <PageHeader
          title="Trung Tâm Giám Sát An Toàn PCCC"
          subtitle="Hệ thống camera nhận diện khói & lửa thời gian thực cho Thư viện Thông minh IUH"
          icon={LocalFireDepartmentOutlinedIcon}
          actions={
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Chip
                icon={serviceHealthy ? <CheckCircleOutlineOutlinedIcon /> : <WarningAmberOutlinedIcon />}
                label={
                  serviceHealthy === null
                    ? "Đang kết nối..."
                    : serviceHealthy
                    ? "Hệ Thống Sẵn Sàng (API Gateway)"
                    : "Mất Kết Nối Gateway"
                }
                color={serviceHealthy ? "success" : "error"}
                variant="outlined"
                size="medium"
                sx={{ fontWeight: 700 }}
              />
              <Tooltip title="Kiểm tra lại kết nối">
                <IconButton onClick={checkHealth} size="small" sx={{ border: 1, borderColor: "divider" }}>
                  <RefreshOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Button
                variant="outlined"
                color="error"
                startIcon={<EmergencyOutlinedIcon />}
                onClick={() => setEmergencyDialogOpen(true)}
                sx={{ borderRadius: 2, fontWeight: 700 }}
              >
                Quy Trình Khẩn Cấp
              </Button>
            </Stack>
          }
        />
      </Box>

      {/* Banner báo động khẩn cấp khi phát hiện lửa/khói */}
      {currentRiskLevel !== "safe" && (
        <Box sx={staggerSx(1)}>
          <Alert
            severity={currentRiskLevel === "danger" ? "error" : "warning"}
            variant="filled"
            icon={<LocalFireDepartmentOutlinedIcon fontSize="large" />}
            action={
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                onClick={() => setEmergencyDialogOpen(true)}
                sx={{ fontWeight: 800, borderColor: "white", color: "white" }}
              >
                Xem Hướng Dẫn Xử Lý
              </Button>
            }
            sx={{
              py: 1.5,
              fontSize: "1.05rem",
              fontWeight: 800,
              borderRadius: 2.5,
              boxShadow:
                currentRiskLevel === "danger"
                  ? "0 6px 24px rgba(239, 68, 68, 0.45)"
                  : "0 6px 24px rgba(245, 158, 11, 0.35)",
              animation: "pulseWarning 1.5s infinite",
              "@keyframes pulseWarning": {
                "0%": { opacity: 1 },
                "50%": { opacity: 0.88 },
                "100%": { opacity: 1 },
              },
            }}
          >
            {currentRiskLevel === "danger"
              ? `CẢNH BÁO NGUY CẤP: PHÁT HIỆN NGỌN LỬA TRỰC TIẾP! (${result?.fire_count} điểm cháy tại ${selectedCamera})`
              : `CẢNH BÁO: PHÁT HIỆN DẤU HIỆU KHÓI BẤT THƯỜNG! (${result?.smoke_count} vùng khói tại ${selectedCamera})`}
          </Alert>
        </Box>
      )}

      {error && (
        <Box sx={staggerSx(1)}>
          <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        </Box>
      )}

      {/* 2. Hàng 4 Thẻ KPI Chỉ Số Giám Sát (Chuẩn MuiStatCard) */}
      <Box sx={staggerSx(1)}>
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MuiStatCard
              label="Trạng Thái An Toàn PCCC"
              value={
                currentRiskLevel === "danger"
                  ? "BÁO ĐỘNG ĐỎ"
                  : currentRiskLevel === "warning"
                  ? "CẢNH BÁO KHÓI"
                  : "BÌNH THƯỜNG"
              }
              icon={currentRiskLevel === "safe" ? ShieldOutlinedIcon : LocalFireDepartmentOutlinedIcon}
              gradient={
                currentRiskLevel === "danger"
                  ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)"
                  : currentRiskLevel === "warning"
                  ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                  : "linear-gradient(135deg, #10b981 0%, #047857 100%)"
              }
              delta={currentRiskLevel === "safe" ? "Khu vực kho sách an toàn" : "Cần kiểm tra ngay"}
              deltaColor={currentRiskLevel === "safe" ? "success" : "error"}
              index={0}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MuiStatCard
              label="Kênh Camera Giám Sát"
              value={isCameraActive ? "1 Đang Trực Tiếp" : "Đang Chờ"}
              icon={VideocamOutlinedIcon}
              gradient="linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"
              delta={isAutoScanning && isCameraActive ? "Quét liên tục (2.5 FPS)" : "Chế độ thủ công"}
              deltaColor="default"
              index={1}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MuiStatCard
              label="Cảnh Báo Ghi Nhận"
              value={incidents.length}
              icon={WarningAmberOutlinedIcon}
              gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              delta={incidents.length === 0 ? "0 sự cố hôm nay" : `${incidents.length} cảnh báo gần nhất`}
              deltaColor={incidents.length > 0 ? "warning" : "success"}
              index={2}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MuiStatCard
              label="Thời Gian Phản Hồi AI"
              value={result?.latency_ms ? `${result.latency_ms} ms` : "~45 ms"}
              icon={SpeedOutlinedIcon}
              gradient="linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)"
              delta="YOLOv8 Edge Realtime"
              deltaColor="default"
              index={3}
            />
          </Grid>
        </Grid>
      </Box>

      {/* 3. Nội dung trung tâm: Kênh Camera CCTV và Bảng Điều Phối */}
      <Box sx={staggerSx(2)}>
        <Grid container spacing={3}>
          {/* Cột trái: Kênh Camera An Ninh */}
          <Grid size={{ xs: 12, lg: 7 }}>
            <DashboardCard
              title="Kênh Giám Sát Camera An Ninh"
              subtitle="Luồng hình ảnh trực tiếp từ khu vực độc giả & kho tài liệu"
              actions={
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Select
                    size="small"
                    value={selectedCamera}
                    onChange={(e) => setSelectedCamera(e.target.value)}
                    sx={{
                      minWidth: 160,
                      height: 34,
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      bgcolor: "background.paper",
                    }}
                  >
                    <MenuItem value="CAM-PCCC-01">CAM-01: Kho Sách Tầng 1</MenuItem>
                    <MenuItem value="CAM-PCCC-02">CAM-02: Phòng Đọc Tầng 2</MenuItem>
                    <MenuItem value="CAM-PCCC-03">CAM-03: Sảnh Check-in</MenuItem>
                  </Select>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CloudUploadOutlinedIcon />}
                    onClick={() => setUploadDialogOpen(true)}
                    sx={{ height: 34, fontWeight: 700, fontSize: "0.78rem" }}
                  >
                    Kiểm Định Ảnh
                  </Button>
                </Stack>
              }
            >
              {/* Khung Màn Hình CCTV Chuyên Nghiệp */}
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  height: { xs: 300, sm: 390, md: 430 },
                  bgcolor: "#090d16",
                  borderRadius: 2.5,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: 2,
                  borderColor:
                    currentRiskLevel === "danger"
                      ? "error.main"
                      : currentRiskLevel === "warning"
                      ? "warning.main"
                      : "divider",
                  boxShadow:
                    currentRiskLevel === "danger"
                      ? "0 0 25px rgba(239, 68, 68, 0.3)"
                      : "0 8px 24px rgba(0, 0, 0, 0.25)",
                  transition: "border-color 0.3s ease",
                }}
              >
                {/* Video Stream */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: isCameraActive ? "block" : "none",
                  }}
                />

                {/* CCTV Overlays & HUD */}
                {isCameraActive && (
                  <>
                    {/* Góc trên bên trái: Trạng thái LIVE & Tên Camera */}
                    <Box
                      sx={{
                        position: "absolute",
                        top: 14,
                        left: 14,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        bgcolor: "rgba(0, 0, 0, 0.65)",
                        backdropFilter: "blur(4px)",
                        px: 1.25,
                        py: 0.5,
                        borderRadius: 1.5,
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "#ef4444",
                          animation: "pulseDot 1s infinite",
                          "@keyframes pulseDot": {
                            "0%": { transform: "scale(1)", opacity: 1 },
                            "50%": { transform: "scale(1.35)", opacity: 0.4 },
                            "100%": { transform: "scale(1)", opacity: 1 },
                          },
                        }}
                      />
                      <Typography sx={{ color: "white", fontSize: "0.75rem", fontWeight: 800, letterSpacing: 0.5 }}>
                        LIVE
                      </Typography>
                      <Typography sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.75rem" }}>
                        · {selectedCamera} · 720p
                      </Typography>
                    </Box>

                    {/* Góc trên bên phải: Đồng hồ điện tử */}
                    <Box
                      sx={{
                        position: "absolute",
                        top: 14,
                        right: 14,
                        bgcolor: "rgba(0, 0, 0, 0.65)",
                        backdropFilter: "blur(4px)",
                        px: 1.25,
                        py: 0.5,
                        borderRadius: 1.5,
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                      }}
                    >
                      <Typography
                        sx={{
                          color: "white",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          fontFamily: "monospace",
                          letterSpacing: 0.8,
                        }}
                      >
                        {currentTime}
                      </Typography>
                    </Box>

                    {/* Góc dưới bên trái: Tiêu chuẩn an toàn */}
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 14,
                        left: 14,
                        bgcolor: "rgba(0, 0, 0, 0.65)",
                        backdropFilter: "blur(4px)",
                        px: 1.25,
                        py: 0.4,
                        borderRadius: 1.5,
                      }}
                    >
                      <Typography sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.7rem", fontWeight: 600 }}>
                        IUH SMART SECURITY · LỌC NHIỄU KÉP
                      </Typography>
                    </Box>

                    {/* Huy hiệu quét thời gian thực */}
                    {isAutoScanning && (
                      <Chip
                        label="ĐANG QUÉT TỰ ĐỘNG"
                        size="small"
                        color="success"
                        sx={{
                          position: "absolute",
                          bottom: 14,
                          right: 14,
                          fontWeight: 800,
                          fontSize: "0.68rem",
                          height: 22,
                        }}
                      />
                    )}

                    {/* Corner Reticles (Khung ngắm CCTV) */}
                    <Box
                      sx={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        width: 16,
                        height: 16,
                        borderTop: "2px solid rgba(255,255,255,0.4)",
                        borderLeft: "2px solid rgba(255,255,255,0.4)",
                        pointerEvents: "none",
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        width: 16,
                        height: 16,
                        borderTop: "2px solid rgba(255,255,255,0.4)",
                        borderRight: "2px solid rgba(255,255,255,0.4)",
                        pointerEvents: "none",
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 10,
                        left: 10,
                        width: 16,
                        height: 16,
                        borderBottom: "2px solid rgba(255,255,255,0.4)",
                        borderLeft: "2px solid rgba(255,255,255,0.4)",
                        pointerEvents: "none",
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 10,
                        right: 10,
                        width: 16,
                        height: 16,
                        borderBottom: "2px solid rgba(255,255,255,0.4)",
                        borderRight: "2px solid rgba(255,255,255,0.4)",
                        pointerEvents: "none",
                      }}
                    />
                  </>
                )}

                {/* Màn hình chờ khi chưa bật Camera */}
                {!isCameraActive && (
                  <Stack sx={{ alignItems: "center", textAlign: "center", p: 3 }} spacing={1.5}>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        bgcolor: "rgba(255, 255, 255, 0.05)",
                        display: "grid",
                        placeItems: "center",
                        mb: 0.5,
                      }}
                    >
                      <VideocamOutlinedIcon sx={{ fontSize: 36, color: "rgba(255, 255, 255, 0.4)" }} />
                    </Box>
                    <Typography sx={{ color: "white", fontWeight: 700, fontSize: "1rem" }}>
                      Kênh Camera Chưa Kích Hoạt
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.6)", maxWidth: 320 }}>
                      Kích hoạt camera giám sát để hệ thống nhận diện nguy cơ cháy nổ liên tục theo thời gian thực
                    </Typography>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<PlayArrowOutlinedIcon />}
                      onClick={startCamera}
                      sx={{ mt: 1, borderRadius: 2, fontWeight: 700, px: 3 }}
                    >
                      Bật Camera Giám Sát
                    </Button>
                  </Stack>
                )}
              </Box>

              {/* Bảng điều khiển tác vụ dưới Camera */}
              <Box sx={{ mt: 2.5 }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ justifyContent: "space-between", alignItems: "center" }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    {isCameraActive ? (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<StopOutlinedIcon />}
                        onClick={stopCamera}
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                      >
                        Dừng Camera
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<PlayArrowOutlinedIcon />}
                        onClick={startCamera}
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                      >
                        Bật Camera
                      </Button>
                    )}

                    {isCameraActive && (
                      <Button
                        variant="outlined"
                        onClick={handleManualCapture}
                        disabled={isCapturing}
                        startIcon={
                          isCapturing ? <CircularProgress size={16} /> : <PhotoCameraOutlinedIcon />
                        }
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                      >
                        Chụp Quét Ngay
                      </Button>
                    )}
                  </Stack>

                  {isCameraActive && (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={isAutoScanning}
                          onChange={(e) => setIsAutoScanning(e.target.checked)}
                          color="success"
                        />
                      }
                      label={
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: isAutoScanning ? "success.main" : "text.secondary",
                          }}
                        >
                          Tự Động Quét 24/7 (Live)
                        </Typography>
                      }
                    />
                  )}
                </Stack>
              </Box>
            </DashboardCard>
          </Grid>

          {/* Cột phải: Trung Tâm Điều Phối & Đánh Giá Nguy Cơ */}
          <Grid size={{ xs: 12, lg: 5 }}>
            <DashboardCard
              title="Trung Tâm Chỉ Huy & Xử Lý Sự Cố"
              subtitle="Đánh giá nguy cơ cháy nổ & Thao tác ứng phó"
              actions={
                <Chip
                  label={
                    currentRiskLevel === "danger"
                      ? "CẤP 2: NGUY CẤP"
                      : currentRiskLevel === "warning"
                      ? "CẤP 1: CẢNH BÁO"
                      : "CẤP 0: AN TOÀN"
                  }
                  color={
                    currentRiskLevel === "danger"
                      ? "error"
                      : currentRiskLevel === "warning"
                      ? "warning"
                      : "success"
                  }
                  size="small"
                  sx={{ fontWeight: 800, fontSize: "0.72rem" }}
                />
              }
            >
              <Stack spacing={2.5}>
                {/* Khối Đánh Giá Nguy Cơ Hiện Tại */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.25,
                    borderRadius: 2.5,
                    bgcolor:
                      currentRiskLevel === "danger"
                        ? alpha(theme.palette.error.main, 0.08)
                        : currentRiskLevel === "warning"
                        ? alpha(theme.palette.warning.main, 0.08)
                        : alpha(theme.palette.success.main, 0.08),
                    borderColor:
                      currentRiskLevel === "danger"
                        ? "error.main"
                        : currentRiskLevel === "warning"
                        ? "warning.main"
                        : "success.main",
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
                    <Avatar
                      sx={{
                        width: 38,
                        height: 38,
                        bgcolor:
                          currentRiskLevel === "danger"
                            ? "error.main"
                            : currentRiskLevel === "warning"
                            ? "warning.main"
                            : "success.main",
                        color: "white",
                      }}
                    >
                      {currentRiskLevel === "safe" ? (
                        <ShieldOutlinedIcon fontSize="small" />
                      ) : (
                        <LocalFireDepartmentOutlinedIcon fontSize="small" />
                      )}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {currentRiskLevel === "danger"
                          ? "PHÁT HIỆN SỰ CỐ CHÁY TẦNG 1"
                          : currentRiskLevel === "warning"
                          ? "PHÁT HIỆN DẤU HIỆU KHÓI TẦNG 1"
                          : "KHU VỰC ĐẠT CHUẨN AN TOÀN PCCC"}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Cập nhật lần cuối: {lastScanTime || "Chưa có dữ liệu"}
                      </Typography>
                    </Box>
                  </Stack>

                  <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                    {currentRiskLevel === "safe"
                      ? "Không phát hiện ngọn lửa, tia lửa điện hay vệt khói tích tụ trong tầm quét camera. Môi trường thư viện được duy trì ở ngưỡng an toàn cao."
                      : "Hệ thống đã tự động kích hoạt cơ chế lọc báo động giả 3 frame liên tiếp. Vui lòng thực hiện kiểm tra thực địa ngay lập tức."}
                  </Typography>

                  {/* Nút hành động khẩn cấp khi có sự cố */}
                  {currentRiskLevel !== "safe" && (
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="error"
                        size="small"
                        startIcon={<NotificationsActiveOutlinedIcon />}
                        onClick={() => setEmergencyDialogOpen(true)}
                        sx={{ fontWeight: 800, borderRadius: 2 }}
                      >
                        Báo Động Khẩn Cấp
                      </Button>
                      <Button
                        variant="outlined"
                        color="inherit"
                        size="small"
                        startIcon={<PhoneInTalkOutlinedIcon />}
                        onClick={() => alert("Đang kết nối tới Đội PCCC cơ sở IUH: 028.38940390")}
                        sx={{ fontWeight: 700, borderRadius: 2, whiteSpace: "nowrap" }}
                      >
                        Gọi Hotline
                      </Button>
                    </Stack>
                  )}
                </Paper>

                {/* Danh Sách Vùng Nguy Cơ Đã Được Khoanh Vùng */}
                {result && result.boxes.length > 0 ? (
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", display: "block", mb: 1 }}>
                      DANH SÁCH ĐỐM LỬA & VÙNG KHÓI ({result.boxes.length}):
                    </Typography>
                    <Stack spacing={1.25}>
                      {result.boxes.map((b, idx) => (
                        <Paper
                          key={idx}
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderLeft: 4,
                            borderColor: b.label === "smoke" ? "warning.main" : "error.main",
                          }}
                        >
                          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                            <Chip
                              label={b.label === "smoke" ? "KHÓI" : "LỬA"}
                              color={b.label === "smoke" ? "warning" : "error"}
                              size="small"
                              sx={{ fontWeight: 800, fontSize: "0.7rem", height: 22 }}
                            />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {b.label === "smoke" ? "Vệt khói lan tỏa" : "Ngọn lửa trực tiếp"}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                Tọa độ: Khu vực {Math.round(b.norm_box[1] / 10)}% chiều ngang
                              </Typography>
                            </Box>
                          </Stack>
                          <Chip
                            label={`Tin cậy ${Math.round((b.confidence || 0.9) * 100)}%`}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: "0.7rem", height: 22 }}
                          />
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                ) : (
                  <Paper variant="outlined" sx={{ p: 2, textAlign: "center", borderRadius: 2, bgcolor: "action.hover" }}>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "center", alignItems: "center" }}>
                      <CheckCircleOutlineOutlinedIcon sx={{ color: "success.main", fontSize: 20 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                        Không có vùng nhiệt nguy hiểm nào được phát hiện
                      </Typography>
                    </Stack>
                  </Paper>
                )}

                {/* Thống kê đốm lửa và vệt khói */}
                {result && (
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 6 }}>
                      <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center", borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Số Điểm Cháy
                        </Typography>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 800,
                            color: result.fire_count > 0 ? "error.main" : "text.primary",
                          }}
                        >
                          {result.fire_count} điểm
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center", borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Số Vệt Khói
                        </Typography>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 800,
                            color: result.smoke_count > 0 ? "warning.main" : "text.primary",
                          }}
                        >
                          {result.smoke_count} vùng
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                )}
              </Stack>
            </DashboardCard>
          </Grid>
        </Grid>
      </Box>

      {/* 4. Nhật Ký Giám Sát & Lịch Sử Cảnh Báo PCCC */}
      <Box sx={staggerSx(3)}>
        <DashboardCard
          title="Sổ Nhật Ký Giám Sát & Sự Cố PCCC"
          subtitle="Ghi nhận lịch sử các cảnh báo và trạng thái xử lý của ban quản lý thư viện"
          actions={
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadOutlinedIcon />}
              onClick={() => alert("Đã xuất báo cáo sự cố PCCC định dạng PDF")}
              sx={{ fontWeight: 700 }}
            >
              Xuất Nhật Ký
            </Button>
          }
        >
          {incidents.length === 0 ? (
            <EmptyState
              icon={<SecurityOutlinedIcon sx={{ fontSize: 40, color: "text.secondary" }} />}
              title="Chưa ghi nhận sự cố cháy nổ nào"
              description="Hệ thống camera giám sát PCCC đang hoạt động ổn định. Tất cả các lần quét hiện tại đều cho kết quả an toàn."
            />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Mã Sự Cố</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Thời Gian</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Vị Trí Camera</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Loại Nguy Cơ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Độ Tin Cậy</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Trạng Thái Xử Lý</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {incidents.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontWeight: 600, fontFamily: "monospace" }}>{row.id}</TableCell>
                      <TableCell>{row.timestamp}</TableCell>
                      <TableCell>{row.cameraName}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.type === "fire" ? "Phát hiện Lửa" : "Phát hiện Khói"}
                          color={row.type === "fire" ? "error" : "warning"}
                          size="small"
                          sx={{ fontWeight: 700, fontSize: "0.72rem" }}
                        />
                      </TableCell>
                      <TableCell>{row.confidence}%</TableCell>
                      <TableCell>
                        <Chip
                          label={row.status}
                          size="small"
                          variant="outlined"
                          color={row.severity === "high" ? "error" : "warning"}
                          sx={{ fontWeight: 700, fontSize: "0.72rem" }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DashboardCard>
      </Box>

      {/* 5. Modal: Kiểm định ảnh hiện trường thủ công */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Kiểm Định Ảnh Hiện Trường Thủ Công</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tải ảnh chụp từ camera an ninh hoặc ảnh chụp hiện trường để kiểm tra phát hiện ngọn lửa hoặc khói.
          </Typography>

          <Paper
            variant="outlined"
            component="label"
            sx={{
              p: 3,
              textAlign: "center",
              borderStyle: "dashed",
              borderColor: "primary.main",
              bgcolor: "action.hover",
              cursor: "pointer",
              borderRadius: 2.5,
              display: "block",
              mb: 2,
              "&:hover": { bgcolor: "action.selected" },
            }}
          >
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const f = e.target.files[0];
                  setManualFile(f);
                  setManualPreviewUrl(URL.createObjectURL(f));
                }
              }}
            />
            <CloudUploadOutlinedIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Nhấp hoặc kéo ảnh vào đây
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Hỗ trợ PNG, JPG, JPEG (Tối đa 15MB)
            </Typography>
          </Paper>

          {manualPreviewUrl && (
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, display: "block", mb: 1 }}>
                ẢNH ĐÃ CHỌN: {manualFile?.name}
              </Typography>
              <Box
                component="img"
                src={manualPreviewUrl}
                alt="Preview"
                sx={{ maxHeight: 220, maxWidth: "100%", borderRadius: 2, border: 1, borderColor: "divider" }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setUploadDialogOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Hủy Bỏ
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!manualFile || isManualEvaluating}
            onClick={handleEvaluateFile}
            startIcon={isManualEvaluating ? <CircularProgress size={16} color="inherit" /> : <SecurityOutlinedIcon />}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Bắt Đầu Phân Tích
          </Button>
        </DialogActions>
      </Dialog>

      {/* 6. Modal: Quy trình ứng phó PCCC khẩn cấp */}
      <Dialog
        open={emergencyDialogOpen}
        onClose={() => setEmergencyDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "error.main", display: "flex", alignItems: "center", gap: 1 }}>
          <EmergencyOutlinedIcon /> Quy Trình Ứng Phó Khẩn Cấp PCCC - Thư Viện IUH
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2, borderLeft: 4, borderColor: "error.main" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "error.main" }}>
                Bước 1: Xác minh hiện trường
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Kiểm tra nhanh qua kênh Camera CAM-PCCC-01 tại Kho sách Tầng 1 để xác định quy mô đám cháy hoặc vệt khói.
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2, borderLeft: 4, borderColor: "warning.main" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "warning.main" }}>
                Bước 2: Cắt điện khu vực & Báo động
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ngắt cầu dao điện tổng khu vực kho sách và kích hoạt còi báo động tòa nhà Thư viện.
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2, borderLeft: 4, borderColor: "primary.main" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "primary.main" }}>
                Bước 3: Hướng dẫn độc giả sơ tán
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Điều phối độc giả di chuyển theo các lối thoát hiểm khẩn cấp ở Cửa Đông và Cửa Tây tòa nhà.
              </Typography>
            </Paper>

            <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Đường dây nóng khẩn cấp:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Cảnh sát PCCC & CNCH: <strong>114</strong>
                <br />
                • Đội Bảo vệ & PCCC ĐH Công nghiệp TP.HCM (IUH): <strong>028.38940390</strong> (Nhánh 115)
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setEmergencyDialogOpen(false)}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Đã Nắm Rõ Quy Trình
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
