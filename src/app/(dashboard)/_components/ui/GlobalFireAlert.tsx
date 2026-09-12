"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Slide,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import LocalFireDepartmentOutlinedIcon from "@mui/icons-material/LocalFireDepartmentOutlined";
import EmergencyOutlinedIcon from "@mui/icons-material/EmergencyOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import PhoneInTalkOutlinedIcon from "@mui/icons-material/PhoneInTalkOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import VolumeOffOutlinedIcon from "@mui/icons-material/VolumeOffOutlined";
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import { fireAlertBus, FireAlertEventPayload } from "@/lib/fire-alert-bus";
import { fireAlarmAudio } from "@/lib/fire-alarm-sound";

export default function GlobalFireAlert() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeAlert, setActiveAlert] = useState<FireAlertEventPayload | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hotlineDialogOpen, setHotlineDialogOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = fireAlertBus.subscribe((alert) => {
      setActiveAlert(alert);
      if (alert && alert.active) {
        setIsDismissed(false);
        // Nếu không ở trang /fire-detection, có thể phát còi cảnh báo toàn cục
        if (!isMuted && pathname !== "/fire-detection") {
          fireAlarmAudio.start();
        }
      } else {
        fireAlarmAudio.stop();
      }
    });

    return () => {
      unsubscribe();
      fireAlarmAudio.stop();
    };
  }, [isMuted, pathname]);

  // Nếu đang ở chính trang /fire-detection, trang đó đã có banner và còi riêng, không cần đè banner toàn cục
  if (pathname === "/fire-detection") {
    return null;
  }

  if (!activeAlert || !activeAlert.active || isDismissed) {
    return null;
  }

  const handleMuteToggle = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    fireAlarmAudio.setMuted(nextMute);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    fireAlarmAudio.stop();
  };

  const handleGoToCamera = () => {
    fireAlarmAudio.stop();
    router.push("/fire-detection");
  };

  const isSmokeOnly =
    activeAlert?.hazardType === "smoke" ||
    Boolean(activeAlert && activeAlert.smokeCount > 0 && activeAlert.fireCount === 0);

  const alertBgColor = isSmokeOnly ? "#d97706" : "#dc2626";
  const alertShadowColor = isSmokeOnly ? "rgba(217, 119, 6, 0.55)" : "rgba(220, 38, 38, 0.55)";

  return (
    <>
      <Slide direction="down" in={Boolean(activeAlert && !isDismissed)} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: "fixed",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            width: "calc(100% - 32px)",
            maxWidth: 1080,
            boxShadow: `0 12px 36px ${alertShadowColor}, 0 0 0 2px rgba(255, 255, 255, 0.25)`,
            borderRadius: 3,
            animation: "globalPulse 1.2s infinite ease-in-out",
            "@keyframes globalPulse": {
              "0%": { transform: "translateX(-50%) scale(1)" },
              "50%": { transform: "translateX(-50%) scale(1.012)" },
              "100%": { transform: "translateX(-50%) scale(1)" },
            },
          }}
        >
          <Alert
            severity={isSmokeOnly ? "warning" : "error"}
            variant="filled"
            icon={
              isSmokeOnly ? (
                <WarningAmberOutlinedIcon sx={{ fontSize: 36, animation: "bounce 0.8s infinite alternate" }} />
              ) : (
                <LocalFireDepartmentOutlinedIcon sx={{ fontSize: 36, animation: "bounce 0.8s infinite alternate" }} />
              )
            }
            action={
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Tooltip title={isMuted ? "Bật âm thanh còi báo" : "Tắt âm thanh còi báo"}>
                  <IconButton
                    size="small"
                    onClick={handleMuteToggle}
                    sx={{ color: "white", bgcolor: "rgba(255,255,255,0.18)", "&:hover": { bgcolor: "rgba(255,255,255,0.3)" } }}
                  >
                    {isMuted ? <VolumeOffOutlinedIcon fontSize="small" /> : <VolumeUpOutlinedIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>

                <Button
                  color="inherit"
                  size="small"
                  variant="outlined"
                  startIcon={<PhoneInTalkOutlinedIcon />}
                  onClick={() => setHotlineDialogOpen(true)}
                  sx={{
                    fontWeight: 700,
                    borderColor: "rgba(255,255,255,0.6)",
                    color: "white",
                    display: { xs: "none", sm: "inline-flex" },
                    "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.15)" },
                  }}
                >
                  Hotline PCCC
                </Button>

                <Button
                  color={isSmokeOnly ? "inherit" : "warning"}
                  size="small"
                  variant="contained"
                  startIcon={<VideocamOutlinedIcon />}
                  onClick={handleGoToCamera}
                  sx={{
                    fontWeight: 800,
                    bgcolor: isSmokeOnly ? "#ffffff" : "#fbbf24",
                    color: isSmokeOnly ? "#b45309" : "#78350f",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    "&:hover": { bgcolor: isSmokeOnly ? "#fef3c7" : "#f59e0b" },
                  }}
                >
                  Xem Camera Ngay
                </Button>

                <IconButton size="small" onClick={handleDismiss} sx={{ color: "white" }}>
                  <CloseOutlinedIcon fontSize="small" />
                </IconButton>
              </Stack>
            }
            sx={{
              bgcolor: alertBgColor,
              color: "#ffffff",
              py: 1.5,
              px: 2.5,
              borderRadius: 3,
              alignItems: "center",
              "& .MuiAlert-icon": { alignItems: "center" },
              "& .MuiAlert-message": { width: "100%" },
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: 0.5 }}>
                {isSmokeOnly
                  ? "⚠️ CẢNH BÁO PCCC: PHÁT HIỆN DẤU HIỆU KHÓI BẤT THƯỜNG!"
                  : "🚨 BÁO ĐỘNG KHẨN CẤP: PHÁT HIỆN NGUY CƠ CHÁY NỔ!"}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.95, fontWeight: 500 }}>
                {isSmokeOnly ? (
                  <>
                    Hệ thống AI vừa phát hiện <b>{activeAlert.smokeCount} vùng khói nghi vấn</b> tại khu vực:{" "}
                    <b>{activeAlert.location}</b> ({activeAlert.cameraName}) lúc {activeAlert.timestamp}. Đề nghị nhân viên kiểm tra hiện trường ngay để ngăn ngừa cháy lan!
                  </>
                ) : (
                  <>
                    Hệ thống AI vừa phát hiện <b>{activeAlert.fireCount} điểm cháy</b> tại khu vực:{" "}
                    <b>{activeAlert.location}</b> ({activeAlert.cameraName}) lúc {activeAlert.timestamp}. Đề nghị nhân viên kiểm tra và chuẩn bị phương án sơ tán!
                  </>
                )}
              </Typography>
            </Box>
          </Alert>
        </Box>
      </Slide>

      {/* Dialog Danh bạ khẩn cấp PCCC */}
      <Dialog open={hotlineDialogOpen} onClose={() => setHotlineDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, color: "error.main", fontWeight: 800 }}>
          <EmergencyOutlinedIcon color="error" />
          Hotline Khẩn Cấp PCCC IUH
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Box sx={{ p: 2, bgcolor: "#fee2e2", borderRadius: 2, border: "1px solid #f87171" }}>
              <Typography variant="caption" sx={{ color: "#991b1b", fontWeight: 700, textTransform: "uppercase" }}>
                Cảnh Sát PCCC & Cứu Nạn Cứu Hộ Quốc Gia
              </Typography>
              <Typography variant="h4" sx={{ color: "#b91c1c", fontWeight: 900, my: 0.5 }}>
                114
              </Typography>
              <Typography variant="body2" sx={{ color: "#7f1d1d" }}>
                Gọi ngay khi ngọn lửa lan rộng ngoài tầm kiểm soát ban đầu.
              </Typography>
            </Box>

            <Box sx={{ p: 2, bgcolor: "#f1f5f9", borderRadius: 2, border: "1px solid #cbd5e1" }}>
              <Typography variant="caption" sx={{ color: "#334155", fontWeight: 700, textTransform: "uppercase" }}>
                Đội An Ninh & Bảo Vệ Thư Viện IUH
              </Typography>
              <Typography variant="h6" sx={{ color: "#0f172a", fontWeight: 800, my: 0.5 }}>
                (028) 38940 390 - Ext: 115
              </Typography>
              <Typography variant="body2" sx={{ color: "#475569" }}>
                Trực ban an ninh tòa nhà Thư viện 24/7.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setHotlineDialogOpen(false)} variant="outlined">
            Đóng
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<PhoneInTalkOutlinedIcon />}
            href="tel:114"
          >
            Bấm Gọi 114
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
