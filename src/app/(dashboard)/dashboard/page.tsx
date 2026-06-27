"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
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
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import ClockIcon from "@mui/icons-material/ScheduleOutlined";
import DashboardIcon from "@mui/icons-material/DashboardOutlined";
import LoginIcon from "@mui/icons-material/LoginOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import PersonAddIcon from "@mui/icons-material/PersonAddAltOutlined";
import SensorIcon from "@mui/icons-material/SensorsOutlined";
import StatsIcon from "@mui/icons-material/InsertChartOutlined";
import UserCheckIcon from "@mui/icons-material/HowToRegOutlined";
import UsersIcon from "@mui/icons-material/GroupsOutlined";
import api from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { fadeInUp, shimmer, slideInRight, successPop } from "@/lib/animations";
import type { AccessLogPublic } from "@/lib/types";

interface Stats {
  total_patrons: number;
  active_patrons: number;
  today_entries: number;
  today_exits: number;
}

function formatTime(value?: string) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function statusChip(status?: string) {
  if (status === "success" || status === "granted") return <Chip size="small" color="success" label="Thành công" sx={{ animation: `${successPop} 0.35s ease-out` }} />;
  if (status === "denied") return <Chip size="small" color="error" label="Từ chối" />;
  return <Chip size="small" color="warning" label={status || "Không rõ"} />;
}

function accessTypeChip(type?: string) {
  if (type === "entry") return <Chip size="small" color="success" label="Vào" />;
  if (type === "exit") return <Chip size="small" color="warning" label="Ra" />;
  return <Chip size="small" label={type || "-"} />;
}

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AccessLogPublic[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sseConnected, setSseConnected] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchData() {
      try {
        setLoadError("");
        const [statsData, logsData] = await Promise.all([
          api.getStats().catch(() => null),
          api.getRecentLogs().catch(() => null),
        ]);

        if (statsData) {
          setStats({
            total_patrons: statsData.total_patrons || 0,
            active_patrons: statsData.active_patrons || 0,
            today_entries: statsData.today_entries || 0,
            today_exits: statsData.today_exits || 0,
          });
          setSseConnected(true);
        }

        if (logsData?.items) setRecentLogs(logsData.items.slice(0, 8));
      } catch {
        setLoadError("Không thể tải dữ liệu tổng quan.");
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const role = user?.role || "staff";
  const quickActions = useMemo(() => {
    const adminActions = role === "admin"
      ? [
          { href: "/enroll", icon: <PersonAddIcon />, label: "Đăng ký khuôn mặt", description: "Tạo dữ liệu nhận diện", gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)" },
          { href: "/patrons", icon: <UsersIcon />, label: "Quản lý độc giả", description: "Tra cứu và cập nhật hồ sơ", gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" },
          { href: "/return", icon: <BookIcon />, label: "Trả sách", description: "Xử lý sách đang mượn", gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" },
          { href: "/stats", icon: <StatsIcon />, label: "Xem thống kê", description: "Theo dõi vận hành trong ngày", gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)" },
        ]
      : [];
    return [
      ...adminActions,
      { href: "/active", icon: <UserCheckIcon />, label: "Đang có mặt", description: "Danh sách trong thư viện", gradient: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)" },
      { href: "/history", icon: <ClockIcon />, label: "Lịch sử ra vào", description: "Nhật ký camera và kiosk", gradient: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)" },
    ];
  }, [role]);

  if (isLoading || !isAuthenticated) {
    return (
      <Box sx={{ minHeight: 400, display: "grid", placeItems: "center" }}>
        <Stack spacing={2} sx={{ alignItems: "center" }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">Đang tải...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      {loadError ? <Alert severity="warning">{loadError}</Alert> : null}

      {/* Gradient Header */}
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
            <DashboardIcon sx={{ color: "#a5b4fc", fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#e0e7ff" }}>
              Xin chào, {user?.full_name || user?.email || "Admin"}
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(199,210,254,0.7)", mt: 0.3 }}>
              Tổng quan hệ thống thư viện — {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ zIndex: 1 }}>
          <Chip icon={<SensorIcon />} label={sseConnected ? "Live" : "Auto-refresh"}
            sx={{ bgcolor: "rgba(16,185,129,0.15)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.3)", fontWeight: 600 }} />
        </Stack>
      </Box>

      {/* Gradient Stat Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2 }}>
        {[
          { key: "patrons", label: "Tổng độc giả", value: stats?.total_patrons ?? "—", icon: <UsersIcon sx={{ fontSize: 22 }} />, gradient: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", desc: "Đã đăng ký", pct: 100 },
          { key: "active", label: "Đang có mặt", value: stats?.active_patrons ?? "—", icon: <UserCheckIcon sx={{ fontSize: 22 }} />, gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)", desc: "Trong thư viện", pct: stats?.total_patrons ? (stats.active_patrons / stats.total_patrons) * 100 : 0 },
          { key: "entries", label: "Lượt vào hôm nay", value: stats?.today_entries ?? "—", icon: <LoginIcon sx={{ fontSize: 22 }} />, gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", desc: "Từ 00:00", pct: 100 },
          { key: "exits", label: "Lượt ra hôm nay", value: stats?.today_exits ?? "—", icon: <LogoutIcon sx={{ fontSize: 22 }} />, gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", desc: "Từ 00:00", pct: 100 },
        ].map((s, idx) => (
          <Paper key={s.key} variant="outlined" sx={{
            p: 2.5, borderRadius: 3, position: "relative", overflow: "hidden", borderColor: "divider",
            transition: "transform 0.2s, box-shadow 0.2s",
            animation: `${fadeInUp} 0.4s ease-out`, animationDelay: `${idx * 0.07}s`, animationFillMode: "both",
            "&:hover": { transform: "translateY(-2px)", boxShadow: 4 },
          }}>
            <Box sx={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: s.gradient, opacity: 0.12, borderRadius: "0 12px 0 80px" }} />
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
              <Avatar sx={{ background: s.gradient, width: 44, height: 44, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>{s.icon}</Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.desc}</Typography>
              </Box>
            </Stack>
            <LinearProgress variant="determinate" value={s.pct} sx={{ mt: 1.5, height: 3, borderRadius: 2, bgcolor: "action.hover", "& .MuiLinearProgress-bar": { background: s.gradient, borderRadius: 2 } }} />
          </Paper>
        ))}
      </Box>

      {/* Recent Activity + Quick Actions */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "8fr 4fr" }, gap: 3 }}>
        {/* Recent Activity */}
        <Paper variant="outlined" sx={{ borderRadius: 3, borderColor: "divider" }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", p: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Hoạt động gần đây</Typography>
              <Typography variant="body2" color="text.secondary">Các lượt ra/vào mới nhất</Typography>
            </Box>
            <Button component={Link} href="/history" endIcon={<ArrowForwardIcon />} size="small">Xem tất cả</Button>
          </Stack>
          <Divider />
          {loadingData ? (
            <Box sx={{ p: 5, display: "grid", placeItems: "center" }}>
              <CircularProgress size={28} sx={{ animation: `${shimmer} 1.5s ease-in-out infinite` }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Đang tải...</Typography>
            </Box>
          ) : recentLogs.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>Chưa có hoạt động nào.</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Thời gian</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Độc giả</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Loại</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentLogs.map((log, idx) => (
                    <TableRow key={log.id} hover sx={{ animation: `${slideInRight} 0.3s ease-out`, animationDelay: `${idx * 0.04}s`, animationFillMode: "both" }}>
                      <TableCell sx={{ fontFamily: "monospace" }}>{formatTime(log.access_time)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{log.patron_name || "Không rõ tên"}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                          {log.student_code || log.patron_id || "---"}
                        </Typography>
                      </TableCell>
                      <TableCell>{accessTypeChip(log.access_type)}</TableCell>
                      <TableCell>{statusChip(log.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Quick Actions */}
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, borderColor: "divider" }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Thao tác nhanh</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1.5 }}>
            {quickActions.map((action, idx) => (
              <Paper key={action.href} variant="outlined" component={Link} href={action.href}
                sx={{
                  p: 2, borderRadius: 2, textDecoration: "none", borderColor: "divider",
                  transition: "all 0.2s",
                  animation: `${fadeInUp} 0.3s ease-out`, animationDelay: `${idx * 0.06}s`, animationFillMode: "both",
                  "&:hover": { borderColor: "primary.main", bgcolor: "action.hover", transform: "translateY(-1px)", boxShadow: 2 },
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <Avatar sx={{ background: action.gradient, width: 40, height: 40 }}>{action.icon}</Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{action.label}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>{action.description}</Typography>
                  </Box>
                  <ArrowForwardIcon fontSize="small" color="action" />
                </Stack>
              </Paper>
            ))}
          </Box>
        </Paper>
      </Box>
    </Stack>
  );
}