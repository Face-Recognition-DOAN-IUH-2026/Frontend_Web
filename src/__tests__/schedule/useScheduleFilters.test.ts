import { renderHook, act } from "@testing-library/react";
import { useScheduleFilters } from "@/hooks/useScheduleFilters";
import type { StaffScheduleAssignment, StaffShift, ScheduleStaff, LibraryZone } from "@/lib/types";

const mockShifts: StaffShift[] = [
  { id: "s1", name: "Sáng", startTime: "08:00", endTime: "12:00", minStaff: 1, maxStaff: 2, isActive: true },
  { id: "s2", name: "Chiều", startTime: "13:00", endTime: "17:00", minStaff: 1, maxStaff: 2, isActive: true },
  { id: "s3", name: "Tối", startTime: "18:00", endTime: "22:00", minStaff: 1, maxStaff: 2, isActive: false },
];

const mockZones: LibraryZone[] = [
  { id: "z1", zoneName: "Zone A", floor: 1, description: null, isActive: true },
  { id: "z2", zoneName: "Zone B", floor: 2, description: null, isActive: true },
];

const mockStaff: ScheduleStaff[] = [
  { id: "u1", fullName: "A", email: "a@test.com", role: "staff", status: "active" },
  { id: "u2", fullName: "B", email: "b@test.com", role: "staff", status: "active" },
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

  it("filters assignments by myShiftsOnly", () => {
    const { result } = renderHook(() => useScheduleFilters(mockAssignments, mockShifts, mockStaff, mockZones, "u1"));
    act(() => { result.current.setMyShiftsOnly(true); });
    expect(result.current.filteredAssignments).toHaveLength(1);
    expect(result.current.filteredAssignments[0].staffId).toBe("u1");
  });

  it("filters assignments by staffSearch query", () => {
    const assignmentsWithStaff: StaffScheduleAssignment[] = [
      { id: "a1", staffId: "u1", shiftId: "s1", zoneId: "z1", workDate: "2026-07-01", status: "scheduled", staff: { id: "u1", fullName: "Nguyễn Văn An", email: "an@test.com", role: "staff", status: "active" } } as any,
      { id: "a2", staffId: "u2", shiftId: "s2", zoneId: "z2", workDate: "2026-07-01", status: "scheduled", staff: { id: "u2", fullName: "Trần Thị Bình", email: "binh@test.com", role: "staff", status: "active" } } as any,
    ];
    const { result } = renderHook(() => useScheduleFilters(assignmentsWithStaff, mockShifts, mockStaff, mockZones));
    act(() => { result.current.setStaffSearch("Bình"); });
    expect(result.current.filteredAssignments).toHaveLength(1);
    expect(result.current.filteredAssignments[0].staffId).toBe("u2");
  });
});
