"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import api, { getErrorMessage } from "@/lib/api-client";

interface ForgotPasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ForgotPasswordDialog({
  open,
  onClose,
}: ForgotPasswordDialogProps) {
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3 | 4>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleClose = () => {
    onClose();
    setForgotStep(1);
    setForgotEmail("");
    setForgotCode("");
    setForgotPassword("");
    setForgotConfirmPassword("");
    setForgotError("");
    setShowForgotPassword(false);
  };

  const handleForgotSendCode = async () => {
    if (!forgotEmail) {
      setForgotError("Vui lòng nhập email");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    try {
      await api.forgotPassword(forgotEmail);
      setForgotStep(2);
      setResendCooldown(60);
    } catch (err: any) {
      setForgotError(getErrorMessage(err) || "Không thể gửi mã reset");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!forgotCode || forgotCode.length !== 6) {
      setForgotError("Vui lòng nhập đầy đủ 6 chữ số mã xác minh");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    try {
      await api.verifyResetCode(forgotEmail, forgotCode);
      setForgotStep(3);
    } catch (err: any) {
      setForgotError(getErrorMessage(err) || "Mã xác minh không hợp lệ");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async () => {
    if (!forgotPassword || !forgotConfirmPassword) {
      setForgotError("Vui lòng nhập mật khẩu mới");
      return;
    }
    if (forgotPassword !== forgotConfirmPassword) {
      setForgotError("Mật khẩu mới không khớp");
      return;
    }
    if (forgotPassword.length < 6) {
      setForgotError("Mật khẩu phải ít nhất 6 ký tự");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    try {
      await api.resetPassword(forgotEmail, forgotCode, forgotPassword);
      setForgotStep(4);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      setForgotError(getErrorMessage(err) || "Đặt lại mật khẩu thất bại");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3.5, p: 0.5 } } }}
    >
      <DialogContent sx={{ p: 3, pt: "20px !important" }}>
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: "Space Grotesk, sans-serif" }}>
            {forgotStep === 4 ? "Thành công" : "Quên mật khẩu"}
          </Typography>
          <IconButton onClick={handleClose} size="small" sx={{ color: "text.secondary" }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Step Indicator - Dot style */}
        {forgotStep < 4 && (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mb: 3, mt: 1.5 }}>
            {[1, 2, 3].map((s) => (
              <Box key={s} sx={{ display: "flex", alignItems: "center" }}>
                <Box
                  sx={{
                    width: forgotStep === s ? 32 : 10,
                    height: 8,
                    borderRadius: 4,
                    bgcolor: forgotStep >= s ? "primary.main" : "action.hover",
                    transition: "all 0.3s ease",
                  }}
                />
                {s < 3 && (
                  <Box
                    sx={{
                      width: 24,
                      height: 2,
                      mx: 0.5,
                      bgcolor: forgotStep > s ? "primary.main" : "action.hover",
                      transition: "background-color 0.3s ease",
                    }}
                  />
                )}
              </Box>
            ))}
          </Box>
        )}

        {/* Error Message */}
        {forgotError && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              p: 1.5,
              borderRadius: 2,
              mb: 2,
              bgcolor: "error.light",
              color: "error.contrastText",
            }}
          >
            <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 20, color: "error.main" }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{forgotError}</Typography>
          </Box>
        )}

        {forgotStep === 1 && (
          <Stack spacing={2.5}>
            <Box sx={{ textAlign: "center", mb: 0.5 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  mx: "auto",
                  mb: 2,
                  bgcolor: "action.hover",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <EmailOutlinedIcon sx={{ fontSize: 32, color: "primary.main" }} />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Nhập email đã đăng ký để nhận mã xác minh.
              </Typography>
            </Box>
            <TextField
              label="Email"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              fullWidth
              autoFocus
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlinedIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2.5 },
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleForgotSendCode}
              disabled={forgotLoading || !forgotEmail}
              fullWidth
              size="large"
              sx={{
                py: 1.35,
                fontWeight: 700,
                borderRadius: 2.5,
                boxShadow: "0 4px 14px rgba(139, 0, 0, 0.25)",
              }}
            >
              {forgotLoading ? "Đang gửi..." : "Gửi mã xác minh"}
            </Button>
          </Stack>
        )}

        {forgotStep === 2 && (
          <Stack spacing={2}>
            <Box sx={{ textAlign: "center", mb: 1 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  mx: "auto",
                  mb: 2,
                  bgcolor: "action.hover",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <ShieldOutlinedIcon sx={{ fontSize: 32, color: "primary.main" }} />
              </Box>
              <Typography variant="body2" color="text.secondary">Nhập mã 6 chữ số đã gửi đến</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>{forgotEmail}</Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1.5, justifyContent: "center" }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <TextField
                  key={i}
                  id={`code-${i}`}
                  value={forgotCode[i] || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length > 1) return;
                    const newCode = forgotCode.split("");
                    newCode[i] = val;
                    const code = newCode.join("").slice(0, 6);
                    setForgotCode(code);
                    if (val && i < 5) {
                      setTimeout(() => document.getElementById(`code-${i + 1}`)?.focus(), 10);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !forgotCode[i] && i > 0) {
                      setTimeout(() => document.getElementById(`code-${i - 1}`)?.focus(), 10);
                    }
                  }}
                  slotProps={{
                    htmlInput: {
                      maxLength: 1,
                      style: { textAlign: "center", fontSize: "1.5rem", fontWeight: 700, width: 48, height: 48, padding: 0 },
                    },
                  }}
                  sx={{
                    "& fieldset": {
                      borderRadius: 2,
                      borderWidth: forgotCode[i] ? 2 : 1,
                      borderColor: forgotCode[i] ? "primary.main" : "divider",
                    },
                    transition: "all 0.2s ease",
                    bgcolor: forgotCode[i] ? "action.selected" : "transparent",
                  }}
                />
              ))}
            </Box>
            <Button
              variant="contained"
              onClick={handleVerifyCode}
              disabled={forgotLoading || forgotCode.length !== 6}
              fullWidth
              size="large"
              sx={{
                py: 1.35,
                fontWeight: 700,
                borderRadius: 2.5,
                boxShadow: "0 4px 14px rgba(139, 0, 0, 0.25)",
              }}
            >
              {forgotLoading ? "Đang xác minh..." : "Xác minh mã"}
            </Button>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button
                variant="text"
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => { setForgotStep(1); setForgotCode(""); setForgotError(""); }}
                sx={{ textTransform: "none", fontWeight: 600, color: "text.secondary" }}
              >
                Quay lại
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={handleForgotSendCode}
                disabled={forgotLoading || resendCooldown > 0}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                {resendCooldown > 0 ? `Gửi lại (${resendCooldown}s)` : "Gửi lại mã"}
              </Button>
            </Box>
          </Stack>
        )}

        {forgotStep === 3 && (
          <Stack spacing={2.5}>
            <Box sx={{ textAlign: "center", mb: 0.5 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  mx: "auto",
                  mb: 2,
                  bgcolor: "action.hover",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <LockOutlinedIcon sx={{ fontSize: 32, color: "primary.main" }} />
              </Box>
              <Typography variant="body2" color="text.secondary">Tạo mật khẩu mới cho tài khoản của bạn.</Typography>
            </Box>
            <TextField
              label="Mật khẩu mới"
              type={showForgotPassword ? "text" : "password"}
              value={forgotPassword}
              onChange={(e) => setForgotPassword(e.target.value)}
              fullWidth
              autoFocus
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowForgotPassword(!showForgotPassword)}
                        edge="end"
                        size="small"
                      >
                        {showForgotPassword ? <VisibilityOffIcon sx={{ fontSize: 20 }} /> : <VisibilityIcon sx={{ fontSize: 20 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2.5 },
                },
              }}
            />
            <TextField
              label="Xác nhận mật khẩu mới"
              type={showForgotPassword ? "text" : "password"}
              value={forgotConfirmPassword}
              onChange={(e) => setForgotConfirmPassword(e.target.value)}
              fullWidth
              error={forgotConfirmPassword.length > 0 && forgotPassword !== forgotConfirmPassword}
              helperText={forgotConfirmPassword.length > 0 && forgotPassword !== forgotConfirmPassword ? "Mật khẩu không khớp" : ""}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2.5 },
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleForgotReset}
              disabled={forgotLoading || !forgotPassword || !forgotConfirmPassword}
              fullWidth
              size="large"
              sx={{
                py: 1.35,
                fontWeight: 700,
                borderRadius: 2.5,
                boxShadow: "0 4px 14px rgba(139, 0, 0, 0.25)",
              }}
            >
              {forgotLoading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
            </Button>
            <Button
              variant="text"
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={() => { setForgotStep(2); setForgotError(""); setForgotPassword(""); setForgotConfirmPassword(""); }}
              sx={{ textTransform: "none", fontWeight: 600, color: "text.secondary" }}
            >
              Quay lại
            </Button>
          </Stack>
        )}

        {forgotStep === 4 && (
          <Stack spacing={2} sx={{ alignItems: "center", py: 3 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                bgcolor: "success.light",
                display: "grid",
                placeItems: "center",
                animation: "scaleIn 0.3s ease-out",
                "@keyframes scaleIn": {
                  "0%": { transform: "scale(0)", opacity: 0 },
                  "100%": { transform: "scale(1)", opacity: 1 },
                },
              }}
            >
              <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 48, color: "success.main" }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Đặt lại mật khẩu thành công!</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
              Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.
            </Typography>
            <Button
              variant="contained"
              onClick={handleClose}
              fullWidth
              size="large"
              sx={{ mt: 1, py: 1.5, fontWeight: 700 }}
            >
              Quay lại đăng nhập
            </Button>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
