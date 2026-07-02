"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import api, { getErrorMessage } from "@/lib/api-client";

interface JobPollProps {
  jobId: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

function resultSummary(result: any) {
  if (!result) return "";
  if (result.verified !== undefined) {
    return `Xác minh: ${result.verified ? "đạt" : "không đạt"}${result.score != null ? `, điểm ${(Number(result.score) * 100).toFixed(1)}%` : ""}`;
  }
  if (result.matches) return `Tìm thấy ${result.matches.length} kết quả`;
  if (result.is_live !== undefined) {
    return `Khuôn mặt thật: ${result.is_live ? "có" : "không"}${result.liveness_score != null ? `, điểm ${(Number(result.liveness_score) * 100).toFixed(1)}%` : ""}`;
  }
  return "Tác vụ đã hoàn tất.";
}

export default function JobPoll({ jobId, onComplete, onError }: JobPollProps) {
  const [status, setStatus] = useState<string>("PENDING");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const poll = async () => {
      try {
        const response = await api.getTaskStatus(jobId);
        setStatus(response.status);
        if (response.status === "SUCCESS") {
          if (response.result?.status === "error") {
            const errorMsg = response.result.error || "Tác vụ thất bại.";
            setError(errorMsg);
            onError?.(errorMsg);
          } else {
            setResult(response.result);
            onComplete?.(response.result);
          }
          if (intervalId) clearInterval(intervalId);
        } else if (response.status === "FAILURE") {
          const errorMsg = response.result?.error || response.result?.detail || "Tác vụ thất bại.";
          setError(errorMsg);
          onError?.(errorMsg);
          if (intervalId) clearInterval(intervalId);
        }
      } catch (err: any) {
        const msg = getErrorMessage(err) || "Không thể lấy trạng thái tác vụ.";
        setError(msg);
        onError?.(msg);
        if (intervalId) clearInterval(intervalId);
      }
    };
    poll();
    intervalId = setInterval(poll, 2000);
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [jobId, onComplete, onError]);

  if (error) {
    return (
      <Alert icon={<ErrorOutlineOutlinedIcon />} severity="error">
        <Typography sx={{ fontWeight: 750 }}>Lỗi xử lý</Typography>
        <Typography variant="body2">{error}</Typography>
      </Alert>
    );
  }

  if (status === "SUCCESS") {
    return (
      <Alert icon={<CheckCircleOutlineOutlinedIcon />} severity="success">
        <Typography sx={{ fontWeight: 750 }}>Thành công</Typography>
        {result && <Typography variant="body2">{resultSummary(result)}</Typography>}
      </Alert>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <CircularProgress size={28} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800 }}>Đang xử lý...</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
            Job ID: {jobId}
          </Typography>
          <LinearProgress sx={{ mt: 1.5, borderRadius: 99 }} />
        </Box>
      </Stack>
    </Paper>
  );
}
