"use client";

import { useState } from "react";
import { Box, Alert, Button, Checkbox, LinearProgress, Stack, Typography } from "@mui/material";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CameraCapture from "@/app/(dashboard)/_components/camera-capture";
import JobPoll from "@/app/(dashboard)/_components/job-poll";
import api, { getErrorMessage } from "@/lib/api-client";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import { staggerSx } from "@/lib/useStaggeredAnimation";

function LivenessResultCard({ result }: { result: any }) {
  const isLive = Boolean(result.is_live);
  const score = Number(result.liveness_score ?? 0);
  const pct = Math.min(Math.round(score * 100), 100);

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

        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <LinearProgress
            variant="determinate"
            value={pct}
            color={isLive ? "success" : "error"}
            sx={{ flex: 1, height: 10, borderRadius: 5 }}
          />
          <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 40 }}>
            {pct}%
          </Typography>
        </Stack>
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

  const handleFileUpload = (file: File) => {
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
                <CameraCapture onCapture={handleCapture} onFileUpload={handleFileUpload} />
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
