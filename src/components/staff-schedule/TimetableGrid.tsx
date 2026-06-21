"use client";

import { Fragment, useMemo } from "react";
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
  days, shifts, assignments, filter, isAdmin, onCellClick, onDeleteAssignment,
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

  return (
    <div
      className="dot-grid-bg rounded-lg overflow-hidden"
      style={{
        display: "grid",
        gridTemplateColumns: `180px repeat(${numCols}, 1fr)`,
        gap: "1px",
        backgroundColor: "rgb(var(--color-border) / 1)",
        border: "1px solid rgb(var(--color-border) / 1)",
      }}
    >
      {/* Corner cell */}
      <div className="bg-surface p-2 flex items-end">
        <span className="text-[10px] font-medium text-text-3 uppercase tracking-wider">Ca / Ngày</span>
      </div>

      {/* Day headers */}
      {days.map((d, i) => (
        <div
          key={i}
          className={`bg-surface p-2 text-center border-b border-border ${isToday(d) ? "bg-primary/[0.04]" : ""}`}
        >
          <div className={`text-xs font-bold ${isToday(d) ? "text-primary" : "text-text"}`}>
            {DAY_LABELS[i]}
          </div>
          <div className={`text-[10px] mt-0.5 ${isToday(d) ? "text-primary-dim font-medium" : "text-text-3"}`}>
            {formatDate(d)}
          </div>
        </div>
      ))}

      {/* Shift rows */}
      {shifts.map((shift) => (
        <Fragment key={shift.id}>
          {/* Row label */}
          <div
            className="bg-primary/[0.06] p-2 flex flex-col justify-center border-b border-border"
          >
            <span className="text-xs font-semibold text-primary">{shift.name}</span>
            <span className="text-[10px] text-text-3 mt-0.5">
              {shift.startTime?.slice(0, 5)} &ndash; {shift.endTime?.slice(0, 5)}
            </span>
          </div>

          {/* Day cells */}
          {days.map((d, di) => {
            const dateStr = toDateInput(d);
            const cellAssignments = cellMap[`${shift.id}:${dateStr}`] || [];
            return (
              <div
                key={`${shift.id}-${di}`}
                className={`bg-surface p-2 min-h-[64px] border-b border-border ${isToday(d) ? "bg-primary/[0.02]" : ""} group`}
              >
                <TimetableCell
                  assignments={cellAssignments}
                  date={dateStr}
                  shiftId={shift.id}
                  isAdmin={isAdmin}
                  onCellClick={onCellClick}
                  onDeleteAssignment={onDeleteAssignment}
                />
              </div>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
