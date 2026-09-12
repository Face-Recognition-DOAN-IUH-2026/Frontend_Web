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
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import VolumeOffOutlinedIcon from "@mui/icons-material/VolumeOffOutlined";
import {
  useFireSurveillance,
  DetectedBox,
  DetectionResponse,
  IncidentLog,
  DEFAULT_CONFIDENCE_THRESHOLD,
} from "@/lib/fire-surveillance-context";

// Shared Dashboard Components
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import MuiStatCard from "@/app/(dashboard)/_components/ui/MuiStatCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import { useAuth } from "@/lib/auth-context";

export default function FireDetectionPage() {
  const theme = useTheme();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  // Dùng chung trạng thái Camera và Giám Sát Ngầm xuyên suốt toàn hệ thống
  const {
    isCameraActive,
    isAutoScanning,
    selectedCamera,
    confidenceThreshold,
    stream,
    lastResult: result,
    lastScanTime,
    isProcessing,
    error: ctxError,
    serviceHealthy,
    checkHealth,
    incidents,
    isAudioMuted,
    startCamera,
    stopCamera,
    setSelectedCamera,
    setIsAutoScanning,
    setConfidenceThreshold,
    toggleAudioMute: handleToggleAudio,
    acknowledgeAlert: handleAcknowledgeAlert,
    clearIncidents: handleClearIncidentsContext,
    evaluateBlob,
    captureFrameBlob,
  } = useFireSurveillance();

  const [isCapturing, setIsCapturing] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);
  const error = localError || ctxError;
  const setError = setLocalError;

  // Video preview element trên trang này
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Gắn stream đang chạy (hoặc mới mở) vào thẻ video preview của màn hình
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, isCameraActive]);

  // Xuất file CSV nhật ký sự cố
  const handleExportCSV = () => {
    if (incidents.length === 0) {
      alert("Chưa có sự cố nào để xuất báo cáo.");
      return;
    }
    const headers = ["Mã Sự Cố", "Thời Gian", "Vị Trí Camera", "Loại Nguy Cơ", "Mức Độ", "Độ Tin Cậy", "Trạng Thái"];
    const rows = incidents.map((i) => [
      i.id,
      `"${i.timestamp}"`,
      `"${i.cameraName}"`,
      i.type === "fire" ? "Cháy / Lửa" : "Khói",
      i.severity === "high" ? "Cao" : "Trung bình",
      `${i.confidence}%`,
      `"${i.status}"`,
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Nhat_ky_PCCC_IUH_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Làm mới hoặc xóa sổ nhật ký sự cố
  const handleClearIncidents = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử trong sổ nhật ký sự cố PCCC?")) return;
    await handleClearIncidentsContext();
  };

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

  // Mức độ nguy cơ hiện tại (CHỈ BÁO ĐỘNG KHI ĐỘ TIN CẬY TRÊN 60% THEO YÊU CẦU)
  const currentRiskLevel = useMemo(() => {
    if (!result) return "safe";
    const maxConf =
      result.boxes && result.boxes.length > 0
        ? Math.max(...result.boxes.map((b) => (typeof b.confidence === "number" ? b.confidence : 0.9)))
        : 0;

    // Nếu độ tin cậy < 60% thì coi như cảnh báo giả, duy trì trạng thái an toàn
    if (maxConf < confidenceThreshold) {
      return "safe";
    }

    if (result.has_fire) return "danger";
    if (result.has_smoke) return "warning";
    return "safe";
  }, [result, confidenceThreshold]);

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
              <Tooltip title="Chỉ phát âm thanh cảnh báo và kích hoạt còi khi độ tin cậy nhận diện trên 60%">
                <Chip
                  icon={<SecurityOutlinedIcon fontSize="small" />}
                  label={`Ngưỡng Báo Động: ≥ ${(confidenceThreshold * 100).toFixed(0)}%`}
                  color="primary"
                  variant="outlined"
                  size="medium"
                  sx={{ fontWeight: 700 }}
                />
              </Tooltip>
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
              <Tooltip title={isAudioMuted ? "Bật còi hú báo động PCCC" : "Tắt tiếng còi hú PCCC"}>
                <IconButton
                  onClick={handleToggleAudio}
                  size="small"
                  sx={{
                    border: 1,
                    borderColor: isAudioMuted ? "divider" : "error.main",
                    color: isAudioMuted ? "text.secondary" : "error.main",
                  }}
                >
                  {isAudioMuted ? <VolumeOffOutlinedIcon fontSize="small" /> : <VolumeUpOutlinedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
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

      {/* Thông báo lọc bỏ cảnh báo giả khi độ tin cậy < 60% */}
      {result && (result.has_fire || result.has_smoke) && currentRiskLevel === "safe" && (
        <Box sx={staggerSx(1)}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Hệ thống AI nhận diện dấu hiệu nghi vấn nhưng độ tin cậy đạt{" "}
            {Math.round(
              (result.boxes?.[0]?.confidence ?? 0.5) * 100
            )}
            %, thấp hơn ngưỡng kích hoạt quy định (≥ 60%). Hệ thống đã tự động lọc bỏ cảnh báo giả để tránh làm gián đoạn hoạt động thư viện.
          </Alert>
        </Box>
      )}

      {/* Banner báo động khẩn cấp khi phát hiện lửa/khói (Độ tin cậy ≥ 60%) */}
      {currentRiskLevel !== "safe" && (
        <Box sx={staggerSx(1)}>
          <Alert
            severity={currentRiskLevel === "danger" ? "error" : "warning"}
            variant="filled"
            icon={<LocalFireDepartmentOutlinedIcon fontSize="large" />}
            action={
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Button
                  color="inherit"
                  size="small"
                  variant="outlined"
                  startIcon={isAudioMuted ? <VolumeOffOutlinedIcon /> : <VolumeUpOutlinedIcon />}
                  onClick={handleToggleAudio}
                  sx={{ fontWeight: 800, borderColor: "white", color: "white" }}
                >
                  {isAudioMuted ? "Bật Còi Hú" : "Tắt Còi Hú"}
                </Button>
                <Button
                  color="inherit"
                  size="small"
                  variant="outlined"
                  onClick={handleAcknowledgeAlert}
                  sx={{
                    fontWeight: 800,
                    borderColor: "white",
                    color: "white",
                    bgcolor: "rgba(0,0,0,0.18)",
                    display: { xs: "none", sm: "inline-flex" },
                  }}
                >
                  Đã Kiểm Tra An Toàn
                </Button>
                <Button
                  color="inherit"
                  size="small"
                  variant="contained"
                  onClick={() => setEmergencyDialogOpen(true)}
                  sx={{
                    fontWeight: 800,
                    bgcolor: "white",
                    color: currentRiskLevel === "danger" ? "#b91c1c" : "#b45309",
                    "&:hover": { bgcolor: "#f8fafc" },
                  }}
                >
                  Quy Trình Khẩn Cấp
                </Button>
              </Stack>
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
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadOutlinedIcon />}
                onClick={handleExportCSV}
                sx={{ fontWeight: 700 }}
              >
                Xuất Nhật Ký (CSV)
              </Button>
              {incidents.length > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={handleClearIncidents}
                  sx={{ fontWeight: 700 }}
                >
                  Làm Mới Sổ
                </Button>
              )}
            </Stack>
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
