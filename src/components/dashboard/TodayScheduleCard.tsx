"use client";

import Link from "next/link";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CalendarIcon from "@mui/icons-material/CalendarMonthOutlined";
import DashboardCard from "@/components/ui/DashboardCard";
import EmptyState from "@/components/ui/EmptyState";
import type { StaffScheduleAssignment } from "@/lib/types";

interface TodayScheduleCardProps {
  assignments: StaffScheduleAssignment[];
  loading: boolean;
}

function formatShiftTime(startTime?: string, endTime?: string) {
  if (!startTime || !endTime) return "";
  return `${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}`;
}

function statusColor(status: string) {
  const map: Record<string, "success" | "warning" | "error" | "info" | "default"> = {
    approved: "success",
    confirmed: "success",
    checked_in: "success",
    pending: "warning",
    pending_confirm: "warning",
    pending_admin_confirm: "warning",
    unchecked: "error",
    absent: "error",
    cancelled: "default",
  };
  return map[status] || "default";
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    approved: "Đã duyệt",
    confirmed: "Đã xác nhận",
    checked_in: "Đã check-in",
    pending: "Chờ duyệt",
    pending_confirm: "Chờ xác nhận",
    pending_admin_confirm: "Chờ admin",
    unchecked: "Chưa check-in",
    absent: "Vắng mặt",
    cancelled: "Đã hủy",
  };
  return map[status] || status;
}

export default function TodayScheduleCard({ assignments, loading }: TodayScheduleCardProps) {
  return (
    <DashboardCard
      title="Lịch trực hôm nay"
      subtitle={`${assignments.length} ca trực`}
      actions={
        <Button component={Link} href="/staff-schedules" endIcon={<ArrowForwardIcon />} size="small">
          Xem lịch
        </Button>
      }
      noPadding
    >
      {assignments.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon sx={{ fontSize: 40, color: "text.disabled" }} />}
          title="Hôm nay không có ca trực"
        />
      ) : (
        <Stack spacing={1} sx={{ p: 2.5 }}>
          {assignments.slice(0, 6).map((a) => (
            <Stack
              key={a.id}
              direction="row"
              spacing={1.5}
              sx={{
                alignItems: "center",
                justifyContent: "space-between",
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                    {a.shift?.name || "Ca trực"} · {formatShiftTime(a.shift?.startTime, a.shift?.endTime)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {a.staff?.fullName || a.staffId} · {a.zone?.zoneName || a.zoneId}
                  </Typography>
                </Box>
              </Stack>
              <Chip size="small" label={statusLabel(a.status)} color={statusColor(a.status)} sx={{ fontWeight: 600, fontSize: "0.72rem" }} />
            </Stack>
          ))}
        </Stack>
      )}
    </DashboardCard>
  );
}
