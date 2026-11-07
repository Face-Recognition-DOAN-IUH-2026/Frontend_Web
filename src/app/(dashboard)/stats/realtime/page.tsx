"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import CameraIcon from "@mui/icons-material/PhotoCameraOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import PeopleIcon from "@mui/icons-material/HowToRegOutlined";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";
import SettingsInputAntennaIcon from "@mui/icons-material/SettingsInputAntennaOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type { CameraStatus, ActivePatron } from "@/lib/types";
import { StatCard, SectionLayout, TabNavigation, KpiGrid, type KpiCardProps } from "../_components";

const tabs = [
  { label: "Tổng quan", href: "/stats" },
  { label: "Tài chính", href: "/stats/finance" },
  { label: "Kho sách", href: "/stats/inventory" },
  { label: "Nhận diện", href: "/stats/recognition" },
  { label: "Real-time", href: "/stats/realtime" },
];

export default function RealtimePage() {
  const theme = useTheme();
  const [cameraStatuses, setCameraStatuses] = useState<CameraStatus[]>([]);
  const [activePatrons, setActivePatrons] = useState<ActivePatron[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [camerasRes, patronsRes] = await Promise.allSettled([
        api.getCameraStatus(),
        api.getActivePatrons(),
      ]);
      if (camerasRes.status === "fulfilled") setCameraStatuses(camerasRes.value);
      if (patronsRes.status === "fulfilled") setActivePatrons(patronsRes.value.items);
    } catch (err: any) {
      setError(getErrorMessage(err) || "Lỗi tải dữ liệu real-time");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const onlineCameras = cameraStatuses.filter((c) => c.connected).length;
  const totalCameras = cameraStatuses.length;

  const kpiCards: KpiCardProps[] = [
    {
      label: "Camera hoạt động",
      value: `${onlineCameras}/${totalCameras}`,
      icon: <CameraIcon />,
      gradient: onlineCameras === totalCameras
        ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
        : onlineCameras > 0
        ? "linear-gradient(135deg, #D4AF37 0%, #B89628 100%)"
        : "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)",
      delta: onlineCameras === totalCameras ? "Tất cả online" : `${totalCameras - onlineCameras} offline`,
      deltaColor: onlineCameras === totalCameras ? "success" : onlineCameras > 0 ? "warning" : "error",
    },
    {
      label: "Độc giả đang có mặt",
      value: activePatrons.length,
      icon: <PeopleIcon />,
      gradient: "linear-gradient(135deg, #0A2540 0%, #0F3C5C 100%)",
      delta: "Đang trong thư viện",
      deltaColor: "default" as const,
    },
    {
      label: "Trạng thái kết nối",
      value: onlineCameras === totalCameras ? "Ổn định" : "Có vấn đề",
      icon: <SettingsInputAntennaIcon />,
      gradient: onlineCameras === totalCameras
        ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
        : "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)",
      delta: "Auto refresh 30s",
      deltaColor: onlineCameras === totalCameras ? "success" : "error",
    },
    {
      label: "Cập nhật gần nhất",
      value: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      icon: <RefreshIcon />,
      gradient: "linear-gradient(135deg, #8B0000 0%, #700000 100%)",
      delta: "Tự động làm mới",
      deltaColor: "default" as const,
    },
  ];

  return (
    <Stack spacing={3} >
      <TabNavigation tabs={tabs} />

      <SectionLayout
        title="Real-time: Camera & Hiện diện"
        subtitle="Trạng thái camera, độc giả đang có mặt - Tự động cập nhật mỗi 30 giây"
        icon={<CameraIcon />}
        actions={
          <Button size="small" startIcon={<RefreshIcon />} onClick={fetchData} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : "Làm mới ngay"}
          </Button>
        }
        kpiCards={<KpiGrid cards={kpiCards} />}
      >
        {loading && (
          <Chip variant="outlined" label="Đang tải dữ liệu..." icon={<CircularProgress size={16} />} color="info" />
        )}

        {error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" startIcon={<RefreshIcon />} onClick={fetchData}>
                Thử lại
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
              Trạng thái Camera ({onlineCameras}/{totalCameras} online)
            </Typography>
            {cameraStatuses.length === 0 ? (
              <Alert severity="info">Không có camera nào được cấu hình</Alert>
            ) : (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, gap: 2 }}>
                {cameraStatuses.map((cam, idx) => {
                  const isOnline = cam.connected && cam.running;
                  const hasError = cam.last_error && !isOnline;
                  return (
                    <Box
                      key={cam.camera_id}
                      sx={{
                        borderRadius: 3,
                        overflow: "hidden",
                        border: `2px solid ${isOnline ? "success.main" : "error.main"}`,
                        transition: "transform 0.2s, box-shadow 0.2s",
                        "&:hover": { transform: "translateY(-2px)", boxShadow: 4 },
                      }}
                    >
                      <Box sx={{ p: 2, bgcolor: isOnline ? "success.50" : "error.50" }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: "50%",
                              background: isOnline ? "success.main" : "error.main",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            }}
                          >
                            <CameraIcon sx={{ fontSize: 22, color: "white" }} />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {cam.camera_id === "entry_gate" ? "Cổng vào" : cam.camera_id === "exit_gate" ? "Cổng ra" : "Kiosk"}
                            </Typography>
                            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                              {isOnline ? (
                                <CheckCircleIcon sx={{ fontSize: 14, color: "success.main" }} />
                              ) : (
                                <ErrorOutlineIcon sx={{ fontSize: 14, color: "error.main" }} />
                              )}
                              <Typography variant="caption" color={isOnline ? "success.main" : "error.main"} sx={{ fontWeight: 600 }}>
                                {isOnline ? "Online" : "Offline"}
                              </Typography>
                            </Stack>
                          </Box>
                        </Stack>

                        <Stack spacing={1}>
                          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                            <Typography variant="caption" color="text.secondary">Khung hình xử lý</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
                              {cam.frames_processed.toLocaleString("vi-VN")}
                            </Typography>
                          </Stack>
                          {cam.last_frame_time ? (
                            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                              <Typography variant="caption" color="text.secondary">Khung cuối</Typography>
                              <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                                {new Date(cam.last_frame_time).toLocaleTimeString("vi-VN")}
                              </Typography>
                            </Stack>
                          ) : null}
                          {cam.retry_count > 0 ? (
                            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                              <Typography variant="caption" color="text.secondary">Số lần retry</Typography>
                              <Chip size="small" label={cam.retry_count} color="warning" sx={{ height: 20, fontSize: "0.7rem" }} />
                            </Stack>
                          ) : null}
                          {cam.last_error && !isOnline ? (
                            <Typography variant="caption" color="error.main" sx={{ mt: 0.5, lineHeight: 1.3 }}>
                              {cam.last_error}
                            </Typography>
                          ) : null}
                        </Stack>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
              Độc giả đang có mặt ({activePatrons.length})
            </Typography>
            {activePatrons.length === 0 ? (
              <Alert severity="info">Không có độc giả nào trong thư viện</Alert>
            ) : (
              <Stack spacing={1} sx={{ maxHeight: 500, overflowY: "auto" }}>
                {activePatrons.slice(0, 30).map((p, idx) => (
                  <Box
                    key={p.id}
                    sx={{
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      p: 1.5,
                      transition: "background 0.15s",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontWeight: 900,
                            fontSize: 14,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                          }}
                        >
                          {p.full_name?.charAt(0) || "?"}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.85rem" }} noWrap>
                            {p.full_name || "Không rõ tên"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                            {p.student_code || "---"}
                          </Typography>
                        </Box>
                      </Stack>
                      <Box sx={{ textAlign: "right", minWidth: 120 }}>
                        <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                          {new Date(p.entered_at).toLocaleTimeString("vi-VN")}
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", justifyContent: "flex-end" }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                            {p.camera_id === "entry_gate" ? "Cổng vào" : p.camera_id === "exit_gate" ? "Cổng ra" : "Kiosk"}
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Box>
      </SectionLayout>
    </Stack>
  );
}