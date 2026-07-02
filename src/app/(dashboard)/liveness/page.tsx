"use client";

import { useState } from "react";
import { Box, Alert, Button, Checkbox, LinearProgress, Stack, Typography } from "@mui/material";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CameraCapture from "@/app/(dashboard)/_components/camera-capture";
import JobPoll from "@/app/(dashboard)/_components/job-poll";
import api, { getErrorMessage } from "@/lib/api-client";
import type { LivenessBreakdown } from "@/lib/types";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import { staggerSx } from "@/lib/useStaggeredAnimation";

const breakdownLabels: Record<keyof LivenessBreakdown, string> = {
  lbp: "Kết cấu ảnh",
  color: "Màu sắc",
  noise: "Nhiễu ảnh",
  fft: "Tần số ảnh",
  multi_scale: "Đa tỷ lệ",
  bbox: "Tỷ lệ khuôn mặt",
  insightface: "Mô hình học sâu",
};

function BreakdownBar({ label, score }: { label: string; score: number }) {
  const percent = Math.round(score * 100);
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { sm: "center" } }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: { sm: 150 }, flexShrink: 0 }}>{label}</Typography>
      <LinearProgress variant="determinate" value={percent} color={score >= 0.7 ? "success" : score >= 0.4 ? "warning" : "error"} sx={{ flex: 1, height: 8, borderRadius: 99, minWidth: 120 }} />
      <Typography variant="caption" color="text.secondary" sx={{ width: 44, fontFamily: "monospace", textAlign: "right" }}>
        {percent}%
      </Typography>
    </Stack>
  );
}

function LivenessResultCard({ result }: { result: any }) {
  const isLive = Boolean(result.is_live);
  const score = Number(result.liveness_score ?? 0);
  const breakdown: LivenessBreakdown | undefined = result.breakdown;

  return (
    <DashboardCard>
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          {isLive ? <VisibilityOutlinedIcon color="success" sx={{ fontSize: 48 }} /> : <VisibilityOffOutlinedIcon color="error" sx={{ fontSize: 48 }} />}
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              {isLive ? "Khuôn mặt thật" : "Phát hiện giả mạo"}
            </Typography>
            <Typography color="text.secondary">Điểm liveness: {(score * 100).toFixed(1)}%</Typography>
          </Box>
        </Stack>

        <LinearProgress variant="determinate" value={Math.min(score * 100, 100)} color={isLive ? "success" : "error"} sx={{ height: 9, borderRadius: 99 }} />

        {breakdown ? (
          <Stack spacing={1.5}>
            <Typography variant="overline" color="text.secondary">Chi tiết kỹ thuật</Typography>
            {Object.entries(breakdownLabels).map(([key, label]) => {
              const value = breakdown[key as keyof LivenessBreakdown];
              if (value === undefined) return null;
              return <BreakdownBar key={key} label={label} score={value} />;
            })}
          </Stack>
        ) : null}
      </Stack>
    </DashboardCard>
  );
}

export default function LivenessPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleCapture = (file: File) => {
    setImageFile(file);
    setResult(null);
    setError("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!imageFile) return;
    setError("");
    setIsLoading(true);
    setJobId(null);
    setResult(null);
    try {
      const data = await api.livenessCheck(imageFile, consent);
      setJobId(data.job_id);
    } catch (err: any) {
      setError(getErrorMessage(err) || "Kiểm tra liveness thất bại.");
      setIsLoading(false);
    }
  };

  const reset = () => {
    setImageFile(null);
    setJobId(null);
    setResult(null);
    setError("");
    setIsLoading(false);
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 920, mx: "auto" }}>
      <Box sx={staggerSx(0)}>
        <PageHeader
          title="Kiểm tra sống"
          subtitle="Đánh giá ảnh khuôn mặt thật hay ảnh giả mạo trước khi xử lý nhận diện."
          icon={VisibilityOutlinedIcon}
          gradient="linear-gradient(135deg, #581c87 0%, #7c3aed 50%, #a78bfa 100%)"
        />
      </Box>

      {error ? (
        <Box sx={staggerSx(1)}>
          <Alert severity="error">{error}</Alert>
        </Box>
      ) : null}

      {result ? (
        <Stack spacing={2} sx={staggerSx(1)}>
          <LivenessResultCard result={result} />
          <Button startIcon={<RestartAltOutlinedIcon />} variant="outlined" onClick={reset} sx={{ alignSelf: "center" }}>
            Thử lại
          </Button>
        </Stack>
      ) : jobId ? (
        <Box sx={staggerSx(1)}>
          <DashboardCard>
            <JobPoll
              jobId={jobId}
              onComplete={(value) => { setResult(value); setIsLoading(false); setJobId(null); }}
              onError={(message) => { setError(message); setIsLoading(false); setJobId(null); }}
            />
          </DashboardCard>
        </Box>
      ) : (
        <Box sx={staggerSx(1)}>
          <DashboardCard>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <CameraCapture onCapture={handleCapture} />
       <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { xs: "flex-start", sm: "center" } }}>
         <Checkbox checked={consent} onChange={(event) => setConsent(event.target.checked)} />
         <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5, mt: { xs: -0.5, sm: 0 } }}>
           Tôi đồng ý cho hệ thống xử lý dữ liệu khuôn mặt để kiểm tra liveness.
         </Typography>
       </Stack>
                <Button type="submit" variant="contained" disabled={!imageFile || !consent || isLoading} fullWidth>
                  {isLoading ? "Đang gửi..." : "Kiểm tra liveness"}
                </Button>
              </Stack>
            </Box>
          </DashboardCard>
        </Box>
      )}
    </Stack>
  );
}
