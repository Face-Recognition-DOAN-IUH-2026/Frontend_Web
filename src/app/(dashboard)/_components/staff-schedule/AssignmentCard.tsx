"use client";

import { useState } from "react";
import { Box, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberIcon from "@mui/icons-material/WarningAmberOutlined";
import CancelIcon from "@mui/icons-material/CancelOutlined";
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

      <Chip
        icon={isUnderstaffed ? <WarningAmberIcon sx={{ fontSize: 12 }} /> : isCancelled ? <CancelIcon sx={{ fontSize: 12 }} /> : undefined}
        label={meta.label}
        size="small"
        color={meta.chipColor}
        variant={isGround ? "outlined" : "filled"}
        sx={{
          mt: 0.5,
          height: 18,
          fontSize: "0.6rem",
          fontWeight: 700,
          "& .MuiChip-label": { px: 0.75 },
        }}
      />

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
              opacity: hover ? 1 : 0,
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
