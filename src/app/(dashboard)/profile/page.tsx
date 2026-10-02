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
import api, { getErrorMessage } from "@/lib/api-client";
import type { UserPublic } from "@/lib/types";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import { useAuth } from "@/lib/auth-context";
import AvatarUser from "@/app/(dashboard)/_components/ui/AvatarUser";

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

  const [passData, setPassData] = useState({ old_password: "", new_password: "", confirm_password: "" });
  const [changingPass, setChangingPass] = useState(false);

  const [emailData, setEmailData] = useState({ new_email: "", code: "" });
  const [emailStep, setEmailStep] = useState<"request" | "verify">("request");
  const [emailLoading, setEmailLoading] = useState(false);

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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passData.new_password !== passData.confirm_password) return showNotice("error", "Mật khẩu xác nhận không khớp");
    if (passData.new_password.length < 6) return showNotice("error", "Mật khẩu mới phải ít nhất 6 ký tự");
    try {
      setChangingPass(true);
      await api.changePassword({ old_password: passData.old_password, new_password: passData.new_password });
      showNotice("success", "Đổi mật khẩu thành công!");
      setShowPasswordModal(false);
      setPassData({ old_password: "", new_password: "", confirm_password: "" });
    } catch (error: any) {
      showNotice("error", getErrorMessage(error) || "Đổi mật khẩu thất bại");
    } finally {
      setChangingPass(false);
    }
  };

  const requestEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailData.new_email) return showNotice("error", "Vui lòng nhập email mới");
    try {
      setEmailLoading(true);
      await api.requestEmailChangeOtp({ new_email: emailData.new_email });
      showNotice("success", "Đã gửi mã OTP đến email mới");
      setEmailStep("verify");
    } catch (error: any) {
      showNotice("error", getErrorMessage(error) || "Không thể gửi OTP");
    } finally {
      setEmailLoading(false);
    }
  };

  const verifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailData.code) return showNotice("error", "Vui lòng nhập mã OTP");
    try {
      setEmailLoading(true);
      await api.verifyAndChangeEmail({ new_email: emailData.new_email, otp: emailData.code });
      showNotice("success", "Đổi email thành công!");
      setShowEmailModal(false);
      setEmailData({ new_email: "", code: "" });
      setEmailStep("request");
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
        </Grid>
      </Grid>

      <Dialog open={showPasswordModal} onClose={() => setShowPasswordModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
          <KeyIcon color="primary" /> Đổi Mật Khẩu
          <Box sx={{ flex: 1 }} />
          <IconButton size="small" onClick={() => setShowPasswordModal(false)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <form onSubmit={handlePasswordChange}>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <TextField label="Mật khẩu hiện tại" type="password" fullWidth required value={passData.old_password} onChange={(e) => setPassData({ ...passData, old_password: e.target.value })} />
              <TextField label="Mật khẩu mới" type="password" fullWidth required value={passData.new_password} onChange={(e) => setPassData({ ...passData, new_password: e.target.value })} helperText="Tối thiểu 6 ký tự" />
              <TextField label="Xác nhận mật khẩu mới" type="password" fullWidth required value={passData.confirm_password} onChange={(e) => setPassData({ ...passData, confirm_password: e.target.value })} />
              <Stack direction="row" spacing={1.5} sx={{ justifyContent: "flex-end", pt: 1 }}>
                <Button variant="outlined" onClick={() => setShowPasswordModal(false)} disabled={changingPass}>Hủy</Button>
                <Button type="submit" variant="contained" disabled={changingPass} startIcon={changingPass ? <CircularProgress size={16} color="inherit" /> : undefined}>
                  {changingPass ? "Đang lưu..." : "Cập nhật"}
                </Button>
              </Stack>
            </Stack>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEmailModal} onClose={() => { setShowEmailModal(false); setEmailStep("request"); setEmailData({ new_email: "", code: "" }); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
          <AtSignIcon color="primary" /> Đổi Email
          <Box sx={{ flex: 1 }} />
          <IconButton size="small" onClick={() => { setShowEmailModal(false); setEmailStep("request"); setEmailData({ new_email: "", code: "" }); }}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          {emailStep === "request" ? (
            <form onSubmit={requestEmailOtp}>
              <Stack spacing={2.5} sx={{ pt: 1 }}>
                <Alert severity="info" sx={{ borderRadius: 2 }}>Để đổi email, nhập địa chỉ email mới. Chúng tôi sẽ gửi mã OTP đến đó để xác minh.</Alert>
                <TextField label="Email hiện tại" fullWidth value={user?.email || ""} disabled />
                <TextField label="Email mới" type="email" fullWidth required autoFocus value={emailData.new_email} onChange={(e) => setEmailData({ ...emailData, new_email: e.target.value })} placeholder="email_moi@example.com" />
                <Stack direction="row" spacing={1.5} sx={{ justifyContent: "flex-end" }}>
                  <Button variant="outlined" onClick={() => setShowEmailModal(false)} disabled={emailLoading}>Hủy</Button>
                  <Button type="submit" variant="contained" disabled={emailLoading} startIcon={emailLoading ? <CircularProgress size={16} color="inherit" /> : undefined}>
                    {emailLoading ? "Đang gửi..." : "Gửi mã OTP"}
                  </Button>
                </Stack>
              </Stack>
            </form>
          ) : (
            <form onSubmit={verifyEmailOtp}>
              <Stack spacing={2.5} sx={{ pt: 1 }}>
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                  Mã OTP đã được gửi đến <strong>{emailData.new_email}</strong>
                </Alert>
                <TextField
                  label="Nhập mã OTP (6 số)" fullWidth required autoFocus
                  value={emailData.code}
                  onChange={(e) => setEmailData({ ...emailData, code: e.target.value.replace(/\D/g, "") })}
                  slotProps={{ htmlInput: { maxLength: 6, style: { textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.5em", fontFamily: "monospace" } } }}
                />
                <Stack direction="row" spacing={1.5} sx={{ justifyContent: "flex-end" }}>
                  <Button variant="outlined" onClick={() => setEmailStep("request")} disabled={emailLoading}>Quay lại</Button>
                  <Button type="submit" variant="contained" disabled={emailLoading || emailData.code.length !== 6} startIcon={emailLoading ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}>
                    {emailLoading ? "Đang xác thực..." : "Xác thực"}
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
