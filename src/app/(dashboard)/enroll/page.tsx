"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import FaceRetouchingNaturalOutlinedIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import { shimmer } from "@/lib/animations";
import MultiAngleCapture, { type CaptureAngle } from "@/components/MultiAngleCapture";

export default function EnrollPage() {
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const pollForResult = async (taskId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const data = await api.getTaskStatus(taskId);
        if (data.status === "SUCCESS") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          const inner = data.result;
          if (inner?.status === "error") setError(inner.error || "Đăng ký thất bại.");
          setResult(inner);
          setIsLoading(false);
        } else if (data.status === "FAILURE") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setError(data.result?.error || "Đăng ký thất bại.");
          setResult(data.result);
          setIsLoading(false);
        }
      } catch {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setError("Không thể lấy trạng thái tác vụ.");
        setIsLoading(false);
      }
    }, 2000);
  };

  const handleFilesReady = async (files: Record<CaptureAngle, File>) => {
    setError("");
    setIsLoading(true);
    setJobId(null);
    setResult(null);
    try {
      const data = await api.enrollBatch(files, consent);
      setJobId(data.job_id);
      await pollForResult(data.job_id);
    } catch (err: any) {
      setError(getErrorMessage(err) || "Đăng ký nhiều góc thất bại.");
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setConsent(false);
    setJobId(null);
    setResult(null);
    setError("");
    setIsLoading(false);
  };

  const failedCount = result?.results?.filter((item: any) => item.status !== "success").length || 0;
  const success = result && result.status !== "error";

  return (
    <Stack spacing={3} sx={{ maxWidth: 920, mx: "auto" }}>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <FaceRetouchingNaturalOutlinedIcon color="primary" />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 850 }}>Đăng ký khuôn mặt</Typography>
            <Typography color="text.secondary">Chụp đủ 4 góc để hệ thống tạo hồ sơ nhận diện ổn định hơn.</Typography>
          </Box>
        </Stack>
      </Paper>

      {error && <Alert icon={<ErrorOutlineOutlinedIcon />} severity="error">{error}</Alert>}

      {result ? (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                {success ? <CheckCircleOutlineOutlinedIcon color="success" sx={{ fontSize: 44 }} /> : <ErrorOutlineOutlinedIcon color="error" sx={{ fontSize: 44 }} />}
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 850 }}>
                    {success ? "Đăng ký thành công" : "Đăng ký thất bại một phần"}
                  </Typography>
                  <Typography color="text.secondary">
                    {success ? "Khuôn mặt đã được ghi nhận vào hệ thống." : `${failedCount} góc ảnh chưa đạt yêu cầu.`}
                  </Typography>
                </Box>
              </Stack>

              {result.results && (
                <>
                  <Divider />
                  <Stack spacing={1}>
                    <Typography variant="overline" color="text.secondary">Kết quả từng góc</Typography>
                    {result.results.map((item: any, index: number) => (
                      <Stack key={`${item.angle}-${index}`} direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                        <Typography sx={{ textTransform: "capitalize" }}>{item.angle}</Typography>
                        <Chip size="small" color={item.status === "success" ? "success" : "error"} label={item.status === "success" ? "Thành công" : "Thất bại"} />
                      </Stack>
                    ))}
                  </Stack>
                </>
              )}

              <Button variant="contained" startIcon={<RestartAltOutlinedIcon />} onClick={handleReset} sx={{ alignSelf: "flex-start" }}>
                {success ? "Đăng ký thêm" : "Thử lại"}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : jobId ? (
        <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
          <CircularProgress sx={{ animation: `${shimmer} 1.5s ease-in-out infinite` }} />
          <Typography variant="h6" sx={{ mt: 2, fontWeight: 800 }}>Đang xử lý...</Typography>
          <Typography color="text.secondary" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>Job ID: {jobId}</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <MultiAngleCapture consent={consent} setConsent={setConsent} onFilesReady={handleFilesReady} />
          {isLoading && <Alert severity="info" sx={{ mt: 2 }}>Đang gửi dữ liệu đăng ký...</Alert>}
        </Paper>
      )}
    </Stack>
  );
}
