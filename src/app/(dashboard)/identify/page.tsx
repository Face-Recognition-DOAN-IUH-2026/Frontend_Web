"use client";

import { useState } from "react";
import { Alert, Box, Button, Checkbox, Chip, LinearProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import FaceRetouchingNaturalOutlinedIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import CameraCapture from "@/app/(dashboard)/_components/camera-capture";
import JobPoll from "@/app/(dashboard)/_components/job-poll";
import api, { getErrorMessage } from "@/lib/api-client";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import { staggerSx } from "@/lib/useStaggeredAnimation";

export default function IdentifyPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [dataUrl, setDataUrl] = useState<string>("");
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [matches, setMatches] = useState<any[] | null>(null);

  const handleCapture = (file: File, url: string) => {
    setImageFile(file);
    setDataUrl(url);
    setMatches(null);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImageFile(file);
      setDataUrl(url);
      setMatches(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!imageFile) return;
    setError("");
    setIsLoading(true);
    setJobId(null);
    setMatches(null);
    try {
      const data = await api.identifyFace(imageFile, consent);
      setJobId(data.job_id);
    } catch (err: any) {
      setError(getErrorMessage(err) || "Nhận diện thất bại.");
      setIsLoading(false);
    }
  };

  const reset = () => {
    setMatches(null);
    setDataUrl("");
    setImageFile(null);
    setJobId(null);
    setError("");
    setIsLoading(false);
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 1040, mx: "auto" }}>
      <Box sx={staggerSx(0)}>
        <PageHeader
          title="Nhận diện khuôn mặt"
          subtitle="Tìm người dùng gần nhất trong kho khuôn mặt đã đăng ký."
          icon={FaceRetouchingNaturalOutlinedIcon}
          gradient="linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #3b82f6 100%)"
        />
      </Box>

      {error ? (
        <Box sx={staggerSx(1)}>
          <Alert severity="error">{error}</Alert>
        </Box>
      ) : null}

      {jobId ? (
        <Box sx={staggerSx(1)}>
          <DashboardCard>
            <JobPoll
              jobId={jobId}
              onComplete={(result) => { setIsLoading(false); setJobId(null); setMatches(result?.matches || []); }}
              onError={(message) => { setError(message); setIsLoading(false); setJobId(null); }}
            />
          </DashboardCard>
        </Box>
      ) : matches ? (
        <Stack spacing={2} sx={staggerSx(1)}>
          <DashboardCard
            title={`Tìm thấy ${matches.length} kết quả`}
            subtitle="Kết quả được sắp xếp theo độ tin cậy giảm dần."
            actions={<Button startIcon={<RestartAltOutlinedIcon />} variant="outlined" onClick={reset}>Thử lại</Button>}
          />

          {dataUrl ? (
            <DashboardCard noPadding>
              <Box component="img" src={dataUrl} alt="Ảnh đã chụp" sx={{ width: 160, height: 160, objectFit: "cover", borderRadius: 2, border: 1, borderColor: "divider", mx: "auto" }} />
            </DashboardCard>
          ) : null}

          {matches.length === 0 ? (
            <DashboardCard>
              <EmptyState
                icon={<FaceRetouchingNaturalOutlinedIcon />}
                title="Không tìm thấy khuôn mặt phù hợp"
                description="Không có kết quả nào khớp với khuôn mặt đã cung cấp."
              />
            </DashboardCard>
          ) : (
            <DashboardCard noPadding>
      <TableContainer sx={{ overflowX: "auto" }}>
      <Table sx={{ minWidth: 820 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Độ tin cậy</TableCell>
                      <TableCell>User ID</TableCell>
                      <TableCell>Tên</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Vai trò</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {matches.map((match, index) => {
                      const score = Number(match.score ?? 0);
                      const percent = Number((score * 100).toFixed(1));
                      return (
                        <TableRow key={`${match.user_id}-${index}`} hover>
                          <TableCell sx={{ minWidth: 180 }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                              <LinearProgress variant="determinate" value={Math.min(percent, 100)} color={score > 0.6 ? "success" : score > 0.3 ? "warning" : "error"} sx={{ width: 90, height: 7, borderRadius: 99 }} />
                              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{percent}%</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ fontFamily: "monospace", color: "text.secondary" }}>{match.user_id}</TableCell>
                          <TableCell sx={{ fontWeight: 750 }}>{match.full_name || "-"}</TableCell>
                          <TableCell sx={{ color: "text.secondary" }}>{match.email || "-"}</TableCell>
                          <TableCell><Chip size="small" label={match.role || "-"} /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </DashboardCard>
          )}
        </Stack>
      ) : (
        <Box sx={staggerSx(1)}>
          <DashboardCard>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <CameraCapture onCapture={handleCapture} onFileUpload={handleFileUpload} />
       <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { xs: "flex-start", sm: "center" } }}>
         <Checkbox checked={consent} onChange={(event) => setConsent(event.target.checked)} />
         <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5, mt: { xs: -0.5, sm: 0 } }}>
           Tôi đồng ý cho hệ thống xử lý dữ liệu khuôn mặt để nhận diện.
         </Typography>
       </Stack>
                <Button type="submit" variant="contained" disabled={!imageFile || !consent || isLoading} fullWidth>
                  {isLoading ? "Đang gửi..." : "Nhận diện khuôn mặt"}
                </Button>
              </Stack>
            </Box>
          </DashboardCard>
        </Box>
      )}
    </Stack>
  );
}
