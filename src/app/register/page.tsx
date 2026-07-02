"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Checkbox, CircularProgress,
  FormControlLabel, Paper, Stack, Step, StepLabel, Stepper,
  TextField, Typography, alpha,
} from "@mui/material";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api, { getErrorMessage } from "@/lib/api-client";
import StudentCardScanner, { type ScannedCardData } from "@/app/(dashboard)/_components/StudentCardScanner";
import MultiAngleCapture, { type CaptureAngle } from "@/app/(dashboard)/_components/MultiAngleCapture";

const steps = ["Quét thẻ", "Xác nhận thông tin", "Đăng ký", "Khuôn mặt"];

type RegisterPhase = "scan" | "confirm" | "form" | "face" | "face-enrolling" | "done";

export default function RegisterPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<RegisterPhase>("scan");
  const [activeStep, setActiveStep] = useState(0);
  const [scannedData, setScannedData] = useState<ScannedCardData | null>(null);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const [registrationTokens, setRegistrationTokens] = useState<{
    access_token: string; refresh_token?: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleScanned = async (data: ScannedCardData) => {
    setError("");
    if (!data.studentCode) return;
    try {
      const existing = await api.lookupPatron(data.studentCode);
      if (existing.exists) {
        setError("MSSV này đã được đăng ký trong hệ thống. Vui lòng đăng nhập hoặc liên hệ thư viện để được hỗ trợ.");
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
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusData = await api.getTaskStatus(data.job_id, token);
          if (statusData.status === "SUCCESS") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (statusData.result?.status === "error") {
              setFaceError(statusData.result.error || "Đăng ký khuôn mặt thất bại");
            }
            setFaceResult(statusData.result);
            setFaceLoading(false);
            setPhase("done");
          } else if (statusData.status === "FAILURE") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setFaceError(statusData.result?.error || "Đăng ký khuôn mặt thất bại");
            setFaceResult(statusData.result);
            setFaceLoading(false);
            setPhase("done");
          }
        } catch {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setFaceError("Không thể lấy trạng thái tác vụ");
          setFaceLoading(false);
          setPhase("done");
        }
      }, 2000);
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
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 560, width: "100%" }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={3}>
            <Typography variant="h5" sx={{ fontWeight: 700, textAlign: "center" }}>
              Đăng ký thẻ thư viện
            </Typography>

            {phase !== "done" && (
              <Stepper activeStep={activeStep} alternativeLabel>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            )}

            {error && <Alert severity="error">{error}</Alert>}

            {phase === "scan" && (
              <StudentCardScanner
                onScanned={handleScanned}
                onError={(msg) => setError(msg)}
              />
            )}

            {phase === "confirm" && scannedData && (
              <Stack spacing={2}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Thông tin từ thẻ sinh viên
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha("#000", 0.02) }}>
                  <Stack spacing={1}>
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
                  Bạn có thể chỉnh sửa thông tin ở bước tiếp theo
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button variant="contained" onClick={handleConfirmNext} fullWidth>
                    Tiếp theo
                  </Button>
                  <Button variant="outlined" onClick={() => { setPhase("scan"); setActiveStep(0); }} fullWidth>
                    Quét lại
                  </Button>
                </Stack>
              </Stack>
            )}

            {phase === "form" && (
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  Thông tin tài khoản
                </Typography>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Mật khẩu"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                  size="small"
                />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                  Thông tin cá nhân
                </Typography>
                <TextField
                  label="Họ tên"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  fullWidth
                  size="small"
                />
                <TextField
                  label="MSSV"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  required
                  fullWidth
                  size="small"
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Lớp"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Ngày sinh"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    fullWidth
                    size="small"
                  />
                </Stack>
                <TextField
                  label="Khóa học"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="HKTT"
                  value={permanentAddress}
                  onChange={(e) => setPermanentAddress(e.target.value)}
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                />
                <TextField
                  label="Khoa"
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  fullWidth
                  size="small"
                />
                {scannedData && (
                  <Alert severity="info" sx={{ fontSize: "0.8rem" }}>
                    Đã điền thông tin từ thẻ sinh viên
                  </Alert>
                )}
                <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleFormSubmit}
                    disabled={registering}
                    fullWidth
                  >
                    {registering ? <CircularProgress size={20} /> : "Đăng ký"}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => { setPhase("scan"); setActiveStep(0); }}
                    fullWidth
                  >
                    Quay lại
                  </Button>
                </Stack>
              </Stack>
            )}

            {phase === "face" && (
              <Stack spacing={2}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Đăng ký khuôn mặt (tùy chọn)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Đăng ký khuôn mặt giúp bạn ra vào thư viện nhanh chóng mà không cần thẻ.
                  Bạn có thể bỏ qua bước này và làm sau.
                </Typography>
                <MultiAngleCapture
                  consent={consent}
                  setConsent={setConsent}
                  onFilesReady={handleFilesReady}
                />
                <Button color="inherit" variant="text" onClick={handleSkipFace} fullWidth>
                  Bỏ qua bước này
                </Button>
              </Stack>
            )}

            {phase === "face-enrolling" && (
              <Stack spacing={2} sx={{ alignItems: "center", py: 4 }}>
                <CircularProgress size={48} />
                <Typography>Đang xử lý đăng ký khuôn mặt...</Typography>
              </Stack>
            )}

            {phase === "done" && (
              <Stack spacing={2} sx={{ alignItems: "center", py: 3 }}>
                {faceLoading ? (
                  <>
                    <CircularProgress size={48} />
                    <Typography>Đang xử lý...</Typography>
                  </>
                ) : faceError ? (
                  <Alert severity="warning" sx={{ width: "100%" }}>
                    {faceError}
                  </Alert>
                ) : faceResult ? (
                  <Alert severity="success" sx={{ width: "100%" }}>
                    Đăng ký khuôn mặt thành công!
                  </Alert>
                ) : (
                  <Alert severity="info" sx={{ width: "100%" }}>
                    Bạn có thể đăng ký khuôn mặt sau trong phần quản lý tài khoản.
                  </Alert>
                )}
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Đăng ký thành công!
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                  Tài khoản thư viện của bạn đã được tạo. Vui lòng đăng nhập để sử dụng.
                </Typography>
                <Button variant="contained" onClick={() => router.push("/login")} fullWidth>
                  Đăng nhập
                </Button>
                <Button variant="text" onClick={handleReset} fullWidth>
                  Đăng ký tài khoản khác
                </Button>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string | null }) {
  return (
    <Stack direction="row" spacing={1}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90, flexShrink: 0 }}>
        {label}:
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value ?? ""}
      </Typography>
    </Stack>
  );
}
