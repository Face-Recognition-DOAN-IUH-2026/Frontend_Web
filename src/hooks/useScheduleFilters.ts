"use client";

import { useMemo, useState } from "react";
import type { LibraryZone, ScheduleStaff, StaffScheduleAssignment, StaffShift } from "@/lib/types";

export interface ScheduleFilters {
  filter: string;
  zoneFilter: string;
  shiftFilter: string;
  staffFilter: string;
  staffSearch: string;
  myShiftsOnly: boolean;
  setFilter: (v: string) => void;
  setZoneFilter: (v: string) => void;
  setShiftFilter: (v: string) => void;
  setStaffFilter: (v: string) => void;
  setStaffSearch: (v: string) => void;
  setMyShiftsOnly: (v: boolean) => void;
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
  currentUserId?: string,
): ScheduleFilters {
  const [filter, setFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [staffFilter, setStaffFilter] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [myShiftsOnly, setMyShiftsOnly] = useState(false);

  const shiftList = useMemo(() => {
    return [...shifts].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  }, [shifts]);

  const filteredAssignments = useMemo(() => {
    const searchNormalized = staffSearch.trim().toLowerCase();

    return assignments.filter((a) => {
      if (zoneFilter && a.zoneId !== zoneFilter) return false;
      if (shiftFilter && a.shiftId !== shiftFilter) return false;
      if (staffFilter && a.staffId !== staffFilter) return false;

      if (myShiftsOnly && currentUserId) {
        const isMine = a.staffId === currentUserId || a.staff?.id === currentUserId;
        if (!isMine) return false;
      }

      if (searchNormalized) {
        const staffName = (a.staff?.fullName || "").toLowerCase();
        const staffEmail = (a.staff?.email || "").toLowerCase();
        const note = (a.note || "").toLowerCase();
        const matches =
          staffName.includes(searchNormalized) ||
          staffEmail.includes(searchNormalized) ||
          note.includes(searchNormalized);
        if (!matches) return false;
      }

      return true;
    });
  }, [assignments, zoneFilter, shiftFilter, staffFilter, myShiftsOnly, currentUserId, staffSearch]);

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
    filter, zoneFilter, shiftFilter, staffFilter, staffSearch, myShiftsOnly,
    setFilter, setZoneFilter, setShiftFilter, setStaffFilter, setStaffSearch, setMyShiftsOnly,
    shiftList, filteredAssignments, filteredShifts, weekStats,
  };
}
