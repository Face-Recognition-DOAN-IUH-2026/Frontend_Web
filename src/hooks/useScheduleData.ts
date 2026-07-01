"use client";

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

  const days = getWeekDays(weekStart);
  const from = toDateInput(days[0]);
  const to = toDateInput(days[6]);

  const loadData = useCallback(async () => {
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
  }, [from, isAdmin, to]);

  useEffect(() => { loadData(); }, [loadData]);

  return { assignments, staff, zones, shifts, loading, error, loadData, setError };
}
