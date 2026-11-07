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
import LoginIcon from "@mui/icons-material/LoginOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import UserCheckIcon from "@mui/icons-material/HowToRegOutlined";
import UsersIcon from "@mui/icons-material/GroupsOutlined";
import HistoryIcon from "@mui/icons-material/HistoryOutlined";
import MenuBookIcon from "@mui/icons-material/MenuBookOutlined";
import VideocamIcon from "@mui/icons-material/VideocamOutlined";
import { useAuth } from "@/lib/auth-context";
import { slideInRight, successPop } from "@/lib/animations";
import MuiStatCard from "@/app/(dashboard)/_components/ui/MuiStatCard";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import GreetingBar from "@/app/(dashboard)/_components/dashboard/GreetingBar";
import QuickActionBar from "@/app/(dashboard)/_components/dashboard/QuickActionBar";
import HourlyActivityChart from "@/app/(dashboard)/_components/dashboard/HourlyActivityChart";
import CameraStatusGrid from "@/app/(dashboard)/_components/dashboard/CameraStatusGrid";
import BorrowSummaryCard from "@/app/(dashboard)/_components/dashboard/BorrowSummaryCard";
import ConditionAttentionSection from "@/app/(dashboard)/_components/books/ConditionAttentionSection";
import TodayScheduleCard from "@/app/(dashboard)/_components/dashboard/TodayScheduleCard";
import RecentNotificationsCard from "@/app/(dashboard)/_components/dashboard/RecentNotificationsCard";
import { useDashboardData } from "@/hooks/useDashboardData";
import type { AccessLogPublic } from "@/lib/types";

function formatTime(value?: string) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function statusChip(status?: string) {
  if (status === "success" || status === "granted") {
    return (
      <Chip
        size="small"
        label="Thành công"
        sx={{
          height: 22,
          fontSize: "0.7rem",
          fontWeight: 700,
          bgcolor: "rgba(16, 185, 129, 0.12)",
          color: "#059669",
          border: "1px solid rgba(16, 185, 129, 0.25)",
          animation: `${successPop} 0.35s ease-out`,
        }}
      />
    );
  }
  if (status === "denied") {
    return (
      <Chip
        size="small"
        label="Từ chối"
        sx={{
          height: 22,
          fontSize: "0.7rem",
          fontWeight: 700,
          bgcolor: "rgba(239, 68, 68, 0.12)",
          color: "#dc2626",
          border: "1px solid rgba(239, 68, 68, 0.25)",
        }}
      />
    );
  }
  return (
    <Chip
      size="small"
      label={status || "Không rõ"}
      sx={{
        height: 22,
        fontSize: "0.7rem",
        fontWeight: 600,
        bgcolor: "action.hover",
        color: "text.secondary",
      }}
    />
  );
}

function accessTypeChip(type?: string) {
  if (type === "entry") {
    return (
      <Chip
        size="small"
        label="Vào"
        sx={{
          height: 22,
          fontSize: "0.7rem",
          fontWeight: 800,
          bgcolor: "rgba(16, 185, 129, 0.14)",
          color: "#059669",
          border: "1px solid rgba(16, 185, 129, 0.3)",
        }}
      />
    );
  }
  if (type === "exit") {
    return (
      <Chip
        size="small"
        label="Ra"
        sx={{
          height: 22,
          fontSize: "0.7rem",
          fontWeight: 800,
          bgcolor: "rgba(245, 158, 11, 0.14)",
          color: "#d97706",
          border: "1px solid rgba(245, 158, 11, 0.3)",
        }}
      />
    );
  }
  return (
    <Chip
      size="small"
      label={type || "-"}
      sx={{
        height: 22,
        fontSize: "0.7rem",
        bgcolor: "action.hover",
      }}
    />
  );
}

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const data = useDashboardData();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isLoading, isAuthenticated, router]);

  const stats = data.stats;
  const borrowStats = data.borrowStats;
  const cameras = data.cameraStatuses;

  // 1. Góc trên bên trái: Hiện diện thực tế (Active Patrons / Sức chứa phòng đọc)
  const LIBRARY_CAPACITY = 200; // Sức chứa danh định phòng đọc
  const activeCount = stats?.active_patrons ?? 0;
  const occupancyPct = stats?.active_patrons != null
    ? Math.min(100, Math.round((activeCount / LIBRARY_CAPACITY) * 100))
    : undefined;

  // 2. Lưu lượng ra/vào hôm nay & mốc so sánh
  const todayEntries = stats?.today_entries ?? 0;
  const todayExits = stats?.today_exits ?? 0;
  const totalFlow = todayEntries + todayExits;
  const entryPct = totalFlow > 0 ? Math.round((todayEntries / totalFlow) * 100) : undefined;

  // 3. Tình trạng mượn sách & Cảnh báo quá hạn (Tô màu có mục đích)
  const activeBorrows = borrowStats?.active ?? 0;
  const overdueBorrows = borrowStats?.overdue ?? 0;
  const hasOverdue = overdueBorrows > 0;
  const borrowPct = borrowStats?.total && borrowStats.total > 0
    ? Math.min(100, Math.round((activeBorrows / borrowStats.total) * 100))
    : undefined;

  // 4. Trạng thái hạ tầng AI (Camera & Cổng)
  const totalCams = cameras.length;
  const onlineCams = cameras.filter((c) => c.connected && c.running).length;
  const allCamsOnline = totalCams > 0 && onlineCams === totalCams;
  const hasOfflineCams = totalCams > 0 && onlineCams < totalCams;

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

      {/* Lối tắt tác nghiệp 1-chạm cho Thủ thư */}
      <QuickActionBar />

      {/* Dãy chỉ số KPI tuân thủ quy tắc 5 giây (Bấm để mở trang chi tiết) */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2 }}>
        {/* Card 1 (Top-Left): Chỉ số sinh mạng tức thì - Đang có mặt & Sức chứa */}
        <MuiStatCard
          label="Đang có mặt"
          value={stats?.active_patrons ?? "—"}
          icon={UserCheckIcon}
          gradient="linear-gradient(135deg, #0A2540 0%, #0F3C5C 100%)"
          pct={occupancyPct}
          delta={occupancyPct != null ? `${occupancyPct}% sức chứa (${activeCount}/${LIBRARY_CAPACITY} chỗ)` : undefined}
          deltaColor={occupancyPct && occupancyPct >= 90 ? "error" : occupancyPct && occupancyPct >= 75 ? "warning" : "default"}
          href="/active"
          index={0}
        />

        {/* Card 2: Lưu lượng check-in hôm nay kèm mốc đối chiếu lượt ra */}
        <MuiStatCard
          label="Lượt vào hôm nay"
          value={stats?.today_entries ?? "—"}
          icon={LoginIcon}
          gradient="linear-gradient(135deg, #D4AF37 0%, #B89628 100%)"
          pct={entryPct}
          delta={stats ? `Đã check-out: ${todayExits} lượt` : undefined}
          deltaColor="default"
          href="/history"
          index={1}
        />

        {/* Card 3: Sách đang mượn - Chỉ dùng đỏ khi có sách quá hạn */}
        <MuiStatCard
          label="Sách đang mượn"
          value={borrowStats ? activeBorrows : "—"}
          icon={MenuBookIcon}
          gradient={hasOverdue ? "linear-gradient(135deg, #8B0000 0%, #700000 100%)" : "linear-gradient(135deg, #475569 0%, #334155 100%)"}
          pct={borrowPct}
          delta={borrowStats ? (hasOverdue ? `⚠ ${overdueBorrows} cuốn quá hạn cần thu hồi` : "✓ 0 quá hạn (Đúng hạn)") : undefined}
          deltaColor={hasOverdue ? "error" : "success"}
          href={hasOverdue ? "/return" : "/books"}
          index={2}
        />

        {/* Card 4: Hạ tầng AI - Xanh lá khi 100% online, Đỏ khi có thiết bị ngắt kết nối */}
        <MuiStatCard
          label="Camera & Cổng AI"
          value={totalCams > 0 ? `${onlineCams}/${totalCams} Online` : "—"}
          icon={VideocamIcon}
          gradient={hasOfflineCams ? "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)" : allCamsOnline ? "linear-gradient(135deg, #059669 0%, #047857 100%)" : "linear-gradient(135deg, #64748B 0%, #475569 100%)"}
          pct={totalCams > 0 ? Math.round((onlineCams / totalCams) * 100) : undefined}
          delta={totalCams > 0 ? (allCamsOnline ? "● 100% thiết bị hoạt động bình thường" : `⚠ ${totalCams - onlineCams} thiết bị mất kết nối`) : "Chưa có thiết bị"}
          deltaColor={allCamsOnline ? "success" : hasOfflineCams ? "error" : "default"}
          href="/gate"
          index={3}
        />
      </Box>

      {/* Cảnh báo quá hạn có lối xử lý: KPI chỉ báo, banner này dẫn đi thu hồi */}
      {hasOverdue ? (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2.5,
            borderColor: "rgba(139, 0, 0, 0.35)",
            bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(139, 0, 0, 0.15)" : "rgba(254, 242, 242, 0.8)",
            borderWidth: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5,
            boxShadow: "0 4px 16px rgba(139, 0, 0, 0.08)",
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Avatar sx={{ bgcolor: "#8B0000", width: 42, height: 42, boxShadow: "0 2px 8px rgba(139, 0, 0, 0.35)" }}>
              <HistoryIcon sx={{ fontSize: 24, color: "#fff" }} />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#8B0000" }}>
                {overdueBorrows} cuốn sách đã quá hạn mượn cần thu hồi
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Kiểm tra thông tin độc giả và tiếp nhận tại quầy trả sách
              </Typography>
            </Box>
          </Stack>
          <Button
            component={Link}
            href="/return"
            variant="contained"
            color="error"
            endIcon={<ArrowForwardIcon />}
            sx={{ borderRadius: 1.5, textTransform: "none", fontWeight: 700 }}
          >
            Đến quầy trả sách
          </Button>
        </Paper>
      ) : null}

      {/* Hàng 2: Trọng tâm giám sát mật độ cao điểm & Tác nghiệp mượn trả */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, alignItems: "stretch" }}>
        <HourlyActivityChart logs={data.hourlyLogs} loading={data.loading} />
        <BorrowSummaryCard borrowStats={data.borrowStats} borrows={data.activeBorrows} loading={data.loading} />
      </Box>

      {/* Hàng 3: Giám sát chi tiết Camera & Nhật ký ra vào thời gian thực */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, alignItems: "stretch" }}>
        <CameraStatusGrid cameras={data.cameraStatuses} loading={data.loading} />

        <DashboardCard
          title="Hoạt động gần đây"
          subtitle="Các lượt ra/vào mới nhất"
          actions={
            <Button component={Link} href="/history" endIcon={<ArrowForwardIcon />} size="small" sx={{ fontWeight: 700 }}>
              Xem tất cả
            </Button>
          }
          noPadding
        >
          <LoadingOverlay loading={data.loading} message="Đang tải...">
            {data.recentLogs.length === 0 ? (
              <EmptyState title="Chưa có hoạt động nào" description="Các lượt ra/vào sẽ hiển thị ở đây" />
            ) : (
              <TableContainer sx={{ maxHeight: 340, overflowY: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ "& .MuiTableCell-head": { fontWeight: 700, bgcolor: "action.hover", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary", py: 1.25 } }}>
                      <TableCell sx={{ pl: 2.5 }}>Thời gian</TableCell>
                      <TableCell>Độc giả</TableCell>
                      <TableCell align="center">Loại</TableCell>
                      <TableCell align="center" sx={{ pr: 2.5 }}>Trạng thái</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.recentLogs.map((log, idx) => {
                      const initial = (log.patron_name || "U").trim().charAt(0).toUpperCase();
                      return (
                        <TableRow
                          key={log.id}
                          hover
                          sx={{
                            animation: `${slideInRight} 0.3s ease-out`,
                            animationDelay: `${idx * 0.04}s`,
                            animationFillMode: "both",
                            "& td": { py: 1.25 },
                          }}
                        >
                          <TableCell sx={{ pl: 2.5, fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "text.secondary", whiteSpace: "nowrap" }}>
                            {formatTime(log.access_time)}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                              <Avatar
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 1.5,
                                  fontSize: "0.8rem",
                                  fontWeight: 800,
                                  bgcolor: "primary.main",
                                  color: "#fff",
                                }}
                              >
                                {initial}
                              </Avatar>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 800, fontSize: "0.84rem", lineHeight: 1.2 }}>
                                  {log.patron_name || "Không rõ tên"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem" }}>
                                  {log.student_code || log.patron_id || "---"}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell align="center">{accessTypeChip(log.access_type)}</TableCell>
                          <TableCell align="center" sx={{ pr: 2.5 }}>{statusChip(log.status)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </LoadingOverlay>
        </DashboardCard>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, alignItems: "stretch" }}>
        <TodayScheduleCard assignments={data.todaySchedule} loading={data.loading} />
        <RecentNotificationsCard notifications={data.notifications} loading={data.loading} />
      </Box>

      {/* Sách cần xử lý: sửa chữa / thanh lý (Bảo trì kho) */}
      <ConditionAttentionSection />
    </Stack>
  );
}
