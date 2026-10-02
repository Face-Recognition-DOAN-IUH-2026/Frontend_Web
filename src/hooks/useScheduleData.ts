"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import useSWR from "swr";
import api, { getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { usePermission } from "@/lib/permission-context";
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

interface ScheduleDataResult {
  staff: ScheduleStaff[];
  zones: LibraryZone[];
  shifts: StaffShift[];
  assignments: StaffScheduleAssignment[];
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

const fetchScheduleData = async (from: string, to: string, isAdmin: boolean): Promise<ScheduleDataResult> => {
  if (isAdmin) {
    const [staffResult, zoneResult, shiftResult, assignmentResult] = await Promise.all([
      api.getScheduleStaffOptions(),
      api.getScheduleZones(),
      api.getScheduleShifts(),
      api.getScheduleAssignments({ from, to }),
    ]);
    return {
      staff: staffResult.filter((s) => s.role === "admin" || s.role === "staff"),
      zones: zoneResult.filter((z) => z.isActive),
      shifts: shiftResult.filter((s) => s.isActive),
      assignments: assignmentResult.items,
    };
  } else {
    const [result, staffResult, shiftResult, zoneResult] = await Promise.all([
      api.getMySchedules({ from, to }),
      api.getScheduleStaffOptions(),
      api.getScheduleShifts(),
      api.getScheduleZones(),
    ]);
    return {
      assignments: result.items,
      staff: staffResult.filter((s) => s.role === "admin" || s.role === "staff"),
      shifts: shiftResult.filter((s) => s.isActive),
      zones: zoneResult.filter((z) => z.isActive),
    };
  }
};

export function useScheduleData(canViewAllOverride?: boolean): ScheduleData {
  const { user } = useAuth();
  const { can } = usePermission();
  const isAdmin = user?.role === "admin";
  const canManageAll = isAdmin || (canViewAllOverride !== undefined ? canViewAllOverride : (can("schedules", "create") || can("schedules", "update")));
  const isStaff = !!user;
  const [weekStart, setWeekStart] = useState(startOfWeek);
  const [staff, setStaff] = useState<ScheduleStaff[]>([]);
  const [zones, setZones] = useState<LibraryZone[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [assignments, setAssignments] = useState<StaffScheduleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const from = toDateInput(days[0]);
  const to = toDateInput(days[6]);

  const cacheKey = `schedule:${from}:${to}:${canManageAll ? "all" : "my"}`;
  const mountedRef = useRef(true);

  const { data: cachedData, mutate } = useSWR<ScheduleDataResult>(
    isStaff ? cacheKey : null,
    () => fetchScheduleData(from, to, canManageAll),
    {
      dedupingInterval: 10000,
      revalidateOnFocus: true,
      onSuccess: (data) => {
        if (mountedRef.current && data) {
          setStaff(data.staff);
          setZones(data.zones);
          setShifts(data.shifts);
          setAssignments(data.assignments);
          setLoading(false);
        }
      },
      onError: (err) => {
        if (mountedRef.current) {
          setError(getErrorMessage(err));
          setLoading(false);
        }
      },
    }
  );

  const loadData = useCallback(async () => {
    if (!isStaff) return;
    // Only show loading spinner when there is no cached data to display
    if (!cachedData) {
      setLoading(true);
    }
    setError(null);
    try {
      await mutate();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isStaff, mutate, cachedData]);

  useEffect(() => {
    mountedRef.current = true;
    // If SWR already has cached data on mount, don't show loading spinner
    if (cachedData) setLoading(false);
    return () => { mountedRef.current = false; };
  }, []);

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
}
