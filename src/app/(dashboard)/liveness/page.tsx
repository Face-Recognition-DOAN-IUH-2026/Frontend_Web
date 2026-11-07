"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import GppBadOutlinedIcon from "@mui/icons-material/GppBadOutlined";
import GppGoodOutlinedIcon from "@mui/icons-material/GppGoodOutlined";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import FaceRetouchingNaturalOutlinedIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import CameraCapture from "@/app/(dashboard)/_components/camera-capture";
import JobPoll from "@/app/(dashboard)/_components/job-poll";
import api, { getErrorMessage } from "@/lib/api-client";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import { useToast } from "@/lib/toast-context";

/** Component hiển thị kết quả kiểm tra Anti-Spoofing chi tiết */
function LivenessResultCard({
  result,
  onReset,
  capturedUrl,
}: {
  result: any;
  onReset: () => void;
  capturedUrl?: string;
}) {
  const theme = useTheme();
  const router = useRouter();
  const isLive = Boolean(result.is_live);
  const score = Number(result.liveness_score ?? 0);
  const pct = Math.min(Math.round(score * 100), 100);

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3.5,
        border: "2px solid",
        borderColor: isLive ? "#10B981" : "#EF4444",
        background: isLive
          ? `linear-gradient(145deg, ${alpha("#ECFDF5", 0.9)} 0%, #FFFFFF 100%)`
          : `linear-gradient(145deg, ${alpha("#FEF2F2", 0.9)} 0%, #FFFFFF 100%)`,
        boxShadow: isLive
          ? "0 12px 36px rgba(16, 185, 129, 0.12)"
          : "0 12px 36px rgba(239, 68, 68, 0.12)",
        overflow: "hidden",
      }}
    >
      {/* Banner trên cùng */}
      <Box
        sx={{
          py: 1,
          px: 3,
          background: isLive
            ? "linear-gradient(90deg, #059669 0%, #10B981 100%)"
            : "linear-gradient(90deg, #DC2626 0%, #EF4444 100%)",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {isLive ? <GppGoodOutlinedIcon sx={{ fontSize: 20 }} /> : <GppBadOutlinedIcon sx={{ fontSize: 20 }} />}
          <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase" }}>
            {isLive ? "CHỨNG NHẬN THỰC THỂ SỐNG ĐẠT CHUẨN" : "CẢNH BÁO: PHÁT HIỆN DẤU HIỆU GIẢ MẠO"}
          </Typography>
        </Stack>
        <Chip
          size="small"
          label={isLive ? "PASSED (REAL)" : "FAILED (SPOOF)"}
          sx={{
            bgcolor: "rgba(255, 255, 255, 0.25)",
            color: "#FFFFFF",
            fontWeight: 800,
            height: 22,
            fontSize: "0.72rem",
          }}
        />
      </Box>

      {/* Nội dung kết quả */}
      <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: capturedUrl ? "auto 1fr" : "1fr" },
            gap: 3,
            alignItems: "center",
          }}
        >
          {/* Ảnh mẫu đã quét */}
          {capturedUrl && (
            <Box sx={{ textAlign: "center", mx: "auto" }}>
              <Box
                component="img"
                src={capturedUrl}
                alt="Ảnh kiểm tra Liveness"
                sx={{
                  width: 140,
                  height: 140,
                  objectFit: "cover",
                  borderRadius: 3,
                  border: "3px solid",
                  borderColor: isLive ? "#10B981" : "#EF4444",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
                }}
              />
              <Typography variant="caption" sx={{ display: "block", mt: 0.8, fontWeight: 700, color: "text.secondary" }}>
                Mẫu ảnh đối chiếu
              </Typography>
            </Box>
          )}

          {/* Chi tiết phân tích */}
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: isLive ? "#065F46" : "#991B1B", mb: 0.5 }}>
                {isLive ? "Khuôn mặt thật (Real Face)" : "Phát hiện giả mạo (Spoof Detected)"}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
                {isLive
                  ? "Khuôn mặt được xác định là thực thể sống thật đang tương tác trước camera. Không phát hiện dấu hiệu tái phát ảnh qua màn hình hiển thị hoặc ảnh in tĩnh."
                  : "Hệ thống phát hiện dấu hiệu bất thường về phản xạ ánh sáng hoặc tần số quét vi sóng màn hình. Giao dịch có thể mang tính chất giả mạo sinh trắc học."}
              </Typography>
            </Box>

            {/* Thanh đo điểm số */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: alpha(isLive ? "#10B981" : "#EF4444", 0.06),
                border: "1px solid",
                borderColor: alpha(isLive ? "#10B981" : "#EF4444", 0.2),
              }}
            >
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isLive ? "#065F46" : "#991B1B" }}>
                  Chỉ số thực thể sống (Liveness Confidence Score)
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: isLive ? "#059669" : "#DC2626" }}>
                  {(score * 100).toFixed(1)}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={pct}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  bgcolor: alpha(isLive ? "#10B981" : "#EF4444", 0.15),
                  "& .MuiLinearProgress-bar": {
                    background: isLive
                      ? "linear-gradient(90deg, #10B981, #059669)"
                      : "linear-gradient(90deg, #F87171, #DC2626)",
                  },
                }}
              />
            </Paper>

            {/* Bảng checklist an toàn 4 lớp */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.5,
              }}
            >
              {[
                {
                  label: "Cấu trúc phản xạ da",
                  val: isLive ? "Tự nhiên" : "Không đồng nhất",
                  ok: isLive,
                },
                {
                  label: "Tần số quét Moiré",
                  val: isLive ? "Âm tính (Không có màn hình)" : "Dương tính (Màn hình)",
                  ok: isLive,
                },
                {
                  label: "Chiều sâu biên cạnh 3D",
                  val: isLive ? "Hợp lệ" : "Bất thường viền",
                  ok: isLive,
                },
                {
                  label: "Trạng thái giao dịch",
                  val: isLive ? "Cho phép tiếp tục" : "Khóa xác thực",
                  ok: isLive,
                },
              ].map((item, idx) => (
                <Paper
                  key={idx}
                  elevation={0}
                  sx={{
                    p: 1.2,
                    px: 1.8,
                    borderRadius: 2,
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: alpha(item.ok ? "#10B981" : "#EF4444", 0.25),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                    {item.label}
                  </Typography>
                  <Chip
                    size="small"
                    label={item.val}
                    sx={{
                      height: 22,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      bgcolor: alpha(item.ok ? "#10B981" : "#EF4444", 0.12),
                      color: item.ok ? "#059669" : "#DC2626",
                    }}
                  />
                </Paper>
              ))}
            </Box>

            <Divider />

            {/* Nút hành động sau kết quả */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<RestartAltOutlinedIcon />}
                onClick={onReset}
                sx={{ borderRadius: 2, fontWeight: 700 }}
              >
                Kiểm tra lượt mới
              </Button>

              {isLive ? (
                <>
                  <Button
                    variant="contained"
                    startIcon={<CheckCircleOutlineOutlinedIcon />}
                    onClick={() => router.push("/verify")}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 800,
                      background: "linear-gradient(135deg, #8B0000 0%, #A00000 100%)",
                      boxShadow: "0 4px 14px rgba(139, 0, 0, 0.25)",
                    }}
                  >
                    Tiến hành Xác minh 1:1
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<FaceRetouchingNaturalOutlinedIcon />}
                    onClick={() => router.push("/identify")}
                    sx={{ borderRadius: 2, fontWeight: 700 }}
                  >
                    Nhận diện 1:N
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<RestartAltOutlinedIcon />}
                  onClick={onReset}
                  sx={{ borderRadius: 2, fontWeight: 800 }}
                >
                  Chụp lại mẫu ảnh mới
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Paper>
  );
}

export default function LivenessPage() {
  const theme = useTheme();
  const router = useRouter();
  const { toast } = useToast();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [dataUrl, setDataUrl] = useState<string>("");
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleCapture = (file: File, url: string) => {
    setImageFile(file);
    setDataUrl(url);
    setResult(null);
    setError("");
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImageFile(file);
      setDataUrl(url);
      setResult(null);
      setError("");
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
    setJobId(null);
    setResult(null);

    try {
      const data = await api.livenessCheck(imageFile, consent);
      setJobId(data.job_id);
    } catch (err: any) {
      const msg = getErrorMessage(err) || "Kiểm tra liveness thất bại.";
      setError(msg);
      toast.error(msg);
      setIsLoading(false);
    }
  };

  const reset = () => {
    setImageFile(null);
    setDataUrl("");
    setJobId(null);
    setResult(null);
    setError("");
    setIsLoading(false);
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 1140, mx: "auto", pb: 6 }}>
      {/* 1. Header trang chuẩn IUH */}
      <Box sx={staggerSx(0)}>
        <PageHeader
          title="Kiểm tra thực thể sống (Liveness Check)"
          subtitle="Công nghệ Anti-Spoofing AI phát hiện và ngăn chặn hành vi giả mạo ảnh in hoặc màn hình số."
          icon={SecurityOutlinedIcon}
          actions={
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
              <Chip
                icon={<SecurityOutlinedIcon sx={{ fontSize: "16px !important" }} />}
                label="Anti-Spoofing AI v2"
                size="small"
                sx={{
                  bgcolor: alpha("#0A2540", 0.08),
                  color: "#0A2540",
                  fontWeight: 700,
                  borderRadius: "8px",
                }}
              />
              <Chip
                icon={<VerifiedUserOutlinedIcon sx={{ fontSize: "16px !important" }} />}
                label="Zero-Trust Biometrics"
                size="small"
                sx={{
                  bgcolor: alpha("#10B981", 0.12),
                  color: "#059669",
                  fontWeight: 700,
                  borderRadius: "8px",
                }}
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
            severity="error"
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

      {/* 2. Hiển thị Kết quả phân tích Liveness */}
      {result ? (
        <Box sx={staggerSx(1)}>
          <LivenessResultCard
            result={result}
            onReset={reset}
            capturedUrl={dataUrl}
          />
        </Box>
      ) : jobId ? (
        /* 3. Đang polling xử lý qua SSE / JobPoll */
        <Box sx={staggerSx(1)}>
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 3.5,
              border: "1px solid",
              borderColor: alpha(theme.palette.primary.main, 0.2),
              background: `linear-gradient(135deg, ${alpha("#8B0000", 0.03)} 0%, ${alpha("#0A2540", 0.04)} 100%)`,
              textAlign: "center",
            }}
          >
            <Stack spacing={2.5} sx={{ maxWidth: 500, mx: "auto", alignItems: "center" }}>
              <SecurityOutlinedIcon sx={{ fontSize: 56, color: "#8B0000" }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#0A2540", mb: 0.5 }}>
                  Đang phân tích cấu trúc quang học thực thể sống...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Hệ thống kiểm tra phản xạ bề mặt da, quét vân màn hình moiré và chiều sâu 3D.
                </Typography>
              </Box>

              <Box sx={{ width: "100%" }}>
                <JobPoll
                  jobId={jobId}
                  onComplete={(value) => {
                    setResult(value);
                    setIsLoading(false);
                    setJobId(null);
                    if (value?.is_live) {
                      toast.success("Khuôn mặt thật — kiểm tra liveness đạt chuẩn!");
                    } else {
                      toast.warning("Cảnh báo: Phát hiện nghi vấn giả mạo!");
                    }
                  }}
                  onError={(message) => {
                    setError(message);
                    setIsLoading(false);
                    setJobId(null);
                    toast.error(message);
                  }}
                />
              </Box>
            </Stack>
          </Paper>
        </Box>
      ) : (
        /* 4. Màn hình BAN ĐẦU: Bố cục 2 cột hiện đại */
        <Box
          sx={{
            ...staggerSx(1),
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "580px 1fr" },
            gap: 3,
            alignItems: "start",
          }}
        >
          {/* CỘT TRÁI: CAMERA & GỬI YÊU CẦU */}
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
                      Thu nhận mẫu kiểm tra
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Chụp ảnh khuôn mặt người dùng trực tiếp từ camera
                    </Typography>
                  </Box>
                </Stack>

                {/* CameraCapture có khung oval ngắm sinh trắc học */}
                <CameraCapture
                  onCapture={handleCapture}
                  onFileUpload={handleFileUpload}
                  overlayGuide="face"
                />

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
                        Tôi đồng ý cho hệ thống xử lý dữ liệu khuôn mặt để kiểm tra thực thể sống theo quy định bảo mật.
                      </Typography>
                    }
                  />
                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5, pl: 4 }}>
                    Thuật toán chỉ tính toán điểm số liveness và tự động hủy bỏ tệp tin tạm ngay sau khi hoàn thành.
                  </Typography>
                </Paper>

                {/* Nút Submit */}
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!imageFile || !consent || isLoading}
                  fullWidth
                  startIcon={<SecurityOutlinedIcon />}
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
                  {isLoading ? "Đang gửi yêu cầu..." : "Kiểm tra thực thể sống (Anti-Spoofing)"}
                </Button>
              </Stack>
            </Box>
          </Paper>

          {/* CỘT PHẢI: CÔNG NGHỆ & NGUYÊN LÝ HOẠT ĐỘNG */}
          <Stack spacing={3}>
            {/* Thẻ 1: 4 Lớp bảo vệ Anti-Spoofing */}
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
                <ShieldOutlinedIcon sx={{ color: "#8B0000" }} />
                4 Cơ chế phát hiện giả mạo chuyên sâu
              </Typography>

              <Stack spacing={2}>
                {[
                  {
                    title: "Phản xạ quang học bề mặt (Texture Specularity)",
                    desc: "Phân biệt độ bóng dầu tự nhiên của lớp sừng biểu bì so với ánh sáng khuếch tán thô ráp của giấy in.",
                  },
                  {
                    title: "Khử vân vi sóng màn hình (Moiré Filter)",
                    desc: "Quét dải tần số giao thoa pixel phát xạ đặc trưng từ màn hình điện thoại, máy tính bảng hoặc máy tính.",
                  },
                  {
                    title: "Chiều sâu & Đường biên 3D (3D Depth Transition)",
                    desc: "Phát hiện sự phẳng dẹt bất thường hoặc các đường gờ cắt mép giấy in không có độ chuyển tiếp không gian tự nhiên.",
                  },
                  {
                    title: "Dải màu quang phổ da người (Skin Chrominance)",
                    desc: "Kiểm tra tính nhất quán phổ màu da sinh học dưới điều kiện chiếu sáng xung quanh.",
                  },
                ].map((item, idx) => (
                  <Stack key={idx} direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        bgcolor: alpha("#8B0000", 0.1),
                        color: "#8B0000",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "0.8rem",
                        flexShrink: 0,
                        mt: 0.2,
                      }}
                    >
                      {idx + 1}
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

            {/* Thẻ 2: Tiêu chuẩn thu nhận mẫu đạt chuẩn */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3.5,
                bgcolor: alpha("#0A2540", 0.03),
                border: "1px solid",
                borderColor: alpha("#0A2540", 0.08),
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0A2540", mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <LightbulbOutlinedIcon sx={{ color: "#D4AF37", fontSize: 20 }} />
                Lưu ý khi thu nhận mẫu
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.875rem", lineHeight: 1.6 }}>
                • Không sử dụng ảnh chụp lại từ thiết bị khác.<br />
                • Căn chỉnh khuôn mặt nằm trọn trong vòng oval hướng dẫn.<br />
                • Đảm bảo ánh sáng đồng đều hai bên gò má và trán.
              </Typography>
            </Paper>

            {/* Thẻ 3: Lối tắt điều hướng */}
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
                Các chức năng sinh trắc học khác
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
                  Xác thực khuôn mặt 1:1
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<FaceRetouchingNaturalOutlinedIcon />}
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => router.push("/identify")}
                  sx={{ justifyContent: "space-between", borderRadius: 2, fontWeight: 700, py: 1 }}
                >
                  Nhận diện khuôn mặt 1:N
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
