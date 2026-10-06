"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import FaceRetouchingNaturalOutlinedIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import { useAuth } from "@/lib/auth-context";
import api, { getErrorMessage } from "@/lib/api-client";
import Link from "next/link";
import {
  LoginBrandHero,
  LoginFormPassword,
  LoginFormFace,
  ForgotPasswordDialog,
  ForcePasswordChangeDialog,
} from "./_components";

type LoginMode = "password" | "face";

export default function LoginPage() {
  const theme = useTheme();
  const { login, setAuthFromToken } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [submittedPassword, setSubmittedPassword] = useState("");

  const faceFailCountRef = useRef(0);

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await login(email, password);
      if (res?.require_password_change) {
        setSubmittedPassword(password);
        setForcePasswordChange(true);
        return;
      }
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(getErrorMessage(err) || "Đăng nhập thất bại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFaceLogin = useCallback(async (file: File) => {
    setError("");
    setIsLoading(true);
    try {
      const res = await api.faceLogin(file);
      if (!res.access_token) throw new Error("Backend did not return access_token");
      const payload = JSON.parse(atob(res.access_token.split(".")[1]));
      const userEmail = payload?.email || "";
      const role = ((payload?.roles as string[])?.[0]) || "user";
      setAuthFromToken(res.access_token, res.refresh_token, userEmail, role);
      setSuccess(true);
      setIsLoading(false);
      faceFailCountRef.current = 0;
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    } catch (err: any) {
      const msg = getErrorMessage(err) || "Đăng nhập thất bại.";
      setError(msg);
      setIsLoading(false);
      const newCount = faceFailCountRef.current + 1;
      faceFailCountRef.current = newCount;
      if (newCount >= 2) {
        setMode("password");
        faceFailCountRef.current = 0;
        setError(`${msg} Chuyển sang đăng nhập bằng mật khẩu.`);
      }
      throw err;
    }
  }, [setAuthFromToken]);

  const switchMode = (newMode: LoginMode) => {
    setMode(newMode);
    setError("");
    faceFailCountRef.current = 0;
  };

  return (
    <>
      <Box
        sx={{
          minHeight: "100vh",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr", lg: "55% 45%" },
        }}
      >
        {/* Left Hero Panel */}
        <LoginBrandHero />

        {/* Right Form Panel */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            p: { xs: 3, sm: 4, md: 5 },
            bgcolor: "background.default",
            minHeight: "100vh",
          }}
        >
          {/* Mobile-only logo */}
          <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", justifyContent: "center", mb: 4 }}>
            <Box
              component="img"
              src={theme.palette.mode === "dark" ? "/logo-white.png" : "/logo.png"}
              alt="IUH Logo"
              sx={{ height: 44, width: "auto", objectFit: "contain" }}
            />
          </Box>

          <Box sx={{ width: "100%", maxWidth: 420 }}>
            {/* Header */}
            <Box sx={{ mb: 3.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, fontFamily: "Space Grotesk, sans-serif" }}>
                Đăng nhập
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: "0.95rem" }}>
                Chào mừng trở lại! Vui lòng đăng nhập để tiếp tục.
              </Typography>
            </Box>

            {/* Mode Tabs */}
            <Box
              sx={{
                display: "flex",
                bgcolor: "action.hover",
                borderRadius: 2.5,
                p: 0.5,
                mb: 3,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              {(["password", "face"] as LoginMode[]).map((m) => (
                <Box
                  key={m}
                  onClick={() => switchMode(m)}
                  sx={{
                    flex: 1,
                    py: 1.1,
                    borderRadius: 2,
                    textAlign: "center",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.75,
                    ...(mode === m
                      ? {
                          bgcolor: "background.paper",
                          color: "primary.main",
                          boxShadow: "0 2px 8px rgba(139, 0, 0, 0.12)",
                        }
                      : {
                          color: "text.secondary",
                          "&:hover": { color: "text.primary" },
                        }),
                  }}
                >
                  {m === "password" ? (
                    <>
                      <LockOutlinedIcon sx={{ fontSize: 17 }} />
                      Mật khẩu
                    </>
                  ) : (
                    <>
                      <FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: 17 }} />
                      Khuôn mặt AI
                    </>
                  )}
                </Box>
              ))}
            </Box>

            {/* Error Alert */}
            {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}

            {/* Success */}
            {success && (
              <Alert icon={<CheckCircleOutlineOutlinedIcon />} severity="success" sx={{ mb: 2.5, borderRadius: 2 }}>
                Đăng nhập thành công. Đang chuyển hướng...
              </Alert>
            )}

            {/* Render Forms */}
            {mode === "password" ? (
              <LoginFormPassword
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                onSubmit={handlePasswordSubmit}
                onForgotClick={() => setForgotOpen(true)}
                isLoading={isLoading}
              />
            ) : (
              <LoginFormFace
                onFaceLogin={handleFaceLogin}
                isLoading={isLoading}
                onSwitchToPassword={(prefillEmail) => {
                  if (prefillEmail) setEmail(prefillEmail);
                  setMode("password");
                }}
                setError={setError}
              />
            )}

            {/* Patron Notice */}
            <Box sx={{ mt: 3.5, pt: 2.5, borderTop: "1px solid", borderColor: "divider", textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Tài khoản độc giả do Thư viện cấp theo mã sinh viên.
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 0.5 }}>
                Độc giả mới vui lòng liên hệ quầy dịch vụ thư viện để kích hoạt thẻ.
              </Typography>
            </Box>

            {/* Footer */}
            <Typography variant="caption" color="text.disabled" sx={{ display: "block", textAlign: "center", mt: 3 }}>
              © {new Date().getFullYear()} Thư Viện IUH — Hệ thống Quản lý Thư viện Thông minh
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Forgot Password Dialog */}
      <ForgotPasswordDialog
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
      />

      {/* Force Password Change Dialog on First Login */}
      <ForcePasswordChangeDialog
        open={forcePasswordChange}
        initialOldPassword={submittedPassword}
        onSuccess={() => {
          window.location.href = "/dashboard";
        }}
      />
    </>
  );
}
