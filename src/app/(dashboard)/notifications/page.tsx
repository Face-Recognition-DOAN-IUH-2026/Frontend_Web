"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Pagination,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  NotificationsOutlined,
  ErrorOutlined,
  CalendarMonthOutlined,
  BadgeOutlined,
  ShieldOutlined,
  BarChartOutlined,
  PersonOffOutlined,
  MenuBookOutlined,
} from "@mui/icons-material";
import api from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { Notification } from "@/lib/types";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import { staggerSx } from "@/lib/useStaggeredAnimation";

const NOTIFICATION_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  borrow_overdue: { icon: <ErrorOutlined />, color: "error.main", label: "Quá hạn mượn" },
  book_available: { icon: <MenuBookOutlined />, color: "success.main", label: "Sách có sẵn" },
  schedule_change: { icon: <CalendarMonthOutlined />, color: "warning.main", label: "Thay đổi lịch" },
  membership_expiry: { icon: <BadgeOutlined />, color: "info.main", label: "Hạn thẻ" },
  access_anomaly: { icon: <ShieldOutlined />, color: "error.main", label: "Bất thường truy cập" },
  daily_stats: { icon: <BarChartOutlined />, color: "primary.main", label: "Báo cáo thống kê" },
  staff_absence: { icon: <PersonOffOutlined />, color: "warning.main", label: "Nhân viên vắng mặt" },
};

function getConfig(type: string) {
  return NOTIFICATION_CONFIG[type] || { icon: <NotificationsOutlined />, color: "primary.main", label: "Thông báo" };
}

function formatRelativeTime(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const pageSize = 20;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const result = await api.getNotifications({
        unread: filter === "unread" ? true : undefined,
        skip: (page - 1) * pageSize,
        limit: pageSize,
      });
      setNotifications(result.items);
      setTotal(result.total);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, filter, page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      fetchNotifications();
    } catch {
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await api.markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
      } catch {
      }
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPages = Math.ceil(total / pageSize);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (authLoading) {
    return <LoadingOverlay loading message="Đang tải..." />;
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 800, mx: "auto" }}>
      <PageHeader
        title="Thông báo"
        icon={NotificationsOutlined}
        gradient="linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #818cf8 100%)"
        statBadges={unreadCount > 0 ? `${unreadCount} chưa đọc` : undefined}
        onRefresh={fetchNotifications}
        actions={
          <Typography
            variant="body2"
            sx={{ color: "#c7d2fe", cursor: "pointer", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}
            onClick={handleMarkAllRead}
          >
            Đánh dấu đã đọc tất cả
          </Typography>
        }
      />

      <DashboardCard
        title="Danh sách thông báo"
        actions={
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_, v) => { if (v) { setFilter(v); setPage(1); } }}
            size="small"
          >
            <ToggleButton value="all">Tất cả</ToggleButton>
            <ToggleButton value="unread">Chưa đọc</ToggleButton>
          </ToggleButtonGroup>
        }
      >
        <LoadingOverlay loading={loading} message="Đang tải thông báo...">
          {notifications.length === 0 ? (
            <EmptyState
              icon={<NotificationsOutlined />}
              title={filter === "unread" ? "Không có thông báo chưa đọc" : "Không có thông báo"}
            />
          ) : (
            <Box>
              {notifications.map((notification, index) => {
                const config = getConfig(notification.type);
                return (
                  <Paper
                    key={notification.id}
                    variant="outlined"
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      p: 2,
                      mb: 1,
                      display: "flex",
                      gap: 2,
                      cursor: "pointer",
                      bgcolor: notification.isRead ? "transparent" : "action.hover",
                      borderColor: notification.isRead ? "divider" : "primary.light",
                      "&:hover": { bgcolor: "action.selected" },
                      ...staggerSx(index),
                    }}
                  >
                    <Box sx={{ color: config.color, mt: 0.5 }}>{config.icon}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: notification.isRead ? 400 : 700 }} noWrap>
                          {notification.title}
                        </Typography>
                        {!notification.isRead ? (
                          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "error.main", flexShrink: 0 }} />
                        ) : null}
                      </Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: expandedIds.has(notification.id) ? "unset" : 2,
                          WebkitBoxOrient: "vertical",
                          overflow: expandedIds.has(notification.id) ? "visible" : "hidden",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {notification.body}
                      </Typography>
                      {(notification.body?.length ?? 0) > 100 ? (
                        <Typography
                          variant="caption"
                          color="primary.main"
                          sx={{ cursor: "pointer", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(notification.id);
                          }}
                        >
                          {expandedIds.has(notification.id) ? "Thu gọn" : "Xem thêm"}
                        </Typography>
                      ) : null}
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
                        {formatRelativeTime(notification.createdAt)}
                      </Typography>
                    </Box>
                  </Paper>
                );
              })}
              {totalPages > 1 ? (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                  <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
                </Box>
              ) : null}
            </Box>
          )}
        </LoadingOverlay>
      </DashboardCard>
    </Stack>
  );
}
