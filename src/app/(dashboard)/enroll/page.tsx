"use client";

import { useEffect, useState } from "react";
import { Box, Alert, Button, Chip, Divider, Stack, Typography } from "@mui/material";
import FaceOutlinedIcon from "@mui/icons-material/FaceOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import { useTaskSSE } from "@/lib/hooks/useTaskSSE";
import MultiAngleCapture, { type CaptureAngle } from "@/app/(dashboard)/_components/MultiAngleCapture";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import { useToast } from "@/lib/toast-context";

export default function EnrollPage() {
  const { toast } = useToast();
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const { state: sseState, start: startSSE, reset: resetSSE } = useTaskSSE();

  useEffect(() => {
    return () => resetSSE();
  }, [resetSSE]);

  useEffect(() => {
    if (sseState.status === "SUCCESS") {
      const inner = sseState.result as Record<string, any> | null;
      if (inner?.status === "error") {
        const msg = String(inner.error) || "Đăng ký thất bại.";
        setError(msg);
        toast.error(msg);
      } else {
        toast.success("Đăng ký khuôn mặt thành công.");
      }
      setResult(inner);
      setIsLoading(false);
    } else if (sseState.status === "FAILURE" || sseState.status === "ERROR" || sseState.status === "TIMEOUT") {
      const msg = sseState.error || "Không thể lấy trạng thái tác vụ.";
      setError(msg);
      toast.error(msg);
      setIsLoading(false);
    }
  }, [sseState.status, sseState.result, sseState.error, toast]);

  const handleFilesReady = async (files: Record<CaptureAngle, File>) => {
    setError("");
    setIsLoading(true);
    setJobId(null);
    setResult(null);
    try {
      const data = await api.enrollBatch(files, consent);
      setJobId(data.job_id);
      startSSE(data.job_id);
    } catch (err: any) {
      const msg = getErrorMessage(err) || "Đăng ký nhiều góc thất bại.";
      setError(msg);
      toast.error(msg);
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
      <Box sx={staggerSx(0)}>
        <PageHeader
          title="Đăng ký khuôn mặt"
          subtitle="Chụp các góc để hệ thống tạo hồ sơ nhận diện khuôn mặt ổn định hơn."
          icon={FaceOutlinedIcon}
        />
      </Box>

      {error ? (
        <Box sx={staggerSx(1)}>
          <Alert icon={<ErrorOutlineOutlinedIcon />} severity="error">{error}</Alert>
        </Box>
      ) : null}

      {result ? (
        <Box sx={staggerSx(1)}>
          <DashboardCard>
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

              {result.results ? (
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
              ) : null}

              <Button variant="contained" startIcon={<RestartAltOutlinedIcon />} onClick={handleReset} sx={{ alignSelf: "flex-start" }}>
                {success ? "Đăng ký thêm" : "Thử lại"}
              </Button>
            </Stack>
          </DashboardCard>
        </Box>
      ) : jobId ? (
        <Box sx={staggerSx(1)}>
          <DashboardCard>
            <LoadingOverlay loading message={jobId ? `Đang xử lý... (Job ID: ${jobId})` : undefined} />
          </DashboardCard>
        </Box>
      ) : (
        <Box sx={staggerSx(1)}>
          <DashboardCard>
            <MultiAngleCapture consent={consent} setConsent={setConsent} onFilesReady={handleFilesReady} />
            {isLoading ? <Alert severity="info" sx={{ mt: 2 }}>Đang gửi dữ liệu đăng ký...</Alert> : null}
          </DashboardCard>
        </Box>
      )}
    </Stack>
  );
}
