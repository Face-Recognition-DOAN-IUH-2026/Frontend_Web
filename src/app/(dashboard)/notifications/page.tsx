"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListSubheader,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import DoneAllOutlinedIcon from "@mui/icons-material/DoneAllOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import AssignmentReturnedOutlinedIcon from "@mui/icons-material/AssignmentReturnedOutlined";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import LocalFireDepartmentOutlinedIcon from "@mui/icons-material/LocalFireDepartmentOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import PersonOffOutlinedIcon from "@mui/icons-material/PersonOffOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import ExpandLessOutlinedIcon from "@mui/icons-material/ExpandLessOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import DateRangeOutlinedIcon from "@mui/icons-material/DateRangeOutlined";

import api from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import type { Notification } from "@/lib/types";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import { staggerSx } from "@/lib/useStaggeredAnimation";

interface NotificationTypeMeta {
  icon: React.ReactNode;
  color: string;
  label: string;
  category: "borrow" | "schedule" | "system";
  route?: string;
  routeLabel?: string;
}

const NOTIFICATION_CONFIG: Record<string, NotificationTypeMeta> = {
  borrow: {
    icon: <MenuBookOutlinedIcon fontSize="small" />,
    color: "#059669",
    label: "Mượn sách",
    category: "borrow",
    route: "/borrow",
    routeLabel: "Xem phiếu mượn",
  },
  return: {
    icon: <AssignmentReturnedOutlinedIcon fontSize="small" />,
    color: "#0284C7",
    label: "Trả sách",
    category: "borrow",
    route: "/return",
    routeLabel: "Ghi nhận trả",
  },
  book_available: {
    icon: <AutoStoriesOutlinedIcon fontSize="small" />,
    color: "#059669",
    label: "Sách có sẵn",
    category: "borrow",
    route: "/books",
    routeLabel: "Xem sách",
  },
  overdue_reminder: {
    icon: <WarningAmberOutlinedIcon fontSize="small" />,
    color: "#DC2626",
    label: "Quá hạn",
    category: "borrow",
    route: "/borrow",
    routeLabel: "Xử lý quá hạn",
  },
  due_soon_reminder: {
    icon: <AccessTimeOutlinedIcon fontSize="small" />,
    color: "#D97706",
    label: "Sắp đến hạn",
    category: "borrow",
    route: "/borrow",
    routeLabel: "Kiểm tra hạn",
  },
  fine_notice: {
    icon: <ReceiptLongOutlinedIcon fontSize="small" />,
    color: "#DC2626",
    label: "Phí phạt",
    category: "borrow",
    route: "/borrow",
    routeLabel: "Thu phí phạt",
  },
  schedule_change: {
    icon: <CalendarMonthOutlinedIcon fontSize="small" />,
    color: "#7C3AED",
    label: "Lịch trực",
    category: "schedule",
    route: "/staff-schedules",
    routeLabel: "Mở lịch trực",
  },
  shift_reminder: {
    icon: <EventNoteOutlinedIcon fontSize="small" />,
    color: "#2563EB",
    label: "Nhắc ca",
    category: "schedule",
    route: "/staff-schedules",
    routeLabel: "Xem ca trực",
  },
  staff_absence: {
    icon: <PersonOffOutlinedIcon fontSize="small" />,
    color: "#D97706",
    label: "Vắng mặt",
    category: "schedule",
    route: "/staff-schedules",
    routeLabel: "Sắp xếp lại ca",
  },
  bid_warning: {
    icon: <WarningAmberOutlinedIcon fontSize="small" />,
    color: "#D97706",
    label: "Đăng ký ca",
    category: "schedule",
    route: "/staff-schedules",
    routeLabel: "Duyệt đăng ký",
  },
  swap_warning: {
    icon: <SwapHorizOutlinedIcon fontSize="small" />,
    color: "#D97706",
    label: "Đổi ca trực",
    category: "schedule",
    route: "/staff-schedules",
    routeLabel: "Duyệt đổi ca",
  },
  membership_expiry: {
    icon: <BadgeOutlinedIcon fontSize="small" />,
    color: "#DC2626",
    label: "Hạn thẻ",
    category: "system",
    route: "/patrons",
    routeLabel: "Gia hạn thẻ",
  },
  anomaly_alert: {
    icon: <ShieldOutlinedIcon fontSize="small" />,
    color: "#DC2626",
    label: "Bất thường",
    category: "system",
    route: "/history",
    routeLabel: "Lịch sử ra vào",
  },
  fire_hazard: {
    icon: <LocalFireDepartmentOutlinedIcon fontSize="small" />,
    color: "#DC2626",
    label: "Báo động cháy",
    category: "system",
  },
  hazard_alert: {
    icon: <LocalFireDepartmentOutlinedIcon fontSize="small" />,
    color: "#DC2626",
    label: "Nguy cơ",
    category: "system",
  },
  smoke_alert: {
    icon: <ShieldOutlinedIcon fontSize="small" />,
    color: "#D97706",
    label: "Khói bất thường",
    category: "system",
  },
  smoke_hazard: {
    icon: <ShieldOutlinedIcon fontSize="small" />,
    color: "#D97706",
    label: "Khói phát hiện",
    category: "system",
  },
  daily_report: {
    icon: <BarChartOutlinedIcon fontSize="small" />,
    color: "#0284C7",
    label: "Thống kê",
    category: "system",
    route: "/stats",
    routeLabel: "Xem thống kê",
  },
};

function getConfig(type: string): NotificationTypeMeta {
  return (
    NOTIFICATION_CONFIG[type] || {
      icon: <NotificationsOutlinedIcon fontSize="small" />,
      color: "#0284C7",
      label: "Hệ thống",
      category: "system",
    }
  );
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
  if (diffDay === 1) return "Hôm qua";
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type TabCategory = "all" | "unread" | "borrow" | "schedule" | "system";

export default function NotificationsPage() {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabCategory>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const pageSize = 20;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const isUnreadOnly = activeTab === "unread";
      const result = await api.getNotifications({
        unread_only: isUnreadOnly ? true : undefined,
        skip: (page - 1) * pageSize,
        limit: pageSize,
      });

      setNotifications(result.items);
      setTotal(result.total);
      if (typeof result.unread === "number") {
        setUnreadCount(result.unread);
      } else {
        setUnreadCount(result.items.filter((n) => !n.isRead).length);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, activeTab, page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("Đã đánh dấu đọc tất cả thông báo.");
    } catch {
      toast.error("Không thể đánh dấu đọc tất cả thông báo.");
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      toast.success("Đã đánh dấu thông báo là đã đọc.");
    } catch {
      toast.error("Không thể đánh dấu đọc thông báo.");
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await api.markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Fallback
      }
    }
    // Auto-navigate if route exists
    const config = getConfig(notification.type);
    if (config.route) {
      router.push(config.route);
    }
  };

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter list by selected Tab if category-specific
  const filteredNotifications = useMemo(() => {
    if (activeTab === "all" || activeTab === "unread") {
      return notifications;
    }
    return notifications.filter((n) => {
      const cfg = getConfig(n.type);
      return cfg.category === activeTab;
    });
  }, [notifications, activeTab]);

  // Group notifications by relative date
  const groupedNotifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: {
      today: Notification[];
      yesterday: Notification[];
      thisWeek: Notification[];
      earlier: Notification[];
    } = {
      today: [],
      yesterday: [],
      thisWeek: [],
      earlier: [],
    };

    filteredNotifications.forEach((item) => {
      const itemDate = new Date(item.createdAt);
      if (itemDate >= today) {
        groups.today.push(item);
      } else if (itemDate >= yesterday) {
        groups.yesterday.push(item);
      } else if (itemDate >= weekAgo) {
        groups.thisWeek.push(item);
      } else {
        groups.earlier.push(item);
      }
    });

    return [
      { key: "today", title: "Hôm nay", icon: <TodayOutlinedIcon sx={{ fontSize: 16 }} />, items: groups.today },
      { key: "yesterday", title: "Hôm qua", icon: <DateRangeOutlinedIcon sx={{ fontSize: 16 }} />, items: groups.yesterday },
      { key: "thisWeek", title: "Trong 7 ngày qua", icon: <DateRangeOutlinedIcon sx={{ fontSize: 16 }} />, items: groups.thisWeek },
      { key: "earlier", title: "Trước đó", icon: <HistoryOutlinedIcon sx={{ fontSize: 16 }} />, items: groups.earlier },
    ].filter((g) => g.items.length > 0);
  }, [filteredNotifications]);

  const totalPages = Math.ceil(total / pageSize);

  if (authLoading) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 880, mx: "auto", p: 2 }}>
        <Skeleton variant="rounded" height={60} />
        <Skeleton variant="rounded" height={48} />
        <Skeleton variant="rounded" height={100} />
        <Skeleton variant="rounded" height={100} />
        <Skeleton variant="rounded" height={100} />
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 900, mx: "auto", pb: 5 }}>
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <PageHeader
        title="Trung tâm Thông báo"
        icon={NotificationsOutlinedIcon}
        statBadges={unreadCount > 0 ? `${unreadCount} chưa đọc` : undefined}
        onRefresh={fetchNotifications}
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<DoneAllOutlinedIcon />}
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || loading}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 1.5,
                fontSize: "0.8rem",
              }}
            >
              Đánh dấu tất cả đã đọc
            </Button>
            <Tooltip title="Làm mới thông báo">
              <IconButton size="small" onClick={fetchNotifications} disabled={loading}>
                <RefreshOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      />

      {/* ── TABS BAR (MUI TABS + BADGE) ─────────────────────────────────── */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          borderColor: "divider",
          bgcolor: "background.paper",
          overflow: "hidden",
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 1, bgcolor: isDark ? "background.default" : "#F8FAFC" }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => {
              setActiveTab(val);
              setPage(1);
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 46,
              "& .MuiTab-root": {
                minHeight: 46,
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.83rem",
                py: 1,
                px: 2,
              },
            }}
          >
            <Tab
              value="all"
              label={
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                  <span>Tất cả</span>
                  <Chip
                    size="small"
                    label={total}
                    sx={{
                      height: 20,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      bgcolor: isDark ? alpha("#FFFFFF", 0.08) : "#E2E8F0",
                    }}
                  />
                </Stack>
              }
            />
            <Tab
              value="unread"
              label={
                <Badge badgeContent={unreadCount} color="error" max={99} sx={{ "& .MuiBadge-badge": { fontSize: "0.65rem", height: 18, minWidth: 18 } }}>
                  <Box sx={{ pr: unreadCount > 0 ? 1 : 0 }}>Chưa đọc</Box>
                </Badge>
              }
            />
            <Tab value="borrow" label="Mượn - Trả sách" />
            <Tab value="schedule" label="Lịch trực nhân viên" />
            <Tab value="system" label="Cảnh báo & Hệ thống" />
          </Tabs>
        </Box>

        {/* ── NOTIFICATION LIST (MUI LIST & AVATAR BADGE) ───────────────── */}
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
          {loading ? (
            <Stack spacing={1.5} sx={{ p: 1 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Paper
                  key={i}
                  variant="outlined"
                  sx={{
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    borderRadius: 2,
                    borderColor: "divider",
                  }}
                >
                  <Skeleton variant="circular" width={42} height={42} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="40%" height={24} />
                    <Skeleton variant="text" width="85%" height={20} />
                  </Box>
                  <Skeleton variant="rounded" width={80} height={28} />
                </Paper>
              ))}
            </Stack>
          ) : filteredNotifications.length === 0 ? (
            <Box sx={{ py: 6 }}>
              <EmptyState
                icon={<NotificationsOutlinedIcon sx={{ fontSize: 48 }} />}
                title={
                  activeTab === "unread"
                    ? "Bạn không có thông báo chưa đọc nào"
                    : activeTab === "borrow"
                    ? "Không có thông báo mượn trả sách"
                    : activeTab === "schedule"
                    ? "Không có thông báo lịch trực"
                    : activeTab === "system"
                    ? "Không có cảnh báo an ninh hoặc hệ thống"
                    : "Hộp thư thông báo trống"
                }
              />
            </Box>
          ) : (
            <List disablePadding sx={{ width: "100%" }}>
              {groupedNotifications.map((group) => (
                <Box key={group.key} sx={{ mb: 2 }}>
                  {/* Group Header (ListSubheader) */}
                  <ListSubheader
                    disableSticky
                    sx={{
                      bgcolor: "transparent",
                      px: 1,
                      py: 0.75,
                      lineHeight: "normal",
                      color: "text.secondary",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                      {group.icon}
                      <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {group.title}
                      </Typography>
                    </Stack>
                    <Chip
                      size="small"
                      label={`${group.items.length} tin`}
                      sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }}
                    />
                  </ListSubheader>

                  <Stack spacing={1}>
                    {group.items.map((notification, idx) => {
                      const config = getConfig(notification.type);
                      const isExpanded = expandedIds.has(notification.id);
                      const hasRoute = Boolean(config.route);

                      return (
                        <Paper
                          key={notification.id}
                          variant="outlined"
                          onClick={() => handleNotificationClick(notification)}
                          sx={{
                            borderRadius: 2,
                            p: 2,
                            display: "flex",
                            gap: 2,
                            cursor: "pointer",
                            transition: "all 0.18s ease-in-out",
                            position: "relative",
                            borderLeft: 4,
                            borderLeftColor: notification.isRead ? "transparent" : config.color,
                            bgcolor: notification.isRead
                              ? "background.paper"
                              : isDark
                              ? alpha(config.color, 0.08)
                              : alpha(config.color, 0.04),
                            borderColor: notification.isRead ? "divider" : alpha(config.color, 0.3),
                            "&:hover": {
                              bgcolor: isDark ? alpha("#FFFFFF", 0.04) : "#F8FAFC",
                              borderColor: config.color,
                              transform: "translateY(-1px)",
                              boxShadow: `0 3px 12px ${alpha(config.color, 0.12)}`,
                            },
                            ...staggerSx(idx),
                          }}
                        >
                          {/* Avatar with unread indicator badge */}
                          <Badge
                            variant="dot"
                            invisible={notification.isRead}
                            color="error"
                            overlap="circular"
                            anchorOrigin={{ vertical: "top", horizontal: "left" }}
                            sx={{ "& .MuiBadge-badge": { width: 9, height: 9, borderRadius: "50%" } }}
                          >
                            <Avatar
                              sx={{
                                width: 44,
                                height: 44,
                                bgcolor: alpha(config.color, 0.15),
                                color: config.color,
                                border: `1px solid ${alpha(config.color, 0.3)}`,
                              }}
                            >
                              {config.icon}
                            </Avatar>
                          </Badge>

                          {/* Content Body */}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            {/* Title & Tag Row */}
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{
                                alignItems: "center",
                                justifyContent: "space-between",
                                mb: 0.5,
                              }}
                            >
                              <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: notification.isRead ? 600 : 800,
                                    fontSize: "0.88rem",
                                    color: "text.primary",
                                  }}
                                  noWrap
                                >
                                  {notification.title}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={config.label}
                                  sx={{
                                    height: 20,
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    bgcolor: alpha(config.color, 0.12),
                                    color: config.color,
                                    borderRadius: 1,
                                  }}
                                />
                              </Stack>

                              <Typography variant="caption" sx={{ color: "text.secondary", flexShrink: 0 }}>
                                {formatRelativeTime(notification.createdAt)}
                              </Typography>
                            </Stack>

                            {/* Message Body with Collapse */}
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                fontSize: "0.82rem",
                                lineHeight: 1.55,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                display: isExpanded ? "block" : "-webkit-box",
                                WebkitLineClamp: isExpanded ? "unset" : 2,
                                WebkitBoxOrient: "vertical",
                                overflow: isExpanded ? "visible" : "hidden",
                              }}
                            >
                              {notification.body}
                            </Typography>

                            {/* Expand toggle & Action buttons */}
                            <Stack
                              direction="row"
                              spacing={1.5}
                              sx={{
                                alignItems: "center",
                                justifyContent: "space-between",
                                mt: 1,
                              }}
                            >
                              <Box>
                                {(notification.body?.length ?? 0) > 100 && (
                                  <Button
                                    size="small"
                                    variant="text"
                                    onClick={(e) => toggleExpand(e, notification.id)}
                                    endIcon={
                                      isExpanded ? (
                                        <ExpandLessOutlinedIcon sx={{ fontSize: "14px !important" }} />
                                      ) : (
                                        <ExpandMoreOutlinedIcon sx={{ fontSize: "14px !important" }} />
                                      )
                                    }
                                    sx={{
                                      p: 0,
                                      minWidth: 0,
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      textTransform: "none",
                                      color: "primary.main",
                                    }}
                                  >
                                    {isExpanded ? "Thu gọn nội dung" : "Xem toàn bộ nội dung"}
                                  </Button>
                                )}
                              </Box>

                              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                                {hasRoute && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    endIcon={<OpenInNewOutlinedIcon sx={{ fontSize: "13px !important" }} />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleNotificationClick(notification);
                                    }}
                                    sx={{
                                      py: 0.2,
                                      px: 1,
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      textTransform: "none",
                                      borderRadius: 1,
                                      bgcolor: alpha(config.color, 0.05),
                                    }}
                                  >
                                    {config.routeLabel || "Mở tính năng"}
                                  </Button>
                                )}

                                {!notification.isRead && (
                                  <Tooltip title="Đánh dấu đã đọc" arrow>
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={(e) => handleMarkAsRead(e, notification.id)}
                                      sx={{
                                        p: 0.5,
                                        bgcolor: isDark ? alpha("#FFFFFF", 0.05) : "#F1F5F9",
                                        "&:hover": { bgcolor: "action.hover" },
                                      }}
                                    >
                                      <CheckCircleOutlinedIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Stack>
                            </Stack>
                          </Box>
                        </Paper>
                      );
                    })}
                  </Stack>
                </Box>
              ))}
            </List>
          )}

          {/* ── PAGINATION ────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", pt: 3, pb: 1 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, p) => {
                  setPage(p);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </Box>
      </Paper>
    </Stack>
  );
}
