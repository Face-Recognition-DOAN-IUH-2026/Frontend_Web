"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import dynamic from "next/dynamic";
const LoginBackground3D = dynamic(() => import("@/components/LoginBackground3D"), { ssr: false });

export default function VerifyEmailPage() {
  const theme = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState(0);

  // Tab 0: Verify with OTP
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifySuccess, setVerifySuccess] = useState(false);

  // Tab 1: Change email
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [correctCode, setCorrectCode] = useState("");
  const [correctStep, setCorrectStep] = useState<1 | 2>(1);
  const [correctLoading, setCorrectLoading] = useState(false);
  const [correctError, setCorrectError] = useState("");
  const [correctSuccess, setCorrectSuccess] = useState(false);

  const handleVerify = async () => {
    if (!verifyEmail || !verifyCode) {
      setVerifyError("Vui lòng nhập đầy đủ email và mã OTP");
      return;
    }
    setVerifyLoading(true);
    setVerifyError("");
    try {
      await api.verifyEmail({ email: verifyEmail, code: verifyCode });
      setVerifySuccess(true);
    } catch (err: any) {
      setVerifyError(getErrorMessage(err) || "Mã OTP không hợp lệ hoặc đã hết hạn");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!verifyEmail) {
      setVerifyError("Vui lòng nhập email");
      return;
    }
    setVerifyLoading(true);
    setVerifyError("");
    try {
      await api.resendVerification(verifyEmail);
      setVerifyError("");
      alert("Đã gửi mã OTP mới. Vui lòng kiểm tra email.");
    } catch (err: any) {
      setVerifyError(getErrorMessage(err) || "Không thể gửi mã OTP");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleRequestEmailCorrection = async () => {
    if (!currentEmail || !newEmail) {
      setCorrectError("Vui lòng nhập đầy đủ email hiện tại và email mới");
      return;
    }
    if (currentEmail === newEmail) {
      setCorrectError("Email mới phải khác email hiện tại");
      return;
    }
    setCorrectLoading(true);
    setCorrectError("");
    try {
      await api.requestEmailCorrection({ current_email: currentEmail, new_email: newEmail });
      setCorrectStep(2);
    } catch (err: any) {
      setCorrectError(getErrorMessage(err) || "Không thể gửi mã OTP");
    } finally {
      setCorrectLoading(false);
    }
  };

  const handleVerifyEmailCorrection = async () => {
    if (!correctCode) {
      setCorrectError("Vui lòng nhập mã OTP");
      return;
    }
    setCorrectLoading(true);
    setCorrectError("");
    try {
      await api.verifyEmailCorrection({
        current_email: currentEmail,
        new_email: newEmail,
        code: correctCode,
      });
      setCorrectSuccess(true);
    } catch (err: any) {
      setCorrectError(getErrorMessage(err) || "Mã OTP không hợp lệ hoặc đã hết hạn");
    } finally {
      setCorrectLoading(false);
    }
  };

  return (
    <>
      <LoginBackground3D />
      <Box
        sx={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          p: 2,
          position: "relative",
          zIndex: 1,
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            width: "100%",
            maxWidth: 460,
            p: 4,
            background: `linear-gradient(180deg, ${theme.palette.background.paper}, ${theme.palette.background.default})`,
          }}
        >
          <Stack spacing={3}>
            <Stack spacing={1.25} sx={{ alignItems: "center", textAlign: "center" }}>
              <Box sx={{ width: 58, height: 58, borderRadius: 2, bgcolor: "primary.main", color: "primary.contrastText", display: "grid", placeItems: "center" }}>
                <AutoStoriesOutlinedIcon fontSize="large" />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: 0 }}>Xác thực email</Typography>
                <Typography color="text.secondary">Xác thực email hoặc đổi email trước khi đăng nhập</Typography>
              </Box>
            </Stack>

            <Tabs value={tab} onChange={(_, v) => { setTab(v); setVerifyError(""); setCorrectError(""); }} variant="fullWidth">
              <Tab label="Nhập OTP" />
              <Tab label="Đổi email" />
            </Tabs>

            {tab === 0 && (
              <>
                {verifySuccess ? (
                  <Stack spacing={2} sx={{ alignItems: "center", py: 2 }}>
                    <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: "success.light", display: "grid", placeItems: "center" }}>
                      <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 40, color: "success.main" }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Xác thực thành công!</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                      Bạn có thể đăng nhập ngay bây giờ.
                    </Typography>
                    <Button variant="contained" onClick={() => router.push("/login")} fullWidth sx={{ mt: 1 }}>
                      Quay lại đăng nhập
                    </Button>
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    {verifyError && <Alert severity="error">{verifyError}</Alert>}
                    <Typography variant="body2" color="text.secondary">
                      Nhập email và mã 6 chữ số đã nhận được.
                    </Typography>
                    <TextField
                      label="Email"
                      type="email"
                      value={verifyEmail}
                      onChange={(e) => setVerifyEmail(e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Mã OTP (6 chữ số)"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      fullWidth
                      slotProps={{ htmlInput: { maxLength: 6, inputMode: "numeric" } }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleVerify}
                      disabled={verifyLoading || verifyCode.length !== 6}
                      fullWidth
                    >
                      {verifyLoading ? "Đang xác thực..." : "Xác thực"}
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      onClick={handleResendOtp}
                      disabled={verifyLoading}
                    >
                      Gửi lại mã OTP
                    </Button>
                  </Stack>
                )}
              </>
            )}

            {tab === 1 && (
              <>
                {correctSuccess ? (
                  <Stack spacing={2} sx={{ alignItems: "center", py: 2 }}>
                    <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: "success.light", display: "grid", placeItems: "center" }}>
                      <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 40, color: "success.main" }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Đổi email thành công!</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                      Email đã được đổi và tài khoản đã xác thực. Bạn có thể đăng nhập ngay.
                    </Typography>
                    <Button variant="contained" onClick={() => router.push("/login")} fullWidth sx={{ mt: 1 }}>
                      Quay lại đăng nhập
                    </Button>
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    {correctError && <Alert severity="error">{correctError}</Alert>}
                    {correctStep === 1 ? (
                      <>
                        <Typography variant="body2" color="text.secondary">
                          Nhập email hiện tại (đang nhập sai) và email mới đúng.
                        </Typography>
                        <TextField
                          label="Email hiện tại"
                          type="email"
                          value={currentEmail}
                          onChange={(e) => setCurrentEmail(e.target.value)}
                          fullWidth
                        />
                        <TextField
                          label="Email mới (đúng)"
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          fullWidth
                        />
                        <Button
                          variant="contained"
                          onClick={handleRequestEmailCorrection}
                          disabled={correctLoading}
                          fullWidth
                        >
                          {correctLoading ? "Đang gửi..." : "Gửi mã OTP đến email mới"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Typography variant="body2" color="text.secondary">
                          Nhập mã 6 chữ số đã gửi đến <strong>{newEmail}</strong>
                        </Typography>
                        <TextField
                          label="Mã OTP (6 chữ số)"
                          value={correctCode}
                          onChange={(e) => setCorrectCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          fullWidth
                          slotProps={{ htmlInput: { maxLength: 6, inputMode: "numeric" } }}
                        />
                        <Button
                          variant="contained"
                          onClick={handleVerifyEmailCorrection}
                          disabled={correctLoading || correctCode.length !== 6}
                          fullWidth
                        >
                          {correctLoading ? "Đang xác thực..." : "Xác nhận đổi email"}
                        </Button>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => { setCorrectStep(1); setCorrectCode(""); setCorrectError(""); }}
                        >
                          ← Quay lại
                        </Button>
                      </>
                    )}
                  </Stack>
                )}
              </>
            )}

            <Button
              variant="text"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push("/login")}
              fullWidth
            >
              Quay lại đăng nhập
            </Button>
          </Stack>
        </Paper>
      </Box>
    </>
  );
}
