"use client";

import React from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BadgeIcon from "@mui/icons-material/BadgeOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import FaceIcon from "@mui/icons-material/FaceOutlined";
import VideocamIcon from "@mui/icons-material/VideocamOutlined";
import WarningIcon from "@mui/icons-material/WarningAmberOutlined";

import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import AvatarUser from "@/app/(dashboard)/_components/ui/AvatarUser";
import { fadeInUp } from "@/lib/animations";
import { staggerSx } from "@/lib/useStaggeredAnimation";

export interface BorrowStepPatronProps {
  patronCode: string;
  setPatronCode: (val: string) => void;
  patronId: string | null;
  patronName: string;
  activeCount: number;
  overdueCount: number;
  borrowConfig: { max_borrow_books: number };
  remaining: number;
  canBorrow: boolean;
  faceVerifyDisabled: boolean;
  handleLookupAndOpenCamera: () => void;
  startWebcam: () => void;
  handleFaceVerify: () => void;
  setOverdueGuideOpen: (open: boolean) => void;
  setCurrentStep: (step: number) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraStarted: boolean;
  cameraLoading: boolean;
  cameraReady: boolean;
  cameraError: string;
  faceScanning: boolean;
}

export function BorrowStepPatron({
  patronCode,
  setPatronCode,
  patronId,
  patronName,
  activeCount,
  overdueCount,
  borrowConfig,
  remaining,
  canBorrow,
  faceVerifyDisabled,
  handleLookupAndOpenCamera,
  startWebcam,
  handleFaceVerify,
  setOverdueGuideOpen,
  setCurrentStep,
  videoRef,
  cameraStarted,
  cameraLoading,
  cameraReady,
  cameraError,
  faceScanning,
}: BorrowStepPatronProps) {
  const theme = useTheme();

  return (
    <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      {/* Left Column: Patron Info */}
      <Grid size={{ xs: 12, md: 5, lg: 4 }} sx={{ display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", minHeight: 0 }}>
        <Box sx={staggerSx(1)}>
          <DashboardCard
            title="Xác minh độc giả"
            actions={
              <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 32, height: 32 }}>
                <BadgeIcon sx={{ fontSize: 18 }} />
              </Avatar>
            }
          >
            <Stack spacing={2}>
              <TextField
                value={patronCode}
                onChange={(e) => setPatronCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLookupAndOpenCamera();
                }}
                placeholder="Nhập mã số sinh viên (MSSV)..."
                size="small"
                fullWidth
                disabled={!!patronId}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "4px",
                    bgcolor: "background.paper",
                    "&:hover": { "& fieldset": { borderColor: "primary.main" } },
                  },
                }}
              />
              <Button
                variant="contained"
                fullWidth
                onClick={handleLookupAndOpenCamera}
                disabled={faceVerifyDisabled}
                startIcon={<FaceIcon />}
                sx={{
                  borderRadius: "4px",
                  fontWeight: 700,
                  textTransform: "none",
                  py: 1.2,
                }}
              >
                Kiểm tra & Bật camera
              </Button>
            </Stack>
          </DashboardCard>
        </Box>

        {patronId ? (
          <Box sx={{ ...staggerSx(2), animation: `${fadeInUp} 0.4s ease-out` }}>
            <DashboardCard noPadding>
              <Box
                sx={{
                  px: 2.5,
                  pt: 2,
                  pb: 2.5,
                  borderLeft: 4,
                  borderLeftColor: overdueCount > 0 ? "error.main" : "success.main",
                }}
              >
                <Stack spacing={2}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <AvatarUser name={patronName || patronId} role="patron" size={48} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }} noWrap>
                        {patronName || patronId}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        MSSV: {patronCode}
                      </Typography>
                    </Box>
                    <Chip size="small" color="success" label="Đã xác minh" icon={<CheckCircleIcon />} sx={{ fontWeight: 600 }} />
                  </Box>
                  <Divider />
                  <Stack spacing={1}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Số sách đã mượn
                      </Typography>
                      <Chip
                        size="small"
                        color={activeCount >= borrowConfig.max_borrow_books ? "error" : "primary"}
                        label={`${activeCount}/${borrowConfig.max_borrow_books}`}
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(activeCount / borrowConfig.max_borrow_books) * 100}
                      color={activeCount >= borrowConfig.max_borrow_books ? "error" : "primary"}
                      sx={{ borderRadius: "2px", height: 6, bgcolor: "action.hover" }}
                    />
                    {overdueCount > 0 ? (
                      <>
                        <Alert severity="error" sx={{ py: 0.5, borderRadius: "4px" }}>
                          <WarningIcon fontSize="small" sx={{ mr: 0.5 }} />
                          Có {overdueCount} cuốn sách quá hạn
                        </Alert>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setOverdueGuideOpen(true)}
                          sx={{ textTransform: "none", fontWeight: 600, borderRadius: "4px" }}
                        >
                          Xem hướng dẫn xử lý
                        </Button>
                      </>
                    ) : null}
                    <Typography variant="body2" color={remaining > 0 ? "text.secondary" : "error"} sx={{ fontWeight: 600 }}>
                      {remaining > 0 ? `Được phép mượn thêm ${remaining} cuốn` : "Đã đạt giới hạn số lượng mượn"}
                    </Typography>
                  </Stack>
                  <Divider />
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    endIcon={<ArrowForwardIcon />}
                    disabled={!canBorrow}
                    onClick={() => setCurrentStep(1)}
                    sx={{
                      borderRadius: "4px",
                      fontWeight: 700,
                      textTransform: "none",
                      py: 1.4,
                    }}
                  >
                    {canBorrow ? "Tiếp tục: Quét mã vạch sách" : overdueCount > 0 ? "Cần trả sách quá hạn" : "Đã đạt giới hạn mượn"}
                  </Button>
                </Stack>
              </Box>
            </DashboardCard>
          </Box>
        ) : (
          <Box sx={staggerSx(2)}>
            <DashboardCard>
              <Stack spacing={1.5} sx={{ alignItems: "center", color: "text.secondary", minHeight: 200, justifyContent: "center" }}>
                <BadgeIcon sx={{ fontSize: 56, opacity: 0.2 }} />
                <Typography variant="body1" sx={{ fontWeight: 700, textAlign: "center" }}>
                  Nhập MSSV hoặc quét khuôn mặt<br />để xác minh độc giả
                </Typography>
              </Stack>
            </DashboardCard>
          </Box>
        )}
      </Grid>

      {/* Right Column: Face Camera Feed */}
      <Grid size={{ xs: 12, md: 7, lg: 8 }} sx={{ display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", minHeight: 0 }}>
        <Box sx={staggerSx(1)}>
          <DashboardCard title="Camera nhận diện khuôn mặt" actions={<VideocamIcon color="primary" />} noPadding>
            <Box
              sx={{
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "4px",
                overflow: "hidden",
                position: "relative",
                minHeight: 400,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {cameraError ? (
                <Stack spacing={1.5} sx={{ alignItems: "center", justifyContent: "center", height: "100%", color: "grey.300", p: 3 }}>
                  <VideocamIcon sx={{ fontSize: 48, color: "error.main" }} />
                  <Typography sx={{ textAlign: "center", color: "text.primary" }}>{cameraError}</Typography>
                  <Button size="small" variant="outlined" color="primary" onClick={startWebcam}>
                    Thử lại
                  </Button>
                </Stack>
              ) : !cameraStarted ? (
                <Stack spacing={2} sx={{ alignItems: "center", justifyContent: "center", p: 4, textAlign: "center" }}>
                  <Box
                    sx={{
                      width: 68,
                      height: 68,
                      borderRadius: "50%",
                      bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <VideocamIcon sx={{ fontSize: 36, color: "text.secondary" }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Camera xác minh đang ở chế độ chờ
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 340 }}>
                      Bấm nút bên dưới hoặc nhập MSSV để bật camera nhận diện độc giả
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="medium"
                    startIcon={<VideocamIcon />}
                    onClick={startWebcam}
                    sx={{
                      borderRadius: "4px",
                      textTransform: "none",
                      fontWeight: 700,
                      px: 3,
                    }}
                  >
                    Mở camera
                  </Button>
                </Stack>
              ) : (
                <>
                  <video
                    ref={videoRef as any}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", transform: "scaleX(-1)" }}
                  />
                  {cameraLoading && !cameraReady ? (
                    <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.65)", color: "common.white", alignItems: "center", justifyContent: "center" }} spacing={1.5}>
                      <CircularProgress size={32} color="inherit" />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Đang kết nối camera...</Typography>
                    </Stack>
                  ) : null}
                  {faceScanning && cameraReady ? (
                    <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.65)", color: "common.white", alignItems: "center", justifyContent: "center" }} spacing={1.5}>
                      <CircularProgress size={32} color="inherit" />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Đang xác minh khuôn mặt...</Typography>
                    </Stack>
                  ) : null}
                  <Stack direction="row" spacing={1} sx={{ position: "absolute", bottom: 12, left: 12, right: 12, justifyContent: "center" }}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<FaceIcon />}
                      onClick={handleFaceVerify}
                      disabled={!cameraReady || faceScanning || !patronCode.trim()}
                      sx={{ display: cameraReady ? undefined : "none", minWidth: 200, borderRadius: "4px", fontWeight: 700, textTransform: "none" }}
                    >
                      {faceScanning ? "Đang xác minh..." : "Xác minh khuôn mặt"}
                    </Button>
                  </Stack>
                </>
              )}
            </Box>
          </DashboardCard>
        </Box>
      </Grid>
    </Grid>
  );
}
