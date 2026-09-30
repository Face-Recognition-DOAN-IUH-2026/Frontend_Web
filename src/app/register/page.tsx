"use client";

import { useEffect, useState } from "react";
import { useTaskSSE } from "@/lib/hooks/useTaskSSE";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  InputAdornment,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api, { getErrorMessage } from "@/lib/api-client";
import { StudentCardScanner, type ScannedCardData } from "@/app/(dashboard)/_components/scanner";
import MultiAngleCapture, { type CaptureAngle } from "@/app/(dashboard)/_components/MultiAngleCapture";

import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import ClassOutlinedIcon from "@mui/icons-material/ClassOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import FaceRetouchingNaturalOutlinedIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";

const steps = ["Quét thẻ SV", "Xác nhận", "Thông tin tài khoản", "Khuôn mặt AI"];

type RegisterPhase = "scan" | "confirm" | "form" | "face" | "face-enrolling" | "done";

export default function RegisterPage() {
  const theme = useTheme();
  const router = useRouter();
  const [phase, setPhase] = useState<RegisterPhase>("scan");
  const [activeStep, setActiveStep] = useState(0);
  const [scannedData, setScannedData] = useState<ScannedCardData | null>(null);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [className, setClassName] = useState("");
  const [course, setCourse] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [faculty, setFaculty] = useState("");

  const [consent, setConsent] = useState(false);
  const [faceResult, setFaceResult] = useState<any>(null);
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceError, setFaceError] = useState("");
  const { state: sseState, start: startSSE, reset: resetSSE } = useTaskSSE();

  const [registrationTokens, setRegistrationTokens] = useState<{
    access_token: string;
    refresh_token?: string;
  } | null>(null);

  useEffect(() => {
    if (sseState.status === "SUCCESS") {
      if ((sseState.result as any)?.status === "error") {
        setFaceError((sseState.result as any)?.error || "Đăng ký khuôn mặt thất bại");
      }
      setFaceResult(sseState.result);
      setFaceLoading(false);
      setPhase("done");
    } else if (
      sseState.status === "FAILURE" ||
      sseState.status === "ERROR" ||
      sseState.status === "TIMEOUT"
    ) {
      setFaceError(sseState.error || "Không thể lấy trạng thái tác vụ");
      setFaceResult(sseState.result);
      setFaceLoading(false);
      setPhase("done");
    }
  }, [sseState, resetSSE]);

  useEffect(() => () => resetSSE(), [resetSSE]);

  const handleScanned = async (data: ScannedCardData) => {
    setError("");
    if (!data.studentCode) return;
    try {
      const existing = await api.lookupPatron(data.studentCode);
      if (existing.exists) {
        setError(
          "MSSV này đã được đăng ký trong hệ thống. Vui lòng đăng nhập hoặc liên hệ thư viện để được hỗ trợ."
        );
        return;
      }
    } catch {
      setError("Không thể kiểm tra thông tin MSSV. Vui lòng thử lại.");
      return;
    }
    setScannedData(data);
    setFullName(data.fullName || "");
    setStudentCode(data.studentCode || "");
    setClassName(data.className || "");
    setCourse(data.course || "");
    setPermanentAddress(data.permanentAddress || "");
    setDateOfBirth(data.dateOfBirth || "");
    setFaculty(data.faculty || "");
    setActiveStep(1);
    setPhase("confirm");
  };

  const handleConfirmNext = () => {
    setActiveStep(2);
    setPhase("form");
  };

  const handleFormSubmit = async () => {
    if (!email || !password || !fullName || !studentCode) {
      setError("Vui lòng điền đầy đủ Email, Mật khẩu, Họ tên và MSSV");
      return;
    }
    setError("");
    setRegistering(true);
    try {
      const res = await api.patronRegister({
        full_name: fullName,
        student_code: studentCode,
        email,
        password,
        class_name: className || undefined,
        course: course || undefined,
        permanent_address: permanentAddress || undefined,
        date_of_birth: dateOfBirth || undefined,
        faculty: faculty || undefined,
      });
      setRegistrationTokens({ access_token: res.access_token, refresh_token: res.refresh_token });
      setRegistering(false);
      setActiveStep(3);
      setPhase("face");
    } catch (err: any) {
      setRegistering(false);
      setError(getErrorMessage(err) || "Đăng ký thất bại");
    }
  };

  const handleFilesReady = async (files: Record<CaptureAngle, File>) => {
    setFaceError("");
    setFaceLoading(true);
    setFaceResult(null);
    try {
      const token = registrationTokens?.access_token;
      const data = await api.enrollBatch(files, consent, token);
      setPhase("face-enrolling");
      startSSE(data.job_id);
    } catch (err: any) {
      setFaceError(getErrorMessage(err) || "Đăng ký khuôn mặt thất bại");
      setFaceLoading(false);
      setPhase("face");
    }
  };

  const handleSkipFace = () => {
    setPhase("done");
  };

  const handleReset = () => {
    setPhase("scan");
    setActiveStep(0);
    setScannedData(null);
    setError("");
    setFaceResult(null);
    setFaceError("");
    setConsent(false);
    setRegistrationTokens(null);
    setEmail("");
    setPassword("");
    setFullName("");
    setStudentCode("");
    setClassName("");
    setCourse("");
    setPermanentAddress("");
    setDateOfBirth("");
    setFaculty("");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        bgcolor: "background.default",
      }}
    >
      {/* ── Left Hero Panel (matching IUH Brand Identity) ── */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "space-between",
          flex: "0 0 440px",
          background: "linear-gradient(155deg, #0A2540 0%, #0F3C5C 40%, #700000 100%)",
          p: { md: 5, lg: 6 },
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative geometric background elements */}
        <Box sx={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <Box
            sx={{
              position: "absolute",
              top: -80,
              right: -80,
              width: 320,
              height: 320,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: 80,
              left: -60,
              width: 280,
              height: 280,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: -30,
              right: 80,
              width: 180,
              height: 180,
              borderRadius: "50%",
              bgcolor: "rgba(212, 175, 55, 0.12)",
            }}
          />
        </Box>

        {/* Brand Top Header */}
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Box
            component="img"
            src="/logo-white.png"
            alt="IUH Logo"
            sx={{ height: 44, width: "auto", objectFit: "contain" }}
          />
        </Box>

        {/* Center Content */}
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              lineHeight: 1.2,
              mb: 2,
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: { md: "2rem", lg: "2.4rem" },
            }}
          >
            Đăng ký thẻ<br />
            <Box component="span" sx={{ color: "#FCD34D" }}>
              Thư Viện Thông Minh
            </Box>
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.95rem", lineHeight: 1.6, mb: 4 }}>
            Đăng ký tài khoản độc giả để mượn sách, tra cứu tài liệu và trải nghiệm công nghệ nhận diện khuôn mặt AI tại Thư viện IUH.
          </Typography>

          <Stack spacing={2}>
            {[
              { icon: <AutoStoriesOutlinedIcon sx={{ fontSize: 18 }} />, text: "Mượn sách tự động qua quầy Self-Check" },
              { icon: <FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: 18 }} />, text: "Ra vào cổng thư viện bằng nhận diện khuôn mặt" },
              { icon: <ShieldOutlinedIcon sx={{ fontSize: 18 }} />, text: "Bảo mật sinh trắc học và quản trị mượn trả tức thì" },
            ].map((item, idx) => (
              <Stack key={idx} direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1.5,
                    bgcolor: "rgba(255,255,255,0.12)",
                    display: "grid",
                    placeItems: "center",
                    color: "#FCD34D",
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </Box>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.92)", fontSize: "0.88rem" }}>
                  {item.text}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        {/* Footer Quote */}
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
            © {new Date().getFullYear()} Thư Viện IUH — Trường Đại học Công nghiệp TP.HCM
          </Typography>
        </Box>
      </Box>

      {/* ── Right Form Panel ── */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 2.5, sm: 4, md: 5 },
          overflowY: "auto",
          minHeight: "100vh",
        }}
      >
        <Card
          elevation={0}
          sx={{
            maxWidth: 580,
            width: "100%",
            borderRadius: 3.5,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4.5 } }}>
            <Stack spacing={3}>
              {/* Header Title */}
              <Stack
                spacing={0.5}
                sx={{
                  alignItems: { xs: "center", md: "flex-start" },
                  textAlign: { xs: "center", md: "left" },
                }}
              >
                <Box
                  component="img"
                  src={theme.palette.mode === "dark" ? "/logo-white.png" : "/logo.png"}
                  alt="IUH Logo"
                  sx={{
                    height: 38,
                    width: "auto",
                    objectFit: "contain",
                    mb: 1,
                    display: { xs: "block", md: "none" },
                  }}
                />
                <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: "Space Grotesk, sans-serif" }}>
                  Đăng ký tài khoản độc giả
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Hoàn tất các bước dưới đây để kích hoạt thẻ thư viện của bạn
                </Typography>
              </Stack>

              {/* Modern Stepper */}
              {phase !== "done" && (
                <Stepper
                  activeStep={activeStep}
                  alternativeLabel
                  sx={{
                    "& .MuiStepIcon-root.Mui-active": {
                      color: "primary.main",
                    },
                    "& .MuiStepIcon-root.Mui-completed": {
                      color: "secondary.main",
                    },
                    "& .MuiStepLabel-label.Mui-active": {
                      fontWeight: 700,
                      color: "primary.main",
                    },
                  }}
                >
                  {steps.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              )}

              {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

              {/* ── STEP 1: Scan Student Card ── */}
              {phase === "scan" && (
                <StudentCardScanner
                  onScanned={handleScanned}
                  onError={(msg) => setError(msg)}
                />
              )}

              {/* ── STEP 2: Confirm Information ── */}
              {phase === "confirm" && scannedData && (
                <Stack spacing={2.5}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Thông tin trích xuất từ thẻ sinh viên:
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      bgcolor: alpha(theme.palette.primary.main, 0.02),
                      borderRadius: 2.5,
                    }}
                  >
                    <Stack spacing={1.2}>
                      <ConfirmRow label="MSSV" value={scannedData.studentCode} />
                      <ConfirmRow label="Họ tên" value={scannedData.fullName} />
                      {scannedData.className && <ConfirmRow label="Lớp" value={scannedData.className} />}
                      {scannedData.dateOfBirth && <ConfirmRow label="Ngày sinh" value={scannedData.dateOfBirth} />}
                      {scannedData.course && <ConfirmRow label="Khóa học" value={scannedData.course} />}
                      {scannedData.permanentAddress && <ConfirmRow label="HKTT" value={scannedData.permanentAddress} />}
                      {scannedData.faculty && <ConfirmRow label="Khoa" value={scannedData.faculty} />}
                    </Stack>
                  </Paper>
                  <Typography variant="caption" color="text.secondary">
                    * Bạn có thể điều chỉnh và bổ sung thông tin chi tiết ở bước tiếp theo.
                  </Typography>
                  <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
                    <Button
                      variant="contained"
                      onClick={handleConfirmNext}
                      fullWidth
                      size="large"
                      sx={{
                        py: 1.3,
                        fontWeight: 700,
                        borderRadius: 2.5,
                        boxShadow: "0 4px 14px rgba(139, 0, 0, 0.25)",
                      }}
                    >
                      Xác nhận & Tiếp tục
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setPhase("scan");
                        setActiveStep(0);
                      }}
                      sx={{ borderRadius: 2.5, minWidth: 120 }}
                    >
                      Quét lại
                    </Button>
                  </Stack>
                </Stack>
              )}

              {/* ── STEP 3: Complete Account Form ── */}
              {phase === "form" && (
                <Stack spacing={2.5}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
                    1. Thông tin đăng nhập
                  </Typography>
                  <TextField
                    label="Email nhận thông báo"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    fullWidth
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailOutlinedIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                          </InputAdornment>
                        ),
                        sx: { borderRadius: 2 },
                      },
                    }}
                  />
                  <TextField
                    label="Mật khẩu"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    fullWidth
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockOutlinedIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                          </InputAdornment>
                        ),
                        sx: { borderRadius: 2 },
                      },
                    }}
                  />

                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary", mt: 1 }}>
                    2. Thông tin sinh viên
                  </Typography>
                  <TextField
                    label="Họ và tên"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    fullWidth
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonOutlineOutlinedIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                          </InputAdornment>
                        ),
                        sx: { borderRadius: 2 },
                      },
                    }}
                  />
                  <TextField
                    label="Mã số sinh viên (MSSV)"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    required
                    fullWidth
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <BadgeOutlinedIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                          </InputAdornment>
                        ),
                        sx: { borderRadius: 2 },
                      },
                    }}
                  />

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Lớp học"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      fullWidth
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <ClassOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                            </InputAdornment>
                          ),
                          sx: { borderRadius: 2 },
                        },
                      }}
                    />
                    <TextField
                      label="Ngày sinh"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      placeholder="DD/MM/YYYY"
                      fullWidth
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <CalendarMonthOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                            </InputAdornment>
                          ),
                          sx: { borderRadius: 2 },
                        },
                      }}
                    />
                  </Stack>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Khoa / Viện"
                      value={faculty}
                      onChange={(e) => setFaculty(e.target.value)}
                      fullWidth
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <SchoolOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                            </InputAdornment>
                          ),
                          sx: { borderRadius: 2 },
                        },
                      }}
                    />
                    <TextField
                      label="Khóa học"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      fullWidth
                      slotProps={{
                        input: { sx: { borderRadius: 2 } },
                      }}
                    />
                  </Stack>

                  <TextField
                    label="Hộ khẩu thường trú (HKTT)"
                    value={permanentAddress}
                    onChange={(e) => setPermanentAddress(e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start" sx={{ mt: 1 }}>
                            <HomeOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                          </InputAdornment>
                        ),
                        sx: { borderRadius: 2 },
                      },
                    }}
                  />

                  {scannedData && (
                    <Alert severity="info" sx={{ fontSize: "0.85rem", borderRadius: 2 }}>
                      Thông tin đã được tự động đối khớp từ thẻ sinh viên IUH.
                    </Alert>
                  )}

                  <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
                    <Button
                      variant="contained"
                      onClick={handleFormSubmit}
                      disabled={registering}
                      fullWidth
                      size="large"
                      sx={{
                        py: 1.35,
                        fontWeight: 700,
                        borderRadius: 2.5,
                        boxShadow: "0 4px 14px rgba(139, 0, 0, 0.25)",
                      }}
                    >
                      {registering ? <CircularProgress size={22} color="inherit" /> : "Hoàn tất đăng ký"}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setPhase("scan");
                        setActiveStep(0);
                      }}
                      sx={{ borderRadius: 2.5, minWidth: 120 }}
                    >
                      Quay lại
                    </Button>
                  </Stack>
                </Stack>
              )}

              {/* ── STEP 4: Face Enrollment (Optional) ── */}
              {phase === "face" && (
                <Stack spacing={2.5}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Đăng ký khuôn mặt AI (Tùy chọn)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Đăng ký dữ liệu khuôn mặt đa góc giúp bạn ra vào cổng thư viện và mượn sách không cần thẻ.
                    </Typography>
                  </Box>
                  <MultiAngleCapture
                    consent={consent}
                    setConsent={setConsent}
                    onFilesReady={handleFilesReady}
                  />
                  <Button
                    color="inherit"
                    variant="text"
                    onClick={handleSkipFace}
                    fullWidth
                    sx={{ color: "text.secondary", fontWeight: 600 }}
                  >
                    Bỏ qua bước này và hoàn tất
                  </Button>
                </Stack>
              )}

              {/* ── STEP 4.1: Face Processing Progress ── */}
              {phase === "face-enrolling" && (
                <Stack spacing={2.5} sx={{ alignItems: "center", py: 5 }}>
                  <CircularProgress size={52} thickness={4} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Đang xử lý vector sinh trắc học khuôn mặt...
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Vui lòng không đóng trình duyệt
                  </Typography>
                </Stack>
              )}

              {/* ── STEP 5: Registration Complete ── */}
              {phase === "done" && (
                <Stack spacing={2.5} sx={{ alignItems: "center", py: 3 }}>
                  {faceLoading ? (
                    <>
                      <CircularProgress size={52} thickness={4} />
                      <Typography variant="body2">Đang đồng bộ dữ liệu...</Typography>
                    </>
                  ) : faceError ? (
                    <Alert severity="warning" sx={{ width: "100%", borderRadius: 2 }}>
                      {faceError}
                    </Alert>
                  ) : faceResult ? (
                    <Box
                      sx={{
                        width: 76,
                        height: 76,
                        borderRadius: "50%",
                        bgcolor: "success.light",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 44, color: "success.main" }} />
                    </Box>
                  ) : (
                    <Alert severity="info" sx={{ width: "100%", borderRadius: 2 }}>
                      Bạn có thể đăng ký khuôn mặt sau trong phần quản lý tài khoản độc giả.
                    </Alert>
                  )}

                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, fontFamily: "Space Grotesk, sans-serif" }}>
                      Đăng ký tài khoản thành công!
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: "auto" }}>
                      Thẻ độc giả thư viện IUH của bạn đã sẵn sàng. Vui lòng đăng nhập để bắt đầu sử dụng.
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    onClick={() => router.push("/login")}
                    fullWidth
                    size="large"
                    sx={{
                      py: 1.35,
                      fontWeight: 700,
                      borderRadius: 2.5,
                      boxShadow: "0 4px 14px rgba(139, 0, 0, 0.25)",
                    }}
                  >
                    Đăng nhập ngay
                  </Button>
                  <Button
                    variant="text"
                    onClick={handleReset}
                    fullWidth
                    sx={{ color: "text.secondary", fontWeight: 600 }}
                  >
                    Đăng ký tài khoản khác
                  </Button>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Footer Login Link */}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: "center" }}>
          Đã có tài khoản thư viện?{" "}
          <Link
            href="/login"
            style={{
              color: theme.palette.primary.main,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Đăng nhập ngay
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string | null }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 95, flexShrink: 0, fontWeight: 500 }}>
        {label}:
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
        {value || "—"}
      </Typography>
    </Stack>
  );
}
