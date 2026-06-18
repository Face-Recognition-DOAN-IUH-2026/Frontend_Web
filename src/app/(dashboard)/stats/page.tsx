"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Paper,
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
import api from "@/lib/api-client";
import { fadeInUp, shimmer, slideInRight, successPop } from "@/lib/animations";
import type { AccessLogPublic, ActivePatron, BorrowRecord, CameraEvent, StatsResponse } from "@/lib/types";

type RealtimeState = "connecting" | "connected" | "disconnected";

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
  if (type === "entry") return <Chip size="small" color="success" label="Vào" />;
  if (type === "exit") return <Chip size="small" color="warning" label="Ra" />;
  return <Chip size="small" label={type || "?"} />;
}

function StatusChip({ status }: { status?: string }) {
  if (status === "success" || status === "granted") return <Chip size="small" color="success" label="Thành công" />;
  if (status === "no_match") return <Chip size="small" color="warning" label="Không khớp" />;
  if (status === "expired") return <Chip size="small" color="warning" label="Hết hạn" />;
  if (status === "spoof") return <Chip size="small" color="error" label="Giả mạo" />;
  if (status === "wrong_direction") return <Chip size="small" color="warning" label="Sai chiều" />;
  if (status === "already_granted") return <Chip size="small" color="info" label="Đã ghi nhận" />;
  return <Chip size="small" color="error" label={status === "denied" ? "Từ chối" : "Thất bại"} />;
}

function MetricCard({ label, value, description, icon: Icon, color }: any) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900 }}>{label}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>{value}</Typography>
            <Typography variant="caption" color="text.secondary">{description}</Typography>
          </Box>
          <Avatar sx={{ bgcolor: color, color: "primary.contrastText" }}>
            <Icon />
          </Avatar>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function StatsPage() {
  const theme = useTheme();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [todayLogs, setTodayLogs] = useState<AccessLogPublic[]>([]);
  const [activePatrons, setActivePatrons] = useState<ActivePatron[]>([]);
  const [activeBorrows, setActiveBorrows] = useState<BorrowRecord[]>([]);
  const [borrowStats, setBorrowStats] = useState<{ total: number; active: number; overdue: number } | null>(null);
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
        const [s, logs, active, bStats, allActive] = await Promise.all([
          api.getStats(),
          api.getAccessLogs({ dateFrom: today, limit: 200 }),
          api.getActivePatrons(),
          api.getBorrowStats(),
          api.getAllActiveBorrows(),
        ]);
        setStats(s);
        setTodayLogs(logs.items.filter(isPhysicalAccessLog));
        setActivePatrons(active.items);
        setBorrowStats(bStats);
        setActiveBorrows(allActive || []);
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

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ justifyContent: "space-between" }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Chip color="primary" label="Hôm nay" />
              <Typography variant="body2" color="text.secondary">{todayLabel}</Typography>
            </Stack>
            <Typography variant="h4" sx={{ mt: 1.5 }}>Thống kê vận hành</Typography>
            <Typography variant="body2" color="text.secondary">Theo dõi ra/vào, hiện diện và mượn trả trong ngày</Typography>
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
            <Chip variant="outlined" label={`Tổng độc giả: ${(stats.total_patrons ?? 0).toLocaleString("vi-VN")}`} />
            <Chip color={realtimeColor as any} icon={<RadioIcon />} label={realtimeLabel} />
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2 }}>
        <MetricCard label="Đang trong thư viện" value={activePatrons.length} icon={UserIcon} color={theme.palette.success.main} description="Có mặt hiện tại" />
        <MetricCard label="Vào hôm nay" value={stats.today_entries} icon={LoginIcon} color={theme.palette.info.main} description="Từ 00:00" />
        <MetricCard label="Ra hôm nay" value={stats.today_exits} icon={LogoutIcon} color={theme.palette.warning.main} description="Từ 00:00" />
        <MetricCard label="Hoạt động hôm nay" value={todayLogs.length} icon={ActivityIcon} color={theme.palette.primary.main} description="Camera và kiosk" />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1.45fr 0.9fr" }, gap: 3 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
            <ChartIcon color="primary" />
            <Box>
              <Typography variant="h6">Lượt ra/vào theo giờ hôm nay</Typography>
              <Typography variant="body2" color="text.secondary">Tách lượt vào và ra để nhìn cao điểm trong ngày</Typography>
            </Box>
          </Stack>
          {!hasHourlyData ? (
            <Box sx={{ height: 288, border: 1, borderStyle: "dashed", borderColor: "divider", borderRadius: 1, display: "grid", placeItems: "center", textAlign: "center" }}>
              <Box>
                <ClockIcon color="disabled" />
                <Typography variant="body2" color="text.secondary">Chưa có lượt ra/vào hôm nay</Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ height: 288 }}>
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
                  <Bar dataKey="entry" name="Vào" fill={theme.palette.success.main} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="exit" name="Ra" fill={theme.palette.warning.main} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
            <UserIcon color="primary" />
            <Box>
              <Typography variant="h6">Đang trong thư viện</Typography>
              <Typography variant="body2" color="text.secondary">{activePatrons.length} độc giả đang hiện diện</Typography>
            </Box>
          </Stack>
          {activePatrons.length === 0 ? (
            <Alert severity="info">Không có ai trong thư viện.</Alert>
          ) : (
            <Stack spacing={1} sx={{ maxHeight: 288, overflowY: "auto" }}>
              {activePatrons.slice(0, 20).map((p) => (
                <Paper key={p.id} variant="outlined" sx={{ p: 1.25 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
                      <Avatar sx={{ bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 900 }}>
                        {p.full_name?.charAt(0) || "?"}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap>{p.full_name || "Không rõ tên"}</Typography>
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

      <Paper variant="outlined">
        <Box sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <ActivityIcon color="primary" />
            <Box>
              <Typography variant="h6">Hoạt động hôm nay</Typography>
              <Typography variant="body2" color="text.secondary">Các lượt ra/vào mới nhất từ entry_gate, exit_gate và kiosk</Typography>
            </Box>
          </Stack>
        </Box>
        <Divider />
        {todayLogs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <RadioIcon color="disabled" />
            <Typography variant="body2" color="text.secondary">Chưa có hoạt động hôm nay</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Thời gian</TableCell>
                  <TableCell>Độc giả</TableCell>
                  <TableCell>Loại</TableCell>
                  <TableCell>Camera</TableCell>
                  <TableCell>Độ tin cậy</TableCell>
                  <TableCell>Trạng thái</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {todayLogs.slice(0, 30).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell sx={{ fontFamily: "monospace" }}>{formatTime(log.access_time)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{log.patron_name || "Không rõ tên"}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>{log.student_code || log.patron_id || "---"}</Typography>
                    </TableCell>
                    <TableCell><AccessTypeChip type={log.access_type} /></TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>{formatCameraId(log.camera_id)}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>{formatConfidence(log.confidence)}</TableCell>
                    <TableCell><StatusChip status={log.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, 1fr)" }, gap: 2 }}>
        {[
          { label: "Tổng lượt mượn", value: borrowStats?.total ?? "—", icon: BookIcon, color: theme.palette.primary.main, description: "Tất cả phiếu mượn" },
          { label: "Đang mượn", value: borrowStats?.active ?? "—", icon: BookIcon, color: theme.palette.success.main, description: "Chưa trả" },
          { label: "Quá hạn", value: borrowStats?.overdue ?? "—", icon: AlertIcon, color: theme.palette.error.main, description: "Cần xử lý" },
        ].map((card, idx) => (
          <Box key={card.label} sx={{ animation: `${fadeInUp} 0.35s ease-out`, animationDelay: `${idx * 0.08}s`, animationFillMode: "both" }}>
            <MetricCard {...card} />
          </Box>
        ))}
      </Box>

      <Paper variant="outlined">
        <Box sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <BookIcon color="primary" />
            <Typography variant="h6">Sách đang mượn ({borrowStats?.active ?? 0})</Typography>
            {(borrowStats?.overdue ?? 0) > 0 ? <Chip size="small" color="error" label={`${borrowStats?.overdue ?? 0} quá hạn`} /> : null}
          </Stack>
        </Box>
        <Divider />
        {recentBorrows.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <BookIcon color="disabled" />
            <Typography variant="body2" color="text.secondary">Không có sách đang được mượn</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
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
                    <TableRow key={record.id} selected={overdue} sx={{ animation: `${slideInRight} 0.3s ease-out`, animationDelay: `${idx * 0.04}s`, animationFillMode: "both" }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{record.book?.title || record.book_id}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>{record.book?.isbn || record.book_id}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontFamily: "monospace" }}>{record.patron_id}</TableCell>
                      <TableCell>{new Date(record.borrow_at).toLocaleDateString("vi-VN")}</TableCell>
                      <TableCell>{new Date(record.due_at).toLocaleDateString("vi-VN")}</TableCell>
                      <TableCell><Chip size="small" color={overdue ? "error" : "success"} label={overdue ? "Quá hạn" : "Đúng hạn"} sx={{ animation: `${successPop} 0.35s ease-out` }} /></TableCell>
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
