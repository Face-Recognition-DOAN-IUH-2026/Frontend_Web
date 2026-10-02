"use client";

import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

interface LoginFormPasswordProps {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onForgotClick: () => void;
  isLoading: boolean;
}

export default function LoginFormPassword({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  onSubmit,
  onForgotClick,
  isLoading,
}: LoginFormPasswordProps) {
  return (
    <Box component="form" onSubmit={onSubmit}>
      <Stack spacing={2.5}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          fullWidth
          disabled={isLoading}
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

        <TextField
          label="Mật khẩu"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          fullWidth
          disabled={isLoading}
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
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <VisibilityOffIcon sx={{ fontSize: 20 }} /> : <VisibilityIcon sx={{ fontSize: 20 }} />}
                  </IconButton>
                </InputAdornment>
              ),
              sx: { borderRadius: 2.5 },
            },
          }}
        />

        {/* Forgot password */}
        <Box sx={{ textAlign: "right", mt: -0.5 }}>
          <Box
            component="button"
            type="button"
            onClick={onForgotClick}
            sx={{
              border: "none",
              bgcolor: "transparent",
              color: "primary.main",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.85rem",
              transition: "opacity 0.2s",
              "&:hover": { opacity: 0.8, textDecoration: "underline" },
            }}
          >
            Quên mật khẩu?
          </Box>
        </Box>

        <Button
          type="submit"
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <LoginOutlinedIcon />}
          size="large"
          fullWidth
          disabled={isLoading}
          sx={{
            py: 1.35,
            fontWeight: 700,
            borderRadius: 2.5,
            boxShadow: "0 4px 14px rgba(139, 0, 0, 0.25)",
          }}
        >
          {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </Stack>
    </Box>
  );
}
