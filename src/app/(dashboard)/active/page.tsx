"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useToast } from "@/lib/toast-context";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import DoorFrontOutlinedIcon from "@mui/icons-material/DoorFrontOutlined";
import ExitToAppOutlinedIcon from "@mui/icons-material/ExitToAppOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import TerminalOutlinedIcon from "@mui/icons-material/TerminalOutlined";
import UserCheckIcon from "@mui/icons-material/HowToRegOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import PeopleIcon from "@mui/icons-material/PeopleOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import { usePermission, getPermissionDeniedReason } from "@/lib/permission-context";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import MuiStatCard from "@/app/(dashboard)/_components/ui/MuiStatCard";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import AvatarUser from "@/app/(dashboard)/_components/ui/AvatarUser";
import type { ActivePatron, CameraEvent } from "@/lib/types";

const ACTIVE_CAMERA_IDS = new Set(["entry_gate", "exit_gate", "kiosk"]);

const CAMERA_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  entry_gate: { label: "Cổng vào", icon: DoorFrontOutlinedIcon },
  exit_gate: { label: "Cổng ra", icon: ExitToAppOutlinedIcon },
  kiosk: { label: "Kiosk", icon: TerminalOutlinedIcon },
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDuration(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return { text: "Vừa vào", level: 0 as const };
  if (minutes < 60) return { text: `${minutes} phút`, level: 1 as const };
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 2) return { text: rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`, level: 2 as const };
  return { text: rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`, level: 3 as const };
}

const DURATION_ACCENT: Record<number, string> = {
  0: "#4A8C5C",
  1: "#4A8C5C",
  2: "#C49A3C",
  3: "#B85C4A",
};

function initials(name?: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

export default function ActivePage() {
  const { can } = usePermission();
  const canUpdate = can("borrows", "update");
  const { toast } = useToast();
  const [patrons, setPatrons] = useState<ActivePatron[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [exitPatron, setExitPatron] = useState<ActivePatron | null>(null);
  const [exiting, setExiting] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const hasLoadedRef = useRef(false);
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getActivePatrons();
      const allowed = data.items
        .filter((p) => ACTIVE_CAMERA_IDS.has(p.camera_id))
        .sort((a, b) => new Date(b.entered_at).getTime() - new Date(a.entered_at).getTime());
      setPatrons(allowed);
      setLastUpdate(new Date());
      hasLoadedRef.current = true;
    } catch {
      setError("Không thể tải danh sách độc giả.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSSEEvent = useCallback((event: CameraEvent) => {
    if (!event.access_type || !event.patron_id) return;
    if (!ACTIVE_CAMERA_IDS.has(event.camera_id)) return;

    if (event.access_type === "entry" && event.status === "granted") {
      setPatrons((prev) => {
        if (prev.some((p) => p.id === event.patron_id)) return prev;
        const newPatron: ActivePatron = {
          id: event.patron_id!,
          full_name: event.full_name || event.student_code || "",
          student_code: event.student_code || "",
          entered_at: new Date().toISOString(),
          camera_id: event.camera_id,
          image_url: null,
          confidence: event.score ?? null,
        };
        return [newPatron, ...prev];
      });
      setLastUpdate(new Date());
    } else if (event.access_type === "exit" && event.status === "granted") {
      setPatrons((prev) => prev.filter((p) => p.id !== event.patron_id));
      setLastUpdate(new Date());
    }
  }, []);

  const startFallbackPolling = useCallback(() => {
    if (fallbackRef.current) clearInterval(fallbackRef.current);
    fallbackRef.current = setInterval(() => {
      if (!hasLoadedRef.current) return;
      load();
    }, 60000);
  }, [load]);

  const stopFallbackPolling = useCallback(() => {
    if (fallbackRef.current) {
      clearInterval(fallbackRef.current);
      fallbackRef.current = null;
    }
  }, []);

  useEffect(() => {
    load();

    const cleanup = api.connectAccessSSE(handleSSEEvent, (connected) => {
      setSseConnected(connected);
      if (connected) {
        stopFallbackPolling();
      } else {
        startFallbackPolling();
      }
    });

    startFallbackPolling();

    return () => {
      cleanup();
      stopFallbackPolling();
    };
  }, [handleSSEEvent, load, startFallbackPolling, stopFallbackPolling]);

  const q = normalizeQuery(search);
  const filtered = useMemo(() => {
    if (!q) return patrons;
    return patrons.filter((p) =>
      p.full_name.toLowerCase().includes(q) || p.student_code.toLowerCase().includes(q)
    );
  }, [patrons, search]);

  const stalePatrons = useMemo(() => {
    const now = Date.now();
    return patrons.filter((p) => {
      const hours = (now - new Date(p.entered_at).getTime()) / (1000 * 60 * 60);
      return hours > 8;
    });
  }, [patrons]);

  // Chỉ số phục vụ nguyên tắc 5 giây
  const LIBRARY_CAPACITY = 200; // Sức chứa tối đa phòng đọc
  const activeCount = patrons.length;
  const occupancyPct = Math.min(100, Math.round((activeCount / LIBRARY_CAPACITY) * 100));

  const avgDurationMinutes = useMemo(() => {
    if (patrons.length === 0) return 0;
    const now = Date.now();
    const totalMinutes = patrons.reduce((acc, p) => {
      const diffMs = now - new Date(p.entered_at).getTime();
      return acc + Math.max(0, Math.floor(diffMs / 60000));
    }, 0);
    return Math.round(totalMinutes / patrons.length);
  }, [patrons]);

  const avgDurationText = useMemo(() => {
    if (avgDurationMinutes < 1) return "< 1 phút";
    if (avgDurationMinutes < 60) return `${avgDurationMinutes} phút`;
    const h = Math.floor(avgDurationMinutes / 60);
    const m = avgDurationMinutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h} giờ`;
  }, [avgDurationMinutes]);

  const handleForceExit = async () => {
    if (!exitPatron) return;
    setExiting(true);
    try {
      await api.forceExitPatron(exitPatron.id);
      toast.success(`Đã đánh dấu ${exitPatron.full_name || exitPatron.student_code} đã ra`);
      setExitPatron(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err) || "Lỗi khi đánh dấu ra");
    } finally {
      setExiting(false);
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Độc giả đang có mặt"
        subtitle="Giám sát phòng đọc thời gian thực qua hệ thống camera AI & cổng kiểm soát"
        icon={PeopleIcon}
        statBadges={`${patrons.length} độc giả đang ở trong thư viện — cập nhật ${lastUpdate.toLocaleTimeString("vi-VN")}`}
        onRefresh={load}
        actions={
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: error ? "error.main" : sseConnected ? "#6ee7b7" : "#fcd34d", animation: sseConnected ? "pulse 2s ease-in-out infinite" : undefined }} />
              <Typography variant="caption" color="text.secondary">
                {error ? "Lỗi" : sseConnected ? "Live" : "Polling"}
              </Typography>
            </Stack>
          </Stack>
        }
      />

      {/* Dãy KPI chuẩn 5 giây */}
      <Grid container spacing={2}>
        {/* Card 1: Góc trên bên trái - Chỉ số cốt lõi nhất */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <MuiStatCard
            label="Đang trong phòng đọc"
            value={activeCount}
            icon={UserCheckIcon}
            gradient="linear-gradient(135deg, #0A2540 0%, #0F3C5C 100%)"
            pct={occupancyPct}
            delta={`${occupancyPct}% sức chứa (${activeCount}/${LIBRARY_CAPACITY} chỗ)`}
            deltaColor={occupancyPct >= 90 ? "error" : occupancyPct >= 75 ? "warning" : "default"}
            index={0}
          />
        </Grid>

        {/* Card 2: Cảnh báo lưu lại quá 8 giờ (Tô màu có mục đích) */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <MuiStatCard
            label="Lưu lại quá 8 giờ"
            value={stalePatrons.length}
            icon={WarningAmberOutlinedIcon}
            gradient={stalePatrons.length > 0 ? "linear-gradient(135deg, #8B0000 0%, #700000 100%)" : "linear-gradient(135deg, #475569 0%, #334155 100%)"}
            pct={activeCount > 0 ? Math.round((stalePatrons.length / activeCount) * 100) : 0}
            delta={stalePatrons.length > 0 ? "⚠ Nghi vấn quên check-out, cần xử lý" : "✓ 0 độc giả quá thời gian quy định"}
            deltaColor={stalePatrons.length > 0 ? "error" : "success"}
            index={1}
          />
        </Grid>

        {/* Card 3: Thời gian lưu lại trung bình */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <MuiStatCard
            label="Thời gian lưu lại TB"
            value={avgDurationText}
            icon={AccessTimeOutlinedIcon}
            gradient="linear-gradient(135deg, #D4AF37 0%, #B89628 100%)"
            delta={activeCount > 0 ? `Tính trên ${activeCount} độc giả hiện diện` : "Chưa có lượt vào"}
            deltaColor="default"
            index={2}
          />
        </Grid>
      </Grid>

      {stalePatrons.length > 0 ? (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {stalePatrons.length} độc giả ở trong thư viện quá 8 giờ
          </Typography>
          <Typography variant="body2">
            Có thể gate không detect exit. Kiểm tra và sử dụng nút &ldquo;Đánh dấu đã ra&rdquo; nếu cần.
          </Typography>
        </Alert>
      ) : null}

      <DashboardCard
        title="Độc giả"
        subtitle={`${filtered.length} kết quả`}
        actions={
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc MSSV..."
            size="small"
            sx={{ width: { xs: "100%", sm: 320 }, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "background.paper", "&:hover": { "& fieldset": { borderColor: "primary.main" } } } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlinedIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        }
      >
        <LoadingOverlay loading={loading && patrons.length === 0} message="Đang tải...">
          {patrons.length === 0 && !loading ? (
            <EmptyState
              icon={<Box sx={{ width: 64, height: 64, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.04)", color: "text.disabled", mb: 1 }}><MenuBookOutlinedIcon sx={{ fontSize: 32 }} /></Box>}
              title="Thư viện đang yên tĩnh"
              description="Chưa có độc giả nào trong thư viện. Danh sách sẽ tự động cập nhật khi có lượt vào hợp lệ."
            />
          ) : filtered.length === 0 && patrons.length > 0 ? (
            <EmptyState
              icon={<SearchOutlinedIcon sx={{ fontSize: 36, color: "text.disabled" }} />}
              title={`Không tìm thấy độc giả "${search}"`}
            />
          ) : (
            <Grid container spacing={1.5}>
              {filtered.map((patron, idx) => {
                const dur = getDuration(patron.entered_at);
                const accent = DURATION_ACCENT[dur.level];
                const percent = patron.confidence == null ? null : Math.round(patron.confidence * 100);
                const avatarGradient =
                  dur.level <= 1
                    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    : dur.level === 2
                      ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                      : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
                return (
                  <Grid key={patron.id} size={{ xs: 12, xl: 6 }} sx={staggerSx(idx, 0.05)}>
                    <Box
                      sx={{
                        borderRadius: 2,
                        overflow: "hidden",
                        position: "relative",
                        border: "1px solid",
                        borderColor: "divider",
                        transition: "transform 0.2s, box-shadow 0.2s",
                        "&:hover": {
                          transform: "translateY(-1px)",
                          boxShadow: 4,
                        },
                      }}
                    >
                      <Box
                        sx={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 3,
                          bgcolor: accent,
                          opacity: 0.7,
                        }}
                      />

                      <Box sx={{ pl: 2.5, pr: 2, py: 1.5 }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                          <AvatarUser user={patron} role="patron" size={36} />
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ justifyContent: "space-between", alignItems: "flex-start" }}
                            >
                              <Box sx={{ minWidth: 0 }}>
                                <Typography noWrap sx={{ fontWeight: 700, fontSize: 14 }}>
                                  {patron.full_name || "Chưa có tên"}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ fontFamily: "monospace", fontSize: 12 }}
                                >
                                  {patron.student_code}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexShrink: 0 }}>
                                {percent != null ? (
                                  <Tooltip title={`Độ chính xác: ${percent}%`}>
                                    <Box
                                      sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        bgcolor:
                                          percent >= 80 ? "success.main" : percent >= 60 ? "warning.main" : "error.main",
                                      }}
                                    />
                                  </Tooltip>
                                ) : null}
                                <Box
                                  sx={{
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: 0.75,
                                    bgcolor:
                                      dur.level <= 1
                                        ? "rgba(74,140,92,0.1)"
                                        : dur.level === 2
                                          ? "rgba(196,154,60,0.1)"
                                          : "rgba(184,92,74,0.1)",
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{ fontWeight: 700, fontSize: 11, color: accent, whiteSpace: "nowrap" }}
                                  >
                                    {dur.text}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Stack>

                            <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: "wrap", rowGap: 0.5 }}>
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                                <AccessTimeOutlinedIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                                  {formatTime(patron.entered_at)}
                                </Typography>
                              </Stack>
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                                <LocationOnOutlinedIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                                  {CAMERA_CONFIG[patron.camera_id]?.label || patron.camera_id}
                                </Typography>
                              </Stack>
                            </Stack>
                          </Box>
                          <Tooltip title={!canUpdate ? getPermissionDeniedReason("borrows", "update") : "Đánh dấu đã ra"}>
                            <span>
                              <IconButton
                                size="small"
                                color="warning"
                                disabled={!canUpdate}
                                onClick={() => {
                                  if (!canUpdate) return;
                                  setExitPatron(patron);
                                }}
                                sx={{ flexShrink: 0, mt: 0.5 }}
                              >
                                <LogoutIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </LoadingOverlay>
      </DashboardCard>

      <Dialog open={!!exitPatron} onClose={() => exiting ? undefined : setExitPatron(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Xác nhận đánh dấu đã ra?</DialogTitle>
        <DialogContent>
          <Typography>
            Độc giả <strong>{exitPatron?.full_name || exitPatron?.student_code}</strong> sẽ được đánh dấu đã rời khỏi thư viện.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Dùng khi gate không detect được exit.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExitPatron(null)} disabled={exiting}>Hủy</Button>
          <Button variant="contained" color="warning" onClick={handleForceExit} disabled={exiting}>
            {exiting ? "Đang xử lý..." : "Đánh dấu đã ra"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
