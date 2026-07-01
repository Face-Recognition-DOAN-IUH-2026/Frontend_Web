"use client";

import { useMemo, useState } from "react";
import type { StaffScheduleAssignment, StaffShift, LibraryZone } from "@/lib/types";

interface UseScheduleFiltersReturn {
  filter: string;
  setFilter: (v: string) => void;
  zoneFilter: string;
  setZoneFilter: (v: string) => void;
  shiftFilter: string;
  setShiftFilter: (v: string) => void;
  filteredAssignments: StaffScheduleAssignment[];
  filteredShifts: StaffShift[];
  shiftList: StaffShift[];
  weekStats: { total: number; active: number };
}

export function useScheduleFilters(
  assignments: StaffScheduleAssignment[],
  shifts: StaffShift[],
): UseScheduleFiltersReturn {
  const [filter, setFilter] = useState<string>("all");
  const [zoneFilter, setZoneFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");

  const shiftList = useMemo(() => {
    return [...shifts].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  }, [shifts]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (zoneFilter && a.zoneId !== zoneFilter) return false;
      if (shiftFilter && a.shiftId !== shiftFilter) return false;
      return true;
    });
  }, [assignments, zoneFilter, shiftFilter]);

  const filteredShifts = useMemo(() => {
    if (!shiftFilter) return shiftList;
    return shiftList.filter((s) => s.id === shiftFilter);
  }, [shiftList, shiftFilter]);

  const weekStats = useMemo(() => {
    const total = assignments.filter((a) => a.status !== "cancelled").length;
    const today = new Date().toISOString().slice(0, 10);
    const active = assignments.filter((a) => a.status !== "cancelled" && a.workDate === today).length;
    return { total, active };
  }, [assignments]);

  return {
    filter, setFilter,
    zoneFilter, setZoneFilter,
    shiftFilter, setShiftFilter,
    filteredAssignments, filteredShifts, shiftList, weekStats,
  };
}
