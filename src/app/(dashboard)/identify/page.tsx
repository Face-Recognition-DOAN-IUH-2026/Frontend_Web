"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Checkbox, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import Spin from "antd/es/spin";
import Progress from "antd/es/progress";
import FaceRetouchingNaturalOutlinedIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import CameraCapture from "@/app/(dashboard)/_components/camera-capture";
import api, { getErrorMessage } from "@/lib/api-client";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import type { FaceResultEvent } from "@/lib/types";
import { preprocessImage, isImageTooDark, getImageSizeReduction } from "@/lib/image-preprocessor";

export default function IdentifyPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [dataUrl, setDataUrl] = useState<string>("");
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [matches, setMatches] = useState<any[] | null>(null);
  const [connected, setConnected] = useState(false);
  const [lowLightWarning, setLowLightWarning] = useState(false);
  const [processingStats, setProcessingStats] = useState<{
    originalSize: number;
    processedSize: number;
    reduction: number;
  } | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const cleanup = api.connectFaceResultSSE(
    (event: FaceResultEvent) => {
      if (event.process_type !== "identify") return;
      if (event.status === "SUCCESS" && event.result) {
        const resultMatches = event.result.matches;
        setMatches(Array.isArray(resultMatches) ? resultMatches : []);
        setIsLoading(false);
      } else if (event.status === "FAILURE") {
        setError((event.result?.error as string) || "Nhận diện thất bại.");
        setIsLoading(false);
      }
    },
      (connected) => setConnected(connected),
    );
    cleanupRef.current = cleanup;
    return () => { cleanup(); cleanupRef.current = null; };
  }, []);

  const handleCapture = (file: File, url: string) => {
    setImageFile(file);
    setDataUrl(url);
    setMatches(null);
    setLowLightWarning(false);
    setProcessingStats(null);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImageFile(file);
      setDataUrl(url);
      setMatches(null);
      setLowLightWarning(false);
      setProcessingStats(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!imageFile) return;
    setError("");
    setIsLoading(true);
    setIsProcessing(true);
    setMatches(null);
    setLowLightWarning(false);
    setProcessingStats(null);
    
    try {
      const preprocessed = await preprocessImage(imageFile, {
        maxWidth: 640,
        maxHeight: 480,
        quality: 0.85,
        convertToGrayscale: false,
        brightnessThreshold: 50,
      });

      setProcessingStats({
        originalSize: preprocessed.originalSize,
        processedSize: preprocessed.processedSize,
        reduction: getImageSizeReduction(preprocessed.originalSize, preprocessed.processedSize),
      });

      if (isImageTooDark(preprocessed.brightness, 50)) {
        setLowLightWarning(true);
        setIsLoading(false);
        setIsProcessing(false);
        return;
      }

      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(preprocessed.blob);
      });

      setIsProcessing(false);

      const result = await api.processFaceImageSync({
        image: base64,
        camera_id: "identify_dashboard",
        process_type: "identify",
        consent_given: consent,
      });

      if (result.status === "success" && result.result?.matches) {
        setMatches(Array.isArray(result.result.matches) ? result.result.matches : []);
      } else if (result.result?.error) {
        setError(result.result.error as string);
      } else {
        setError("Nhận diện thất bại.");
      }
    } catch (err: any) {
      setError(getErrorMessage(err) || "Nhận diện thất bại.");
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setMatches(null);
    setDataUrl("");
    setImageFile(null);
    setError("");
    setIsLoading(false);
    setIsProcessing(false);
    setLowLightWarning(false);
    setProcessingStats(null);
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

      {lowLightWarning ? (
        <Box sx={staggerSx(1)}>
          <Alert 
            severity="warning" 
            action={
              <Button color="inherit" size="small" onClick={reset}>
                Thử lại
              </Button>
            }
          >
            Ánh sáng yếu! Vui lòng di chuyển đến nơi có ánh sáng tốt hơn hoặc bật đèn.
          </Alert>
        </Box>
      ) : null}

      {isLoading ? (
        <Box sx={staggerSx(1)}>
          <DashboardCard>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Spin size="small" />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800 }}>
                  {isProcessing ? "Đang tiền xử lý ảnh..." : "Đang nhận diện..."}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {connected ? "Kết nối SSE đang chờ kết quả" : "Đang kết nối..."}
                </Typography>
                <Progress percent={99} status="active" showInfo={false} strokeColor="#6366f1" trailColor="rgba(0,0,0,0.06)" />
              </Box>
            </Stack>
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

          {processingStats ? (
            <DashboardCard>
              <Typography variant="body2" color="text.secondary">
                Ảnh đã xử lý: {processingStats.originalSize} → {processingStats.processedSize} 
                (giảm {processingStats.reduction}%)
              </Typography>
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
                              <Progress
                                percent={Math.min(percent, 100)}
                                size="small"
                                status={score > 0.6 ? "success" : score > 0.3 ? "normal" : "exception"}
                                strokeColor={score > 0.6 ? "#10b981" : score > 0.3 ? "#f59e0b" : "#ef4444"}
                                showInfo={false}
                                style={{ width: 90 }}
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
