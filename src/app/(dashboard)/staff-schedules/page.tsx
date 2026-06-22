"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api, { getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { ScheduleStaff, LibraryZone, StaffShift, StaffScheduleAssignment } from "@/lib/types";
import TimetableHeader from "@/components/staff-schedule/TimetableHeader";
import TimetableGrid from "@/components/staff-schedule/TimetableGrid";
import TimetableLegend from "@/components/staff-schedule/TimetableLegend";
import AssignStaffDialog from "@/components/staff-schedule/AssignStaffDialog";
import ScheduleManagementPanel from "@/components/staff-schedule/ScheduleManagementPanel";

const FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang trực" },
  { value: "future", label: "Sắp tới" },
  { value: "past", label: "Đã qua" },
] as const;

function startOfWeek(date = new Date()) {
  const value = new Date(date);
  const day = value.getDay() || 7;
  value.setDate(value.getDate() - day + 1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function getWeekDays(anchor: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + i);
    return d;
  });
}

function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function StaffSchedulesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isStaff = !!user;
  const [weekStart, setWeekStart] = useState(startOfWeek);
  const [staff, setStaff] = useState<ScheduleStaff[]>([]);
  const [zones, setZones] = useState<LibraryZone[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [assignments, setAssignments] = useState<StaffScheduleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  // Management state
  const [showManagement, setShowManagement] = useState(false);
  const [assignDialog, setAssignDialog] = useState<{ date: string; shiftId: string; shiftName: string } | null>(null);

  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const from = toDateInput(days[0]);
  const to = toDateInput(days[6]);

  const loadData = useCallback(async () => {
    if (!isStaff) return;
    setLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        const [staffResult, zoneResult, shiftResult, assignmentResult] = await Promise.all([
          api.getScheduleStaffOptions(),
          api.getScheduleZones(),
          api.getScheduleShifts(),
          api.getScheduleAssignments({ from, to }),
        ]);
        setStaff(staffResult.filter((s) => s.role === "admin" || s.role === "staff"));
        setZones(zoneResult.filter((z) => z.isActive));
        setShifts(shiftResult.filter((s) => s.isActive));
        setAssignments(assignmentResult.items);
      } else {
        const result = await api.getMySchedules({ from, to });
        setAssignments(result.items);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [from, isAdmin, isStaff, to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const shiftList = useMemo(() => {
    const list = isAdmin
      ? shifts
      : Array.from(new Set(assignments.map((a) => a.shiftId)))
          .map((id) => assignments.find((a) => a.shiftId === id)?.shift)
          .filter(Boolean) as StaffShift[];
    return [...list].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  }, [shifts, assignments, isAdmin]);

  const weekStats = useMemo(() => {
    const total = assignments.filter((a) => a.status !== "cancelled").length;
    const active = assignments.filter((a) => a.status === "in_progress").length;
    return { total, active };
  }, [assignments]);

  const goPrevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const goNextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const goToday = () => setWeekStart(startOfWeek());

  const handleCellClick = (date: string, shiftId: string) => {
    const shift = shifts.find((s) => s.id === shiftId);
    setAssignDialog({ date, shiftId, shiftName: shift?.name || "" });
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("Xóa ca trực này?")) return;
    try {
      await api.deleteScheduleAssignment(id);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleAutoSchedule = async () => {
    setError(null);
    try {
      const result = await api.autoSchedule({ from, to });
      const count = result.proposed?.length || 0;
      if (count === 0) {
        setError("Không có đề xuất lịch mới");
        return;
      }
      for (const item of result.proposed) {
        await api.createScheduleAssignment(item);
      }
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (!isStaff) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-text-3">
        Bạn không có quyền xem trang này.
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto py-6 px-4 space-y-5">
      <TimetableHeader
        weekStart={weekStart}
        onPrevWeek={goPrevWeek}
        onNextWeek={goNextWeek}
        onToday={goToday}
        isAdmin={isAdmin}
        onOpenManagement={() => setShowManagement(true)}
        onAutoSchedule={handleAutoSchedule}
      />

      <div className="flex items-center gap-4 text-xs text-text-3 print:hidden">
        <span className="font-medium text-text-2">
          Tổng ca: <span className="text-primary font-bold">{weekStats.total}</span>
        </span>
        <span className="w-px h-3 bg-border" />
        <span>
          Đang trực: <span className="text-success font-bold">{weekStats.active}</span>
        </span>
        <span className="w-px h-3 bg-border" />
        <span>
          Nhân viên: <span className="text-text font-bold">{staff.length}</span>
        </span>
      </div>

      <div className="flex items-center gap-1.5 print:hidden">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
              filter === f.value
                ? "bg-primary/10 text-primary border-primary/20"
                : "text-text-3 border-border hover:bg-surface-2"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-xs text-error bg-error/10 border border-error/20 rounded-md px-3 py-2 print:hidden">
          {error}
        </div>
      )}

      {/* Print-only header */}
      <div className="hidden print:block mb-4">
        <h1 className="font-serif text-2xl font-semibold text-text tracking-tight mb-1">
          Lịch trực thư viện
        </h1>
        <p className="text-sm text-text-2 font-mono">{from} ~ {to}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 print:hidden">
          <div className="flex flex-col items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-text-3">Đang tải lịch trực...</span>
          </div>
        </div>
      ) : (
        <TimetableGrid
          days={days}
          shifts={shiftList}
          assignments={assignments}
          filter={filter}
          isAdmin={isAdmin}
          onCellClick={isAdmin ? handleCellClick : undefined}
          onDeleteAssignment={isAdmin ? handleDeleteAssignment : undefined}
        />
      )}

      <TimetableLegend />

      <AssignStaffDialog
        open={!!assignDialog}
        date={assignDialog?.date || ""}
        shiftId={assignDialog?.shiftId || ""}
        shiftName={assignDialog?.shiftName || ""}
        shifts={shiftList}
        zones={zones}
        staff={staff}
        existingAssignments={assignments.filter(
          (a) => a.shiftId === assignDialog?.shiftId && a.workDate === assignDialog?.date && a.status !== "cancelled"
        )}
        onClose={() => setAssignDialog(null)}
        onAssigned={() => { setAssignDialog(null); loadData(); }}
      />

      <ScheduleManagementPanel
        open={showManagement}
        onClose={() => setShowManagement(false)}
        zones={zones}
        shifts={shiftList}
        onUpdate={loadData}
      />
    </div>
  );
}
