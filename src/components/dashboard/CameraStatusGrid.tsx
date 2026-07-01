"use client";

import { Avatar, Box, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import CameraIcon from "@mui/icons-material/PhotoCameraOutlined";
import DashboardCard from "@/components/ui/DashboardCard";
import EmptyState from "@/components/ui/EmptyState";
import type { CameraStatus } from "@/lib/types";

interface CameraStatusGridProps {
  cameras: CameraStatus[];
  loading: boolean;
}

function cameraLabel(id: string) {
  if (id === "entry_gate") return "Cổng vào";
  if (id === "exit_gate") return "Cổng ra";
  if (id === "kiosk") return "Kiosk";
  return id;
}

export default function CameraStatusGrid({ cameras, loading }: CameraStatusGridProps) {
  const onlineCount = cameras.filter((c) => c.connected && c.running).length;

  return (
    <DashboardCard
      title="Camera"
      subtitle={`${onlineCount}/${cameras.length} online`}
    >
      {cameras.length === 0 ? (
        <EmptyState
          icon={<CameraIcon sx={{ fontSize: 40, color: "text.disabled" }} />}
          title="Không có camera nào"
        />
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1.5 }}>
          {cameras.map((cam) => {
            const isOnline = cam.connected && cam.running;
            return (
              <Stack
                key={cam.camera_id}
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: "center",
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: isOnline ? "success.main" : "error.main",
                  borderWidth: isOnline ? 1 : 2,
                }}
              >
                <Avatar sx={{ bgcolor: isOnline ? "#10b981" : "#ef4444", width: 36, height: 36 }}>
                  <CameraIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                    {cameraLabel(cam.camera_id)}
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                    {isOnline ? (
                      <CheckCircleIcon sx={{ fontSize: 12, color: "success.main" }} />
                    ) : (
                      <ErrorOutlineIcon sx={{ fontSize: 12, color: "error.main" }} />
                    )}
                    <Typography variant="caption" color={isOnline ? "success.main" : "error.main"} sx={{ fontWeight: 600 }}>
                      {isOnline ? "Online" : "Offline"}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            );
          })}
        </Box>
      )}
    </DashboardCard>
  );
}
