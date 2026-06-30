"use client";

import { useState } from "react";
import type { StaffScheduleAssignment } from "@/lib/types";

interface AssignmentCardProps {
  assignment: StaffScheduleAssignment;
  onDelete?: (id: string) => void;
  understaffed?: boolean;
}

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  past: { bg: "bg-surface-2", border: "border-border-2", text: "text-text-3", label: "Đã qua" },
  active: { bg: "bg-success/10", border: "border-success/30", text: "text-success", label: "Đang trực" },
  future: { bg: "bg-primary/10", border: "border-primary/20", text: "text-primary-dark", label: "Sắp tới" },
  today: { bg: "bg-warning/10", border: "border-warning/30", text: "text-warning", label: "Hôm nay" },
  understaffed: { bg: "bg-orange-500/10", border: "border-orange-400/40", text: "text-orange-600", label: "Thiếu người" },
};

function getStatus(assignment: StaffScheduleAssignment): keyof typeof STATUS_STYLES {
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
  const status = understaffed ? "understaffed" : baseStatus;
  const style = STATUS_STYLES[status];
  const displayName = assignment.staff?.fullName || assignment.staff?.email || "Nhân viên";
  const zoneName = assignment.zone?.zoneName || "";

  return (
    <div
      className={`relative px-2 py-1.5 rounded-md border ${style.bg} ${style.border} text-xs group`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {zoneName && (
        <div className="text-[10px] font-medium text-text-3/70 leading-tight mb-0.5">{zoneName}</div>
      )}
      <div className={`font-medium ${style.text} truncate`}>{displayName}</div>
      {onDelete && hover && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(assignment.id); }}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-surface border border-error/30 text-error text-[10px] flex items-center justify-center shadow-sm hover:bg-error/10 transition opacity-0 group-hover:opacity-100"
        >
          &times;
        </button>
      )}
    </div>
  );
}
