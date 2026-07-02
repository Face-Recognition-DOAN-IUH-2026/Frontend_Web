"use client";

import { useState } from "react";
import { Box, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { StaffScheduleAssignment } from "@/lib/types";

interface AssignmentCardProps {
  assignment: StaffScheduleAssignment;
  onDelete?: (id: string) => void;
  understaffed?: boolean;
}

type StatusKey = "past" | "active" | "future" | "today" | "understaffed" | "cancelled" | "completed";

const STATUS_STYLES: Record<StatusKey, { bg: string; border: string; text: string; label: string }> = {
  past:        { bg: "rgba(255,255,255,0.04)",       border: "rgba(255,255,255,0.08)",  text: "rgba(255,255,255,0.45)", label: "Đã qua" },
  active:      { bg: "rgba(16,185,129,0.10)",        border: "rgba(16,185,129,0.30)",  text: "#10b981",                label: "Đang trực" },
  future:      { bg: "rgba(99,102,241,0.10)",        border: "rgba(99,102,241,0.20)",   text: "#a5b4fc",                label: "Sắp tới" },
  today:       { bg: "rgba(245,158,11,0.10)",        border: "rgba(245,158,11,0.30)",   text: "#f59e0b",                label: "Hôm nay" },
  understaffed:{ bg: "rgba(251,146,60,0.10)",        border: "rgba(251,146,60,0.40)",   text: "#fb923c",                label: "Thiếu người" },
  cancelled:   { bg: "rgba(239,68,68,0.10)",         border: "rgba(239,68,68,0.30)",   text: "#ef4444",                label: "Đã hủy" },
  completed:   { bg: "rgba(99,102,241,0.06)",        border: "rgba(99,102,241,0.15)",  text: "rgba(165,180,252,0.7)", label: "Hoàn thành" },
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
  const style = STATUS_STYLES[status];
  const displayName = assignment.staff?.fullName || assignment.staff?.email || "Nhân viên";
  const zoneName = assignment.zone?.zoneName || "";

  return (
    <Box
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      sx={{
        position: "relative",
        px: 1.5,
        py: 1,
        borderRadius: 1,
        border: `1px solid ${style.border}`,
        bgcolor: style.bg,
        "&:hover": onDelete ? { borderColor: style.border } : undefined,
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
        sx={{ fontWeight: 600, color: style.text, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        {displayName}
      </Typography>
      {hover ? (
        <Chip
          label={style.label}
          size="small"
          sx={{
            position: "absolute",
            top: 2,
            right: onDelete ? 20 : 2,
            height: 16,
            fontSize: "0.5rem",
            fontWeight: 700,
            bgcolor: `${style.text}18`,
            color: style.text,
            border: `1px solid ${style.border}`,
          }}
        />
      ) : null}
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
