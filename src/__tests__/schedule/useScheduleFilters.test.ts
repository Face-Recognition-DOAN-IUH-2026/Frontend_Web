import { renderHook, act } from "@testing-library/react";
import { useScheduleFilters } from "@/hooks/useScheduleFilters";
import type { StaffScheduleAssignment, StaffShift, ScheduleStaff, LibraryZone } from "@/lib/types";

const mockShifts: StaffShift[] = [
  { id: "s1", name: "Sáng", startTime: "08:00", endTime: "12:00", isActive: true, zoneId: "z1", createdAt: "" },
  { id: "s2", name: "Chiều", startTime: "13:00", endTime: "17:00", isActive: true, zoneId: "z1", createdAt: "" },
  { id: "s3", name: "Tối", startTime: "18:00", endTime: "22:00", isActive: false, zoneId: "z1", createdAt: "" },
];

const mockZones: LibraryZone[] = [
  { id: "z1", zoneName: "Zone A", floor: 1, isActive: true },
  { id: "z2", zoneName: "Zone B", floor: 2, isActive: true },
];

const mockStaff: ScheduleStaff[] = [
  { id: "u1", fullName: "A", email: "a@test.com", role: "staff", isActive: true },
  { id: "u2", fullName: "B", email: "b@test.com", role: "staff", isActive: true },
];

const mockAssignments: StaffScheduleAssignment[] = [
  { id: "a1", staffId: "u1", shiftId: "s1", zoneId: "z1", workDate: "2026-07-01", status: "scheduled", shiftName: "Sáng", zoneName: "Zone A", staffName: "A" } as any,
  { id: "a2", staffId: "u2", shiftId: "s2", zoneId: "z2", workDate: "2026-07-01", status: "scheduled", shiftName: "Chiều", zoneName: "Zone B", staffName: "B" } as any,
  { id: "a3", staffId: "u2", shiftId: "s1", zoneId: "z1", workDate: "2026-07-02", status: "cancelled", shiftName: "Sáng", zoneName: "Zone A", staffName: "B" } as any,
];

describe("useScheduleFilters", () => {
  it("initializes with default filter values", () => {
    const { result } = renderHook(() => useScheduleFilters(mockAssignments, mockShifts, mockStaff, mockZones));
    expect(result.current.filter).toBe("all");
    expect(result.current.zoneFilter).toBe("");
    expect(result.current.shiftFilter).toBe("");
  });

  it("sorts shiftList by startTime", () => {
    const { result } = renderHook(() => useScheduleFilters(mockAssignments, mockShifts, mockStaff, mockZones));
    expect(result.current.shiftList[0].name).toBe("Sáng");
    expect(result.current.shiftList[1].name).toBe("Chiều");
  });

  it("filters assignments by zone", () => {
    const { result } = renderHook(() => useScheduleFilters(mockAssignments, mockShifts, mockStaff, mockZones));
    act(() => { result.current.setZoneFilter("z2"); });
    expect(result.current.filteredAssignments).toHaveLength(1);
    expect(result.current.filteredAssignments[0].zoneId).toBe("z2");
  });

  it("filters assignments by shift", () => {
    const { result } = renderHook(() => useScheduleFilters(mockAssignments, mockShifts, mockStaff, mockZones));
    act(() => { result.current.setShiftFilter("s2"); });
    expect(result.current.filteredAssignments).toHaveLength(1);
    expect(result.current.filteredAssignments[0].shiftId).toBe("s2");
  });

  it("filters shifts to single when shiftFilter set", () => {
    const { result } = renderHook(() => useScheduleFilters(mockAssignments, mockShifts, mockStaff, mockZones));
    act(() => { result.current.setShiftFilter("s1"); });
    expect(result.current.filteredShifts).toHaveLength(1);
    expect(result.current.filteredShifts[0].id).toBe("s1");
  });

  it("computes weekStats correctly", () => {
    const { result } = renderHook(() => useScheduleFilters(mockAssignments, mockShifts, mockStaff, mockZones));
    expect(result.current.weekStats.total).toBe(2);
    expect(result.current.weekStats.staffCount).toBe(2);
  });

  it("updates filter value", () => {
    const { result } = renderHook(() => useScheduleFilters(mockAssignments, mockShifts, mockStaff, mockZones));
    act(() => { result.current.setFilter("active"); });
    expect(result.current.filter).toBe("active");
  });
});
