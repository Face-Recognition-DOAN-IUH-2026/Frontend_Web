"use client";

import { useState } from "react";
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberIcon from "@mui/icons-material/WarningAmberOutlined";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import type { StaffScheduleAssignment } from "@/lib/types";

interface AssignmentCardProps {
  assignment: StaffScheduleAssignment;
  onDelete?: (id: string) => void;
  understaffed?: boolean;
}

type StatusKey = "past" | "active" | "future" | "today" | "understaffed" | "cancelled" | "completed";

const STATUS_META: Record<StatusKey, { label: string; chipColor: "default" | "success" | "primary" | "warning" | "error"; accentBorder?: string }> = {
  past:         { label: "Đã qua",     chipColor: "default" },
  active:       { label: "Đang trực",  chipColor: "success", accentBorder: "#10b981" },
  future:       { label: "Sắp tới",    chipColor: "primary" },
  today:        { label: "Hôm nay",    chipColor: "warning", accentBorder: "#f59e0b" },
  understaffed: { label: "Thiếu người", chipColor: "warning" },
  cancelled:    { label: "Đã hủy",     chipColor: "error" },
  completed:    { label: "Hoàn thành", chipColor: "default" },
};

function getStatus(assignment: StaffScheduleAssignment): StatusKey {
  if (assignment.status === "cancelled") return "cancelled";
  if (assignment.status === "completed") return "completed";
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (assignment.workDate < today) return "past";
  if (assignment.workDate > today) return "future";
  const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const start = (assignment.shift?.startTime || "").slice(0, 5);
  const end = (assignment.shift?.endTime || "").slice(0, 5);
  if (start && end && current >= start && current <= end) return "active";
  return "today";
}

function formatAttendanceTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AssignmentCard({ assignment, onDelete, understaffed }: AssignmentCardProps) {
  const [hover, setHover] = useState(false);
  const baseStatus = getStatus(assignment);
  const status: StatusKey = understaffed ? "understaffed" : baseStatus;
  const meta = STATUS_META[status];
  const displayName = assignment.staff?.fullName || assignment.staff?.email || "Nhân viên";
  const zoneName = assignment.zone?.zoneName || "";

  const isGround = status === "past" || status === "completed" || status === "future";
  const isFigure = status === "active" || status === "today";
  const isUnderstaffed = status === "understaffed";
  const isCancelled = status === "cancelled";

  return (
    <Box
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      sx={{
        position: "relative",
        px: 1.5,
        py: 1,
        borderRadius: 1,
        border: "1px solid",
        borderColor: isCancelled
          ? "rgba(239,68,68,0.25)"
          : isUnderstaffed
          ? "rgba(251,146,60,0.35)"
          : isFigure
          ? "transparent"
          : "action.hover",
        borderLeftWidth: isFigure ? 3 : 1,
        borderLeftColor: meta.accentBorder,
        bgcolor: isCancelled
          ? "rgba(239,68,68,0.06)"
          : isUnderstaffed
          ? "rgba(251,146,60,0.08)"
          : isFigure
          ? "rgba(99,102,241,0.04)"
          : "background.paper",
        backgroundImage: isCancelled
          ? "repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(239,68,68,0.06) 4px, rgba(239,68,68,0.06) 8px)"
          : "none",
        transition: "background 0.15s, border-color 0.15s",
        "&:hover": onDelete ? { borderColor: "action.focus" } : undefined,
      }}
    >
      {zoneName ? (
        <Typography
          variant="caption"
          sx={{ fontSize: "0.625rem", fontWeight: 500, color: "text.secondary", lineHeight: 1.2, display: "block", mb: 0.25 }}
        >
          {zoneName}
        </Typography>
      ) : null}
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          color: isCancelled ? "error.main" : isUnderstaffed ? "warning.dark" : isFigure ? "text.primary" : "text.secondary",
          display: "block",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {displayName}
      </Typography>

      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexWrap: "wrap", mt: 0.5, gap: 0.5 }}>
        <Chip
          icon={isUnderstaffed ? <WarningAmberIcon sx={{ fontSize: 12 }} /> : isCancelled ? <CancelIcon sx={{ fontSize: 12 }} /> : undefined}
          label={meta.label}
          size="small"
          color={meta.chipColor}
          variant={isGround ? "outlined" : "filled"}
          sx={{
            height: 18,
            fontSize: "0.6rem",
            fontWeight: 700,
            "& .MuiChip-label": { px: 0.75 },
          }}
        />

        {assignment.attendance?.checkInAt ? (
          <Tooltip
            title={`Đã điểm danh qua ${assignment.attendance.method?.toUpperCase() || "HỆ THỐNG"} lúc ${formatAttendanceTime(assignment.attendance.checkInAt)}${assignment.attendance.checkOutAt ? ` · Ra ca lúc ${formatAttendanceTime(assignment.attendance.checkOutAt)}` : ""}`}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.4,
                px: 0.6,
                py: 0.2,
                borderRadius: "4px",
                bgcolor: assignment.attendance.checkOutAt ? "action.hover" : "rgba(16, 185, 129, 0.12)",
                color: assignment.attendance.checkOutAt ? "text.secondary" : "#059669",
              }}
            >
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  bgcolor: assignment.attendance.checkOutAt ? "text.disabled" : "#10b981",
                  boxShadow: assignment.attendance.checkOutAt ? "none" : "0 0 4px #10b981",
                }}
              />
              <Typography variant="caption" sx={{ fontSize: "0.58rem", fontWeight: 700, lineHeight: 1 }}>
                {assignment.attendance.checkOutAt
                  ? `Ra ca ${formatAttendanceTime(assignment.attendance.checkOutAt)}`
                  : `Vào ${formatAttendanceTime(assignment.attendance.checkInAt)}`}
              </Typography>
            </Box>
          </Tooltip>
        ) : baseStatus === "active" ? (
          <Tooltip title="Đang trong ca trực nhưng chưa điểm danh GPS/Face">
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.4,
                px: 0.6,
                py: 0.2,
                borderRadius: "4px",
                bgcolor: "rgba(245, 158, 11, 0.15)",
                color: "#d97706",
              }}
            >
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  bgcolor: "#f59e0b",
                  animation: "pulse 1.5s infinite",
                  "@keyframes pulse": {
                    "0%": { opacity: 1, transform: "scale(1)" },
                    "50%": { opacity: 0.4, transform: "scale(1.3)" },
                    "100%": { opacity: 1, transform: "scale(1)" },
                  },
                }}
              />
              <Typography variant="caption" sx={{ fontSize: "0.58rem", fontWeight: 700, lineHeight: 1 }}>
                Chưa vào ca
              </Typography>
            </Box>
          </Tooltip>
        ) : null}
      </Stack>

      {onDelete ? (
        <Tooltip title="Xóa ca trực">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onDelete(assignment.id); }}
            sx={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 18,
              height: 18,
              bgcolor: "background.paper",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#ef4444",
              opacity: { xs: 1, md: hover ? 1 : 0 },
              transition: "opacity 0.15s",
              "&:hover": { bgcolor: "rgba(239,68,68,0.1)" },
              "& .MuiIconButton-root": { p: 0 },
            }}
          >
            <CloseIcon sx={{ fontSize: 10 }} />
          </IconButton>
        </Tooltip>
      ) : null}
    </Box>
  );
}
