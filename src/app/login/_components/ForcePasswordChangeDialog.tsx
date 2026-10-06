"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
  Box,
  InputAdornment,
  IconButton,
  CircularProgress,
} from "@mui/material";
import LockResetIcon from "@mui/icons-material/LockReset";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import SecurityIcon from "@mui/icons-material/Security";
import api, { getErrorMessage } from "@/lib/api-client";

interface ForcePasswordChangeDialogProps {
  open: boolean;
  initialOldPassword?: string;
  onSuccess: () => void;
}

export default function ForcePasswordChangeDialog({
  open,
  initialOldPassword = "",
  onSuccess,
}: ForcePasswordChangeDialogProps) {
  const [oldPassword, setOldPassword] = useState(initialOldPassword);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Sync if initialOldPassword changes
  React.useEffect(() => {
    if (initialOldPassword) {
      setOldPassword(initialOldPassword);
    }
  }, [initialOldPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!oldPassword) {
      setError("Vui lòng nhập mật khẩu hiện tại");
      return;
    }
    if (newPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự");
      return;
    }
    if (newPassword === oldPassword) {
      setError("Mật khẩu mới không được trùng với mật khẩu cũ");
      return;
    }
    const hasLower = /[a-z]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);
    if (!hasLower || !hasUpper || !hasDigit) {
      setError("Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu mới không khớp");
      return;
    }

    setSubmitting(true);
    try {
      await api.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      onSuccess();
    } catch (err: any) {
      setError(getErrorMessage(err) || "Đổi mật khẩu thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      maxWidth="xs"
      fullWidth
      slotProps={{
        backdrop: {
          sx: { backdropFilter: "blur(4px)", backgroundColor: "rgba(10, 37, 64, 0.6)" },
        },
        paper: {
          sx: {
            borderRadius: 3,
            p: 1,
            boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          },
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: "warning.lighter",
                color: "warning.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LockResetIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Đổi mật khẩu lần đầu
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Bắt buộc để kích hoạt và bảo mật tài khoản
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 1.5 }}>
          <Alert severity="warning" icon={<SecurityIcon />} sx={{ mb: 2.5, borderRadius: 2 }}>
            Tài khoản của bạn được khởi tạo với mật khẩu tự động mặc định. Vui lòng thiết lập mật khẩu mới trước khi tiếp tục.
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2}>
            <TextField
              label="Mật khẩu hiện tại"
              type={showOld ? "text" : "password"}
              fullWidth
              size="small"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowOld(!showOld)} edge="end">
                        {showOld ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Mật khẩu mới"
              type={showNew ? "text" : "password"}
              fullWidth
              size="small"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và chữ số"
              required
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowNew(!showNew)} edge="end">
                        {showNew ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Xác nhận mật khẩu mới"
              type={showNew ? "text" : "password"}
              fullWidth
              size="small"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <LockResetIcon />}
            sx={{
              py: 1.2,
              fontWeight: 700,
              textTransform: "none",
              borderRadius: 2,
              background: "linear-gradient(135deg, #0B4378 0%, #0F3C5C 100%)",
            }}
          >
            {submitting ? "Đang cập nhật..." : "Cập nhật mật khẩu & Tiếp tục"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
