"use client";

import { useMemo, useState } from "react";
import type { LibraryZone, ScheduleStaff, StaffScheduleAssignment, StaffShift } from "@/lib/types";

export interface ScheduleFilters {
  filter: string;
  zoneFilter: string;
  shiftFilter: string;
  setFilter: (v: string) => void;
  setZoneFilter: (v: string) => void;
  setShiftFilter: (v: string) => void;
  shiftList: StaffShift[];
  filteredAssignments: StaffScheduleAssignment[];
  filteredShifts: StaffShift[];
  weekStats: { total: number; active: number; staffCount: number };
}

export function useScheduleFilters(
  assignments: StaffScheduleAssignment[],
  shifts: StaffShift[],
  staff: ScheduleStaff[],
  zones: LibraryZone[],
): ScheduleFilters {
  const [filter, setFilter] = useState("all");
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
    return { total, active, staffCount: staff.length };
  }, [assignments, staff]);

  return {
    filter, zoneFilter, shiftFilter,
    setFilter, setZoneFilter, setShiftFilter,
    shiftList, filteredAssignments, filteredShifts, weekStats,
  };
}
