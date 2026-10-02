"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  Paper,
  Snackbar,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import BadgeIcon from "@mui/icons-material/BadgeOutlined";
import SchoolIcon from "@mui/icons-material/SchoolOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import api, { getErrorMessage } from "@/lib/api-client";
import { initials } from "@/lib/utils";
import { StudentCardScanner, type ScannedCardData } from "@/app/(dashboard)/_components/scanner";
import type { CaptureAngle } from "@/app/(dashboard)/_components/MultiAngleCapture";
import MultiAngleCapture from "@/app/(dashboard)/_components/MultiAngleCapture";
import type { PatronPublic } from "@/lib/types";

const _RAW_CAM_URL = process.env.NEXT_PUBLIC_BORROW_CAM_URL;
const CARD_CAM_URL = _RAW_CAM_URL ? `/api/camera/proxy?url=${encodeURIComponent(_RAW_CAM_URL)}` : "";

function QrCodeSvg({ value }: { value: string }) {
  const size = 110;
  const cellSize = 4;
  const cells = value.split("").map((_, i) => ({
    x: (i % 25) * cellSize,
    y: Math.floor(i / 25) * cellSize,
    visible: (value.charCodeAt(i) + i) % 3 !== 0,
  }));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${25 * cellSize} ${25 * cellSize}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={25 * cellSize} height={25 * cellSize} fill="white" rx={4} />
      {cells.filter((c) => c.visible).map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={cellSize} height={cellSize} fill="black" rx={0.5} />
      ))}
      {[[0, 0], [18, 0], [0, 18]].map(([ox, oy], i) => (
        <g key={`finder-${i}`}>
          <rect x={ox} y={oy} width={7 * cellSize} height={7 * cellSize} fill="black" rx={1} />
          <rect x={ox + cellSize} y={oy + cellSize} width={5 * cellSize} height={5 * cellSize} fill="white" rx={0.5} />
          <rect x={ox + 2 * cellSize} y={oy + 2 * cellSize} width={3 * cellSize} height={3 * cellSize} fill="black" rx={0.5} />
        </g>
      ))}
    </svg>
  );
}

interface PatronWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type Notice = { severity: "success" | "error" | "warning" | "info"; message: string } | null;

const initialFormData = {
  fullName: "",
  studentCode: "",
  className: "",
  course: "",
  email: "",
  phone: "",
  identityNumber: "",
  permanentAddress: "",
  issueDate: new Date().toISOString().split("T")[0],
  membershipExpiry: (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  })(),
};

const steps = ["Quét thẻ", "Xác minh", "Khuôn mặt", "Hoàn tất"];

export default function PatronWizard({ open, onClose, onComplete }: PatronWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [scannedFromCard, setScannedFromCard] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newPatron, setNewPatron] = useState<PatronPublic | null>(null);
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const showNotice = (severity: NonNullable<Notice>["severity"], message: string) => {
    setNotice({ severity, message });
  };

  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setFormData(initialFormData);
      setErrors({});
      setScannedFromCard(false);
      setSubmitting(false);
      setNewPatron(null);
      setConsent(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && currentStep === 1) {
      const studentCode = formData.studentCode || "";
      const course = formData.course || "";
      let startYear = 0;
      let endYear = 0;
      const years = course.match(/\b(20\d{2})\b/g);
      if (years && years.length > 0) {
        startYear = parseInt(years[0]);
        endYear = years.length > 1 ? parseInt(years[1]) : startYear + 4;
      } else if (studentCode && studentCode.match(/^(1[0-9]|2[0-9])/)) {
        const prefix = parseInt(studentCode.substring(0, 2));
        startYear = 2000 + prefix;
        endYear = startYear + 4;
      }
      if (startYear > 0 && endYear > 0) {
        setFormData((prev) => ({
          ...prev,
          issueDate: `${startYear}-09-01`,
          membershipExpiry: `${endYear}-09-01`,
        }));
      }
    }
  }, [currentStep, open, formData.studentCode, formData.course]);

  const handleCardScanned = useCallback((data: ScannedCardData) => {
    setFormData((prev) => ({
      ...prev,
      fullName: data.fullName || prev.fullName,
      studentCode: data.studentCode || prev.studentCode,
      className: data.className || prev.className,
      course: data.course || prev.course,
      permanentAddress: data.permanentAddress || prev.permanentAddress,
    }));
    setScannedFromCard(true);
    setTimeout(() => setCurrentStep(1), 600);
  }, []);

  const handleChange = (field: keyof typeof initialFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim()) errs.fullName = "Vui lòng nhập họ và tên";
    if (!formData.studentCode.trim()) {
      errs.studentCode = "Vui lòng nhập MSSV";
    } else if (!/^[A-Za-z0-9]+$/.test(formData.studentCode.trim())) {
      errs.studentCode = "MSSV chỉ chứa chữ và số";
    }
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      errs.email = "Email không hợp lệ";
    }
    if (formData.phone && !/^[0-9]{10}$/.test(formData.phone)) {
      errs.phone = "Số điện thoại phải gồm 10 chữ số";
    }
    if (!formData.membershipExpiry) {
      errs.membershipExpiry = "Vui lòng chọn hạn thẻ";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setCurrentStep(2);
    }
  };

  const handleSkipFace = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const patron = await api.createPatron({
        full_name: formData.fullName,
        student_code: formData.studentCode,
        class_name: formData.className || undefined,
        course: formData.course || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        identity_number: formData.identityNumber || undefined,
        permanent_address: formData.permanentAddress || undefined,
        issue_date: formData.issueDate || undefined,
        membership_expiry: formData.membershipExpiry || new Date().toISOString().split("T")[0],
      });
      setNewPatron(patron);
      setCurrentStep(3);
      onComplete();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        showNotice("error", "MSSV hoặc mã thẻ đã tồn tại trong hệ thống.");
      } else {
        showNotice("error", getErrorMessage(err) || "Không thể tạo độc giả");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFaceReady = async (files: Record<CaptureAngle, File>) => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const patron = await api.createPatron({
        full_name: formData.fullName,
        student_code: formData.studentCode,
        class_name: formData.className || undefined,
        course: formData.course || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        identity_number: formData.identityNumber || undefined,
        permanent_address: formData.permanentAddress || undefined,
        issue_date: formData.issueDate || undefined,
        membership_expiry: formData.membershipExpiry || new Date().toISOString().split("T")[0],
      });
      await api.enrollPatronFaceBatch(patron.id, files);
      setNewPatron(patron);
      setCurrentStep(3);
      onComplete();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        showNotice("error", "MSSV hoặc mã thẻ đã tồn tại trong hệ thống.");
      } else {
        showNotice("error", getErrorMessage(err) || "Không thể tạo độc giả");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendEmail = () => {
    showNotice("info", "Tính năng gửi email thông báo tự động đang được hoàn thiện.");
  };

  const handleResetWizard = () => {
    setCurrentStep(0);
    setFormData(initialFormData);
    setErrors({});
    setScannedFromCard(false);
    setNewPatron(null);
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen slotProps={{ paper: { sx: { bgcolor: "background.default" } } }}>
      {/* Header */}
      <Box sx={{ p: 2.5, px: 4, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <BadgeIcon sx={{ color: "primary.main", fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Cấp Phát Thẻ Độc Giả</Typography>
            <Typography variant="caption" color="text.secondary">Hệ thống thư viện thông minh Đại học Công nghiệp TP.HCM</Typography>
          </Box>
        </Stack>
        <Button color="inherit" onClick={onClose} startIcon={<CloseIcon />} sx={{ textTransform: "none" }}>
          Đóng
        </Button>
      </Box>

      {/* Stepper Progress */}
      <Box sx={{ py: 3, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ maxWidth: 800, mx: "auto", px: 4 }}>
          <Stepper activeStep={currentStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel
                  sx={{
                    "& .MuiStepLabel-label": { fontWeight: 700, fontSize: "0.875rem" },
                    "& .Mui-active": { color: "primary.main" },
                    "& .Mui-completed": { color: "success.main" },
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      </Box>

      <DialogContent sx={{ p: { xs: 2, md: 4 }, display: "flex", justifyContent: "center" }}>
        <Box sx={{ width: "100%", maxWidth: 1000 }}>
          {/* BƯỚC 1: QUÉT THẺ */}
          {currentStep === 0 && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Quét thẻ sinh viên</Typography>
                <Typography variant="body2" color="text.secondary">
                  Đặt thẻ sinh viên vào vùng camera để hệ thống tự động nhận diện và trích xuất thông tin.
                </Typography>
              </Box>
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  border: "2px dashed",
                  borderColor: "primary.light",
                  bgcolor: "background.paper",
                }}
              >
                <StudentCardScanner
                  onScanned={handleCardScanned}
                  onError={(msg) => showNotice("warning", `Lỗi quét thẻ: ${msg}`)}
                  onSkip={() => setCurrentStep(1)}
                  videoSource="ipcamera"
                  ipCameraUrl={CARD_CAM_URL}
                />
              </Paper>
            </Stack>
          )}

          {/* BƯỚC 2: XÁC MINH THÔNG TIN */}
          {currentStep === 1 && (
            <Stack spacing={3} component="form" onSubmit={handleFormSubmit}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Xác minh thông tin độc giả</Typography>
                {scannedFromCard ? (
                  <Alert severity="success" sx={{ borderRadius: 2 }}>
                    Đã trích xuất thông tin tự động từ thẻ sinh viên. Vui lòng kiểm tra lại trước khi lưu.
                  </Alert>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Vui lòng điền thông tin chi tiết của độc giả mới vào biểu mẫu dưới đây.
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
                {/* Academic info */}
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.75rem" }}>
                    Thông tin học vụ
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      label="Họ và tên *"
                      value={formData.fullName}
                      onChange={handleChange("fullName")}
                      error={Boolean(errors.fullName)}
                      helperText={errors.fullName}
                      fullWidth
                      size="small"
                      placeholder="Nguyễn Văn A"
                    />
                    <TextField
                      label="MSSV *"
                      value={formData.studentCode}
                      onChange={handleChange("studentCode")}
                      error={Boolean(errors.studentCode)}
                      helperText={errors.studentCode}
                      fullWidth
                      size="small"
                      placeholder="21012345"
                    />
                    <TextField
                      label="Khóa học"
                      value={formData.course}
                      onChange={handleChange("course")}
                      fullWidth
                      size="small"
                      placeholder="K17 (2021 - 2025)"
                    />
                    <TextField
                      label="Lớp sinh hoạt"
                      value={formData.className}
                      onChange={handleChange("className")}
                      fullWidth
                      size="small"
                      placeholder="DHKTPM17A"
                    />
                  </Stack>
                </Paper>

                {/* Library credentials */}
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.75rem" }}>
                    Cấp quyền & Liên hệ
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      label="Email sinh viên"
                      value={formData.email}
                      onChange={handleChange("email")}
                      error={Boolean(errors.email)}
                      helperText={errors.email}
                      fullWidth
                      size="small"
                      placeholder="student@iuh.edu.vn"
                    />
                    <TextField
                      label="Số điện thoại"
                      value={formData.phone}
                      onChange={handleChange("phone")}
                      error={Boolean(errors.phone)}
                      helperText={errors.phone}
                      fullWidth
                      size="small"
                      placeholder="0901234567"
                    />
                    <TextField
                      label="CMND / CCCD"
                      value={formData.identityNumber}
                      onChange={handleChange("identityNumber")}
                      fullWidth
                      size="small"
                      placeholder="079201001234"
                    />
                    <TextField
                      label="Hộ khẩu thường trú"
                      value={formData.permanentAddress}
                      onChange={handleChange("permanentAddress")}
                      fullWidth
                      size="small"
                      placeholder="Gò Vấp, TP. Hồ Chí Minh"
                    />
                  </Stack>
                </Paper>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                <TextField
                  label="Ngày cấp thẻ"
                  type="date"
                  value={formData.issueDate}
                  onChange={handleChange("issueDate")}
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="Hạn sử dụng thẻ *"
                  type="date"
                  value={formData.membershipExpiry}
                  onChange={handleChange("membershipExpiry")}
                  error={Boolean(errors.membershipExpiry)}
                  helperText={errors.membershipExpiry}
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>

              <Stack direction="row" spacing={2} sx={{ justifyContent: "flex-end", pt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setCurrentStep(0)}
                  startIcon={<ArrowBackIcon />}
                  sx={{ borderRadius: 2, px: 3, fontWeight: 600, textTransform: "none" }}
                >
                  Quay lại
                </Button>
                <Button
                  variant="contained"
                  type="submit"
                  endIcon={<ArrowForwardIcon />}
                  sx={{ borderRadius: 2, px: 4, fontWeight: 700, textTransform: "none" }}
                >
                  Tiếp tục thu thập khuôn mặt
                </Button>
              </Stack>
            </Stack>
          )}

          {/* BƯỚC 3: KHUÔN MẶT */}
          {currentStep === 2 && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Thu thập khuôn mặt sinh trắc học</Typography>
                <Typography variant="body2" color="text.secondary">
                  Hướng mặt về phía camera để hệ thống ghi nhận đa góc khuôn mặt cho tính năng AI Face Recognition.
                </Typography>
              </Box>
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden", p: 2, bgcolor: "background.paper" }}>
                <MultiAngleCapture consent={consent} setConsent={setConsent} onFilesReady={handleFaceReady} />
              </Paper>
              <Stack direction="row" spacing={2} sx={{ justifyContent: "flex-end" }}>
                <Button
                  variant="outlined"
                  onClick={() => setCurrentStep(1)}
                  disabled={submitting}
                  startIcon={<ArrowBackIcon />}
                  sx={{ borderRadius: 2, px: 3, fontWeight: 600, textTransform: "none" }}
                >
                  Quay lại
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSkipFace}
                  disabled={submitting}
                  sx={{ borderRadius: 2, px: 4, fontWeight: 700, textTransform: "none" }}
                >
                  {submitting ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
                  Tạo độc giả (Bỏ qua Face ID)
                </Button>
              </Stack>
            </Stack>
          )}

          {/* BƯỚC 4: HOÀN TẤT */}
          {currentStep === 3 && newPatron && (
            <Stack spacing={4} sx={{ alignItems: "center", py: 4 }}>
              <Box sx={{ textAlign: "center" }}>
                <CheckCircleOutlineIcon color="success" sx={{ fontSize: 64, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Cấp Phát Thẻ Thành Công!</Typography>
                <Typography variant="body1" color="text.secondary">
                  Độc giả đã được đăng ký vào hệ thống và có thể dùng khuôn mặt hoặc mã QR để qua cổng an ninh.
                </Typography>
              </Box>

              {/* IUH Virtual Card */}
              <Paper
                elevation={6}
                sx={{
                  width: { xs: 340, sm: 440 },
                  aspectRatio: "1.586",
                  borderRadius: 4,
                  color: "white",
                  p: 3,
                  background: "linear-gradient(135deg, #8B0000 0%, #0A2540 100%)",
                  boxShadow: "0 20px 40px rgba(10, 37, 64, 0.25)",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                {/* Background watermarking */}
                <Box sx={{ position: "absolute", top: -20, right: -20, opacity: 0.08 }}>
                  <SchoolIcon sx={{ fontSize: 240, color: "white" }} />
                </Box>

                {/* Card Header */}
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", zIndex: 1 }}>
                  <Box>
                    <Typography variant="caption" sx={{ letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, color: "#FCD34D" }}>
                      ĐẠI HỌC CÔNG NGHIỆP TP.HCM
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, opacity: 0.9 }}>
                      THẺ ĐỘC GIẢ THƯ VIỆN
                    </Typography>
                  </Box>
                  <Chip
                    label="ACTIVE"
                    size="small"
                    sx={{ bgcolor: "rgba(5, 150, 105, 0.9)", color: "white", fontWeight: 700, fontSize: "0.7rem" }}
                  />
                </Stack>

                {/* Card Body */}
                <Stack direction="row" spacing={2.5} sx={{ alignItems: "center", zIndex: 1 }}>
                  <Avatar
                    sx={{
                      width: 60,
                      height: 60,
                      bgcolor: "rgba(255,255,255,0.15)",
                      fontSize: 22,
                      fontWeight: 700,
                      border: "2px solid rgba(255,255,255,0.4)",
                    }}
                  >
                    {initials(newPatron.full_name)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.95rem", lineHeight: 1.2 }}>
                      {newPatron.full_name}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.95, fontFamily: "'JetBrains Mono', monospace", mt: 0.5 }}>
                      MSSV: {newPatron.student_code}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8, display: "block" }}>
                      Lớp: {newPatron.class_name || "N/A"}
                    </Typography>
                  </Box>
                  <Box sx={{ bgcolor: "white", p: 0.75, borderRadius: 1.5, display: "flex" }}>
                    <QrCodeSvg value={newPatron.student_code || newPatron.id} />
                  </Box>
                </Stack>
              </Paper>

              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  onClick={handleResetWizard}
                  sx={{ borderRadius: 2, px: 4, py: 1.2, fontWeight: 700, textTransform: "none" }}
                >
                  Cấp thẻ tiếp theo
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleSendEmail}
                  sx={{ borderRadius: 2, px: 3, fontWeight: 600, textTransform: "none" }}
                >
                  Gửi qua Email
                </Button>
              </Stack>
            </Stack>
          )}
        </Box>
      </DialogContent>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {notice ? (
          <Alert
            onClose={() => setNotice(null)}
            severity={notice.severity}
            variant="filled"
            sx={{ width: "100%", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}
          >
            {notice.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Dialog>
  );
}
