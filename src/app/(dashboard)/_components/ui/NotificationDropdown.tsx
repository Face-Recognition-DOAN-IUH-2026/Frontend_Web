"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Box, CircularProgress, Paper, Typography } from "@mui/material";
import {
  NotificationsOutlined,
  ErrorOutlined,
  CalendarMonthOutlined,
  BadgeOutlined,
  ShieldOutlined,
  BarChartOutlined,
  PersonOffOutlined,
  MenuBookOutlined,
  LocalFireDepartmentOutlined,
} from "@mui/icons-material";
import api from "@/lib/api-client";
import type { Notification } from "@/lib/types";

const NOTIFICATION_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  borrow: { icon: <MenuBookOutlined fontSize="small" />, color: "success.main", label: "Mượn sách" },
  return: { icon: <MenuBookOutlined fontSize="small" />, color: "primary.main", label: "Trả sách" },
  book_available: { icon: <MenuBookOutlined fontSize="small" />, color: "success.main", label: "Sách có sẵn" },
  overdue_reminder: { icon: <ErrorOutlined fontSize="small" />, color: "error.main", label: "Quá hạn" },
  due_soon_reminder: { icon: <ErrorOutlined fontSize="small" />, color: "warning.main", label: "Sắp đến hạn" },
  fine_notice: { icon: <ErrorOutlined fontSize="small" />, color: "error.main", label: "Phí phạt" },
  schedule_change: { icon: <CalendarMonthOutlined fontSize="small" />, color: "warning.main", label: "Lịch trực" },
  shift_reminder: { icon: <CalendarMonthOutlined fontSize="small" />, color: "secondary.main", label: "Nhắc lịch" },
  membership_expiry: { icon: <BadgeOutlined fontSize="small" />, color: "error.main", label: "Hạn thẻ" },
  anomaly_alert: { icon: <ShieldOutlined fontSize="small" />, color: "error.main", label: "Bất thường" },
  fire_hazard: { icon: <LocalFireDepartmentOutlined fontSize="small" />, color: "error.main", label: "Cảnh báo cháy" },
  hazard_alert: { icon: <LocalFireDepartmentOutlined fontSize="small" />, color: "error.main", label: "Nguy cơ cháy" },
  smoke_alert: { icon: <ShieldOutlined fontSize="small" />, color: "warning.main", label: "Cảnh báo khói" },
  smoke_hazard: { icon: <ShieldOutlined fontSize="small" />, color: "warning.main", label: "Phát hiện khói" },
  daily_report: { icon: <BarChartOutlined fontSize="small" />, color: "primary.main", label: "Thống kê" },
  staff_absence: { icon: <PersonOffOutlined fontSize="small" />, color: "warning.main", label: "Vắng mặt" },
  bid_warning: { icon: <ErrorOutlined fontSize="small" />, color: "warning.main", label: "Đấu giá" },
  swap_warning: { icon: <ErrorOutlined fontSize="small" />, color: "warning.main", label: "Đổi ca" },
};

function getConfig(type: string) {
  return NOTIFICATION_CONFIG[type] || { icon: <NotificationsOutlined fontSize="small" />, color: "primary.main", label: "Thông báo" };
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

interface NotificationDropdownProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}

export default function NotificationDropdown({ anchorEl, open, onClose }: NotificationDropdownProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!open) return;
    try {
      setLoading(true);
      const result = await api.getNotifications({ limit: 20 });
      setNotifications(result.items);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        anchorEl &&
        !anchorEl.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose, anchorEl]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // silently fail
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
        // silently fail
      }
    }
    onClose();
    router.push("/notifications");
  };

  if (!open) return null;

  return (
    <Paper
      ref={dropdownRef}
      elevation={8}
      onClick={(e) => e.stopPropagation()}
      sx={{
        position: "absolute",
        top: "100%",
        right: 0,
        mt: 1,
        width: 380,
        maxHeight: 480,
        borderRadius: 2,
        overflow: "hidden",
        zIndex: 1300,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Thông báo
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: "primary.main", cursor: "pointer", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}
          onClick={handleMarkAllRead}
        >
          Đánh dấu đã đọc tất cả
        </Typography>
      </Box>

      <Box sx={{ maxHeight: 400, overflow: "auto" }}>
        {loading ? (
          <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <NotificationsOutlined sx={{ fontSize: 40, color: "text.secondary", mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Không có thông báo
            </Typography>
          </Box>
        ) : (
          notifications.map((notification) => {
            const config = getConfig(notification.type);
            return (
              <Box
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  p: 2,
                  display: "flex",
                  gap: 1.5,
                  cursor: "pointer",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  bgcolor: notification.isRead ? "transparent" : "action.hover",
                  "&:hover": { bgcolor: "action.selected" },
                }}
              >
                <Box sx={{ color: config.color, mt: 0.5 }}>{config.icon}</Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: notification.isRead ? 400 : 700 }} noWrap>
                    {notification.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {notification.body}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
                    {formatRelativeTime(notification.createdAt)}
                  </Typography>
                </Box>
                {!notification.isRead && (
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "error.main", mt: 1, flexShrink: 0 }} />
                )}
              </Box>
            );
          })
        )}
      </Box>
    </Paper>
  );
}
