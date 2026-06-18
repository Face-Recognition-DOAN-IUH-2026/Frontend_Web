"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import CameraCapture from "@/components/camera-capture";
import JobPoll from "@/components/job-poll";
import { useAuth } from "@/lib/auth-context";
import api, { getErrorMessage } from "@/lib/api-client";
import { shimmer } from "@/lib/animations";
import type { TaskResult } from "@/lib/types";

function decodeJwt(token: string): { sub: string } | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export default function VerifyPage() {
  const { accessToken } = useAuth();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [targetUserId, setTargetUserId] = useState("");
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TaskResult | null>(null);

  useEffect(() => {
    if (accessToken) {
      const payload = decodeJwt(accessToken);
      if (payload?.sub) setTargetUserId(payload.sub);
    }
  }, [accessToken]);

  const handleCapture = (file: File) => {
    setImageFile(file);
    setResult(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!imageFile || !targetUserId) return;
    setError("");
    setIsLoading(true);
    setJobId(null);
    try {
      const res = await api.verifyFace(imageFile, targetUserId, consent);
      setJobId(res.job_id);
    } catch (err: any) {
      setError(getErrorMessage(err) || "Xác thực thất bại.");
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setImageFile(null);
    setJobId(null);
    setError("");
    setIsLoading(false);
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 920, mx: "auto" }}>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <VerifiedUserOutlinedIcon color="primary" />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 850 }}>Xác thực khuôn mặt</Typography>
            <Typography color="text.secondary">So khớp ảnh hiện tại với hồ sơ khuôn mặt của một người dùng cụ thể.</Typography>
          </Box>
        </Stack>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}

      {jobId ? (
        <JobPoll
          jobId={jobId}
          onComplete={(value) => { setResult(value); setIsLoading(false); setJobId(null); }}
          onError={(message) => { setError(message); setIsLoading(false); setJobId(null); }}
        />
      ) : result ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              {result.verified ? <CheckCircleOutlineOutlinedIcon color="success" sx={{ fontSize: 44 }} /> : <ErrorOutlineOutlinedIcon color="error" sx={{ fontSize: 44 }} />}
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 850 }}>
                  {result.verified ? "Xác thực thành công" : "Xác thực thất bại"}
                </Typography>
                {result.score != null && (
                  <Typography color="text.secondary">Độ tin cậy: {(Number(result.score) * 100).toFixed(1)}%</Typography>
                )}
              </Box>
            </Stack>
            {result.score != null && (
              <LinearProgress variant="determinate" value={Math.min(Number(result.score) * 100, 100)} color={result.verified ? "success" : "error"} sx={{ height: 8, borderRadius: 99 }} />
            )}
            {result.error && <Alert severity="error">{result.error}</Alert>}
            <Button startIcon={<RestartAltOutlinedIcon />} variant="outlined" onClick={reset} sx={{ alignSelf: "flex-start" }}>
              Thử lại
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <CameraCapture onCapture={handleCapture} />
              <TextField
                label="User ID"
                value={targetUserId}
                onChange={(event) => setTargetUserId(event.target.value)}
                placeholder="User ID cần xác thực"
                required
                fullWidth
              />
              <FormControlLabel
                control={<Checkbox checked={consent} onChange={(event) => setConsent(event.target.checked)} />}
                label="Tôi đồng ý cho hệ thống xử lý dữ liệu khuôn mặt để xác thực."
              />
              <Button type="submit" variant="contained" disabled={!imageFile || !targetUserId || !consent || isLoading} fullWidth>
                {isLoading ? "Đang gửi..." : "Xác thực khuôn mặt"}
              </Button>
            </Stack>
          </Box>
        </Paper>
      )}
    </Stack>
  );
}
