"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useTheme,
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
import RefreshIcon from "@mui/icons-material/RefreshOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNewOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import MeetingRoomOutlinedIcon from "@mui/icons-material/MeetingRoomOutlined";
import FilterListIcon from "@mui/icons-material/FilterList";
import api, { getErrorMessage } from "@/lib/api-client";
import { usePermission, getPermissionDeniedReason } from "@/lib/permission-context";
import { fadeInUp } from "@/lib/animations";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import MuiStatCard from "@/app/(dashboard)/_components/ui/MuiStatCard";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import AvatarUser from "@/app/(dashboard)/_components/ui/AvatarUser";
import DataTable, { type DataTableColumn } from "@/app/(dashboard)/_components/ui/DataTable";
import ViewToggle from "@/app/(dashboard)/_components/ui/ViewToggle";
import SearchField from "@/app/(dashboard)/_components/ui/SearchField";
import type { ActivePatron, CameraEvent } from "@/lib/types";

const ACTIVE_CAMERA_IDS = new Set(["entry_gate", "exit_gate", "kiosk"]);

const CAMERA_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  entry_gate: { label: "Cổng vào chính", icon: DoorFrontOutlinedIcon, color: "#10B981" },
  exit_gate: { label: "Cổng ra", icon: ExitToAppOutlinedIcon, color: "#EF4444" },
  kiosk: { label: "Kiosk tự phục vụ", icon: TerminalOutlinedIcon, color: "#3B82F6" },
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatRelativeDuration(value: string): { text: string; minutes: number; level: 0 | 1 | 2 | 3 | 4 } {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return { text: "Vừa vào", minutes, level: 0 };
  if (minutes < 60) return { text: `${minutes} phút`, minutes, level: 1 };
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const timeText = rest ? `${hours}h ${rest}m` : `${hours} giờ`;
  if (hours < 4) return { text: timeText, minutes, level: 2 };
  if (hours < 8) return { text: timeText, minutes, level: 3 };
  return { text: `${timeText} (Quá 8h)`, minutes, level: 4 };
}

const DURATION_CONFIG = {
  0: { color: "#10B981", bg: "rgba(16, 185, 129, 0.12)", label: "Vừa vào" },
  1: { color: "#10B981", bg: "rgba(16, 185, 129, 0.12)", label: "< 1 giờ" },
  2: { color: "#3B82F6", bg: "rgba(59, 130, 246, 0.12)", label: "1 - 4 giờ" },
  3: { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.12)", label: "4 - 8 giờ" },
  4: { color: "#EF4444", bg: "rgba(239, 68, 68, 0.15)", label: "> 8 giờ (Cảnh báo)" },
};

type DurationFilter = "all" | "under_1h" | "1_to_4h" | "4_to_8h" | "over_8h";
type SortOption = "newest" | "oldest" | "name_asc";

export default function ActivePage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { can } = usePermission();
  const canUpdate = can("borrows", "update") || can("patrons", "update");
  const { toast } = useToast();

  const [patrons, setPatrons] = useState<ActivePatron[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [exitPatron, setExitPatron] = useState<ActivePatron | null>(null);
  const [exiting, setExiting] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Bộ lọc nâng cao
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("all");
  const [cameraFilter, setCameraFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Bảng Table Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const hasLoadedRef = useRef(false);
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getActivePatrons();
      const rawList = data.items || [];
      const allowed = rawList
        .filter((p) => !p.camera_id || ACTIVE_CAMERA_IDS.has(p.camera_id) || true)
        .sort((a, b) => new Date(b.entered_at).getTime() - new Date(a.entered_at).getTime());
      setPatrons(allowed);
      setLastUpdate(new Date());
      hasLoadedRef.current = true;
    } catch (err) {
      setError("Không thể tải danh sách độc giả đang có mặt.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSSEEvent = useCallback((event: CameraEvent) => {
    if (!event.access_type || !event.patron_id) return;
    if (event.camera_id && !ACTIVE_CAMERA_IDS.has(event.camera_id)) return;

    if (event.access_type === "entry" && event.status === "granted") {
      setPatrons((prev) => {
        if (prev.some((p) => p.id === event.patron_id)) return prev;
        const newPatron: ActivePatron = {
          id: event.patron_id!,
          full_name: event.full_name || event.student_code || "Độc giả mới",
          student_code: event.student_code || "",
          entered_at: new Date().toISOString(),
          camera_id: event.camera_id || "entry_gate",
          image_url: null,
          confidence: event.score ?? null,
        };
        toast.info(`Độc giả ${newPatron.full_name} (${newPatron.student_code}) vừa vào thư viện`);
        return [newPatron, ...prev];
      });
      setLastUpdate(new Date());
    } else if (event.access_type === "exit" && event.status === "granted") {
      setPatrons((prev) => {
        const found = prev.find((p) => p.id === event.patron_id);
        if (found) {
          toast.info(`Độc giả ${found.full_name} đã rời thư viện`);
        }
        return prev.filter((p) => p.id !== event.patron_id);
      });
      setLastUpdate(new Date());
    }
  }, [toast]);

  const startFallbackPolling = useCallback(() => {
    if (fallbackRef.current) clearInterval(fallbackRef.current);
    fallbackRef.current = setInterval(() => {
      if (!hasLoadedRef.current) return;
      load();
    }, 45000);
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

  // Thống kê nhanh
  const LIBRARY_CAPACITY = 200;
  const activeCount = patrons.length;
  const occupancyPct = Math.min(100, Math.round((activeCount / LIBRARY_CAPACITY) * 100));
  const remainingSeats = Math.max(0, LIBRARY_CAPACITY - activeCount);

  const stalePatrons = useMemo(() => {
    const now = Date.now();
    return patrons.filter((p) => {
      const hours = (now - new Date(p.entered_at).getTime()) / (1000 * 60 * 60);
      return hours >= 8;
    });
  }, [patrons]);

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

  // Danh sách đã lọc và sắp xếp
  const filteredAndSortedPatrons = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();

    const result = patrons.filter((p) => {
      // 1. Tìm kiếm
      if (q) {
        const matchesName = (p.full_name || "").toLowerCase().includes(q);
        const matchesCode = (p.student_code || "").toLowerCase().includes(q);
        if (!matchesName && !matchesCode) return false;
      }

      // 2. Lọc thời gian lưu lại
      if (durationFilter !== "all") {
        const minutes = Math.max(0, Math.floor((now - new Date(p.entered_at).getTime()) / 60000));
        if (durationFilter === "under_1h" && minutes >= 60) return false;
        if (durationFilter === "1_to_4h" && (minutes < 60 || minutes >= 240)) return false;
        if (durationFilter === "4_to_8h" && (minutes < 240 || minutes >= 480)) return false;
        if (durationFilter === "over_8h" && minutes < 480) return false;
      }

      // 3. Lọc cổng
      if (cameraFilter !== "all") {
        if (p.camera_id !== cameraFilter) return false;
      }

      return true;
    });

    // Sắp xếp
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.entered_at).getTime() - new Date(a.entered_at).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.entered_at).getTime() - new Date(b.entered_at).getTime();
      }
      if (sortBy === "name_asc") {
        return (a.full_name || "").localeCompare(b.full_name || "", "vi");
      }
      return 0;
    });

    return result;
  }, [patrons, search, durationFilter, cameraFilter, sortBy]);

  // Xử lý buộc check-out
  const handleForceExit = async () => {
    if (!exitPatron) return;
    setExiting(true);
    try {
      await api.forceExitPatron(exitPatron.id);
      toast.success(`Đã đánh dấu ${exitPatron.full_name || exitPatron.student_code} đã rời khỏi thư viện.`);
      setExitPatron(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err) || "Không thể thực hiện đánh dấu ra");
    } finally {
      setExiting(false);
    }
  };

  // Cột cho Table View
  const tableColumns: DataTableColumn<ActivePatron>[] = useMemo(() => [
    {
      key: "full_name",
      label: "Độc giả",
      sortable: true,
      render: (_, row) => (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <AvatarUser user={row} role="patron" size={38} />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component={Link}
              href={`/patrons/${row.id}`}
              variant="body2"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                textDecoration: "none",
                "&:hover": { color: "#8B0000", textDecoration: "underline" },
              }}
            >
              {row.full_name || "Chưa có tên"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", display: "block" }}>
              {row.student_code}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      key: "entered_at",
      label: "Giờ vào",
      sortable: true,
      render: (_, row) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatTime(row.entered_at)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(row.entered_at).toLocaleDateString("vi-VN")}
          </Typography>
        </Box>
      ),
    },
    {
      key: "duration",
      label: "Thời gian có mặt",
      render: (_, row) => {
        const dur = formatRelativeDuration(row.entered_at);
        const cfg = DURATION_CONFIG[dur.level];
        return (
          <Chip
            size="small"
            label={dur.text}
            sx={{
              height: 24,
              fontWeight: 700,
              fontSize: "0.72rem",
              bgcolor: cfg.bg,
              color: cfg.color,
              border: "1px solid",
              borderColor: alpha(cfg.color, 0.3),
            }}
          />
        );
      },
    },
    {
      key: "camera_id",
      label: "Cổng kiểm soát",
      render: (_, row) => {
        const cfg = CAMERA_CONFIG[row.camera_id] || {
          label: row.camera_id || "Cổng vào",
          icon: DoorFrontOutlinedIcon,
          color: "text.secondary",
        };
        const GateIcon = cfg.icon;
        return (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: 1,
                bgcolor: alpha(cfg.color, 0.1),
                color: cfg.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <GateIcon sx={{ fontSize: 16 }} />
            </Box>
            <Typography variant="body2" sx={{ fontSize: "0.82rem" }}>
              {cfg.label}
            </Typography>
          </Stack>
        );
      },
    },
    {
      key: "confidence",
      label: "Khớp AI",
      render: (_, row) => {
        const percent = row.confidence == null ? null : Math.round(row.confidence * 100);
        if (percent == null) return <Typography variant="caption" color="text.secondary">—</Typography>;
        const color = percent >= 85 ? "success" : percent >= 70 ? "warning" : "error";
        return (
          <Chip
            size="small"
            color={color}
            variant="outlined"
            label={`${percent}%`}
            sx={{ height: 22, fontSize: "0.7rem", fontWeight: 700 }}
          />
        );
      },
    },
    {
      key: "actions",
      label: "Thao tác",
      align: "right",
      render: (_, row) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Xem hồ sơ độc giả">
            <IconButton
              component={Link}
              href={`/patrons/${row.id}`}
              size="small"
              sx={{ color: "text.secondary", "&:hover": { color: "#8B0000" } }}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={!canUpdate ? getPermissionDeniedReason("borrows", "update") : "Đánh dấu độc giả đã ra khỏi thư viện"}>
            <span>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                startIcon={<LogoutIcon sx={{ fontSize: 15 }} />}
                disabled={!canUpdate}
                onClick={() => {
                  if (!canUpdate) return;
                  setExitPatron(row);
                }}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  borderRadius: 1.5,
                }}
              >
                Đánh dấu ra
              </Button>
            </span>
          </Tooltip>
        </Stack>
      ),
    },
  ], [canUpdate]);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Độc giả đang có mặt"
        subtitle="Giám sát lưu lượng phòng đọc thời gian thực qua hệ thống Camera AI & Cổng kiểm soát"
        icon={PeopleIcon}
        statBadges={`${patrons.length} độc giả đang ở trong thư viện · Cập nhật: ${lastUpdate.toLocaleTimeString("vi-VN")}`}
        onRefresh={load}
        actions={
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                px: 1.5,
                py: 0.6,
                borderRadius: 2,
                border: "1px solid",
                borderColor: sseConnected ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)",
                bgcolor: sseConnected ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)",
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: sseConnected ? "#10B981" : "#F59E0B",
                  boxShadow: sseConnected ? "0 0 0 3px rgba(16, 185, 129, 0.25)" : "none",
                  animation: sseConnected ? "pulse 2s ease-in-out infinite" : undefined,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  fontSize: "0.75rem",
                  color: sseConnected ? "#059669" : "#D97706",
                  letterSpacing: 0.5,
                }}
              >
                {sseConnected ? "LIVE REAL-TIME" : "POLLING AUTO"}
              </Typography>
            </Box>

            <Tooltip title="Tải lại ngay">
              <IconButton
                size="small"
                onClick={load}
                disabled={loading}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  "&:hover": { borderColor: "#8B0000", color: "#8B0000" },
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      />

      {/* Dãy KPI chỉ số nhanh */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MuiStatCard
            label="Đang trong phòng đọc"
            value={activeCount}
            icon={UserCheckIcon}
            gradient="linear-gradient(135deg, #0A2540 0%, #0F3C5C 100%)"
            pct={occupancyPct}
            delta={`${occupancyPct}% sức chứa (${activeCount}/${LIBRARY_CAPACITY} chỗ)`}
            deltaColor={occupancyPct >= 90 ? "error" : occupancyPct >= 75 ? "warning" : "success"}
            index={0}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MuiStatCard
            label="Lưu lại quá 8 giờ"
            value={stalePatrons.length}
            icon={WarningAmberOutlinedIcon}
            gradient={stalePatrons.length > 0 ? "linear-gradient(135deg, #8B0000 0%, #700000 100%)" : "linear-gradient(135deg, #475569 0%, #334155 100%)"}
            pct={activeCount > 0 ? Math.round((stalePatrons.length / activeCount) * 100) : 0}
            delta={stalePatrons.length > 0 ? "⚠ Có thể quên check-out, cần xử lý" : "✓ 0 độc giả quá thời gian"}
            deltaColor={stalePatrons.length > 0 ? "error" : "success"}
            index={1}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
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

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MuiStatCard
            label="Chỗ ngồi còn trống"
            value={remainingSeats}
            icon={MeetingRoomOutlinedIcon}
            gradient="linear-gradient(135deg, #059669 0%, #047857 100%)"
            pct={Math.round((remainingSeats / LIBRARY_CAPACITY) * 100)}
            delta={`Sức chứa tối đa: ${LIBRARY_CAPACITY} chỗ`}
            deltaColor={remainingSeats <= 20 ? "error" : "success"}
            index={3}
          />
        </Grid>
      </Grid>

      {/* Thanh sức chứa phòng đọc trực quan */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2.5,
          bgcolor: isDark ? alpha(theme.palette.background.paper, 0.8) : "background.paper",
        }}
      >
        <Stack spacing={1.25}>
          <Stack direction={{ xs: "column", sm: "row" }} sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Mức độ lấp đầy phòng đọc:
              </Typography>
              <Chip
                size="small"
                label={
                  occupancyPct >= 90
                    ? "Gần đầy chỗ (Quá tải)"
                    : occupancyPct >= 70
                    ? "Đông đúc"
                    : "Thông thoáng"
                }
                color={occupancyPct >= 90 ? "error" : occupancyPct >= 70 ? "warning" : "success"}
                sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }}
              />
            </Stack>

            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
              Đã dùng: <strong>{activeCount}</strong> / {LIBRARY_CAPACITY} chỗ ({occupancyPct}%) · Còn trống <strong>{remainingSeats}</strong> chỗ
            </Typography>
          </Stack>

          <LinearProgress
            variant="determinate"
            value={occupancyPct}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              "& .MuiLinearProgress-bar": {
                borderRadius: 4,
                bgcolor:
                  occupancyPct >= 90
                    ? "#EF4444"
                    : occupancyPct >= 70
                    ? "#F59E0B"
                    : "#10B981",
              },
            }}
          />
        </Stack>
      </Paper>

      {/* Cảnh báo khi có độc giả ở lại quá 8 tiếng */}
      {stalePatrons.length > 0 && (
        <Alert
          severity="warning"
          variant="filled"
          icon={<WarningAmberOutlinedIcon />}
          sx={{
            borderRadius: 2.5,
            alignItems: "center",
            boxShadow: "0 4px 12px rgba(245, 158, 11, 0.25)",
            "& .MuiAlert-message": { flex: 1 },
          }}
          action={
            <Button
              size="small"
              variant="contained"
              onClick={() => setDurationFilter("over_8h")}
              sx={{
                bgcolor: "#ffffff",
                color: "#B45309",
                fontWeight: 800,
                textTransform: "none",
                "&:hover": { bgcolor: "#f5f5f5" },
              }}
            >
              Lọc {stalePatrons.length} độc giả này
            </Button>
          }
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Phát hiện {stalePatrons.length} độc giả có mặt trong thư viện quá 8 giờ liên tục
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9, display: "block" }}>
            Hệ thống nhận diện cổng ra có thể bị gián đoạn hoặc độc giả quên quẹt thẻ lúc về. Vui lòng đối chiếu và dùng nút &ldquo;Đánh dấu ra&rdquo; để cập nhật sức chứa thực tế.
          </Typography>
        </Alert>
      )}

      {/* Thanh công cụ Tìm kiếm & Bộ lọc nâng cao */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2.5,
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: "column",
          gap: 1.75,
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          sx={{ alignItems: { xs: "stretch", md: "center" }, justifyContent: "space-between" }}
        >
          {/* Ô tìm kiếm */}
          <Box sx={{ flex: 1, minWidth: { xs: "100%", md: 320 } }}>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Tìm theo tên độc giả, MSSV..."
            />
          </Box>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {/* Lọc theo Cổng */}
            <TextField
              select
              size="small"
              value={cameraFilter}
              onChange={(e) => setCameraFilter(e.target.value)}
              sx={{
                minWidth: 160,
                "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: "0.85rem" },
              }}
            >
              <MenuItem value="all">Tất cả cổng</MenuItem>
              <MenuItem value="entry_gate">Cổng vào chính</MenuItem>
              <MenuItem value="exit_gate">Cổng ra</MenuItem>
              <MenuItem value="kiosk">Kiosk tự phục vụ</MenuItem>
            </TextField>

            {/* Sắp xếp */}
            <TextField
              select
              size="small"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              sx={{
                minWidth: 160,
                "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: "0.85rem" },
              }}
            >
              <MenuItem value="newest">Vào gần nhất</MenuItem>
              <MenuItem value="oldest">Ở lâu nhất</MenuItem>
              <MenuItem value="name_asc">Tên (A → Z)</MenuItem>
            </TextField>

            {/* Chuyển đổi hiển thị Lưới / Bảng */}
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </Stack>
        </Stack>

        <Divider sx={{ my: 0.25 }} />

        {/* Bộ lọc Pills theo Thời gian lưu lại */}
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.75 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", mr: 0.5 }}>
            Thời gian:
          </Typography>

          {[
            { key: "all", label: "Tất cả", count: patrons.length },
            { key: "under_1h", label: "< 1 giờ", count: patrons.filter((p) => (Date.now() - new Date(p.entered_at).getTime()) < 3600000).length },
            { key: "1_to_4h", label: "1 - 4 giờ", count: patrons.filter((p) => { const m = (Date.now() - new Date(p.entered_at).getTime()) / 60000; return m >= 60 && m < 240; }).length },
            { key: "4_to_8h", label: "4 - 8 giờ", count: patrons.filter((p) => { const m = (Date.now() - new Date(p.entered_at).getTime()) / 60000; return m >= 240 && m < 480; }).length },
            { key: "over_8h", label: "> 8 giờ ⚠", count: stalePatrons.length, highlight: stalePatrons.length > 0 },
          ].map((pill) => {
            const isSelected = durationFilter === pill.key;
            return (
              <Chip
                key={pill.key}
                clickable
                onClick={() => setDurationFilter(pill.key as DurationFilter)}
                label={`${pill.label} (${pill.count})`}
                color={isSelected ? "primary" : pill.highlight ? "error" : "default"}
                variant={isSelected ? "filled" : "outlined"}
                sx={{
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  height: 28,
                  borderRadius: "20px",
                  ...(isSelected && {
                    bgcolor: "#8B0000",
                    "&:hover": { bgcolor: "#700000" },
                  }),
                }}
              />
            );
          })}

          {(search || durationFilter !== "all" || cameraFilter !== "all" || sortBy !== "newest") && (
            <Button
              size="small"
              onClick={() => {
                setSearch("");
                setDurationFilter("all");
                setCameraFilter("all");
                setSortBy("newest");
              }}
              sx={{ textTransform: "none", fontSize: "0.75rem", color: "text.secondary" }}
            >
              Đặt lại
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Danh sách hiển thị theo ViewMode */}
      <LoadingOverlay loading={loading && patrons.length === 0} message="Đang tải danh sách độc giả...">
        {patrons.length === 0 && !loading ? (
          <EmptyState
            icon={<Box sx={{ width: 64, height: 64, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.04)", color: "text.disabled", mb: 1 }}><MenuBookOutlinedIcon sx={{ fontSize: 32 }} /></Box>}
            title="Thư viện đang yên tĩnh"
            description="Hiện chưa có độc giả nào trong phòng đọc. Danh sách sẽ tự động cập nhật ngay khi có lượt vào từ cổng kiểm soát."
          />
        ) : filteredAndSortedPatrons.length === 0 ? (
          <EmptyState
            icon={<SearchOutlinedIcon sx={{ fontSize: 36, color: "text.disabled" }} />}
            title="Không tìm thấy độc giả phù hợp"
            description="Hãy thử đổi từ khóa tìm kiếm hoặc làm mới bộ lọc thời gian/cổng kiểm soát."
            action={
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setSearch("");
                  setDurationFilter("all");
                  setCameraFilter("all");
                }}
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                Xóa bộ lọc
              </Button>
            }
          />
        ) : viewMode === "list" ? (
          /* VIEW 1: DẠNG BẢNG CHI TIẾT (Table View) */
          <DataTable<ActivePatron>
            columns={tableColumns}
            rows={filteredAndSortedPatrons}
            getRowId={(row) => row.id}
            page={page}
            rowsPerPage={rowsPerPage}
            totalCount={filteredAndSortedPatrons.length}
            onPageChange={setPage}
            onRowsPerPageChange={(ps) => {
              setRowsPerPage(ps);
              setPage(0);
            }}
          />
        ) : (
          /* VIEW 2: DẠNG LƯỚI THẺ TRỰC QUAN (Grid Cards View) */
          <Grid container spacing={2}>
            {filteredAndSortedPatrons.map((patron, idx) => {
              const dur = formatRelativeDuration(patron.entered_at);
              const cfg = DURATION_CONFIG[dur.level];
              const percent = patron.confidence == null ? null : Math.round(patron.confidence * 100);
              const gateConfig = CAMERA_CONFIG[patron.camera_id] || {
                label: patron.camera_id || "Cổng kiểm soát",
                icon: DoorFrontOutlinedIcon,
                color: "text.secondary",
              };
              const GateIcon = gateConfig.icon;

              return (
                <Grid key={patron.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      borderRadius: 2.5,
                      position: "relative",
                      overflow: "hidden",
                      p: 2,
                      bgcolor: "background.paper",
                      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                      borderLeft: `4px solid ${cfg.color}`,
                      animation: `${fadeInUp} 0.35s ease-out`,
                      animationDelay: `${Math.min(idx * 0.04, 0.4)}s`,
                      animationFillMode: "both",
                      "&:hover": {
                        transform: "translateY(-3px)",
                        boxShadow: isDark
                          ? "0 8px 24px rgba(0,0,0,0.4)"
                          : "0 8px 24px rgba(0,0,0,0.08)",
                        borderColor: cfg.color,
                      },
                    }}
                  >
                    <Stack spacing={1.5}>
                      {/* Hàng 1: Avatar + Tên + Badge Thời gian */}
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0, flex: 1 }}>
                          <AvatarUser user={patron} role="patron" size={42} />
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                              component={Link}
                              href={`/patrons/${patron.id}`}
                              noWrap
                              sx={{
                                fontWeight: 800,
                                fontSize: "0.95rem",
                                color: "text.primary",
                                textDecoration: "none",
                                display: "block",
                                "&:hover": { color: "#8B0000", textDecoration: "underline" },
                              }}
                            >
                              {patron.full_name || "Chưa có tên"}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontFamily: "monospace", fontSize: "0.78rem" }}
                            >
                              {patron.student_code}
                            </Typography>
                          </Box>
                        </Stack>

                        {/* Chip thời lượng có mặt */}
                        <Chip
                          size="small"
                          label={dur.text}
                          sx={{
                            height: 24,
                            fontWeight: 800,
                            fontSize: "0.7rem",
                            bgcolor: cfg.bg,
                            color: cfg.color,
                            border: "1px solid",
                            borderColor: alpha(cfg.color, 0.3),
                            flexShrink: 0,
                          }}
                        />
                      </Stack>

                      <Divider sx={{ my: 0.5, borderColor: "divider" }} />

                      {/* Hàng 2: Thông tin giờ vào & Cổng kiểm soát */}
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", rowGap: 0.5 }}>
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                          <AccessTimeOutlinedIcon sx={{ fontSize: 15, color: "text.secondary" }} />
                          <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                            Vào lúc: <strong>{formatTime(patron.entered_at)}</strong>
                          </Typography>
                        </Stack>

                        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                          <GateIcon sx={{ fontSize: 15, color: gateConfig.color }} />
                          <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                            {gateConfig.label}
                          </Typography>
                        </Stack>
                      </Stack>

                      {/* Hàng 3: Độ khớp AI & Nút thao tác */}
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", pt: 0.5 }}>
                        {percent != null ? (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={`${percent}% Khớp AI`}
                            color={percent >= 85 ? "success" : percent >= 70 ? "warning" : "error"}
                            sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700 }}
                          />
                        ) : (
                          <Box />
                        )}

                        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                          <Tooltip title="Xem hồ sơ">
                            <IconButton
                              component={Link}
                              href={`/patrons/${patron.id}`}
                              size="small"
                              sx={{
                                color: "text.secondary",
                                border: "1px solid",
                                borderColor: "divider",
                                "&:hover": { color: "#8B0000", borderColor: "#8B0000" },
                              }}
                            >
                              <OpenInNewIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title={!canUpdate ? getPermissionDeniedReason("borrows", "update") : "Đánh dấu độc giả đã rời thư viện"}>
                            <span>
                              <Button
                                size="small"
                                variant="outlined"
                                color="warning"
                                startIcon={<LogoutIcon sx={{ fontSize: 14 }} />}
                                disabled={!canUpdate}
                                onClick={() => {
                                  if (!canUpdate) return;
                                  setExitPatron(patron);
                                }}
                                sx={{
                                  textTransform: "none",
                                  fontWeight: 700,
                                  fontSize: "0.72rem",
                                  borderRadius: 1.5,
                                  py: 0.4,
                                  px: 1,
                                }}
                              >
                                Đánh dấu ra
                              </Button>
                            </span>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        )}
      </LoadingOverlay>

      {/* Hộp thoại xác nhận đánh dấu đã ra */}
      <Dialog
        open={!!exitPatron}
        onClose={() => (exiting ? undefined : setExitPatron(null))}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ m: 0, p: 2.5, fontWeight: 800 }}>
          Xác nhận đánh dấu độc giả đã ra?
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2.5 }}>
          <Stack spacing={2} sx={{ alignItems: "center", textAlign: "center" }}>
            {exitPatron && <AvatarUser user={exitPatron} role="patron" size={56} />}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {exitPatron?.full_name || "Độc giả"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                MSSV: {exitPatron?.student_code}
              </Typography>
            </Box>

            <Paper variant="outlined" sx={{ p: 1.5, width: "100%", borderRadius: 2, bgcolor: "action.hover" }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Giờ vào: <strong>{exitPatron ? formatTime(exitPatron.entered_at) : "—"}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                Thời gian có mặt: <strong>{exitPatron ? formatRelativeDuration(exitPatron.entered_at).text : "—"}</strong>
              </Typography>
            </Paper>

            <Typography variant="caption" color="text.secondary">
              Thao tác này dùng khi cổng kiểm soát không nhận diện được lượt ra của độc giả. Dữ liệu phòng đọc sẽ được cập nhật ngay lập tức.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 2 }}>
          <Button onClick={() => setExitPatron(null)} disabled={exiting} variant="outlined" sx={{ borderRadius: 2, textTransform: "none" }}>
            Hủy
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleForceExit}
            disabled={exiting}
            startIcon={<LogoutIcon />}
            sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
          >
            {exiting ? "Đang xử lý..." : "Xác nhận đã ra"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
