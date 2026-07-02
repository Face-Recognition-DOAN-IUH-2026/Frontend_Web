"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
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
import LoginIcon from "@mui/icons-material/LoginOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import UserCheckIcon from "@mui/icons-material/HowToRegOutlined";
import UsersIcon from "@mui/icons-material/GroupsOutlined";
import HistoryIcon from "@mui/icons-material/HistoryOutlined";
import { useAuth } from "@/lib/auth-context";
import { slideInRight, successPop } from "@/lib/animations";
import MuiStatCard from "@/app/(dashboard)/_components/ui/MuiStatCard";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import GreetingBar from "@/app/(dashboard)/_components/dashboard/GreetingBar";
import HourlyActivityChart from "@/app/(dashboard)/_components/dashboard/HourlyActivityChart";
import CameraStatusGrid from "@/app/(dashboard)/_components/dashboard/CameraStatusGrid";
import BorrowSummaryCard from "@/app/(dashboard)/_components/dashboard/BorrowSummaryCard";
import TodayScheduleCard from "@/app/(dashboard)/_components/dashboard/TodayScheduleCard";
import RecentNotificationsCard from "@/app/(dashboard)/_components/dashboard/RecentNotificationsCard";
import { useDashboardData } from "@/hooks/useDashboardData";
import type { AccessLogPublic } from "@/lib/types";

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
  const data = useDashboardData();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isLoading, isAuthenticated, router]);

  const stats = data.stats;

  if (isLoading || !isAuthenticated) {
    return <LoadingOverlay loading message="Đang tải..." />;
  }

  return (
    <Stack spacing={3}>
      {data.error ? <Alert severity="warning">{data.error}</Alert> : null}

      <GreetingBar
        userName={user?.full_name || user?.email || "Admin"}
        onRefresh={data.refresh}
        liveConnected={!!stats}
      />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2 }}>
        <MuiStatCard label="Tổng độc giả" value={stats?.total_patrons ?? "—"} icon={UsersIcon} gradient="linear-gradient(135deg, #6366f1 0%, #4338ca 100%)" pct={100} index={0} />
        <MuiStatCard label="Đang có mặt" value={stats?.active_patrons ?? "—"} icon={UserCheckIcon} gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)" pct={stats?.total_patrons ? (stats.active_patrons / stats.total_patrons) * 100 : 0} index={1} />
        <MuiStatCard label="Lượt vào hôm nay" value={stats?.today_entries ?? "—"} icon={LoginIcon} gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" pct={100} index={2} />
        <MuiStatCard label="Lượt ra hôm nay" value={stats?.today_exits ?? "—"} icon={LogoutIcon} gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" pct={100} index={3} />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, alignItems: "start" }}>
        <HourlyActivityChart logs={data.hourlyLogs} loading={data.loading} />
        <CameraStatusGrid cameras={data.cameraStatuses} loading={data.loading} />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, alignItems: "start" }}>
        <BorrowSummaryCard borrowStats={data.borrowStats} borrows={data.activeBorrows} loading={data.loading} />

        <DashboardCard
          title="Hoạt động gần đây"
          subtitle="Các lượt ra/vào mới nhất"
          actions={
            <Button component={Link} href="/history" endIcon={<ArrowForwardIcon />} size="small">
              Xem tất cả
            </Button>
          }
          noPadding
        >
          <LoadingOverlay loading={data.loading} message="Đang tải...">
            {data.recentLogs.length === 0 ? (
              <EmptyState title="Chưa có hoạt động nào" description="Các lượt ra/vào sẽ hiển thị ở đây" />
            ) : (
              <TableContainer sx={{ maxHeight: 320, overflowY: "auto" }}>
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
                    {data.recentLogs.map((log, idx) => (
                      <TableRow
                        key={log.id}
                        hover
                        sx={{
                          animation: `${slideInRight} 0.3s ease-out`,
                          animationDelay: `${idx * 0.04}s`,
                          animationFillMode: "both",
                        }}
                      >
                        <TableCell sx={{ fontFamily: "monospace" }}>{formatTime(log.access_time)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {log.patron_name || "Không rõ tên"}
                          </Typography>
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
          </LoadingOverlay>
        </DashboardCard>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, alignItems: "start" }}>
        <TodayScheduleCard assignments={data.todaySchedule} loading={data.loading} />
        <RecentNotificationsCard notifications={data.notifications} loading={data.loading} />
      </Box>
    </Stack>
  );
}
