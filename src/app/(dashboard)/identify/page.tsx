"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import FaceOutlinedIcon from "@mui/icons-material/FaceOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import CameraCapture from "@/components/camera-capture";
import JobPoll from "@/components/job-poll";
import api, { getErrorMessage } from "@/lib/api-client";

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
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <SearchOutlinedIcon color="primary" />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 850 }}>Nhận diện khuôn mặt</Typography>
            <Typography color="text.secondary">Tìm người dùng gần nhất trong kho khuôn mặt đã đăng ký.</Typography>
          </Box>
        </Stack>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}

      {jobId ? (
        <JobPoll
          jobId={jobId}
          onComplete={(result) => { setIsLoading(false); setJobId(null); setMatches(result?.matches || []); }}
          onError={(message) => { setError(message); setIsLoading(false); setJobId(null); }}
        />
      ) : matches ? (
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <FaceOutlinedIcon color="primary" />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 850 }}>Tìm thấy {matches.length} kết quả</Typography>
                  <Typography color="text.secondary">Kết quả được sắp xếp theo độ tin cậy giảm dần.</Typography>
                </Box>
              </Stack>
              <Button startIcon={<RestartAltOutlinedIcon />} variant="outlined" onClick={reset}>Thử lại</Button>
            </Stack>
          </Paper>

          {dataUrl && (
            <Box component="img" src={dataUrl} alt="Ảnh đã chụp" sx={{ width: 160, height: 160, objectFit: "cover", borderRadius: 2, border: 1, borderColor: "divider", mx: "auto" }} />
          )}

          {matches.length === 0 ? (
            <Alert severity="info">Không tìm thấy khuôn mặt phù hợp.</Alert>
          ) : (
            <Paper variant="outlined" sx={{ overflow: "hidden" }}>
              <TableContainer>
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
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(percent, 100)}
                                color={score > 0.6 ? "success" : score > 0.3 ? "warning" : "error"}
                                sx={{ width: 90, height: 7, borderRadius: 99 }}
                              />
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
            </Paper>
          )}
        </Stack>
      ) : (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <CameraCapture onCapture={handleCapture} />
              <FormControlLabel
                control={<Checkbox checked={consent} onChange={(event) => setConsent(event.target.checked)} />}
                label="Tôi đồng ý cho hệ thống xử lý dữ liệu khuôn mặt để nhận diện."
              />
              <Button type="submit" variant="contained" disabled={!imageFile || !consent || isLoading} fullWidth>
                {isLoading ? "Đang gửi..." : "Nhận diện khuôn mặt"}
              </Button>
            </Stack>
          </Box>
        </Paper>
      )}
    </Stack>
  );
}
