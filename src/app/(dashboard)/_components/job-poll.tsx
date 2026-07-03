"use client";

import { useEffect } from "react";
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
import { useTaskSSE } from "@/lib/hooks/useTaskSSE";

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
    return `Khuôn mặt thật: ${result.is_live ? "Có" : "Không"}${result.liveness_score != null ? `, điểm ${(Number(result.liveness_score) * 100).toFixed(1)}%` : ""}`;
  }
  return "Tác vụ đã hoàn tất.";
}

export default function JobPoll({ jobId, onComplete, onError }: JobPollProps) {
  const { state, start } = useTaskSSE();

  useEffect(() => {
    start(jobId);
  }, [jobId, start]);

  useEffect(() => {
    if (state.status === "SUCCESS") {
      onComplete?.(state.result);
    } else if (state.status === "FAILURE" || state.status === "ERROR" || state.status === "TIMEOUT") {
      onError?.(state.error || "Tác vụ thất bại.");
    }
  }, [state.status, state.result, state.error, onComplete, onError]);

  if (state.status === "FAILURE" || state.status === "ERROR" || state.status === "TIMEOUT") {
    return (
      <Alert icon={<ErrorOutlineOutlinedIcon />} severity="error">
        <Typography sx={{ fontWeight: 750 }}>Lỗi</Typography>
        <Typography variant="body2">{state.error}</Typography>
      </Alert>
    );
  }

  if (state.status === "SUCCESS") {
    return (
      <Alert icon={<CheckCircleOutlineOutlinedIcon />} severity="success">
        <Typography sx={{ fontWeight: 750 }}>Thành công</Typography>
        {state.result && <Typography variant="body2">{resultSummary(state.result)}</Typography>}
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
