"use client";

import type { StaffScheduleAssignment, StaffShift } from "@/lib/types";
import AssignmentCard from "./AssignmentCard";

interface TimetableCellProps {
  assignments: StaffScheduleAssignment[];
  date?: string;
  shiftId?: string;
  isAdmin?: boolean;
  onCellClick?: (date: string, shiftId: string) => void;
  onDeleteAssignment?: (id: string) => void;
  shift?: StaffShift | null;
}

function isUnderstaffed(assignments: StaffScheduleAssignment[], shift?: StaffShift | null): boolean {
  if (!shift?.minStaff) return false;
  const activeCount = assignments.filter(a => a.status !== "cancelled" && a.status !== "completed").length;
  return activeCount < shift.minStaff;
}

export default function TimetableCell({
  assignments, date, shiftId, isAdmin, onCellClick, onDeleteAssignment, shift,
}: TimetableCellProps) {
  const under = isUnderstaffed(assignments, shift);
  if (!isAdmin || !date || !shiftId || !onCellClick) {
    if (assignments.length === 0) return null;
    return (
      <div className="flex flex-col gap-1">
        {assignments.map((a) => (
          <AssignmentCard key={a.id} assignment={a} understaffed={under} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {assignments.map((a) => (
        <AssignmentCard key={a.id} assignment={a} onDelete={onDeleteAssignment} understaffed={under} />
      ))}
      <button
        onClick={() => onCellClick(date, shiftId)}
        className="w-full py-1 rounded-md border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition flex items-center justify-center text-text-3 hover:text-primary"
      >
        <span className="text-sm leading-none">+</span>
      </button>
    </div>
  );
}
