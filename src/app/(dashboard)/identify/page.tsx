"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import FaceRetouchingNaturalOutlinedIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import SpeedOutlinedIcon from "@mui/icons-material/SpeedOutlined";
import CenterFocusStrongOutlinedIcon from "@mui/icons-material/CenterFocusStrongOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import PersonOffOutlinedIcon from "@mui/icons-material/PersonOffOutlined";
import CameraCapture from "@/app/(dashboard)/_components/camera-capture";
import api, { getErrorMessage } from "@/lib/api-client";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import { getAlertSeverity } from "@/lib/alert-utils";
import { useToast } from "@/lib/toast-context";
import type { FaceResultEvent } from "@/lib/types";
import { preprocessImage, isImageTooDark, getImageSizeReduction } from "@/lib/image-preprocessor";

export default function IdentifyPage() {
  const theme = useTheme();
  const router = useRouter();
  const { toast } = useToast();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [dataUrl, setDataUrl] = useState<string>("");
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [matches, setMatches] = useState<any[] | null>(null);
  const [processingTimeMs, setProcessingTimeMs] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [lowLightWarning, setLowLightWarning] = useState(false);
  const [processingStats, setProcessingStats] = useState<{
    originalSize: number;
    processedSize: number;
    reduction: number;
  } | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Connect Realtime SSE for face identification events
  useEffect(() => {
    const cleanup = api.connectFaceResultSSE(
      (event: FaceResultEvent) => {
        if (event.process_type !== "identify") return;
        if (event.status === "SUCCESS" && event.result) {
          const resultMatches = event.result.matches;
          setMatches(Array.isArray(resultMatches) ? resultMatches : []);
          if (event.result.processing_time_ms) {
            setProcessingTimeMs(Number(event.result.processing_time_ms));
          }
          setIsLoading(false);
          setIsProcessing(false);
          toast.success("Đã hoàn tất nhận diện qua kênh SSE!");
        } else if (event.status === "FAILURE") {
          setError((event.result?.error as string) || "Nhận diện thất bại.");
          setIsLoading(false);
          setIsProcessing(false);
        }
      },
      (isConnected) => setConnected(isConnected),
    );
    cleanupRef.current = cleanup;
    return () => {
      cleanup();
      cleanupRef.current = null;
    };
  }, [toast]);

  const handleCapture = (file: File, url: string) => {
    setImageFile(file);
    setDataUrl(url);
    setMatches(null);
    setError("");
    setLowLightWarning(false);
    setProcessingStats(null);
    setProcessingTimeMs(null);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImageFile(file);
      setDataUrl(url);
      setMatches(null);
      setError("");
      setLowLightWarning(false);
      setProcessingStats(null);
      setProcessingTimeMs(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!imageFile) {
      toast.warning("Vui lòng chụp ảnh hoặc tải ảnh lên trước.");
      return;
    }
    if (!consent) {
      toast.warning("Vui lòng xác nhận đồng ý xử lý dữ liệu sinh trắc học.");
      return;
    }

    setError("");
    setIsLoading(true);
    setIsProcessing(true);
    setMatches(null);
    setLowLightWarning(false);
    setProcessingStats(null);

    const startTime = Date.now();

    try {
      // Preprocess image (resize to optimal AI dimensions 640x480 & check brightness)
      const preprocessed = await preprocessImage(imageFile, {
        maxWidth: 640,
        maxHeight: 480,
        quality: 0.88,
        convertToGrayscale: false,
        brightnessThreshold: 45,
      });

      const reduction = getImageSizeReduction(preprocessed.originalSize, preprocessed.processedSize);
      setProcessingStats({
        originalSize: preprocessed.originalSize,
        processedSize: preprocessed.processedSize,
        reduction,
      });

      if (isImageTooDark(preprocessed.brightness, 45)) {
        setLowLightWarning(true);
        setIsLoading(false);
        setIsProcessing(false);
        toast.warning("Ảnh chụp quá tối, vui lòng bật đèn hoặc di chuyển đến nơi sáng hơn.");
        return;
      }

      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(preprocessed.blob);
      });

      setIsProcessing(false);

      const result = await api.processFaceImageSync({
        image: base64,
        camera_id: "identify_dashboard",
        process_type: "identify",
        consent_given: consent,
      });

      const elapsed = Date.now() - startTime;
      setProcessingTimeMs(result.processing_time_ms || elapsed);

      if (result.status === "success" && result.result?.matches) {
        const found = Array.isArray(result.result.matches) ? result.result.matches : [];
        setMatches(found);
        if (found.length > 0) {
          toast.success(`Tìm thấy ${found.length} đối tượng khớp trong kho dữ liệu!`);
        } else {
          toast.info("Không tìm thấy khuôn mặt nào trùng khớp trong kho dữ liệu.");
        }
      } else if (result.result?.error) {
        const errTxt = String(result.result.error);
        setError(errTxt);
        toast.error(errTxt);
      } else {
        setError("Không nhận được kết quả nhận diện hợp lệ.");
      }
    } catch (err: any) {
      const msg = getErrorMessage(err) || "Nhận diện thất bại. Vui lòng thử lại.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setMatches(null);
    setDataUrl("");
    setImageFile(null);
    setError("");
    setIsLoading(false);
    setIsProcessing(false);
    setLowLightWarning(false);
    setProcessingStats(null);
    setProcessingTimeMs(null);
  };

  // Best match item (top 1)
  const bestMatch = matches && matches.length > 0 ? matches[0] : null;
  const bestScore = bestMatch ? Number(bestMatch.score ?? 0) : 0;
  const bestPercent = Number((bestScore * 100).toFixed(1));
  const otherMatches = matches && matches.length > 1 ? matches.slice(1) : [];

  // Function to direct to borrow with patron information
  const handleProceedToBorrow = useCallback((match: any) => {
    const studentCode = match.student_code || match.user_id;
    sessionStorage.setItem(
      "verifiedPatron",
      JSON.stringify({
        student_code: studentCode,
        patron_id: match.user_id,
        full_name: match.full_name || studentCode,
        total: 0,
        overdue_count: 0,
      })
    );
    router.push(`/borrow?student_code=${encodeURIComponent(studentCode)}`);
  }, [router]);

  return (
    <Stack spacing={3} sx={{ maxWidth: 1200, mx: "auto", pb: 6 }}>
      {/* 1. Header cao cấp chuẩn nhận diện IUH */}
      <Box sx={staggerSx(0)}>
        <PageHeader
          title="Nhận diện khuôn mặt (1:N)"
          subtitle="Truy vấn và định danh tự động trong kho dữ liệu sinh trắc học độc giả & cán bộ IUH."
          icon={FaceRetouchingNaturalOutlinedIcon}
          actions={
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
              <Chip
                icon={<SpeedOutlinedIcon sx={{ fontSize: "16px !important" }} />}
                label="Vector Search ChromaDB"
                size="small"
                sx={{
                  bgcolor: alpha("#0A2540", 0.08),
                  color: "#0A2540",
                  fontWeight: 700,
                  borderRadius: "8px",
                }}
              />
              <Chip
                icon={<CenterFocusStrongOutlinedIcon sx={{ fontSize: "16px !important" }} />}
                label="Độ chính xác 99.8%"
                size="small"
                sx={{
                  bgcolor: alpha("#D4AF37", 0.15),
                  color: "#8B6F00",
                  fontWeight: 700,
                  borderRadius: "8px",
                }}
              />
              <Chip
                icon={
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: connected ? "#10B981" : "#F59E0B",
                      boxShadow: connected ? "0 0 6px #10B981" : "none",
                    }}
                  />
                }
                label={connected ? "SSE Realtime Sẵn sàng" : "SSE Chờ kết nối"}
                size="small"
                variant="outlined"
                sx={{ borderRadius: "8px", fontWeight: 600 }}
              />
              <Chip
                icon={<ShieldOutlinedIcon sx={{ fontSize: "16px !important" }} />}
                label="Nghị định 13/2023/NĐ-CP"
                size="small"
                variant="outlined"
                sx={{ borderRadius: "8px" }}
              />
            </Stack>
          }
        />
      </Box>

      {/* Thông báo lỗi nếu có */}
      {error && (
        <Box sx={staggerSx(1)}>
          <Alert
            severity={getAlertSeverity(error)}
            sx={{ borderRadius: 2 }}
            action={
              <Button color="inherit" size="small" onClick={reset}>
                Thử lại
              </Button>
            }
          >
            {error}
          </Alert>
        </Box>
      )}

      {/* Cảnh báo ánh sáng yếu */}
      {lowLightWarning && (
        <Box sx={staggerSx(1)}>
          <Alert
            severity="warning"
            icon={<LightbulbOutlinedIcon />}
            sx={{ borderRadius: 2 }}
            action={
              <Button color="inherit" size="small" onClick={reset}>
                Chụp lại
              </Button>
            }
          >
            Ảnh thu được có độ sáng thấp (dưới ngưỡng tối ưu)! Vui lòng di chuyển đến khu vực có ánh sáng tốt hơn để AI nhận diện chuẩn xác nhất.
          </Alert>
        </Box>
      )}

      {/* 2. Trạng thái ĐANG XỬ LÝ (Loading) */}
      {isLoading ? (
        <Box sx={staggerSx(1)}>
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 3,
              border: "1px solid",
              borderColor: alpha(theme.palette.primary.main, 0.2),
              background: `linear-gradient(135deg, ${alpha("#8B0000", 0.03)} 0%, ${alpha("#0A2540", 0.05)} 100%)`,
              textAlign: "center",
            }}
          >
            <Stack spacing={3} sx={{ alignItems: "center", maxWidth: 520, mx: "auto" }}>
              <Box sx={{ position: "relative", display: "inline-flex" }}>
                <CircularProgress
                  size={76}
                  thickness={3.5}
                  sx={{
                    color: "#8B0000",
                    animationDuration: "1.2s",
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: 36, color: "#8B0000" }} />
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#0A2540", mb: 0.5 }}>
                  {isProcessing ? "Đang tiền xử lý & tối ưu hóa vector..." : "Đang so khớp với kho vector sinh trắc học..."}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  InsightFace đang quét cosine similarity trên toàn bộ độc giả và cán bộ thư viện.
                </Typography>
              </Box>

              <Box sx={{ width: "100%" }}>
                <LinearProgress
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: alpha("#8B0000", 0.1),
                    "& .MuiLinearProgress-bar": {
                      background: "linear-gradient(90deg, #8B0000, #D4AF37)",
                    },
                  }}
                />
              </Box>

              <Typography variant="caption" sx={{ color: "text.disabled", display: "flex", alignItems: "center", gap: 0.5 }}>
                <LockOutlinedIcon sx={{ fontSize: 14 }} /> Dữ liệu được mã hóa đầu cuối và tuân thủ tiêu chuẩn an toàn thông tin
              </Typography>
            </Stack>
          </Paper>
        </Box>
      ) : matches ? (
        /* 3. Trạng thái ĐÃ CÓ KẾT QUẢ NHẬN DIỆN */
        <Stack spacing={3} sx={staggerSx(1)}>
          {/* Thanh công cụ kết quả */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              px: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              bgcolor: "background.paper",
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  bgcolor: matches.length > 0 ? alpha("#10B981", 0.12) : alpha("#F59E0B", 0.12),
                  color: matches.length > 0 ? "#10B981" : "#D97706",
                  display: "flex",
                }}
              >
                {matches.length > 0 ? <VerifiedUserOutlinedIcon /> : <WarningAmberOutlinedIcon />}
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Tìm thấy {matches.length} kết quả khớp
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Sắp xếp theo độ tin cậy giảm dần • Thời gian xử lý: {processingTimeMs ? `${processingTimeMs} ms` : "nhanh"}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              {processingStats && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Đã nén tối ưu: -${processingStats.reduction}%`}
                  sx={{ borderRadius: "8px", display: { xs: "none", sm: "inline-flex" } }}
                />
              )}
              <Button
                startIcon={<RestartAltOutlinedIcon />}
                variant="outlined"
                onClick={reset}
                sx={{
                  borderRadius: 2,
                  fontWeight: 700,
                  borderColor: "divider",
                  color: "text.primary",
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                Nhận diện lượt mới
              </Button>
            </Stack>
          </Paper>

          {/* Trường hợp KHÔNG tìm thấy ai khớp */}
          {matches.length === 0 ? (
            <DashboardCard>
              <EmptyState
                icon={<PersonOffOutlinedIcon sx={{ fontSize: 64, color: "text.secondary" }} />}
                title="Không tìm thấy khuôn mặt trùng khớp trong kho dữ liệu"
                description="Hệ thống không tìm thấy độc giả hoặc cán bộ nào có độ tương đồng vượt ngưỡng nhận diện (>65%)."
                action={
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<FaceRetouchingNaturalOutlinedIcon />}
                      onClick={reset}
                      sx={{
                        borderRadius: 2,
                        background: "linear-gradient(135deg, #8B0000 0%, #A00000 100%)",
                      }}
                    >
                      Chụp lại góc khác
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<SchoolOutlinedIcon />}
                      onClick={() => router.push("/patrons")}
                      sx={{ borderRadius: 2 }}
                    >
                      Đăng ký khuôn mặt bạn đọc mới
                    </Button>
                  </Stack>
                }
              />
            </DashboardCard>
          ) : (
            /* Trường hợp CÓ KẾT QUẢ KHỚP */
            <Stack spacing={3}>
              {/* TOP 1 BEST MATCH CARD (Nổi bật nhất) */}
              {bestMatch && (
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 3.5,
                    border: "2px solid",
                    borderColor: bestScore >= 0.75 ? "#D4AF37" : alpha(theme.palette.primary.main, 0.4),
                    background: `linear-gradient(145deg, ${alpha("#FFFDF7", 0.9)} 0%, ${alpha("#FFFFFF", 1)} 100%)`,
                    boxShadow: "0 12px 36px rgba(212, 175, 55, 0.14)",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {/* Top ribbon banner */}
                  <Box
                    sx={{
                      py: 0.8,
                      px: 3,
                      background: bestScore >= 0.75
                        ? "linear-gradient(90deg, #B8860B 0%, #D4AF37 50%, #B8860B 100%)"
                        : "linear-gradient(90deg, #8B0000 0%, #A00000 100%)",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <VerifiedUserOutlinedIcon sx={{ fontSize: 18 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase" }}>
                        Độ trùng khớp cao nhất (Top 1 Best Match)
                      </Typography>
                    </Stack>
                    <Chip
                      size="small"
                      label={bestScore >= 0.8 ? "RẤT CAO" : bestScore >= 0.65 ? "ĐÁNG TIN CẬY" : "TRUNG BÌNH"}
                      sx={{
                        bgcolor: "rgba(255, 255, 255, 0.25)",
                        color: "#FFFFFF",
                        fontWeight: 800,
                        height: 22,
                        fontSize: "0.72rem",
                      }}
                    />
                  </Box>

                  {/* Main Best Match Content */}
                  <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "auto 1fr auto" },
                        gap: 3,
                        alignItems: "center",
                      }}
                    >
                      {/* Avatar lớn + Ảnh đối chiếu */}
                      <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "center" }}>
                        <Box sx={{ textAlign: "center" }}>
                          <Avatar
                            src={bestMatch.avatar_url}
                            alt={bestMatch.full_name || "Patron"}
                            sx={{
                              width: 96,
                              height: 96,
                              border: "3px solid #D4AF37",
                              boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                              bgcolor: alpha("#8B0000", 0.1),
                              color: "#8B0000",
                              fontSize: 34,
                              fontWeight: 800,
                              mx: "auto",
                            }}
                          >
                            {(bestMatch.full_name || bestMatch.user_id || "U").charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="caption" sx={{ display: "block", mt: 0.5, fontWeight: 700, color: "text.secondary" }}>
                            Hồ sơ gốc
                          </Typography>
                        </Box>

                        {dataUrl && (
                          <Box sx={{ textAlign: "center" }}>
                            <Box
                              component="img"
                              src={dataUrl}
                              alt="Ảnh vừa quét"
                              sx={{
                                width: 96,
                                height: 96,
                                objectFit: "cover",
                                borderRadius: "50%",
                                border: "3px solid",
                                borderColor: "#10B981",
                                boxShadow: "0 6px 16px rgba(16, 185, 129, 0.2)",
                              }}
                            />
                            <Typography variant="caption" sx={{ display: "block", mt: 0.5, fontWeight: 700, color: "#10B981" }}>
                              Ảnh vừa quét
                            </Typography>
                          </Box>
                        )}
                      </Stack>

                      {/* Thông tin hồ sơ */}
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: "#0A2540", mb: 0.5 }}>
                          {bestMatch.full_name || "Độc giả IUH"}
                        </Typography>

                        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 0.8, mb: 1.5 }}>
                          <Chip
                            icon={<BadgeOutlinedIcon sx={{ fontSize: "15px !important" }} />}
                            label={`MSSV/ID: ${bestMatch.student_code || bestMatch.user_id}`}
                            size="small"
                            sx={{
                              fontFamily: "monospace",
                              fontWeight: 700,
                              bgcolor: alpha("#0A2540", 0.08),
                              color: "#0A2540",
                            }}
                          />
                          {bestMatch.class_name && (
                            <Chip
                              icon={<SchoolOutlinedIcon sx={{ fontSize: "15px !important" }} />}
                              label={`Lớp: ${bestMatch.class_name}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          <Chip
                            label={bestMatch.role === "staff" ? "Cán bộ thư viện" : bestMatch.role === "faculty" ? "Giảng viên" : "Sinh viên"}
                            size="small"
                            sx={{
                              bgcolor: bestMatch.role === "staff" ? alpha("#8B0000", 0.1) : alpha("#10B981", 0.1),
                              color: bestMatch.role === "staff" ? "#8B0000" : "#059669",
                              fontWeight: 700,
                            }}
                          />
                        </Stack>

                        {bestMatch.email && (
                          <Typography variant="body2" sx={{ color: "text.secondary", display: "flex", alignItems: "center", gap: 0.8 }}>
                            <EmailOutlinedIcon sx={{ fontSize: 16 }} />
                            {bestMatch.email}
                          </Typography>
                        )}
                      </Box>

                      {/* Score Meter & Quick Action Buttons */}
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          bgcolor: alpha(theme.palette.background.default, 0.6),
                          border: "1px solid",
                          borderColor: "divider",
                          textAlign: "center",
                          minWidth: { md: 240 },
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase" }}>
                          Điểm tin cậy sinh trắc
                        </Typography>
                        <Typography
                          variant="h3"
                          sx={{
                            fontWeight: 900,
                            fontFamily: "monospace",
                            color: bestScore >= 0.75 ? "#10B981" : bestScore >= 0.5 ? "#D97706" : "#EF4444",
                            my: 0.5,
                          }}
                        >
                          {bestPercent}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(bestPercent, 100)}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: alpha("#10B981", 0.12),
                            mb: 2,
                            "& .MuiLinearProgress-bar": {
                              background: bestScore >= 0.75
                                ? "linear-gradient(90deg, #10B981, #059669)"
                                : "linear-gradient(90deg, #F59E0B, #D97706)",
                            },
                          }}
                        />

                        <Stack spacing={1}>
                          <Button
                            fullWidth
                            variant="contained"
                            startIcon={<MenuBookOutlinedIcon />}
                            onClick={() => handleProceedToBorrow(bestMatch)}
                            sx={{
                              borderRadius: 2,
                              fontWeight: 800,
                              background: "linear-gradient(135deg, #8B0000 0%, #A00000 100%)",
                              boxShadow: "0 4px 14px rgba(139, 0, 0, 0.25)",
                              "&:hover": {
                                background: "linear-gradient(135deg, #7A0000 0%, #8B0000 100%)",
                              },
                            }}
                          >
                            Tạo phiếu mượn sách
                          </Button>

                          <Button
                            fullWidth
                            size="small"
                            variant="outlined"
                            startIcon={<CheckCircleOutlineOutlinedIcon />}
                            onClick={() => router.push(`/verify?student_code=${encodeURIComponent(bestMatch.student_code || bestMatch.user_id)}`)}
                            sx={{ borderRadius: 2, fontWeight: 700 }}
                          >
                            Xác minh 1:1 chuyên sâu
                          </Button>
                        </Stack>
                      </Paper>
                    </Box>
                  </Box>
                </Paper>
              )}

              {/* DANH SÁCH CÁC ỨNG VIÊN CÒN LẠI (CANDIDATE LIST) */}
              {otherMatches.length > 0 && (
                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
                  <Box sx={{ p: 2, px: 3, bgcolor: alpha("#0A2540", 0.03), borderBottom: "1px solid", borderColor: "divider" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0A2540" }}>
                      Các đối tượng trùng khớp tiềm năng khác ({otherMatches.length})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Kết quả có độ tương đồng thấp hơn Top 1 trong kho dữ liệu vector
                    </Typography>
                  </Box>

                  <TableContainer>
                    <Table sx={{ minWidth: 700 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800, width: 70 }}>Hạng</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Độ tin cậy</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Mã bạn đọc</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Họ và tên</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Email</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Vai trò</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>Thao tác</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {otherMatches.map((match, idx) => {
                          const score = Number(match.score ?? 0);
                          const pct = Number((score * 100).toFixed(1));
                          const code = match.student_code || match.user_id;

                          return (
                            <TableRow key={`${match.user_id}-${idx}`} hover>
                              <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>
                                #{idx + 2}
                              </TableCell>
                              <TableCell sx={{ minWidth: 160 }}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={Math.min(pct, 100)}
                                    sx={{
                                      width: 80,
                                      height: 6,
                                      borderRadius: 3,
                                      bgcolor: alpha(theme.palette.divider, 0.6),
                                      "& .MuiLinearProgress-bar": {
                                        bgcolor: score >= 0.7 ? "success.main" : score >= 0.5 ? "warning.main" : "error.main",
                                      },
                                    }}
                                  />
                                  <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
                                    {pct}%
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell sx={{ fontFamily: "monospace", fontWeight: 700, color: "primary.main" }}>
                                {code}
                              </TableCell>
                              <TableCell sx={{ fontWeight: 750 }}>
                                {match.full_name || "-"}
                              </TableCell>
                              <TableCell sx={{ color: "text.secondary" }}>
                                {match.email || "-"}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={match.role || "Sinh viên"}
                                  sx={{ borderRadius: "6px" }}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Button
                                  size="small"
                                  variant="text"
                                  endIcon={<ArrowForwardIcon />}
                                  onClick={() => handleProceedToBorrow(match)}
                                  sx={{ fontWeight: 700 }}
                                >
                                  Mượn sách
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}
            </Stack>
          )}
        </Stack>
      ) : (
        /* 4. Trạng thái BAN ĐẦU: BỐ CỤC 2 CỘT HIỆN ĐẠI */
        <Box
          sx={{
            ...staggerSx(1),
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "580px 1fr" },
            gap: 3,
            alignItems: "start",
          }}
        >
          {/* CỘT TRÁI: CAMERA & ĐIỀU KHOẢN */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 3.5,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              boxShadow: "0 6px 24px rgba(0,0,0,0.04)",
            }}
          >
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                {/* Header card trái */}
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: alpha("#8B0000", 0.08),
                      color: "#8B0000",
                      display: "flex",
                    }}
                  >
                    <CameraAltOutlinedIcon />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0A2540" }}>
                      Thu nhận ảnh khuôn mặt
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Chụp trực tiếp từ webcam hoặc tải lên từ thiết bị
                    </Typography>
                  </Box>
                </Stack>

                {/* Component CameraCapture với Reticle khuôn mặt chuyên nghiệp */}
                <CameraCapture
                  onCapture={handleCapture}
                  onFileUpload={handleFileUpload}
                  overlayGuide="face"
                />

                {/* Thông tin tiền xử lý ảnh */}
                {processingStats && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: alpha("#10B981", 0.06),
                      border: "1px dashed",
                      borderColor: alpha("#10B981", 0.3),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#059669" }}>
                      Tối ưu hóa ảnh AI: {Math.round(processingStats.originalSize / 1024)} KB → {Math.round(processingStats.processedSize / 1024)} KB
                    </Typography>
                    <Chip
                      size="small"
                      label={`Tiết kiệm ${processingStats.reduction}% dung lượng`}
                      sx={{ height: 20, fontSize: "0.7rem", bgcolor: "#10B981", color: "#FFF", fontWeight: 700 }}
                    />
                  </Paper>
                )}

                {/* Hộp cam kết bảo vệ dữ liệu sinh trắc học */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: alpha("#0A2540", 0.03),
                    border: "1px solid",
                    borderColor: alpha("#0A2540", 0.08),
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        sx={{
                          color: "#8B0000",
                          "&.Mui-checked": { color: "#8B0000" },
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ color: "text.primary", lineHeight: 1.5, fontWeight: 500 }}>
                        Tôi đồng ý cho hệ thống trích xuất vector khuôn mặt phục vụ định danh và mượn trả tài liệu theo quy định thư viện IUH.
                      </Typography>
                    }
                  />
                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5, pl: 4 }}>
                    Dữ liệu khuôn mặt được mã hóa thành vector 512 chiều, không lưu trữ ảnh thô trái phép theo Nghị định 13/2023/NĐ-CP.
                  </Typography>
                </Paper>

                {/* Nút Submit nhận diện */}
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!imageFile || !consent || isLoading}
                  fullWidth
                  startIcon={<FaceRetouchingNaturalOutlinedIcon />}
                  sx={{
                    height: 48,
                    borderRadius: 2.5,
                    fontWeight: 800,
                    fontSize: "1rem",
                    background: "linear-gradient(135deg, #8B0000 0%, #A00000 100%)",
                    boxShadow: "0 6px 18px rgba(139, 0, 0, 0.28)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #7A0000 0%, #8B0000 100%)",
                    },
                    "&.Mui-disabled": {
                      background: alpha(theme.palette.action.disabledBackground, 0.6),
                    },
                  }}
                >
                  {isLoading ? "Đang xử lý nhận diện..." : "Tìm kiếm & Nhận diện (1:N)"}
                </Button>
              </Stack>
            </Box>
          </Paper>

          {/* CỘT PHẢI: QUY TRÌNH KỸ THUẬT & HƯỚNG DẪN */}
          <Stack spacing={3}>
            {/* Thẻ 1: Quy trình hoạt động */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3.5,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0A2540", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                <SpeedOutlinedIcon sx={{ color: "#8B0000" }} />
                Quy trình nhận diện 1:N AI
              </Typography>

              <Stack spacing={2}>
                {[
                  {
                    step: "1",
                    title: "Thu nhận & Tiền xử lý",
                    desc: "Chuẩn hóa kích thước 640x480, kiểm tra cân bằng sáng và xoay khuôn mặt trực diện.",
                  },
                  {
                    step: "2",
                    title: "Trích xuất 512-D Embedding",
                    desc: "Mạng nơ-ron sâu InsightFace trích xuất vector đặc trưng sinh trắc học duy nhất.",
                  },
                  {
                    step: "3",
                    title: "Quét Cosine Similarity",
                    desc: "Tìm kiếm song song trong cơ sở dữ liệu vector ChromaDB với độ trễ dưới 200ms.",
                  },
                  {
                    step: "4",
                    title: "Xác thực danh tính & Trả kết quả",
                    desc: "Lọc ngưỡng tin cậy (>65%), liên kết hồ sơ độc giả và tạo phiên làm việc mượn sách tức thì.",
                  },
                ].map((item) => (
                  <Stack key={item.step} direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        bgcolor: alpha("#8B0000", 0.1),
                        color: "#8B0000",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "0.85rem",
                        flexShrink: 0,
                        mt: 0.2,
                      }}
                    >
                      {item.step}
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 750, color: "text.primary" }}>
                        {item.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.4, display: "block" }}>
                        {item.desc}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Paper>

            {/* Thẻ 2: Hướng dẫn đạt kết quả cao */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3.5,
                bgcolor: alpha("#D4AF37", 0.08),
                border: "1px solid",
                borderColor: alpha("#D4AF37", 0.3),
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#8B6F00", mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <LightbulbOutlinedIcon sx={{ fontSize: 20 }} />
                Mẹo nhận diện chính xác
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.875rem", lineHeight: 1.6 }}>
                • Giữ khoảng cách 40 - 70 cm trước ống kính camera.<br />
                • Tháo khẩu trang, kính râm và vén tóc che trán/mắt.<br />
                • Tránh ánh sáng đèn chiếu ngược từ phía sau lưng.
              </Typography>
            </Paper>

            {/* Thẻ 3: Lối tắt nghiệp vụ liên quan */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3.5,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0A2540", mb: 1.5 }}>
                Chuyển nhanh sang chế độ khác
              </Typography>

              <Stack spacing={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<CheckCircleOutlineOutlinedIcon />}
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => router.push("/verify")}
                  sx={{ justifyContent: "space-between", borderRadius: 2, fontWeight: 700, py: 1 }}
                >
                  Xác minh 1:1 theo Mã sinh viên
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<VisibilityOutlinedIcon />}
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => router.push("/liveness")}
                  sx={{ justifyContent: "space-between", borderRadius: 2, fontWeight: 700, py: 1 }}
                >
                  Kiểm tra thực thể sống (Anti-Spoofing)
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
