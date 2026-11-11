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
  Fade,
  IconButton,
  InputAdornment,
  List,
  ListItemAvatar,
  ListSubheader,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";

// Icons
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import DoneAllOutlinedIcon from "@mui/icons-material/DoneAllOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
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
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import MarkEmailUnreadOutlinedIcon from "@mui/icons-material/MarkEmailUnreadOutlined";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";

import api from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import type { Notification } from "@/lib/types";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import { staggerSx } from "@/lib/useStaggeredAnimation";

// ── Notification Configuration ────────────────────────────────────────────────
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
    color: "#10B981",
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
    color: "#E11D48",
    label: "Phí phạt",
    category: "borrow",
    route: "/borrow",
    routeLabel: "Thu phí phạt",
  },
  schedule_change: {
    icon: <CalendarMonthOutlinedIcon fontSize="small" />,
    color: "#8B5CF6",
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
    color: "#F59E0B",
    label: "Vắng mặt",
    category: "schedule",
    route: "/staff-schedules",
    routeLabel: "Sắp xếp lại ca",
  },
  bid_warning: {
    icon: <WarningAmberOutlinedIcon fontSize="small" />,
    color: "#F59E0B",
    label: "Đăng ký ca",
    category: "schedule",
    route: "/staff-schedules",
    routeLabel: "Duyệt đăng ký",
  },
  swap_warning: {
    icon: <SwapHorizOutlinedIcon fontSize="small" />,
    color: "#06B6D4",
    label: "Đổi ca trực",
    category: "schedule",
    route: "/staff-schedules",
    routeLabel: "Duyệt đổi ca",
  },
  checkin_reminder: {
    icon: <HowToRegOutlinedIcon fontSize="small" />,
    color: "#4F46E5",
    label: "Điểm danh ca",
    category: "schedule",
    route: "/staff-schedules",
    routeLabel: "Điểm danh ngay",
  },
  membership_expiry: {
    icon: <BadgeOutlinedIcon fontSize="small" />,
    color: "#DC2626",
    label: "Hạn thẻ độc giả",
    category: "system",
    route: "/patrons",
    routeLabel: "Gia hạn thẻ",
  },
  anomaly_alert: {
    icon: <ShieldOutlinedIcon fontSize="small" />,
    color: "#DC2626",
    label: "Cảnh báo an ninh",
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
    label: "Nguy cơ an toàn",
    category: "system",
  },
  smoke_alert: {
    icon: <ShieldOutlinedIcon fontSize="small" />,
    color: "#EA580C",
    label: "Khói bất thường",
    category: "system",
  },
  smoke_hazard: {
    icon: <ShieldOutlinedIcon fontSize="small" />,
    color: "#EA580C",
    label: "Phát hiện khói",
    category: "system",
  },
  daily_report: {
    icon: <BarChartOutlinedIcon fontSize="small" />,
    color: "#0284C7",
    label: "Báo cáo thống kê",
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

function formatExactDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString("vi-VN", {
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoString;
  }
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
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const pageSize = 20;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  const fetchNotifications = useCallback(
    async (isManualRefresh = false) => {
      if (!isAuthenticated) return;
      try {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);

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
        // Fallback gracefully
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAuthenticated, activeTab, page]
  );

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
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Graceful fallback
      }
    }
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

  // Filter list by selected Tab and Search Query
  const filteredNotifications = useMemo(() => {
    let list = notifications;

    if (activeTab === "unread") {
      list = list.filter((n) => !n.isRead);
    } else if (activeTab !== "all") {
      list = list.filter((n) => {
        const cfg = getConfig(n.type);
        return cfg.category === activeTab;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter((n) => {
        const titleMatch = n.title?.toLowerCase().includes(query);
        const bodyMatch = n.body?.toLowerCase().includes(query);
        const labelMatch = getConfig(n.type).label.toLowerCase().includes(query);
        const dataMatch = n.data
          ? JSON.stringify(n.data).toLowerCase().includes(query)
          : false;
        return titleMatch || bodyMatch || labelMatch || dataMatch;
      });
    }

    return list;
  }, [notifications, activeTab, searchQuery]);

  // Tab Counts for Quick Badges
  const tabCounts = useMemo(() => {
    const counts = {
      all: total,
      unread: unreadCount,
      borrow: 0,
      schedule: 0,
      system: 0,
    };
    notifications.forEach((n) => {
      const cat = getConfig(n.type).category;
      if (cat in counts) {
        counts[cat as keyof typeof counts]++;
      }
    });
    return counts;
  }, [notifications, total, unreadCount]);

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
      {
        key: "today",
        title: "Hôm nay",
        icon: <TodayOutlinedIcon sx={{ fontSize: 16 }} />,
        color: "#2563EB",
        items: groups.today,
      },
      {
        key: "yesterday",
        title: "Hôm qua",
        icon: <DateRangeOutlinedIcon sx={{ fontSize: 16 }} />,
        color: "#64748B",
        items: groups.yesterday,
      },
      {
        key: "thisWeek",
        title: "Trong 7 ngày qua",
        icon: <DateRangeOutlinedIcon sx={{ fontSize: 16 }} />,
        color: "#8B5CF6",
        items: groups.thisWeek,
      },
      {
        key: "earlier",
        title: "Trước đó",
        icon: <HistoryOutlinedIcon sx={{ fontSize: 16 }} />,
        color: "#94A3B8",
        items: groups.earlier,
      },
    ].filter((g) => g.items.length > 0);
  }, [filteredNotifications]);

  const totalPages = Math.ceil(total / pageSize);

  if (authLoading) {
    return (
      <Stack spacing={2.5} sx={{ maxWidth: 960, mx: "auto", p: { xs: 1.5, sm: 3 } }}>
        <Skeleton variant="rounded" height={70} sx={{ borderRadius: 3 }} />
        <Skeleton variant="rounded" height={52} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={110} sx={{ borderRadius: 2.5 }} />
        <Skeleton variant="rounded" height={110} sx={{ borderRadius: 2.5 }} />
        <Skeleton variant="rounded" height={110} sx={{ borderRadius: 2.5 }} />
      </Stack>
    );
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 980, mx: "auto", pb: 6, px: { xs: 1, sm: 2 } }}>
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <PageHeader
        title="Trung tâm Thông báo"
        subtitle="Quản lý và theo dõi thông tin mượn trả sách, lịch trực nhân sự và các cảnh báo hệ thống"
        icon={NotificationsOutlinedIcon}
        statBadges={unreadCount > 0 ? `${unreadCount} thông báo mới` : undefined}
        onRefresh={() => fetchNotifications(true)}
        actions={
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Button
              size="small"
              variant={unreadCount > 0 ? "contained" : "outlined"}
              color="primary"
              startIcon={<DoneAllOutlinedIcon />}
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || loading}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                px: 2,
                py: 0.8,
                fontSize: "0.82rem",
                boxShadow: unreadCount > 0 ? "0 4px 12px rgba(37,99,235,0.25)" : "none",
                "&:hover": {
                  boxShadow: unreadCount > 0 ? "0 6px 16px rgba(37,99,235,0.35)" : "none",
                },
              }}
            >
              Đánh dấu tất cả đã đọc
            </Button>
            <Tooltip title="Tải lại danh sách" arrow>
              <IconButton
                size="small"
                onClick={() => fetchNotifications(true)}
                disabled={loading || refreshing}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 0.9,
                  bgcolor: "background.paper",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: "action.hover",
                    transform: "rotate(45deg)",
                  },
                }}
              >
                <RefreshOutlinedIcon
                  fontSize="small"
                  sx={{
                    animation: refreshing ? "spin 1s linear infinite" : "none",
                    "@keyframes spin": {
                      "0%": { transform: "rotate(0deg)" },
                      "100%": { transform: "rotate(360deg)" },
                    },
                  }}
                />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      />

      {/* ── OVERVIEW SUMMARY STRIP ──────────────────────────────────────── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
          gap: 1.5,
        }}
      >
        {/* Total Metric */}
        <Paper
          variant="outlined"
          onClick={() => {
            setActiveTab("all");
            setPage(1);
          }}
          sx={{
            p: 1.75,
            borderRadius: 2.5,
            borderColor: activeTab === "all" ? "primary.main" : "divider",
            bgcolor: activeTab === "all" ? (isDark ? alpha("#2563EB", 0.12) : "#EFF6FF") : "background.paper",
            cursor: "pointer",
            transition: "all 0.2s ease",
            "&:hover": {
              borderColor: "primary.main",
              transform: "translateY(-2px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            },
          }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <Avatar
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: alpha("#2563EB", 0.12),
                color: "#2563EB",
              }}
            >
              <NotificationsOutlinedIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block" }}>
                Tổng số
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                {total}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Unread Metric */}
        <Paper
          variant="outlined"
          onClick={() => {
            setActiveTab("unread");
            setPage(1);
          }}
          sx={{
            p: 1.75,
            borderRadius: 2.5,
            borderColor: activeTab === "unread" ? "#DC2626" : "divider",
            bgcolor: activeTab === "unread" ? (isDark ? alpha("#DC2626", 0.15) : "#FEF2F2") : "background.paper",
            cursor: "pointer",
            transition: "all 0.2s ease",
            "&:hover": {
              borderColor: "#DC2626",
              transform: "translateY(-2px)",
              boxShadow: "0 4px 12px rgba(220,38,38,0.1)",
            },
          }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <Avatar
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: alpha("#DC2626", 0.12),
                color: "#DC2626",
              }}
            >
              {unreadCount > 0 ? <MarkEmailUnreadOutlinedIcon fontSize="small" /> : <MarkEmailReadOutlinedIcon fontSize="small" />}
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block" }}>
                Chưa đọc
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.1,
                  color: unreadCount > 0 ? "#DC2626" : "text.primary",
                }}
              >
                {unreadCount}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Borrow & Return Metric */}
        <Paper
          variant="outlined"
          onClick={() => {
            setActiveTab("borrow");
            setPage(1);
          }}
          sx={{
            p: 1.75,
            borderRadius: 2.5,
            borderColor: activeTab === "borrow" ? "#059669" : "divider",
            bgcolor: activeTab === "borrow" ? (isDark ? alpha("#059669", 0.12) : "#ECFDF5") : "background.paper",
            cursor: "pointer",
            transition: "all 0.2s ease",
            "&:hover": {
              borderColor: "#059669",
              transform: "translateY(-2px)",
              boxShadow: "0 4px 12px rgba(5,150,105,0.08)",
            },
          }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <Avatar
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: alpha("#059669", 0.12),
                color: "#059669",
              }}
            >
              <MenuBookOutlinedIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block" }}>
                Mượn & Trả
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                {tabCounts.borrow}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Schedule Metric */}
        <Paper
          variant="outlined"
          onClick={() => {
            setActiveTab("schedule");
            setPage(1);
          }}
          sx={{
            p: 1.75,
            borderRadius: 2.5,
            borderColor: activeTab === "schedule" ? "#8B5CF6" : "divider",
            bgcolor: activeTab === "schedule" ? (isDark ? alpha("#8B5CF6", 0.12) : "#F5F3FF") : "background.paper",
            cursor: "pointer",
            transition: "all 0.2s ease",
            "&:hover": {
              borderColor: "#8B5CF6",
              transform: "translateY(-2px)",
              boxShadow: "0 4px 12px rgba(139,92,246,0.08)",
            },
          }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <Avatar
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: alpha("#8B5CF6", 0.12),
                color: "#8B5CF6",
              }}
            >
              <CalendarMonthOutlinedIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block" }}>
                Lịch trực
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                {tabCounts.schedule}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* ── MAIN CONTENT CONTAINER ──────────────────────────────────────── */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 3,
          borderColor: "divider",
          bgcolor: "background.paper",
          overflow: "hidden",
          boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 12px rgba(0,0,0,0.03)",
        }}
      >
        {/* ── CONTROLS ROW: TABS & SEARCH INPUT ──────────────────────────── */}
        <Box
          sx={{
            p: 1.5,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: isDark ? alpha("#FFFFFF", 0.02) : "#F8FAFC",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 1.5,
            alignItems: { xs: "stretch", md: "center" },
            justifyContent: "space-between",
          }}
        >
          {/* Segmented Category Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, val) => {
              setActiveTab(val);
              setPage(1);
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 40,
              "& .MuiTabs-indicator": {
                height: 3,
                borderRadius: "3px 3px 0 0",
              },
              "& .MuiTab-root": {
                minHeight: 40,
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.82rem",
                px: 1.75,
                py: 0.5,
                borderRadius: 1.5,
                transition: "all 0.15s ease",
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
                      height: 18,
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      bgcolor: activeTab === "all" ? alpha("#2563EB", 0.15) : (isDark ? alpha("#FFFFFF", 0.08) : "#E2E8F0"),
                      color: activeTab === "all" ? "primary.main" : "text.secondary",
                    }}
                  />
                </Stack>
              }
            />
            <Tab
              value="unread"
              label={
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                  <span>Chưa đọc</span>
                  {unreadCount > 0 && (
                    <Chip
                      size="small"
                      label={unreadCount}
                      color="error"
                      sx={{
                        height: 18,
                        fontSize: "0.68rem",
                        fontWeight: 800,
                      }}
                    />
                  )}
                </Stack>
              }
            />
            <Tab value="borrow" label="Mượn & Trả" />
            <Tab value="schedule" label="Lịch trực" />
            <Tab value="system" label="Hệ thống & An ninh" />
          </Tabs>

          {/* Quick Search Field */}
          <Box sx={{ width: { xs: "100%", md: 280 } }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Tìm kiếm thông báo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery("")} edge="end">
                      <ClearOutlinedIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                sx: {
                  borderRadius: 2,
                  fontSize: "0.82rem",
                  bgcolor: isDark ? "background.paper" : "#FFFFFF",
                },
              }}
            />
          </Box>
        </Box>

        {/* ── NOTIFICATIONS LIST ─────────────────────────────────────────── */}
        <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          {loading ? (
            <Stack spacing={2}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Paper
                  key={i}
                  variant="outlined"
                  sx={{
                    p: 2,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 2,
                    borderRadius: 2.5,
                    borderColor: "divider",
                  }}
                >
                  <Skeleton variant="rounded" width={44} height={44} sx={{ borderRadius: 2 }} />
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
                      <Skeleton variant="rounded" width={70} height={20} sx={{ borderRadius: 1 }} />
                      <Skeleton variant="text" width="40%" height={22} />
                    </Stack>
                    <Skeleton variant="text" width="90%" height={18} />
                    <Skeleton variant="text" width="60%" height={18} />
                  </Box>
                  <Skeleton variant="rounded" width={32} height={32} sx={{ borderRadius: 1.5 }} />
                </Paper>
              ))}
            </Stack>
          ) : filteredNotifications.length === 0 ? (
            <Box sx={{ py: 6 }}>
              {searchQuery ? (
                <EmptyState
                  icon={<SearchOutlinedIcon sx={{ fontSize: 44 }} />}
                  title="Không tìm thấy thông báo nào"
                  description={`Không có kết quả nào khớp với từ khóa "${searchQuery}". Vui lòng thử từ khóa khác.`}
                  action={
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setSearchQuery("")}
                      sx={{ mt: 1, textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                    >
                      Xóa bộ lọc tìm kiếm
                    </Button>
                  }
                />
              ) : activeTab === "unread" ? (
                <EmptyState
                  icon={<DoneAllOutlinedIcon sx={{ fontSize: 48, color: "#10B981" }} />}
                  title="Tuyệt vời! Không còn thông báo chưa đọc"
                  description="Bạn đã cập nhật và xử lý hết tất cả các thông báo mới nhất."
                  action={
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setActiveTab("all")}
                      sx={{ mt: 1, textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                    >
                      Xem tất cả thông báo
                    </Button>
                  }
                />
              ) : activeTab === "borrow" ? (
                <EmptyState
                  icon={<MenuBookOutlinedIcon sx={{ fontSize: 48 }} />}
                  title="Không có thông báo mượn trả sách"
                  description="Các cập nhật về mượn sách, trả sách và nhắc hạn sẽ hiển thị tại đây."
                />
              ) : activeTab === "schedule" ? (
                <EmptyState
                  icon={<CalendarMonthOutlinedIcon sx={{ fontSize: 48 }} />}
                  title="Không có thông báo lịch trực"
                  description="Lịch trực ca, thông báo đổi ca và nhắc ca sẽ hiển thị tại đây."
                />
              ) : activeTab === "system" ? (
                <EmptyState
                  icon={<ShieldOutlinedIcon sx={{ fontSize: 48 }} />}
                  title="Không có thông báo hệ thống"
                  description="Các cảnh báo an ninh, bảo trì và trạng thái hệ thống sẽ hiển thị tại đây."
                />
              ) : (
                <EmptyState
                  icon={<NotificationsOutlinedIcon sx={{ fontSize: 48 }} />}
                  title="Hộp thư thông báo trống"
                  description="Bạn chưa có thông báo nào được lưu trong hệ thống."
                />
              )}
            </Box>
          ) : (
            <List disablePadding sx={{ width: "100%" }}>
              {groupedNotifications.map((group) => (
                <Box key={group.key} sx={{ mb: 3 }}>
                  {/* Modern Date Section Header */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      mb: 1.5,
                      px: 0.5,
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={0.75}
                      sx={{
                        alignItems: "center",
                        bgcolor: isDark ? alpha(group.color, 0.15) : alpha(group.color, 0.08),
                        color: group.color,
                        px: 1.25,
                        py: 0.4,
                        borderRadius: 1.5,
                      }}
                    >
                      {group.icon}
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          letterSpacing: 0.3,
                          textTransform: "uppercase",
                        }}
                      >
                        {group.title}
                      </Typography>
                    </Stack>
                    <Chip
                      size="small"
                      label={`${group.items.length} tin`}
                      sx={{
                        height: 20,
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        bgcolor: isDark ? alpha("#FFFFFF", 0.06) : "#F1F5F9",
                        color: "text.secondary",
                      }}
                    />
                    <Divider sx={{ flex: 1, borderColor: "divider" }} />
                  </Box>

                  {/* Notification Items */}
                  <Stack spacing={1.5}>
                    {group.items.map((notification, idx) => {
                      const config = getConfig(notification.type);
                      const isExpanded = expandedIds.has(notification.id);
                      const hasRoute = Boolean(config.route);
                      const isUnread = !notification.isRead;

                      return (
                        <Paper
                          key={notification.id}
                          variant="outlined"
                          onClick={() => handleNotificationClick(notification)}
                          sx={{
                            borderRadius: 2.5,
                            p: { xs: 1.75, sm: 2 },
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.25,
                            cursor: "pointer",
                            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            position: "relative",
                            borderLeft: 4,
                            borderLeftColor: isUnread ? config.color : "transparent",
                            bgcolor: isUnread
                              ? isDark
                                ? alpha(config.color, 0.09)
                                : alpha(config.color, 0.035)
                              : "background.paper",
                            borderColor: isUnread
                              ? alpha(config.color, 0.35)
                              : "divider",
                            boxShadow: isUnread
                              ? `0 2px 8px ${alpha(config.color, 0.08)}`
                              : "none",
                            "&:hover": {
                              bgcolor: isDark
                                ? alpha("#FFFFFF", 0.04)
                                : alpha(config.color, 0.06),
                              borderColor: config.color,
                              transform: "translateY(-1px)",
                              boxShadow: `0 4px 16px ${alpha(config.color, 0.14)}`,
                            },
                            ...staggerSx(idx),
                          }}
                        >
                          <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
                            {/* Avatar with Dot Indicator */}
                            <Badge
                              variant="dot"
                              invisible={notification.isRead}
                              color="error"
                              overlap="circular"
                              anchorOrigin={{ vertical: "top", horizontal: "right" }}
                              sx={{
                                "& .MuiBadge-badge": {
                                  width: 10,
                                  height: 10,
                                  borderRadius: "50%",
                                  border: `2px solid ${isDark ? "#1E293B" : "#FFFFFF"}`,
                                  boxShadow: `0 0 6px ${alpha("#DC2626", 0.6)}`,
                                },
                              }}
                            >
                              <Avatar
                                sx={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 2,
                                  bgcolor: alpha(config.color, 0.14),
                                  color: config.color,
                                  border: `1px solid ${alpha(config.color, 0.28)}`,
                                }}
                              >
                                {config.icon}
                              </Avatar>
                            </Badge>

                            {/* Main Body */}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              {/* Meta Header Row */}
                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  mb: 0.5,
                                  flexWrap: "wrap",
                                }}
                              >
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}>
                                  <Chip
                                    size="small"
                                    label={config.label}
                                    sx={{
                                      height: 22,
                                      fontSize: "0.7rem",
                                      fontWeight: 800,
                                      bgcolor: alpha(config.color, 0.12),
                                      color: config.color,
                                      borderRadius: 1.25,
                                    }}
                                  />
                                  {isUnread && (
                                    <Chip
                                      size="small"
                                      label="MỚI"
                                      color="error"
                                      sx={{
                                        height: 18,
                                        fontSize: "0.62rem",
                                        fontWeight: 900,
                                        borderRadius: 1,
                                        px: 0.3,
                                      }}
                                    />
                                  )}
                                </Stack>

                                <Tooltip title={formatExactDate(notification.createdAt)} arrow>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: isUnread ? "text.primary" : "text.secondary",
                                      fontWeight: isUnread ? 700 : 500,
                                      fontSize: "0.75rem",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 0.5,
                                    }}
                                  >
                                    <AccessTimeOutlinedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                                    {formatRelativeTime(notification.createdAt)}
                                  </Typography>
                                </Tooltip>
                              </Stack>

                              {/* Title */}
                              <Typography
                                variant="subtitle2"
                                sx={{
                                  fontWeight: isUnread ? 800 : 600,
                                  fontSize: "0.92rem",
                                  color: "text.primary",
                                  lineHeight: 1.35,
                                  mb: 0.5,
                                }}
                              >
                                {notification.title}
                              </Typography>

                              {/* Message Content */}
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  fontSize: "0.84rem",
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

                              {/* Structured Metadata (if available) */}
                              {notification.data && Object.keys(notification.data).length > 0 && (
                                <Collapse in={isExpanded} timeout="auto">
                                  <Box
                                    sx={{
                                      mt: 1.5,
                                      p: 1.25,
                                      borderRadius: 1.5,
                                      bgcolor: isDark ? alpha("#FFFFFF", 0.04) : "#F8FAFC",
                                      border: `1px solid ${isDark ? alpha("#FFFFFF", 0.08) : "#E2E8F0"}`,
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: 1,
                                    }}
                                  >
                                    {Object.entries(notification.data).map(([k, v]) => {
                                      if (typeof v === "object" && v !== null) return null;
                                      return (
                                        <Chip
                                          key={k}
                                          size="small"
                                          variant="outlined"
                                          label={`${k}: ${String(v)}`}
                                          sx={{
                                            height: 22,
                                            fontSize: "0.7rem",
                                            borderRadius: 1,
                                            borderColor: "divider",
                                          }}
                                        />
                                      );
                                    })}
                                  </Box>
                                </Collapse>
                              )}

                              {/* Bottom Action Row */}
                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  mt: 1.25,
                                  pt: 0.5,
                                }}
                              >
                                {/* Expand / Collapse text button */}
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
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        textTransform: "none",
                                        color: "primary.main",
                                      }}
                                    >
                                      {isExpanded ? "Thu gọn chi tiết" : "Xem toàn bộ nội dung"}
                                    </Button>
                                  )}
                                </Box>

                                {/* Action Buttons */}
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                  {hasRoute && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      endIcon={<ArrowForwardOutlinedIcon sx={{ fontSize: "13px !important" }} />}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleNotificationClick(notification);
                                      }}
                                      sx={{
                                        py: 0.3,
                                        px: 1.25,
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        textTransform: "none",
                                        borderRadius: 1.5,
                                        bgcolor: isDark ? alpha(config.color, 0.1) : alpha(config.color, 0.05),
                                        borderColor: alpha(config.color, 0.3),
                                        color: config.color,
                                        "&:hover": {
                                          borderColor: config.color,
                                          bgcolor: alpha(config.color, 0.15),
                                        },
                                      }}
                                    >
                                      {config.routeLabel || "Xem ngay"}
                                    </Button>
                                  )}

                                  {isUnread && (
                                    <Tooltip title="Đánh dấu đã đọc" arrow>
                                      <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={(e) => handleMarkAsRead(e, notification.id)}
                                        sx={{
                                          p: 0.6,
                                          borderRadius: 1.5,
                                          bgcolor: isDark ? alpha("#FFFFFF", 0.06) : "#F1F5F9",
                                          border: "1px solid",
                                          borderColor: "divider",
                                          "&:hover": {
                                            bgcolor: alpha("#10B981", 0.15),
                                            color: "#10B981",
                                            borderColor: "#10B981",
                                          },
                                        }}
                                      >
                                        <CheckCircleOutlinedIcon sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </Stack>
                              </Stack>
                            </Box>
                          </Stack>
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
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                pt: 3.5,
                pb: 1,
                borderTop: 1,
                borderColor: "divider",
                mt: 2,
              }}
            >
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, p) => {
                  setPage(p);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                color="primary"
                shape="rounded"
                size="medium"
                showFirstButton
                showLastButton
                sx={{
                  "& .MuiPaginationItem-root": {
                    fontWeight: 700,
                    borderRadius: 1.5,
                  },
                }}
              />
            </Box>
          )}
        </Box>
      </Paper>
    </Stack>
  );
}
