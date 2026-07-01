"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api, { getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { ScheduleStaff, LibraryZone, StaffShift, StaffScheduleAssignment } from "@/lib/types";

export function startOfWeek(date = new Date()) {
  const value = new Date(date);
  const day = value.getDay() || 7;
  value.setDate(value.getDate() - day + 1);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function getWeekDays(anchor: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + i);
    return d;
  });
}

export function toDateInput(date: Date) {
import { useCallback, useEffect, useState } from "react";
import api, { getErrorMessage } from "@/lib/api-client";
import type { ScheduleStaff, LibraryZone, StaffShift, StaffScheduleAssignment } from "@/lib/types";

interface UseScheduleDataReturn {
  assignments: StaffScheduleAssignment[];
  staff: ScheduleStaff[];
  zones: LibraryZone[];
  shifts: StaffShift[];
  loading: boolean;
  error: string | null;
  loadData: () => Promise<void>;
  setError: (msg: string | null) => void;
}

function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateRange(days: Date[]) {
  const from = days[0].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  const to = days[6].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${from} — ${to}`;
}

export interface ScheduleData {
  staff: ScheduleStaff[];
  zones: LibraryZone[];
  shifts: StaffShift[];
  assignments: StaffScheduleAssignment[];
  loading: boolean;
  error: string | null;
  weekStart: Date;
  days: Date[];
  from: string;
  to: string;
  goPrevWeek: () => void;
  goNextWeek: () => void;
  goToday: () => void;
  loadData: () => Promise<void>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useScheduleData(): ScheduleData {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isStaff = !!user;
  const [weekStart, setWeekStart] = useState(startOfWeek);
function getWeekDays(anchor: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + i);
    return d;
  });
}

export function useScheduleData(weekStart: Date, isAdmin: boolean): UseScheduleDataReturn {
  const [staff, setStaff] = useState<ScheduleStaff[]>([]);
  const [zones, setZones] = useState<LibraryZone[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [assignments, setAssignments] = useState<StaffScheduleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const days = getWeekDays(weekStart);
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
        const [result, staffResult, shiftResult, zoneResult] = await Promise.all([
          api.getMySchedules({ from, to }),
          api.getScheduleStaffOptions(),
          api.getScheduleShifts(),
          api.getScheduleZones(),
        ]);
        setAssignments(result.items);
        setStaff(staffResult.filter((s) => s.role === "admin" || s.role === "staff"));
        setShifts(shiftResult.filter((s) => s.isActive));
        setZones(zoneResult.filter((z) => z.isActive));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [from, isAdmin, isStaff, to]);

  useEffect(() => { loadData(); }, [loadData]);

  const goPrevWeek = useCallback(() => {
    setWeekStart((prev) => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; });
  }, []);

  const goNextWeek = useCallback(() => {
    setWeekStart((prev) => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; });
  }, []);

  const goToday = useCallback(() => { setWeekStart(startOfWeek()); }, []);

  return {
    staff, zones, shifts, assignments, loading, error,
    weekStart, days, from, to,
    goPrevWeek, goNextWeek, goToday, loadData, setError,
  };
  }, [from, isAdmin, to]);

  useEffect(() => { loadData(); }, [loadData]);

  return { assignments, staff, zones, shifts, loading, error, loadData, setError };
}
