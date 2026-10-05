"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  Snackbar,
  LinearProgress,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/EmailOutlined";
import PhoneIcon from "@mui/icons-material/PhoneOutlined";
import LockIcon from "@mui/icons-material/LockOutlined";
import PersonIcon from "@mui/icons-material/PersonOutlined";
import CameraAltIcon from "@mui/icons-material/CameraAltOutlined";
import ShieldIcon from "@mui/icons-material/ShieldOutlined";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import KeyIcon from "@mui/icons-material/KeyOutlined";
import AtSignIcon from "@mui/icons-material/AlternateEmailOutlined";
import LocationOnIcon from "@mui/icons-material/LocationOnOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailReadOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import VisibilityIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOffOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import OtpPinInput from "@/app/(dashboard)/_components/ui/OtpPinInput";
import api, { getErrorMessage } from "@/lib/api-client";
import type { UserPublic } from "@/lib/types";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import { useAuth } from "@/lib/auth-context";
import AvatarUser from "@/app/(dashboard)/_components/ui/AvatarUser";
import PatronDebtSection from "@/app/(dashboard)/_components/profile/PatronDebtSection";

export default function ProfilePage() {
  const { updateUser } = useAuth();
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" | "warning" | "info" }>({
    open: false,
    message: "",
    severity: "info",
  });
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    permanent_address: "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const [passData, setPassData] = useState({ old_password: "", new_password: "", confirm_password: "", code: "" });
  const [passStep, setPassStep] = useState<"form" | "otp">("form");
  const [changingPass, setChangingPass] = useState(false);
  const [passResendCooldown, setPassResendCooldown] = useState(0);
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  useEffect(() => {
    if (passResendCooldown <= 0) return;
    const timer = setInterval(() => {
      setPassResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [passResendCooldown]);

  const [emailData, setEmailData] = useState({ new_email: "", code: "" });
  const [emailStep, setEmailStep] = useState<"request" | "verify">("request");
  const [emailLoading, setEmailLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const showNotice = (severity: "success" | "error" | "warning" | "info", message: string) => {
    setToast({ open: true, message, severity });
  };

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await api.getCurrentUser();
      setUser(data);
      if (data.avatar_url) {
        updateUser({ avatar_url: data.avatar_url, full_name: data.full_name });
      }
      setFormData({
        full_name: data.full_name || "",
        phone: (data as any).phone || "",
        permanent_address: (data as any).permanentAddress || (data as any).permanent_address || "",
      });
    } catch {
      showNotice("error", "Không thể tải thông tin cá nhân");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return showNotice("error", "Vui lòng chọn file ảnh");
    if (file.size > 5 * 1024 * 1024) return showNotice("error", "Kích thước ảnh tối đa 5MB");
    try {
      setUploadingAvatar(true);
      const result = await api.uploadAvatar(file);
      setUser((prev) => prev ? { ...prev, avatar_url: result.avatarUrl } : prev);
      updateUser({ avatar_url: result.avatarUrl });
      showNotice("success", "Cập nhật ảnh đại diện thành công!");
    } catch (error: any) {
      showNotice("error", getErrorMessage(error) || "Upload ảnh thất bại");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      await api.updateProfile(formData);
      showNotice("success", "Cập nhật hồ sơ thành công!");
      fetchProfile();
    } catch (error: any) {
      showNotice("error", getErrorMessage(error) || "Cập nhật thất bại");
    } finally {
      setSavingProfile(false);
    }
  };

  const calculatePasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (pwd.length >= 10) score += 15;
    if (/[A-Z]/.test(pwd)) score += 20;
    if (/[a-z]/.test(pwd)) score += 20;
    if (/[0-9]/.test(pwd)) score += 20;
    return Math.min(100, score);
  };

  const getPasswordStrengthLabel = (score: number) => {
    if (score < 40) return { label: "Yếu", color: "error" as const };
    if (score < 80) return { label: "Trung bình", color: "warning" as const };
    return { label: "Mạnh", color: "success" as const };
  };

  const handleRequestPasswordOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passData.old_password) return showNotice("error", "Vui lòng nhập mật khẩu hiện tại");
    if (!passData.new_password) return showNotice("error", "Vui lòng nhập mật khẩu mới");
    if (passData.new_password !== passData.confirm_password) {
      return showNotice("error", "Mật khẩu xác nhận không trùng khớp");
    }
    if (passData.old_password === passData.new_password) {
      return showNotice("error", "Mật khẩu mới không được trùng với mật khẩu hiện tại");
    }
    if (passData.new_password.length < 8) {
      return showNotice("error", "Mật khẩu mới phải có tối thiểu 8 ký tự");
    }
    if (!/[A-Z]/.test(passData.new_password)) {
      return showNotice("error", "Mật khẩu mới phải có ít nhất 1 chữ cái in hoa (A-Z)");
    }
    if (!/[a-z]/.test(passData.new_password)) {
      return showNotice("error", "Mật khẩu mới phải có ít nhất 1 chữ cái in thường (a-z)");
    }
    if (!/[0-9]/.test(passData.new_password)) {
      return showNotice("error", "Mật khẩu mới phải có ít nhất 1 chữ số (0-9)");
    }

    try {
      setChangingPass(true);
      await api.requestPasswordChangeOtp({
        old_password: passData.old_password,
        new_password: passData.new_password,
      });
      showNotice("success", "Đã gửi mã xác thực OTP về email của bạn");
      setPassResendCooldown(60);
      setPassStep("otp");
    } catch (error: any) {
      showNotice("error", getErrorMessage(error) || "Không thể gửi mã OTP đổi mật khẩu");
    } finally {
      setChangingPass(false);
    }
  };

  const handleResendPasswordOtp = async () => {
    if (passResendCooldown > 0) return;
    try {
      setChangingPass(true);
      await api.requestPasswordChangeOtp({
        old_password: passData.old_password,
        new_password: passData.new_password,
      });
      showNotice("success", "Đã gửi lại mã OTP mới về email của bạn");
      setPassResendCooldown(60);
      setPassData((prev) => ({ ...prev, code: "" }));
    } catch (error: any) {
      showNotice("error", getErrorMessage(error) || "Không thể gửi lại OTP");
    } finally {
      setChangingPass(false);
    }
  };

  const handleConfirmPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passData.code || passData.code.length !== 6) {
      return showNotice("error", "Vui lòng nhập đủ 6 số mã OTP");
    }
    try {
      setChangingPass(true);
      await api.changePassword({
        code: passData.code,
        otp: passData.code,
        new_password: passData.new_password,
      });
      showNotice("success", "Đổi mật khẩu thành công! Tài khoản của bạn đã được bảo vệ.");
      setShowPasswordModal(false);
      setPassData({ old_password: "", new_password: "", confirm_password: "", code: "" });
      setPassStep("form");
      setPassResendCooldown(0);
    } catch (error: any) {
      showNotice("error", getErrorMessage(error) || "Xác thực OTP đổi mật khẩu thất bại");
    } finally {
      setChangingPass(false);
    }
  };

  const requestEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailData.new_email) return showNotice("error", "Vui lòng nhập email mới");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.new_email)) {
      return showNotice("error", "Địa chỉ email không hợp lệ");
    }
    if (emailData.new_email.toLowerCase() === user?.email?.toLowerCase()) {
      return showNotice("error", "Email mới không được trùng với email hiện tại");
    }
    try {
      setEmailLoading(true);
      await api.requestEmailChangeOtp({ new_email: emailData.new_email });
      showNotice("success", "Đã gửi mã OTP đến email mới");
      setResendCooldown(60);
      setEmailStep("verify");
    } catch (error: any) {
      showNotice("error", getErrorMessage(error) || "Không thể gửi OTP");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !emailData.new_email) return;
    try {
      setEmailLoading(true);
      await api.requestEmailChangeOtp({ new_email: emailData.new_email });
      showNotice("success", "Đã gửi lại mã OTP mới");
      setResendCooldown(60);
      setEmailData((prev) => ({ ...prev, code: "" }));
    } catch (error: any) {
      showNotice("error", getErrorMessage(error) || "Không thể gửi lại OTP");
    } finally {
      setEmailLoading(false);
    }
  };

  const verifyEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailData.code || emailData.code.length !== 6) {
      return showNotice("error", "Vui lòng nhập đủ 6 chữ số mã OTP");
    }
    try {
      setEmailLoading(true);
      await api.verifyAndChangeEmail({ new_email: emailData.new_email, code: emailData.code, otp: emailData.code });
      showNotice("success", "Đổi email thành công!");
      setShowEmailModal(false);
      setEmailData({ new_email: "", code: "" });
      setEmailStep("request");
      setResendCooldown(0);
      fetchProfile();
    } catch (error: any) {
      showNotice("error", getErrorMessage(error) || "Xác thực thất bại");
    } finally {
      setEmailLoading(false);
    }
  };

  const roleMeta = (role?: string) => {
    if (role === "admin") return { label: "Quản trị viên", color: "#D4AF37", bg: "rgba(212,175,55,0.12)" };
    if (role === "staff") return { label: "Nhân viên", color: "#0A2540", bg: "rgba(10,37,64,0.08)" };
    return { label: "Độc giả", color: "#8B0000", bg: "rgba(139,0,0,0.08)" };
  };

  if (loading) {
    return <LoadingOverlay message="Đang tải hồ sơ..." />;
  }

  const role = roleMeta(user?.role);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Hồ Sơ Cá Nhân"
        subtitle="Quản lý thông tin cá nhân và bảo mật tài khoản"
        icon={PersonIcon}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3}>
            <DashboardCard>
              <Stack spacing={2} sx={{ alignItems: "center", textAlign: "center", py: 1 }}>
                <Box
                  onClick={() => avatarInputRef.current?.click()}
                  sx={{ position: "relative", cursor: "pointer", "&:hover .avatar-overlay": { opacity: 1 } }}
                >
                  <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
                  <AvatarUser
                    user={user}
                    size={112}
                    border="4px solid rgba(255,255,255,0.85)"
                    sx={{ fontSize: "2.4rem" }}
                  />
                  <Box
                    className="avatar-overlay"
                    sx={{
                      position: "absolute", inset: 0, borderRadius: "50%",
                      bgcolor: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center",
                      opacity: 0, transition: "opacity 0.2s",
                    }}
                  >
                    {uploadingAvatar ? <CircularProgress size={28} sx={{ color: "#fff" }} /> : <CameraAltIcon sx={{ color: "#fff", fontSize: 28 }} />}
                  </Box>
                </Box>

                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {user?.full_name || "Chưa cập nhật"}
                </Typography>
                <Chip
                  label={role.label}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    color: role.color,
                    bgcolor: role.bg,
                    border: "1px solid",
                    borderColor: role.color,
                  }}
                />

                <Stack spacing={1} sx={{ width: "100%", pt: 2, borderTop: 1, borderColor: "divider" }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", overflow: "hidden" }}>
                    <EmailIcon sx={{ fontSize: 16, color: "text.secondary", flexShrink: 0 }} />
                    <Typography variant="body2" color="text.secondary" noWrap>{user?.email}</Typography>
                  </Stack>
                  {(user as any)?.phone ? (
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <PhoneIcon sx={{ fontSize: 16, color: "text.secondary", flexShrink: 0 }} />
                      <Typography variant="body2" color="text.secondary">{(user as any).phone}</Typography>
                    </Stack>
                  ) : null}
                  {(user as any)?.studentCode ? (
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>MSSV:</Typography>
                      <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{(user as any).studentCode}</Typography>
                    </Stack>
                  ) : null}
                </Stack>
              </Stack>
            </DashboardCard>

            <DashboardCard title="Bảo mật tài khoản">
              <Stack spacing={1}>
                <Button
                  fullWidth variant="outlined" startIcon={<AtSignIcon />}
                  onClick={() => setShowEmailModal(true)}
                  sx={{ justifyContent: "flex-start", borderRadius: 2, textTransform: "none" }}
                >
                  Đổi Email
                </Button>
                <Button
                  fullWidth variant="outlined" startIcon={<KeyIcon />}
                  onClick={() => setShowPasswordModal(true)}
                  sx={{ justifyContent: "flex-start", borderRadius: 2, textTransform: "none" }}
                >
                  Đổi Mật Khẩu
                </Button>
              </Stack>
            </DashboardCard>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            <PatronDebtSection
              patronName={user?.full_name || ""}
              studentCode={(user as any)?.studentCode || (user as any)?.student_code || ""}
              onNotice={(type, msg) => showNotice(type, msg)}
            />

            <DashboardCard title="Thông tin cơ bản">
              <form onSubmit={handleProfileUpdate}>
                <Stack spacing={2.5}>
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Họ và tên" fullWidth value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="Nguyễn Văn A"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label="Email" fullWidth value={user?.email || ""} disabled helperText='Dùng nút "Đổi Email" để thay đổi' />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        label="Số điện thoại" fullWidth value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="0912 345 678"
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        label="Địa chỉ thường trú" fullWidth value={formData.permanent_address}
                        onChange={(e) => setFormData({ ...formData, permanent_address: e.target.value })}
                        placeholder="12 Nguyễn Văn Bảo, Gò Vấp, TP.HCM"
                      />
                    </Grid>
                  </Grid>
                  <Stack direction="row" sx={{ justifyContent: "flex-end", pt: 2, borderTop: 1, borderColor: "divider" }}>
                    <Button type="submit" variant="contained" disabled={savingProfile} startIcon={savingProfile ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />} sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}>
                      {savingProfile ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                  </Stack>
                </Stack>
              </form>
            </DashboardCard>
          </Stack>
        </Grid>
      </Grid>

      {/* Secure Password Change Modal (2-Step Verification) */}
      <Dialog
        open={showPasswordModal}
        onClose={() => {
          if (!changingPass) {
            setShowPasswordModal(false);
            setPassStep("form");
            setPassData({ old_password: "", new_password: "", confirm_password: "", code: "" });
            setPassResendCooldown(0);
          }
        }}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3.5,
              overflow: "hidden",
              boxShadow: (th) =>
                th.palette.mode === "dark"
                  ? "0 20px 45px rgba(0, 0, 0, 0.6)"
                  : "0 20px 45px rgba(10, 37, 64, 0.16)",
            },
          },
        }}
      >
        {/* Modal Header */}
        <Box
          sx={{
            px: 3,
            pt: 3,
            pb: 2,
            position: "relative",
            display: "flex",
            alignItems: "flex-start",
            gap: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2.5,
              display: "grid",
              placeItems: "center",
              bgcolor: (th) =>
                th.palette.mode === "dark"
                  ? "rgba(212, 175, 55, 0.15)"
                  : "rgba(10, 37, 64, 0.08)",
              color: (th) =>
                th.palette.mode === "dark" ? "#F59E0B" : "primary.main",
              flexShrink: 0,
            }}
          >
            {passStep === "form" ? (
              <KeyIcon sx={{ fontSize: 26 }} />
            ) : (
              <ShieldIcon sx={{ fontSize: 26 }} />
            )}
          </Box>

          <Box sx={{ flex: 1, pr: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
              {passStep === "form" ? "Đổi Mật Khẩu" : "Xác Thực Mã OTP"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              {passStep === "form"
                ? "Bảo mật tài khoản 2 lớp qua mã xác nhận gửi về email"
                : "Nhập mã gồm 6 số đã được gửi qua email"}
            </Typography>
          </Box>

          <IconButton
            size="small"
            disabled={changingPass}
            onClick={() => {
              setShowPasswordModal(false);
              setPassStep("form");
              setPassData({ old_password: "", new_password: "", confirm_password: "", code: "" });
              setPassResendCooldown(0);
            }}
            sx={{
              position: "absolute",
              right: 14,
              top: 14,
              color: "text.secondary",
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* 2-Step Progress Indicator */}
        <Box sx={{ px: 3, pt: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                bgcolor: "primary.main",
              }}
            />
            <Box
              sx={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                bgcolor: passStep === "otp" ? "primary.main" : "action.disabledBackground",
                transition: "background-color 0.3s ease",
              }}
            />
          </Stack>
          <Stack direction="row" sx={{ justifyContent: "space-between", mt: 0.75 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main", fontSize: "0.7rem" }}>
              1. Mật khẩu mới
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontWeight: passStep === "otp" ? 700 : 500,
                color: passStep === "otp" ? "primary.main" : "text.secondary",
                fontSize: "0.7rem",
              }}
            >
              2. Xác thực OTP
            </Typography>
          </Stack>
        </Box>

        <DialogContent sx={{ px: 3, pt: 2, pb: 3 }}>
          {passStep === "form" ? (
            <form onSubmit={handleRequestPasswordOtp}>
              <Stack spacing={2.2}>
                <TextField
                  label="Mật khẩu hiện tại"
                  type={showOldPass ? "text" : "password"}
                  fullWidth
                  required
                  autoFocus
                  value={passData.old_password}
                  onChange={(e) => setPassData({ ...passData, old_password: e.target.value })}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon fontSize="small" sx={{ color: "text.secondary" }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowOldPass(!showOldPass)} edge="end">
                            {showOldPass ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 2.5 },
                    },
                  }}
                />

                <TextField
                  label="Mật khẩu mới"
                  type={showNewPass ? "text" : "password"}
                  fullWidth
                  required
                  value={passData.new_password}
                  onChange={(e) => setPassData({ ...passData, new_password: e.target.value })}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <KeyIcon fontSize="small" sx={{ color: "text.secondary" }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowNewPass(!showNewPass)} edge="end">
                            {showNewPass ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 2.5 },
                    },
                  }}
                />

                {/* Password Strength Indicator */}
                {passData.new_password && (
                  <Box sx={{ mt: -1 }}>
                    {(() => {
                      const strength = calculatePasswordStrength(passData.new_password);
                      const meta = getPasswordStrengthLabel(strength);
                      return (
                        <Box>
                          <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">Độ an toàn mật khẩu:</Typography>
                            <Typography variant="caption" color={`${meta.color}.main`} sx={{ fontWeight: 700 }}>
                              {meta.label}
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={strength}
                            color={meta.color}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      );
                    })()}

                    {/* Requirements checklist */}
                    <Stack direction="row" spacing={0.8} sx={{ flexWrap: "wrap", mt: 1, gap: 0.6 }}>
                      <Chip
                        size="small"
                        icon={<CheckCircleIcon sx={{ fontSize: "14px !important" }} />}
                        label="≥ 8 ký tự"
                        color={passData.new_password.length >= 8 ? "success" : "default"}
                        variant={passData.new_password.length >= 8 ? "filled" : "outlined"}
                        sx={{ fontSize: "0.68rem", height: 22 }}
                      />
                      <Chip
                        size="small"
                        icon={<CheckCircleIcon sx={{ fontSize: "14px !important" }} />}
                        label="Chữ hoa & thường"
                        color={/[A-Z]/.test(passData.new_password) && /[a-z]/.test(passData.new_password) ? "success" : "default"}
                        variant={/[A-Z]/.test(passData.new_password) && /[a-z]/.test(passData.new_password) ? "filled" : "outlined"}
                        sx={{ fontSize: "0.68rem", height: 22 }}
                      />
                      <Chip
                        size="small"
                        icon={<CheckCircleIcon sx={{ fontSize: "14px !important" }} />}
                        label="Số (0-9)"
                        color={/[0-9]/.test(passData.new_password) ? "success" : "default"}
                        variant={/[0-9]/.test(passData.new_password) ? "filled" : "outlined"}
                        sx={{ fontSize: "0.68rem", height: 22 }}
                      />
                    </Stack>
                  </Box>
                )}

                <TextField
                  label="Xác nhận mật khẩu mới"
                  type={showConfirmPass ? "text" : "password"}
                  fullWidth
                  required
                  value={passData.confirm_password}
                  onChange={(e) => setPassData({ ...passData, confirm_password: e.target.value })}
                  error={Boolean(passData.confirm_password && passData.new_password !== passData.confirm_password)}
                  helperText={
                    passData.confirm_password && passData.new_password !== passData.confirm_password
                      ? "Mật khẩu xác nhận không khớp"
                      : ""
                  }
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <CheckIcon fontSize="small" sx={{ color: "text.secondary" }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowConfirmPass(!showConfirmPass)} edge="end">
                            {showConfirmPass ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 2.5 },
                    },
                  }}
                />

                <Stack direction="row" spacing={1.5} sx={{ justifyContent: "flex-end", pt: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setShowPasswordModal(false)}
                    disabled={changingPass}
                    sx={{ borderRadius: 2 }}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={
                      changingPass ||
                      !passData.old_password ||
                      !passData.new_password ||
                      passData.new_password !== passData.confirm_password ||
                      passData.new_password.length < 8
                    }
                    endIcon={changingPass ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardIcon fontSize="small" />}
                    sx={{ borderRadius: 2, px: 2.5, fontWeight: 700 }}
                  >
                    {changingPass ? "Đang xử lý..." : "Tiếp tục"}
                  </Button>
                </Stack>
              </Stack>
            </form>
          ) : (
            <form onSubmit={handleConfirmPasswordChange}>
              <Stack spacing={2.5}>
                {/* Email info card */}
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    bgcolor: (th) =>
                      th.palette.mode === "dark"
                        ? "rgba(56, 189, 248, 0.08)"
                        : "rgba(10, 37, 64, 0.04)",
                    border: "1px solid",
                    borderColor: (th) =>
                      th.palette.mode === "dark"
                        ? "rgba(56, 189, 248, 0.2)"
                        : "rgba(10, 37, 64, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <EmailIcon color="primary" />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.72rem" }}>
                      Mã OTP xác thực đã được gửi đến email:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {user?.email || "Email của bạn"}
                    </Typography>
                  </Box>
                </Box>

                {/* 6-slot OTP Input */}
                <Box sx={{ textAlign: "center", py: 0.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: "0.85rem" }}>
                    Nhập mã PIN 6 số để xác thực đổi mật khẩu:
                  </Typography>

                  <OtpPinInput
                    length={6}
                    value={passData.code}
                    onChange={(code) => setPassData((prev) => ({ ...prev, code }))}
                    disabled={changingPass}
                    autoFocus
                  />
                </Box>

                {/* Resend Cooldown Section */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.5,
                  }}
                >
                  {passResendCooldown > 0 ? (
                    <Chip
                      icon={<AccessTimeIcon sx={{ fontSize: "16px !important" }} />}
                      label={`Gửi lại mã sau ${passResendCooldown}s`}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        borderColor: "divider",
                      }}
                    />
                  ) : (
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
                      onClick={handleResendPasswordOtp}
                      disabled={changingPass}
                      sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.8rem" }}
                    >
                      Chưa nhận được mã? Gửi lại
                    </Button>
                  )}
                </Box>

                {/* Actions */}
                <Stack direction="row" spacing={1.5} sx={{ justifyContent: "flex-end", pt: 0.5 }}>
                  <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon fontSize="small" />}
                    onClick={() => setPassStep("form")}
                    disabled={changingPass}
                    sx={{ borderRadius: 2 }}
                  >
                    Quay lại
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={changingPass || passData.code.length !== 6}
                    startIcon={
                      changingPass ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <CheckIcon fontSize="small" />
                      )
                    }
                    sx={{
                      borderRadius: 2,
                      px: 2.5,
                      fontWeight: 700,
                    }}
                  >
                    {changingPass ? "Đang xác thực..." : "Xác thực & Đổi"}
                  </Button>
                </Stack>
              </Stack>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Change Modal */}
      <Dialog
        open={showEmailModal}
        onClose={() => {
          if (!emailLoading) {
            setShowEmailModal(false);
            setEmailStep("request");
            setEmailData({ new_email: "", code: "" });
            setResendCooldown(0);
          }
        }}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3.5,
              overflow: "hidden",
              boxShadow: (th) =>
                th.palette.mode === "dark"
                  ? "0 20px 45px rgba(0, 0, 0, 0.6)"
                  : "0 20px 45px rgba(10, 37, 64, 0.16)",
            },
          },
        }}
      >
        {/* Modal Header */}
        <Box
          sx={{
            px: 3,
            pt: 3,
            pb: 2,
            position: "relative",
            display: "flex",
            alignItems: "flex-start",
            gap: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2.5,
              display: "grid",
              placeItems: "center",
              bgcolor: (th) =>
                th.palette.mode === "dark"
                  ? "rgba(56, 189, 248, 0.12)"
                  : "rgba(139, 0, 0, 0.08)",
              color: (th) =>
                th.palette.mode === "dark" ? "#38BDF8" : "primary.main",
              flexShrink: 0,
            }}
          >
            {emailStep === "request" ? (
              <AtSignIcon sx={{ fontSize: 26 }} />
            ) : (
              <MarkEmailReadIcon sx={{ fontSize: 26 }} />
            )}
          </Box>

          <Box sx={{ flex: 1, pr: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
              {emailStep === "request" ? "Đổi Địa Chỉ Email" : "Xác Thực Mã OTP"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              {emailStep === "request"
                ? "Bảo mật tài khoản qua mã OTP gửi về hòm thư mới"
                : "Nhập mã gồm 6 số đã được gửi qua email"}
            </Typography>
          </Box>

          <IconButton
            size="small"
            disabled={emailLoading}
            onClick={() => {
              setShowEmailModal(false);
              setEmailStep("request");
              setEmailData({ new_email: "", code: "" });
              setResendCooldown(0);
            }}
            sx={{
              position: "absolute",
              right: 14,
              top: 14,
              color: "text.secondary",
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Step Progress Bar */}
        <Box sx={{ px: 3, pt: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                bgcolor: "primary.main",
              }}
            />
            <Box
              sx={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                bgcolor: emailStep === "verify" ? "primary.main" : "action.disabledBackground",
                transition: "background-color 0.3s ease",
              }}
            />
          </Stack>
          <Stack direction="row" sx={{ justifyContent: "space-between", mt: 0.75 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main", fontSize: "0.7rem" }}>
              1. Địa chỉ email
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontWeight: emailStep === "verify" ? 700 : 500,
                color: emailStep === "verify" ? "primary.main" : "text.secondary",
                fontSize: "0.7rem",
              }}
            >
              2. Xác thực OTP
            </Typography>
          </Stack>
        </Box>

        <DialogContent sx={{ px: 3, pt: 2, pb: 3 }}>
          {emailStep === "request" ? (
            <form onSubmit={requestEmailOtp}>
              <Stack spacing={2.5}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: (th) =>
                      th.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.03)"
                        : "rgba(10, 37, 64, 0.03)",
                    border: "1px dashed",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 0.5 }}>
                    Email hiện tại:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {user?.email || "Chưa thiết lập"}
                  </Typography>
                </Box>

                <TextField
                  label="Email mới"
                  type="email"
                  fullWidth
                  required
                  autoFocus
                  value={emailData.new_email}
                  onChange={(e) => setEmailData({ ...emailData, new_email: e.target.value.trim() })}
                  placeholder="email_moi@example.com"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon fontSize="small" sx={{ color: "text.secondary" }} />
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 2.5 },
                    },
                  }}
                  helperText="Mã OTP gồm 6 chữ số sẽ được gửi vào hòm thư này để xác minh"
                />

                <Stack direction="row" spacing={1.5} sx={{ justifyContent: "flex-end", pt: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setShowEmailModal(false)}
                    disabled={emailLoading}
                    sx={{ borderRadius: 2 }}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={emailLoading || !emailData.new_email}
                    endIcon={emailLoading ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardIcon fontSize="small" />}
                    sx={{
                      borderRadius: 2,
                      px: 2.5,
                      fontWeight: 700,
                    }}
                  >
                    {emailLoading ? "Đang gửi..." : "Gửi mã OTP"}
                  </Button>
                </Stack>
              </Stack>
            </form>
          ) : (
            <form onSubmit={verifyEmailOtp}>
              <Stack spacing={2.5}>
                {/* Destination Email Info Card */}
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    bgcolor: (th) =>
                      th.palette.mode === "dark"
                        ? "rgba(56, 189, 248, 0.08)"
                        : "rgba(139, 0, 0, 0.04)",
                    border: "1px solid",
                    borderColor: (th) =>
                      th.palette.mode === "dark"
                        ? "rgba(56, 189, 248, 0.2)"
                        : "rgba(139, 0, 0, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.72rem" }}>
                      Mã xác nhận đã gửi đến:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {emailData.new_email}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                    onClick={() => {
                      setEmailStep("request");
                      setEmailData((prev) => ({ ...prev, code: "" }));
                    }}
                    sx={{ textTransform: "none", fontSize: "0.78rem", minWidth: "auto", flexShrink: 0 }}
                  >
                    Đổi
                  </Button>
                </Box>

                {/* 6-slot OTP Input Component */}
                <Box sx={{ textAlign: "center", py: 0.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: "0.85rem" }}>
                    Nhập mã PIN 6 số để xác thực:
                  </Typography>

                  <OtpPinInput
                    length={6}
                    value={emailData.code}
                    onChange={(code) => setEmailData((prev) => ({ ...prev, code }))}
                    disabled={emailLoading}
                    autoFocus
                  />
                </Box>

                {/* Resend Cooldown Section */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.5,
                  }}
                >
                  {resendCooldown > 0 ? (
                    <Chip
                      icon={<AccessTimeIcon sx={{ fontSize: "16px !important" }} />}
                      label={`Gửi lại mã sau ${resendCooldown}s`}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        borderColor: "divider",
                      }}
                    />
                  ) : (
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
                      onClick={handleResendOtp}
                      disabled={emailLoading}
                      sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.8rem" }}
                    >
                      Chưa nhận được mã? Gửi lại
                    </Button>
                  )}
                </Box>

                {/* Action Buttons */}
                <Stack direction="row" spacing={1.5} sx={{ justifyContent: "flex-end", pt: 0.5 }}>
                  <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon fontSize="small" />}
                    onClick={() => setEmailStep("request")}
                    disabled={emailLoading}
                    sx={{ borderRadius: 2 }}
                  >
                    Quay lại
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={emailLoading || emailData.code.length !== 6}
                    startIcon={
                      emailLoading ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <CheckIcon fontSize="small" />
                      )
                    }
                    sx={{
                      borderRadius: 2,
                      px: 2.5,
                      fontWeight: 700,
                    }}
                  >
                    {emailLoading ? "Đang xác thực..." : "Xác thực & Lưu"}
                  </Button>
                </Stack>
              </Stack>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))} sx={{ borderRadius: 2 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
