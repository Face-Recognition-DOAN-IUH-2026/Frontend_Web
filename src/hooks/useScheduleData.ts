"use client";

import { useCallback, useMemo, useState } from "react";
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

export interface ScheduleDataResult {
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
  assignmentsLoading?: boolean;
  error: string | null;
  weekStart: Date;
  days: Date[];
  from: string;
  to: string;
  goPrevWeek: () => void;
  goNextWeek: () => void;
  goToday: () => void;
  jumpToDate: (targetDate: Date) => void;
  loadData: () => Promise<void>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export const fetchScheduleData = async (from: string, to: string, isAdmin: boolean): Promise<ScheduleDataResult> => {
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
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const from = toDateInput(days[0]);
  const to = toDateInput(days[6]);

  // 1. Staff options metadata (rarely changes, 60s cache TTL)
  const {
    data: staffData,
    mutate: mutateStaff,
    isLoading: isStaffLoading,
  } = useSWR<ScheduleStaff[]>(
    isStaff ? "schedule:staff-options" : null,
    async () => {
      const res = await api.getScheduleStaffOptions();
      return res.filter((s) => s.role === "admin" || s.role === "staff");
    },
    {
      dedupingInterval: 60000,
      revalidateOnFocus: false,
    }
  );

  // 2. Zones metadata (rarely changes, 60s cache TTL)
  const {
    data: zonesData,
    mutate: mutateZones,
    isLoading: isZonesLoading,
  } = useSWR<LibraryZone[]>(
    isStaff ? "schedule:zones" : null,
    async () => {
      const res = await api.getScheduleZones();
      return res.filter((z) => z.isActive);
    },
    {
      dedupingInterval: 60000,
      revalidateOnFocus: false,
    }
  );

  // 3. Shifts metadata (rarely changes, 60s cache TTL)
  const {
    data: shiftsData,
    mutate: mutateShifts,
    isLoading: isShiftsLoading,
  } = useSWR<StaffShift[]>(
    isStaff ? "schedule:shifts" : null,
    async () => {
      const res = await api.getScheduleShifts();
      return res.filter((s) => s.isActive);
    },
    {
      dedupingInterval: 60000,
      revalidateOnFocus: false,
    }
  );

  // 4. Assignments for selected week (dynamic, keepPreviousData preserves UI during week changes)
  const assignmentKey = isStaff
    ? ["schedule:assignments", from, to, canManageAll ? "all" : "my"]
    : null;

  const {
    data: assignmentsData,
    mutate: mutateAssignments,
    isLoading: isAssignmentsLoading,
    isValidating: isAssignmentsValidating,
  } = useSWR<StaffScheduleAssignment[]>(
    assignmentKey,
    async () => {
      if (canManageAll) {
        const res = await api.getScheduleAssignments({ from, to });
        return res.items;
      } else {
        const res = await api.getMySchedules({ from, to });
        return res.items;
      }
    },
    {
      dedupingInterval: 10000,
      keepPreviousData: true,
      revalidateOnFocus: true,
      onError: (err) => {
        setError(getErrorMessage(err));
      },
    }
  );

  const staff = staffData ?? [];
  const zones = zonesData ?? [];
  const shifts = shiftsData ?? [];
  const assignments = assignmentsData ?? [];

  // Page is only in full loading state on initial mount when core data is not yet available
  const loading =
    (!assignmentsData && isAssignmentsLoading) ||
    (!zonesData && isZonesLoading) ||
    (!shiftsData && isShiftsLoading);

  const assignmentsLoading = isAssignmentsLoading || isAssignmentsValidating;

  const loadData = useCallback(async () => {
    if (!isStaff) return;
    setError(null);
    try {
      await Promise.allSettled([
        mutateAssignments(),
        mutateStaff(),
        mutateZones(),
        mutateShifts(),
      ]);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [isStaff, mutateAssignments, mutateStaff, mutateZones, mutateShifts]);

  const goPrevWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  const goNextWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, []);

  const goToday = useCallback(() => {
    setWeekStart(startOfWeek());
  }, []);

  const jumpToDate = useCallback((targetDate: Date) => {
    setWeekStart(startOfWeek(targetDate));
  }, []);

  return {
    staff,
    zones,
    shifts,
    assignments,
    loading,
    assignmentsLoading,
    error,
    weekStart,
    days,
    from,
    to,
    goPrevWeek,
    goNextWeek,
    goToday,
    jumpToDate,
    loadData,
    setError,
  };
}
