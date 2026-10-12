import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ScheduleFilterBar from "@/app/(dashboard)/_components/staff-schedule/ScheduleFilterBar";
import type { LibraryZone, StaffShift } from "@/lib/types";

const mockZones: LibraryZone[] = [
  { id: "z1", zoneName: "Tầng 1 - Khu mượn trả", description: "" } as LibraryZone,
  { id: "z2", zoneName: "Tầng 2 - Phòng đọc", description: "" } as LibraryZone,
];

const mockShifts: StaffShift[] = [
  { id: "s1", name: "Ca Sáng (07:30 - 11:30)", startTime: "07:30", endTime: "11:30" } as StaffShift,
  { id: "s2", name: "Ca Chiều (13:00 - 17:00)", startTime: "13:00", endTime: "17:00" } as StaffShift,
];

describe("ScheduleFilterBar", () => {
  it("renders status filter pills correctly", () => {
    render(
      <ScheduleFilterBar
        filter="all"
        setFilter={jest.fn()}
        zoneFilter=""
        setZoneFilter={jest.fn()}
        shiftFilter=""
        setShiftFilter={jest.fn()}
        zones={mockZones}
        shiftList={mockShifts}
      />
    );

    expect(screen.getByText("Tất cả")).toBeInTheDocument();
    expect(screen.getByText("Đang trực")).toBeInTheDocument();
    expect(screen.getByText("Sắp tới")).toBeInTheDocument();
    expect(screen.getByText("Đã qua")).toBeInTheDocument();
    expect(screen.getByText("Tất cả khu vực")).toBeInTheDocument();
    expect(screen.getByText("Tất cả ca trực")).toBeInTheDocument();
  });

  it("calls setFilter when clicking another status pill", () => {
    const setFilter = jest.fn();
    render(
      <ScheduleFilterBar
        filter="all"
        setFilter={setFilter}
        zoneFilter=""
        setZoneFilter={jest.fn()}
        shiftFilter=""
        setShiftFilter={jest.fn()}
        zones={mockZones}
        shiftList={mockShifts}
      />
    );

    fireEvent.click(screen.getByText("Đang trực"));
    expect(setFilter).toHaveBeenCalledWith("active");
  });

  it("shows reset button when any filter is active and resets upon click", () => {
    const setFilter = jest.fn();
    const setZoneFilter = jest.fn();
    const setShiftFilter = jest.fn();

    render(
      <ScheduleFilterBar
        filter="active"
        setFilter={setFilter}
        zoneFilter="z1"
        setZoneFilter={setZoneFilter}
        shiftFilter=""
        setShiftFilter={setShiftFilter}
        zones={mockZones}
        shiftList={mockShifts}
      />
    );

    const resetButton = screen.getByRole("button", { name: /đặt lại/i });
    expect(resetButton).toBeInTheDocument();

    fireEvent.click(resetButton);
    expect(setFilter).toHaveBeenCalledWith("all");
    expect(setZoneFilter).toHaveBeenCalledWith("");
    expect(setShiftFilter).toHaveBeenCalledWith("");
  });
});
