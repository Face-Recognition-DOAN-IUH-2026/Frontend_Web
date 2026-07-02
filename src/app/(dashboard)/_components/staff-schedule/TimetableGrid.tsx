"use client";

import { Fragment, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import type { StaffScheduleAssignment, StaffShift } from "@/lib/types";
import TimetableCell from "./TimetableCell";

interface TimetableGridProps {
  days: Date[];
  shifts: StaffShift[];
  assignments: StaffScheduleAssignment[];
  filter: string;
  isAdmin?: boolean;
  onCellClick?: (date: string, shiftId: string) => void;
  onDeleteAssignment?: (id: string) => void;
  onViewStaff?: (staffId: string) => void;
}

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(d: Date) {
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function isToday(d: Date) {
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

export default function TimetableGrid({
  days, shifts, assignments, filter, isAdmin, onCellClick, onDeleteAssignment, onViewStaff,
}: TimetableGridProps) {
  const cellMap = useMemo(() => {
    const map: Record<string, StaffScheduleAssignment[]> = {};
    for (const a of assignments) {
      if (a.status === "cancelled") continue;

      if (filter === "active") {
        const now = new Date();
        const today = toDateInput(now);
        if (a.workDate !== today) continue;
        const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const start = (a.shift?.startTime || "").slice(0, 5);
        const end = (a.shift?.endTime || "").slice(0, 5);
        if (!(start && end && current >= start && current <= end)) continue;
      }
      if (filter === "future" && a.workDate <= toDateInput(new Date())) continue;
      if (filter === "past" && a.workDate >= toDateInput(new Date())) continue;

      const key = `${a.shiftId}:${a.workDate}`;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    return map;
  }, [assignments, filter]);

  const numCols = 7;
  const colTemplate = `180px repeat(${numCols}, minmax(120px, 1fr))`;

  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: colTemplate,
          gap: "1px",
          bgcolor: "divider",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          minWidth: "fit-content",
        }}
      >
        <Box sx={{ bgcolor: "background.paper", p: 1, display: "flex", alignItems: "flex-end" }}>
          <Typography variant="caption" sx={{ fontSize: "0.6rem", fontWeight: 600, color: "text.disabled", textTransform: "uppercase", letterSpacing: 1 }}>
            Ca / Ngày
          </Typography>
        </Box>

        {days.map((d, i) => (
          <Box
            key={i}
            sx={{
              bgcolor: "background.paper",
              p: 1,
              textAlign: "center",
              borderBottom: "1px solid",
              borderColor: "divider",
              ...(isToday(d) ? { bgcolor: "rgba(99,102,241,0.04)" } : {}),
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: isToday(d) ? "primary.main" : "text.primary", display: "block" }}>
              {DAY_LABELS[i]}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "0.625rem", mt: 0.25, display: "block", color: isToday(d) ? "primary.light" : "text.disabled", fontWeight: isToday(d) ? 600 : 400 }}>
              {formatDate(d)}
            </Typography>
          </Box>
        ))}

        {shifts.map((shift) => (
          <Fragment key={shift.id}>
            <Box
              sx={{
                bgcolor: "rgba(99,102,241,0.06)",
                p: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "primary.main" }}>
                {shift.name}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "0.625rem", mt: 0.25, color: "text.disabled" }}>
                {shift.startTime?.slice(0, 5)} &ndash; {shift.endTime?.slice(0, 5)}
              </Typography>
            </Box>

            {days.map((d, di) => {
              const dateStr = toDateInput(d);
              const cellAssignments = cellMap[`${shift.id}:${dateStr}`] || [];
              return (
                <Box
                  key={`${shift.id}-${di}`}
                  sx={{
                    bgcolor: "background.paper",
                    p: 1,
                    minHeight: 64,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    ...(isToday(d) ? { bgcolor: "rgba(99,102,241,0.02)" } : {}),
                  }}
                >
                  <TimetableCell
                    assignments={cellAssignments}
                    date={dateStr}
                    shiftId={shift.id}
                    isAdmin={isAdmin}
                    onCellClick={onCellClick}
                    onDeleteAssignment={onDeleteAssignment}
                    onViewStaff={onViewStaff}
                    shift={shift}
                  />
                </Box>
              );
            })}
          </Fragment>
        ))}
      </Box>
    </Box>
  );
}
