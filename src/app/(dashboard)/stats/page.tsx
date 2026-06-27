"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
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
  alpha,
  useTheme,
} from "@mui/material";
import ActivityIcon from "@mui/icons-material/TimelineOutlined";
import AlertIcon from "@mui/icons-material/WarningAmberOutlined";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import CameraIcon from "@mui/icons-material/PhotoCameraOutlined";
import ChartIcon from "@mui/icons-material/BarChartOutlined";
import ClockIcon from "@mui/icons-material/ScheduleOutlined";
import LoginIcon from "@mui/icons-material/LoginOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import RadioIcon from "@mui/icons-material/SettingsInputAntennaOutlined";
import UserIcon from "@mui/icons-material/HowToRegOutlined";
import UsersIcon from "@mui/icons-material/GroupsOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import EmojiEventsIcon from "@mui/icons-material/EmojiEventsOutlined";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import api from "@/lib/api-client";
import { fadeInUp, shimmer, slideInRight, successPop } from "@/lib/animations";
import type {
  AccessLogPublic,
  ActivePatron,
  BorrowRecord,
  CameraEvent,
  CameraStatus,
  StatsResponse,
} from "@/lib/types";

type RealtimeState = "connecting" | "connected" | "disconnected";

const STAT_GRADIENT: Record<string, string> = {
  active:    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  entry:     "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
  exit:      "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  activity:  "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
  borrow:    "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
  borrow_ok: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
  overdue:   "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
  camera:    "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
  top:       "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  week:      "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
};

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function isPhysicalAccessLog(log: AccessLogPublic) {
  return ["entry_gate", "exit_gate", "kiosk"].includes(log.camera_id);
}

function formatCameraId(cameraId?: string | null) {
  if (!cameraId || !["entry_gate", "exit_gate", "kiosk"].includes(cameraId)) return "-";
  return cameraId;
}

function cameraLabel(id: string) {
  if (id === "entry_gate") return "Cổng vào";
  if (id === "exit_gate") return "Cổng ra";
  if (id === "kiosk") return "Kiosk";
  return id;
}

function formatTime(value?: string) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatShortTime(value?: string) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatConfidence(value?: number | null) {
  if (typeof value !== "number") return "-";
  return `${Math.round(value * 100)}%`;
}

function buildAccessLogFromEvent(event: CameraEvent): AccessLogPublic {
  return {
    id: `${event.camera_id}-${event.patron_id || event.student_code || "unknown"}-${Date.now()}`,
    patron_id: event.patron_id || null,
    patron_name: event.full_name || null,
    student_code: event.student_code || null,
    access_type: event.access_type === "exit" ? "exit" : "entry",
    verify_method: "face",
    confidence: event.score ?? null,
    camera_id: event.camera_id,
    access_time: new Date().toISOString(),
    status: event.status,
  };
}

function AccessTypeChip({ type }: { type?: string }) {
  if (type === "entry") return <Chip size="small" color="success" label="Vào" sx={{ fontWeight: 700, fontSize: "0.72rem", borderRadius: 1.5 }} />;
  if (type === "exit") return <Chip size="small" color="warning" label="Ra" sx={{ fontWeight: 700, fontSize: "0.72rem", borderRadius: 1.5 }} />;
  return <Chip size="small" label={type || "?"} sx={{ fontWeight: 700, fontSize: "0.72rem", borderRadius: 1.5 }} />;
}

function StatusChip({ status }: { status?: string }) {
  if (status === "success" || status === "granted") return <Chip size="small" color="success" label="Thành công" variant="outlined" sx={{ fontWeight: 600, fontSize: "0.72rem", borderRadius: 1.5 }} />;
  if (status === "no_match") return <Chip size="small" color="warning" label="Không khớp" variant="outlined" sx={{ fontWeight: 600, fontSize: "0.72rem", borderRadius: 1.5 }} />;
  if (status === "expired") return <Chip size="small" color="warning" label="Hết hạn" variant="outlined" sx={{ fontWeight: 600, fontSize: "0.72rem", borderRadius: 1.5 }} />;
  if (status === "spoof") return <Chip size="small" color="error" label="Giả mạo" variant="outlined" sx={{ fontWeight: 600, fontSize: "0.72rem", borderRadius: 1.5 }} />;
  if (status === "wrong_direction") return <Chip size="small" color="warning" label="Sai chiều" variant="outlined" sx={{ fontWeight: 600, fontSize: "0.72rem", borderRadius: 1.5 }} />;
  if (status === "already_granted") return <Chip size="small" color="info" label="Đã ghi nhận" variant="outlined" sx={{ fontWeight: 600, fontSize: "0.72rem", borderRadius: 1.5 }} />;
  return <Chip size="small" color="error" label={status === "denied" ? "Từ chối" : "Thất bại"} variant="outlined" sx={{ fontWeight: 600, fontSize: "0.72rem", borderRadius: 1.5 }} />;
}

function StatMetricCard({
  label,
  value,
  description,
  icon,
  gradient,
  percentage,
  idx,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  percentage: number;
  idx: number;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 3,
        position: "relative",
        overflow: "hidden",
        borderColor: "divider",
        transition: "transform 0.2s, box-shadow 0.2s",
        animation: `${fadeInUp} 0.4s ease-out`,
        animationDelay: `${idx * 0.07}s`,
        animationFillMode: "both",
        "&:hover": { transform: "translateY(-2px)", boxShadow: 4 },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 80,
          height: 80,
          background: gradient,
          opacity: 0.12,
          borderRadius: "0 12px 0 80px",
        }}
      />
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
        <Avatar
          sx={{
            background: gradient,
            width: 44,
            height: 44,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {icon}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            {label}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        </Box>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(percentage, 100)}
        sx={{
          mt: 1.5,
          height: 3,
          borderRadius: 2,
          bgcolor: "action.hover",
          "& .MuiLinearProgress-bar": { background: gradient, borderRadius: 2 },
        }}
      />
    </Paper>
  );
}

export default function StatsPage() {
  const theme = useTheme();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [todayLogs, setTodayLogs] = useState<AccessLogPublic[]>([]);
  const [activePatrons, setActivePatrons] = useState<ActivePatron[]>([]);
  const [activeBorrows, setActiveBorrows] = useState<BorrowRecord[]>([]);
  const [borrowStats, setBorrowStats] = useState<{ total: number; active: number; overdue: number } | null>(null);
  const [cameraStatuses, setCameraStatuses] = useState<CameraStatus[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ thisWeek: number[]; lastWeek: number[] }>({ thisWeek: [], lastWeek: [] });
  const [loading, setLoading] = useState(true);
  const [realtimeState, setRealtimeState] = useState<RealtimeState>("connecting");

  const refreshActivePatrons = useCallback(async () => {
    try {
      const active = await api.getActivePatrons();
      setActivePatrons(active.items);
    } catch {
      // Keep old data visible when realtime refresh fails.
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const today = toDateStr(new Date());
        const [s, logs, active, bStats, allActive, cameras] = await Promise.all([
          api.getStats(),
          api.getAccessLogs({ dateFrom: today, limit: 200 }),
          api.getActivePatrons(),
          api.getBorrowStats(),
          api.getAllActiveBorrows(),
          api.getCameraStatus(),
        ]);
        setStats(s);
        setTodayLogs(logs.items.filter(isPhysicalAccessLog));
        setActivePatrons(active.items);
        setBorrowStats(bStats);
        setActiveBorrows(allActive || []);
        setCameraStatuses(cameras);

        // Weekly comparison
        const now = new Date();
        const thisMonday = new Date(now);
        thisMonday.setDate(now.getDate() - now.getDay() + 1);
        const lastMonday = new Date(thisMonday);
        lastMonday.setDate(thisMonday.getDate() - 7);
        const lastSunday = new Date(lastMonday);
        lastSunday.setDate(lastMonday.getDate() + 6);

        const [thisWeekResp, lastWeekResp] = await Promise.all([
          api.getAccessFrequency({ dateFrom: toDateStr(thisMonday), dateTo: today }),
          api.getAccessFrequency({ dateFrom: toDateStr(lastMonday), dateTo: toDateStr(lastSunday) }),
        ]);

        const thisWeekDaily = thisWeekResp.daily || [];
        const lastWeekDaily = lastWeekResp.daily || [];

        const thisWeekTotals = thisWeekDaily.reduce(
          (acc, d) => { acc.push(d.entry + d.exit); return acc; },
          [] as number[]
        );
        const lastWeekTotals = Array.from({ length: 7 }, (_, i) => {
          const found = lastWeekDaily[i];
          return found ? found.entry + found.exit : 0;
        });

        setWeeklyData({ thisWeek: thisWeekTotals, lastWeek: lastWeekTotals });
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setRealtimeState("connecting");
    const cleanup = api.connectAccessSSE(
      (event: CameraEvent) => {
        if (event.status !== "granted") return;
        const log = buildAccessLogFromEvent(event);
        if (!isPhysicalAccessLog(log)) return;
        setTodayLogs((prev) => [log, ...prev].slice(0, 200));
        setStats((prev) => prev ? {
          ...prev,
          today_entries: prev.today_entries + (log.access_type === "entry" ? 1 : 0),
          today_exits: prev.today_exits + (log.access_type === "exit" ? 1 : 0),
        } : prev);
        refreshActivePatrons();
      },
      (connected) => setRealtimeState(connected ? "connected" : "disconnected"),
    );
    return cleanup;
  }, [refreshActivePatrons]);

  const todayLabel = useMemo(() => new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }), []);

  const hourlyData = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, entry: 0, exit: 0, total: 0 }));
    todayLogs.forEach((log) => {
      const hour = new Date(log.access_time).getHours();
      if (log.access_type === "entry") buckets[hour].entry += 1;
      if (log.access_type === "exit") buckets[hour].exit += 1;
      buckets[hour].total += 1;
    });
    return buckets;
  }, [todayLogs]);

  const hasHourlyData = hourlyData.some((item) => item.total > 0);

  const recentBorrows = useMemo(() => [...activeBorrows]
    .sort((a, b) => new Date(b.borrow_at).getTime() - new Date(a.borrow_at).getTime())
    .slice(0, 12), [activeBorrows]);

  const topPatrons = useMemo(() => {
    const countMap = new Map<string, { name: string; code: string; count: number; lastTime: string }>();
    todayLogs.forEach((log) => {
      if (!log.patron_id) return;
      const existing = countMap.get(log.patron_id);
      if (existing) {
        existing.count += 1;
        if (log.access_time > existing.lastTime) existing.lastTime = log.access_time;
      } else {
        countMap.set(log.patron_id, {
          name: log.patron_name || "Không rõ",
          code: log.student_code || log.patron_id,
          count: 1,
          lastTime: log.access_time,
        });
      }
    });
    return Array.from(countMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [todayLogs]);

  const weeklyAvg = useMemo(() => {
    if (!weeklyData.thisWeek.length) return 0;
    return Math.round(weeklyData.thisWeek.reduce((a, b) => a + b, 0) / weeklyData.thisWeek.length);
  }, [weeklyData]);

  const weeklyDayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  if (loading) {
    return (
      <Box sx={{ minHeight: 420, display: "grid", placeItems: "center" }}>
        <Stack spacing={2} sx={{ alignItems: "center" }}>
          <CircularProgress sx={{ animation: `${shimmer} 1.5s ease-in-out infinite` }} />
          <Typography variant="body2" color="text.secondary">Đang tải thống kê vận hành...</Typography>
        </Stack>
      </Box>
    );
  }

  if (!stats) {
    return <Alert severity="info">Không có dữ liệu thống kê.</Alert>;
  }

  const realtimeColor = realtimeState === "connected" ? "success" : realtimeState === "connecting" ? "warning" : "error";
  const realtimeLabel = realtimeState === "connected" ? "Đang cập nhật" : realtimeState === "connecting" ? "Đang kết nối" : "Mất kết nối";

  const onlineCameras = cameraStatuses.filter((c) => c.connected).length;
  const totalCameras = cameraStatuses.length;

  return (
    <Stack spacing={3}>
      {/* ── Gradient Header ── */}
      <Box
        sx={{
          p: 3,
          borderRadius: 3,
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
          border: "1px solid",
          borderColor: "rgba(99,102,241,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box sx={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", bgcolor: "rgba(99,102,241,0.08)", pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -60, left: 200, width: 220, height: 220, borderRadius: "50%", bgcolor: "rgba(99,102,241,0.05)", pointerEvents: "none" }} />

        <Stack direction="row" spacing={2} sx={{ zIndex: 1, alignItems: "center" }}>
          <Avatar sx={{ bgcolor: "rgba(99,102,241,0.3)", width: 52, height: 52, border: "1px solid rgba(99,102,241,0.5)" }}>
            <ActivityIcon sx={{ color: "#a5b4fc", fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#e0e7ff" }}>
              Thống kê vận hành
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(199,210,254,0.7)", mt: 0.3 }}>
              {todayLabel} — Theo dõi ra/vào, hiện diện và mượn trả
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ zIndex: 1, flexWrap: "wrap" }}>
          <Chip
            variant="outlined"
            label={`Tổng độc giả: ${(stats.total_patrons ?? 0).toLocaleString("vi-VN")}`}
            sx={{ color: "#a5b4fc", borderColor: "rgba(165,180,252,0.4)", fontWeight: 600 }}
          />
          <Chip
            color={realtimeColor as any}
            icon={<RadioIcon />}
            label={realtimeLabel}
            sx={{ fontWeight: 600 }}
          />
        </Stack>
      </Box>

      {/* ── Stat Cards (6 metrics) ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)", xl: "repeat(6, 1fr)" }, gap: 2 }}>
        <StatMetricCard
          label="Đang trong thư viện"
          value={activePatrons.length}
          description="Có mặt hiện tại"
          icon={<UserIcon sx={{ fontSize: 28 }} />}
          gradient={STAT_GRADIENT.active}
          percentage={stats.total_patrons ? (activePatrons.length / stats.total_patrons) * 100 : 0}
          idx={0}
        />
        <StatMetricCard
          label="Vào hôm nay"
          value={stats.today_entries}
          description="Từ 00:00"
          icon={<LoginIcon sx={{ fontSize: 28 }} />}
          gradient={STAT_GRADIENT.entry}
          percentage={stats.today_entries ? Math.min((stats.today_entries / (stats.total_patrons || 1)) * 100, 100) : 0}
          idx={1}
        />
        <StatMetricCard
          label="Ra hôm nay"
          value={stats.today_exits}
          description="Từ 00:00"
          icon={<LogoutIcon sx={{ fontSize: 28 }} />}
          gradient={STAT_GRADIENT.exit}
          percentage={stats.today_exits ? Math.min((stats.today_exits / (stats.total_patrons || 1)) * 100, 100) : 0}
          idx={2}
        />
        <StatMetricCard
          label="Hoạt động hôm nay"
          value={todayLogs.length}
          description="Camera và kiosk"
          icon={<ActivityIcon sx={{ fontSize: 28 }} />}
          gradient={STAT_GRADIENT.activity}
          percentage={100}
          idx={3}
        />
        <StatMetricCard
          label="Tổng lượt mượn"
          value={borrowStats?.total ?? "—"}
          description="Tất cả phiếu mượn"
          icon={<BookIcon sx={{ fontSize: 28 }} />}
          gradient={STAT_GRADIENT.borrow}
          percentage={borrowStats?.total ? Math.min((borrowStats.active / borrowStats.total) * 100, 100) : 0}
          idx={4}
        />
        <StatMetricCard
          label="Đang mượn"
          value={borrowStats?.active ?? "—"}
          description="Chưa trả"
          icon={<BookIcon sx={{ fontSize: 28 }} />}
          gradient={STAT_GRADIENT.borrow_ok}
          percentage={borrowStats?.active ? Math.min((borrowStats.active / (borrowStats.total || 1)) * 100, 100) : 0}
          idx={5}
        />
      </Box>

      {/* ── Weekly Comparison ── */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ p: 2.5, pb: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
            <CompareArrowsIcon sx={{ color: "#06b6d4" }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>So sánh tuần</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">Tổng lượt ra/vào theo ngày — Tuần này vs Tuần trước</Typography>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 0 }}>
          <Box sx={{ height: 220, p: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyDayLabels.map((day, i) => ({
                day,
                thisWeek: weeklyData.thisWeek[i] || 0,
                lastWeek: weeklyData.lastWeek[i] || 0,
              }))} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }}
                  formatter={(value: any, name: any) => [value, name === "thisWeek" ? "Tuần này" : "Tuần trước"]}
                />
                <Legend wrapperStyle={{ color: theme.palette.text.secondary, fontSize: 12 }} />
                <Bar dataKey="lastWeek" name="Tuần trước" fill={alpha(theme.palette.primary.main, 0.25)} radius={[4, 4, 0, 0]} />
                <Bar dataKey="thisWeek" name="Tuần này" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <Box sx={{ p: 2, borderLeft: { md: 1 }, borderColor: "divider" }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Trung bình / ngày
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#06b6d4" }}>
                  {weeklyAvg.toLocaleString("vi-VN")}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Hôm nay
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {todayLogs.length.toLocaleString("vi-VN")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {weeklyAvg > 0 ? `${todayLogs.length >= weeklyAvg ? "+" : ""}${Math.round(((todayLogs.length - weeklyAvg) / weeklyAvg) * 100)}% so với TB` : "—"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Tổng tuần này
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {weeklyData.thisWeek.reduce((a, b) => a + b, 0).toLocaleString("vi-VN")}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Paper>

      {/* ── Hourly Chart + Active Patrons ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1.45fr 0.9fr" }, gap: 3 }}>
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Box sx={{ p: 2.5, pb: 1 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
              <ChartIcon sx={{ color: "#6366f1" }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Lượt ra/vào theo giờ</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">Tách lượt vào và ra để nhìn cao điểm trong ngày</Typography>
          </Box>
          {!hasHourlyData ? (
            <Box sx={{ height: 288, m: 2, border: 1, borderStyle: "dashed", borderColor: "divider", borderRadius: 2, display: "grid", placeItems: "center", textAlign: "center" }}>
              <Box>
                <ClockIcon sx={{ fontSize: 40, color: "text.disabled" }} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Chưa có lượt ra/vào hôm nay</Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ height: 288, px: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} interval={1} />
                  <YAxis allowDecimals={false} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }}
                    labelFormatter={(label) => `${label}:00 - ${label}:59`}
                    formatter={(value: any, name: any) => [value, name === "entry" ? "Vào" : "Ra"]}
                  />
                  <Legend wrapperStyle={{ color: theme.palette.text.secondary, fontSize: 12 }} />
                  <Bar dataKey="entry" name="Vào" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="exit" name="Ra" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Box sx={{ p: 2.5, pb: 1 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
              <UserIcon sx={{ color: "#10b981" }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Đang trong thư viện</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">{activePatrons.length} độc giả đang hiện diện</Typography>
          </Box>
          {activePatrons.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <UsersIcon sx={{ fontSize: 40, color: "text.disabled" }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Không có ai trong thư viện</Typography>
            </Box>
          ) : (
            <Stack spacing={1} sx={{ maxHeight: 288, overflowY: "auto", px: 2.5, pb: 2 }}>
              {activePatrons.slice(0, 20).map((p) => (
                <Paper
                  key={p.id}
                  variant="outlined"
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    transition: "background 0.15s",
                    "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
                      <Avatar sx={{ bgcolor: STAT_GRADIENT.active, fontWeight: 900, width: 36, height: 36, fontSize: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                        {p.full_name?.charAt(0) || "?"}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.85rem" }} noWrap>{p.full_name || "Không rõ tên"}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>{p.student_code || "---"}</Typography>
                      </Box>
                    </Stack>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="caption" sx={{ fontFamily: "monospace" }}>{formatShortTime(p.entered_at)}</Typography>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", justifyContent: "flex-end" }}>
                        <CameraIcon sx={{ fontSize: 12 }} color="disabled" />
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>{formatCameraId(p.camera_id)}</Typography>
                      </Stack>
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>

      {/* ── Camera Status Grid ── */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ p: 2.5, pb: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
            <CameraIcon sx={{ color: "#6366f1" }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Trạng thái camera</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">{onlineCameras}/{totalCameras} camera đang hoạt động</Typography>
        </Box>
        {cameraStatuses.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <CameraIcon sx={{ fontSize: 40, color: "text.disabled" }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Không có camera nào</Typography>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, gap: 2, p: 2.5, pt: 0 }}>
            {cameraStatuses.map((cam, idx) => {
              const isOnline = cam.connected && cam.running;
              const hasError = cam.last_error && !isOnline;
              return (
                <Paper
                  key={cam.camera_id}
                  variant="outlined"
                  sx={{
                    borderRadius: 3,
                    overflow: "hidden",
                    borderColor: isOnline ? "success.main" : "error.main",
                    borderWidth: isOnline ? 1 : 2,
                    transition: "transform 0.2s, box-shadow 0.2s",
                    animation: `${fadeInUp} 0.4s ease-out`,
                    animationDelay: `${idx * 0.07}s`,
                    animationFillMode: "both",
                    "&:hover": { transform: "translateY(-2px)", boxShadow: 4 },
                  }}
                >
                  <Box sx={{ p: 2.5 }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
                      <Avatar sx={{ bgcolor: isOnline ? "#10b981" : "#ef4444", width: 40, height: 40, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                        <CameraIcon sx={{ fontSize: 22 }} />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {cameraLabel(cam.camera_id)}
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
                        <Typography variant="caption" color="text.secondary">Khung hình</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: "monospace" }}>{cam.frames_processed.toLocaleString("vi-VN")}</Typography>
                      </Stack>
                      {cam.last_frame_time && (
                        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                          <Typography variant="caption" color="text.secondary">Khung cuối</Typography>
                          <Typography variant="caption" sx={{ fontFamily: "monospace" }}>{formatShortTime(cam.last_frame_time)}</Typography>
                        </Stack>
                      )}
                      {cam.retry_count > 0 && (
                        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                          <Typography variant="caption" color="text.secondary">Retry</Typography>
                          <Chip size="small" label={cam.retry_count} color="warning" sx={{ height: 20, fontSize: "0.7rem" }} />
                        </Stack>
                      )}
                      {hasError && (
                        <Typography variant="caption" color="error.main" sx={{ mt: 0.5, lineHeight: 1.3 }}>
                          {cam.last_error}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        )}
      </Paper>

      {/* ── Top Patrons Widget ── */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ p: 2.5, pb: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
            <EmojiEventsIcon sx={{ color: "#f59e0b" }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Độc giả tích cực nhất hôm nay</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">Top 5 độc giả lui tới thư viện nhiều nhất</Typography>
        </Box>
        {topPatrons.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <EmojiEventsIcon sx={{ fontSize: 40, color: "text.disabled" }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Chưa có dữ liệu hôm nay</Typography>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(5, 1fr)" }, gap: 2, p: 2.5, pt: 0 }}>
            {topPatrons.map((patron, idx) => (
              <Paper
                key={idx}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 3,
                  textAlign: "center",
                  position: "relative",
                  overflow: "hidden",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  animation: `${fadeInUp} 0.4s ease-out`,
                  animationDelay: `${idx * 0.07}s`,
                  animationFillMode: "both",
                  "&:hover": { transform: "translateY(-2px)", boxShadow: 4 },
                  borderColor: idx === 0 ? "#f59e0b" : "divider",
                  borderWidth: idx === 0 ? 2 : 1,
                }}
              >
                {idx === 0 && (
                  <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: STAT_GRADIENT.top }} />
                )}
                <Avatar sx={{ bgcolor: STAT_GRADIENT.top, width: 48, height: 48, mx: "auto", mb: 1, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", fontSize: idx === 0 ? 20 : 16 }}>
                  {idx === 0 ? "🏆" : `#${idx + 1}`}
                </Avatar>
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{patron.name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>{patron.code}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#f59e0b", mt: 0.5 }}>
                  {patron.count}
                </Typography>
                <Typography variant="caption" color="text.secondary">lượt</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  {formatShortTime(patron.lastTime)}
                </Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>

      {/* ── Activity Log Table ── */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ p: 2.5, pb: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
            <ActivityIcon sx={{ color: "#6366f1" }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Hoạt động hôm nay</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">Các lượt ra/vào mới nhất từ entry_gate, exit_gate và kiosk</Typography>
        </Box>
        {todayLogs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <RadioIcon sx={{ fontSize: 40, color: "text.disabled" }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Chưa có hoạt động hôm nay</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& .MuiTableCell-head": { fontWeight: 700, bgcolor: "action.hover", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" } }}>
                  <TableCell>Thời gian</TableCell>
                  <TableCell>Độc giả</TableCell>
                  <TableCell>Loại</TableCell>
                  <TableCell>Camera</TableCell>
                  <TableCell>Độ tin cậy</TableCell>
                  <TableCell>Trạng thái</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {todayLogs.slice(0, 30).map((log, idx) => (
                  <TableRow
                    key={log.id}
                    hover
                    sx={{
                      transition: "background 0.15s",
                      "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
                      "&:last-child td": { border: 0 },
                      animation: `${slideInRight} 0.3s ease-out`,
                      animationDelay: `${idx * 0.03}s`,
                      animationFillMode: "both",
                    }}
                  >
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{formatTime(log.access_time)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{log.patron_name || "Không rõ tên"}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>{log.student_code || log.patron_id || "---"}</Typography>
                    </TableCell>
                    <TableCell><AccessTypeChip type={log.access_type} /></TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{formatCameraId(log.camera_id)}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{formatConfidence(log.confidence)}</TableCell>
                    <TableCell><StatusChip status={log.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* ── Overdue Alert ── */}
      {(borrowStats?.overdue ?? 0) > 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: 3,
            borderColor: "error.main",
            borderWidth: 2,
            bgcolor: (t) => alpha(t.palette.error.main, 0.04),
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Avatar sx={{ bgcolor: STAT_GRADIENT.overdue, width: 44, height: 44 }}>
              <AlertIcon sx={{ fontSize: 24 }} />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "error.main" }}>
                {borrowStats?.overdue} sách quá hạn cần xử lý
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Vui lòng liên hệ độc giả để thu hồi sách
              </Typography>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* ── Borrow Table ── */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ p: 2.5, pb: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
            <BookIcon sx={{ color: "#8b5cf6" }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Sách đang mượn</Typography>
            <Chip
              size="small"
              label={borrowStats?.active ?? 0}
              color="primary"
              sx={{ fontWeight: 700, height: 24 }}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">Các phiếu mượn chưa được trả</Typography>
        </Box>
        {recentBorrows.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <BookIcon sx={{ fontSize: 40, color: "text.disabled" }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Không có sách đang được mượn</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& .MuiTableCell-head": { fontWeight: 700, bgcolor: "action.hover", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" } }}>
                  <TableCell>Sách</TableCell>
                  <TableCell>Độc giả</TableCell>
                  <TableCell>Ngày mượn</TableCell>
                  <TableCell>Hạn trả</TableCell>
                  <TableCell>Trạng thái</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentBorrows.map((record, idx) => {
                  const overdue = new Date(record.due_at) < new Date();
                  return (
                    <TableRow
                      key={record.id}
                      hover
                      selected={overdue}
                      sx={{
                        transition: "background 0.15s",
                        "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
                        "&:last-child td": { border: 0 },
                        animation: `${slideInRight} 0.3s ease-out`,
                        animationDelay: `${idx * 0.04}s`,
                        animationFillMode: "both",
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{record.book?.title || record.book_id}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>{record.book?.isbn || record.book_id}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{record.patron_id}</TableCell>
                      <TableCell sx={{ fontSize: "0.82rem" }}>{new Date(record.borrow_at).toLocaleDateString("vi-VN")}</TableCell>
                      <TableCell sx={{ fontSize: "0.82rem" }}>{new Date(record.due_at).toLocaleDateString("vi-VN")}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={overdue ? "error" : "success"}
                          label={overdue ? "Quá hạn" : "Đúng hạn"}
                          variant="outlined"
                          sx={{ fontWeight: 600, fontSize: "0.72rem", borderRadius: 1.5, animation: `${successPop} 0.35s ease-out` }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Stack>
  );
}
