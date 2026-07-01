"use client";

import Link from "next/link";
import { Avatar, Box, Button, Stack, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import WarningIcon from "@mui/icons-material/WarningAmberOutlined";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import CalendarIcon from "@mui/icons-material/CalendarMonthOutlined";
import PersonIcon from "@mui/icons-material/PersonOutlineOutlined";
import NotificationsIcon from "@mui/icons-material/NotificationsNoneOutlined";
import DashboardCard from "@/components/ui/DashboardCard";
import EmptyState from "@/components/ui/EmptyState";
import type { Notification } from "@/lib/types";

interface RecentNotificationsCardProps {
  notifications: Notification[];
  loading: boolean;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  borrow_overdue: { icon: <WarningIcon sx={{ fontSize: 18 }} />, color: "#ef4444" },
  book_available: { icon: <BookIcon sx={{ fontSize: 18 }} />, color: "#3b82f6" },
  schedule_change: { icon: <CalendarIcon sx={{ fontSize: 18 }} />, color: "#f59e0b" },
  membership_expiry: { icon: <PersonIcon sx={{ fontSize: 18 }} />, color: "#8b5cf6" },
};

function relativeTime(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

export default function RecentNotificationsCard({ notifications, loading }: RecentNotificationsCardProps) {
  return (
    <DashboardCard
      title="Thông báo gần đây"
      actions={
        <Button component={Link} href="/notifications" endIcon={<ArrowForwardIcon />} size="small">
          Xem tất cả
        </Button>
      }
      noPadding
    >
      {notifications.length === 0 ? (
        <EmptyState
          icon={<NotificationsIcon sx={{ fontSize: 40, color: "text.disabled" }} />}
          title="Không có thông báo mới"
        />
      ) : (
        <Stack spacing={0.5} sx={{ p: 1.5 }}>
          {notifications.slice(0, 5).map((n) => {
            const config = TYPE_CONFIG[n.type] || { icon: <NotificationsIcon sx={{ fontSize: 18 }} />, color: "#6b7280" };
            return (
              <Stack
                key={n.id}
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: "flex-start",
                  p: 1.25,
                  borderRadius: 2,
                  transition: "background 0.15s",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Avatar sx={{ bgcolor: config.color, width: 32, height: 32 }}>
                  {config.icon}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: n.isRead ? 600 : 800 }} noWrap>
                    {n.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                    {n.body}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                  {relativeTime(n.createdAt)}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      )}
    </DashboardCard>
  );
}
