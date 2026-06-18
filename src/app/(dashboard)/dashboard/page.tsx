"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
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
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import ClockIcon from "@mui/icons-material/ScheduleOutlined";
import LoginIcon from "@mui/icons-material/LoginOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import PersonAddIcon from "@mui/icons-material/PersonAddAltOutlined";
import StatsIcon from "@mui/icons-material/BarChartOutlined";
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

function MetricCard({ label, value, description, icon: Icon, color }: any) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900 }}>{label}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5 }}>{value}</Typography>
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

function QuickAction({
  href,
  icon: Icon,
  label,
  description,
  color,
}: {
  href: string;
  icon: any;
  label: string;
  description: string;
  color: string;
}) {
  return (
    <Card variant="outlined">
      <CardActionArea component={Link} href={href} sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Avatar sx={{ width: 38, height: 38, bgcolor: color, color: "primary.contrastText" }}>
            <Icon fontSize="small" />
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap>{label}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{description}</Typography>
          </Box>
          <ArrowForwardIcon fontSize="small" color="disabled" />
        </Stack>
      </CardActionArea>
    </Card>
  );
}

export default function DashboardPage() {
  const theme = useTheme();
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AccessLogPublic[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState("");

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
          { href: "/enroll", icon: PersonAddIcon, label: "Đăng ký khuôn mặt", description: "Tạo dữ liệu nhận diện", color: theme.palette.primary.main },
          { href: "/patrons", icon: UsersIcon, label: "Quản lý độc giả", description: "Tra cứu và cập nhật hồ sơ", color: theme.palette.info.main },
          { href: "/return", icon: BookIcon, label: "Trả sách", description: "Xử lý sách đang mượn", color: theme.palette.warning.main },
          { href: "/stats", icon: StatsIcon, label: "Xem thống kê", description: "Theo dõi vận hành trong ngày", color: theme.palette.success.main },
        ]
      : [];
    return [
      ...adminActions,
      { href: "/active", icon: UserCheckIcon, label: "Đang có mặt", description: "Danh sách trong thư viện", color: theme.palette.success.main },
      { href: "/history", icon: ClockIcon, label: "Lịch sử ra vào", description: "Nhật ký camera và kiosk", color: theme.palette.info.main },
    ];
  }, [role, theme.palette.info.main, theme.palette.primary.main, theme.palette.success.main, theme.palette.warning.main]);

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

  const metrics = useMemo(() => [
    { label: "Tổng độc giả", value: stats?.total_patrons ?? "—", icon: UsersIcon, color: theme.palette.primary.main, description: "Đã đăng ký" },
    { label: "Đang có mặt", value: stats?.active_patrons ?? "—", icon: UserCheckIcon, color: theme.palette.success.main, description: "Trong thư viện" },
    { label: "Lượt vào hôm nay", value: stats?.today_entries ?? "—", icon: LoginIcon, color: theme.palette.info.main, description: "Từ 00:00" },
    { label: "Lượt ra hôm nay", value: stats?.today_exits ?? "—", icon: LogoutIcon, color: theme.palette.warning.main, description: "Từ 00:00" },
  ], [stats, theme.palette]);

  return (
    <Stack spacing={3}>
      {loadError ? <Alert severity="warning">{loadError}</Alert> : null}

      {/* Bento Grid Layout */}
      <Box sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(6, 1fr)" },
        gap: 2,
      }}>
        {/* Metric cards - each spans 1 column on lg, 1 on sm, full on xs */}
        {metrics.map((card, idx) => (
          <Box key={card.label} sx={{
            gridColumn: { xs: "span 1", sm: "span 1", lg: "span 1" },
            animation: `${fadeInUp} 0.35s ease-out`,
            animationDelay: `${idx * 0.08}s`,
            animationFillMode: "both",
          }}>
            <MetricCard {...card} />
          </Box>
        ))}

        {/* Recent activity - spans 4 columns (hero), same row as quick actions */}
        <Paper variant="outlined" sx={{
          gridColumn: { xs: "span 1", sm: "span 2", lg: "span 4" },
          animation: `${fadeInUp} 0.4s ease-out`,
          animationDelay: "0.1s",
          animationFillMode: "both",
        }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", p: 2 }}>
            <Box>
              <Typography variant="h6">Hoạt động gần đây</Typography>
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
                    <TableCell>Thời gian</TableCell>
                    <TableCell>Độc giả</TableCell>
                    <TableCell>Loại</TableCell>
                    <TableCell>Trạng thái</TableCell>
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

        {/* Quick actions - spans 2 columns */}
        <Paper variant="outlined" sx={{
          p: 2,
          gridColumn: { xs: "span 1", sm: "span 2", lg: "span 2" },
          animation: `${fadeInUp} 0.45s ease-out`,
          animationDelay: "0.15s",
          animationFillMode: "both",
        }}>
          <Typography variant="h6">Thao tác nhanh</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Đi đến các luồng vận hành thường dùng</Typography>
          <Stack spacing={1.25}>
            {quickActions.map((action, idx) => (
              <Box key={action.href} sx={{ animation: `${fadeInUp} 0.3s ease-out`, animationDelay: `${idx * 0.06}s`, animationFillMode: "both" }}>
                <QuickAction {...action} />
              </Box>
            ))}
          </Stack>
        </Paper>

        {/* AI mini-summary card - spans full width if admin */}
        {role === "admin" && (
          <Paper
            variant="outlined"
            component={Link}
            href="/ai-command-center"
            sx={{
              gridColumn: { xs: "span 1", sm: "span 2", lg: "span 6" },
              p: 2,
              textDecoration: "none",
              cursor: "pointer",
              animation: `${fadeInUp} 0.4s ease-out`,
              animationDelay: "0.2s",
              animationFillMode: "both",
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: "action.hover",
              },
            }}
          >
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Avatar sx={{ bgcolor: "primary.main", color: "primary.contrastText", borderRadius: 2 }}>
                <AutoAwesomeIcon />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>AI Command Center</Typography>
                <Typography variant="body2" color="text.secondary">
                  Phân tích vận hành thư viện bởi AI — cảnh báo, thống kê và đề xuất thông minh
                </Typography>
              </Box>
              <ArrowForwardIcon color="disabled" />
            </Stack>
          </Paper>
        )}
      </Box>
    </Stack>
  );
}
