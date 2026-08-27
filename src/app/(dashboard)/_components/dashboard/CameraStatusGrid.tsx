"use client";

import { Avatar, Box, Chip, Paper, Stack, Typography, useTheme } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import CameraIcon from "@mui/icons-material/PhotoCameraOutlined";
import VideocamIcon from "@mui/icons-material/VideocamOutlined";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import type { CameraStatus } from "@/lib/types";

interface CameraStatusGridProps {
  cameras: CameraStatus[];
  loading: boolean;
}

function cameraLabel(id: string) {
  if (id === "entry_gate") return "Cổng vào chính";
  if (id === "exit_gate") return "Cổng ra chính";
  if (id === "kiosk") return "Kiosk Tự phục vụ";
  return id;
}

function cameraRoleDescription(id: string) {
  if (id === "entry_gate") return "Nhận diện khuôn mặt & Check-in";
  if (id === "exit_gate") return "Nhận diện khuôn mặt & Check-out";
  if (id === "kiosk") return "Xác thực mượn/trả tự động";
  return "Camera giám sát";
}

export default function CameraStatusGrid({ cameras, loading }: CameraStatusGridProps) {
  const theme = useTheme();
  const onlineCount = cameras.filter((c) => c.connected && c.running).length;

  return (
    <DashboardCard
      title="Hệ thống Camera"
      subtitle={`${onlineCount}/${cameras.length} thiết bị đang hoạt động`}
      actions={
        <Chip
          label={`${onlineCount}/${cameras.length} Online`}
          size="small"
          color={onlineCount === cameras.length && cameras.length > 0 ? "success" : "warning"}
          sx={{ fontWeight: 700, fontSize: "0.75rem" }}
        />
      }
    >
      {cameras.length === 0 ? (
        <EmptyState
          icon={<CameraIcon sx={{ fontSize: 40, color: "text.disabled" }} />}
          title="Không tìm thấy camera nào"
        />
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2, pt: 0.5 }}>
          {cameras.map((cam) => {
            const isOnline = cam.connected && cam.running;
            return (
              <Paper
                key={cam.camera_id}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  bgcolor: theme.palette.mode === "dark" ? "rgba(30, 41, 59, 0.5)" : "rgba(248, 250, 252, 0.8)",
                  borderColor: isOnline
                    ? theme.palette.mode === "dark"
                      ? "rgba(16, 185, 129, 0.3)"
                      : "rgba(16, 185, 129, 0.4)"
                    : "rgba(239, 68, 68, 0.3)",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: isOnline
                      ? "0 8px 20px -4px rgba(16, 185, 129, 0.15)"
                      : "0 8px 20px -4px rgba(239, 68, 68, 0.15)",
                  },
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                  <Box sx={{ position: "relative" }}>
                    <Avatar
                      sx={{
                        background: isOnline
                          ? "linear-gradient(135deg, #10b981 0%, #047857 100%)"
                          : "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                        width: 42,
                        height: 42,
                        borderRadius: 2,
                        boxShadow: isOnline
                          ? "0 4px 12px rgba(16, 185, 129, 0.35)"
                          : "0 4px 12px rgba(239, 68, 68, 0.35)",
                      }}
                    >
                      <VideocamIcon sx={{ fontSize: 22, color: "#fff" }} />
                    </Avatar>
                    {isOnline && (
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: -2,
                          right: -2,
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          bgcolor: "#10b981",
                          border: "2px solid",
                          borderColor: "background.paper",
                          "&::after": {
                            content: '""',
                            position: "absolute",
                            top: -2,
                            left: -2,
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            animation: "pulseRing 2s infinite ease-out",
                            border: "2px solid #10b981",
                          },
                          "@keyframes pulseRing": {
                            "0%": { transform: "scale(0.8)", opacity: 1 },
                            "100%": { transform: "scale(2.4)", opacity: 0 },
                          },
                        }}
                      />
                    )}
                  </Box>

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }} noWrap>
                        {cameraLabel(cam.camera_id)}
                      </Typography>
                      <Chip
                        size="small"
                        icon={isOnline ? <CheckCircleIcon sx={{ fontSize: "12px !important" }} /> : <ErrorOutlineIcon sx={{ fontSize: "12px !important" }} />}
                        label={isOnline ? "Trực tiếp" : "Mất kết nối"}
                        sx={{
                          height: 20,
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          bgcolor: isOnline ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                          color: isOnline ? "#059669" : "#dc2626",
                          border: "1px solid",
                          borderColor: isOnline ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)",
                        }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, fontSize: "0.72rem" }}>
                      {cameraRoleDescription(cam.camera_id)}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            );
          })}
        </Box>
      )}
    </DashboardCard>
  );
}

