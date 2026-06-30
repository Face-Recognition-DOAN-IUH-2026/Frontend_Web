"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
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
import { slideInRight, successPop } from "@/lib/animations";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import PageHeader from "@/components/ui/PageHeader";
import DashboardCard from "@/components/ui/DashboardCard";
import MuiStatCard from "@/components/ui/MuiStatCard";
import EmptyState from "@/components/ui/EmptyState";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
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

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchData]);

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

  const statBadges = stats
    ? `${stats.total_patrons} độc giả · ${stats.active_patrons} có mặt · ${stats.today_entries} vào · ${stats.today_exits} ra${sseConnected ? " · Live" : ""}`
    : sseConnected ? "Live" : undefined;

  if (isLoading || !isAuthenticated) {
    return <LoadingOverlay loading message="Đang tải..." />;
  }

  return (
    <Stack spacing={3}>
      {loadError ? <Alert severity="warning">{loadError}</Alert> : null}

      <PageHeader
        title={`Xin chào, ${user?.full_name || user?.email || "Admin"}`}
        subtitle={`Tổng quan hệ thống thư viện — ${new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}`}
        icon={DashboardIcon}
        gradient="linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)"
        statBadges={statBadges}
        onRefresh={fetchData}
        actions={
          <Chip
            icon={<SensorIcon />}
            label={sseConnected ? "Live" : "Auto-refresh"}
            sx={{ bgcolor: "rgba(16,185,129,0.15)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.3)", fontWeight: 600 }}
          />
        }
      />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2 }}>
        <MuiStatCard label="Tổng độc giả" value={stats?.total_patrons ?? "—"} icon={UsersIcon} gradient="linear-gradient(135deg, #6366f1 0%, #4338ca 100%)" pct={100} index={0} />
        <MuiStatCard label="Đang có mặt" value={stats?.active_patrons ?? "—"} icon={UserCheckIcon} gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)" pct={stats?.total_patrons ? (stats.active_patrons / stats.total_patrons) * 100 : 0} index={1} />
        <MuiStatCard label="Lượt vào hôm nay" value={stats?.today_entries ?? "—"} icon={LoginIcon} gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" pct={100} index={2} />
        <MuiStatCard label="Lượt ra hôm nay" value={stats?.today_exits ?? "—"} icon={LogoutIcon} gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" pct={100} index={3} />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "1fr 1fr",
          },
          gap: 3,
          minHeight: 320,
          width: "100%",
          overflow: "hidden",
          alignItems: "start",
        }}
      >
        <DashboardCard
          title="Hoạt động gần đây"
          subtitle="Các lượt ra/vào mới nhất"
          actions={
            <Button
              component={Link}
              href="/history"
              endIcon={<ArrowForwardIcon />}
              size="small"
            >
              Xem tất cả
            </Button>
          }
          noPadding
        >
          <LoadingOverlay loading={loadingData} message="Đang tải...">
            {recentLogs.length === 0 ? (
              <EmptyState
                title="Chưa có hoạt động nào"
                description="Các lượt ra/vào sẽ hiển thị ở đây"
              />
            ) : (
              <TableContainer sx={{ maxHeight: 280, overflowY: "auto" }}>
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
                      <TableRow
                        key={log.id}
                        hover
                        sx={{
                          animation: `${slideInRight} 0.3s ease-out`,
                          animationDelay: `${idx * 0.04}s`,
                          animationFillMode: "both",
                        }}
                      >
                        <TableCell sx={{ fontFamily: "monospace" }}>
                          {formatTime(log.access_time)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {log.patron_name || "Không rõ tên"}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontFamily: "monospace" }}
                          >
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
          </LoadingOverlay>
        </DashboardCard>

        <DashboardCard title="Thao tác nhanh">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 1.5,
            }}
          >
            {quickActions.map((action, idx) => (
              <Paper
                key={action.href}
                variant="outlined"
                component={Link}
                href={action.href}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  textDecoration: "none",
                  borderColor: "divider",
                  transition: "all 0.2s",
                  ...staggerSx(idx, 0.06),
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: "action.hover",
                    transform: "translateY(-1px)",
                    boxShadow: 2,
                  },
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <Avatar sx={{ background: action.gradient, width: 40, height: 40 }}>
                    {action.icon}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                      {action.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {action.description}
                    </Typography>
                  </Box>
                  <ArrowForwardIcon fontSize="small" color="action" />
                </Stack>
              </Paper>
            ))}
          </Box>
        </DashboardCard>
      </Box>
    </Stack>
  );
}

