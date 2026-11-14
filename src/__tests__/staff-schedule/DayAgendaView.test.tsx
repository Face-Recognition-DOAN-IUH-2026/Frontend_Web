import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DayAgendaView from "@/app/(dashboard)/_components/staff-schedule/DayAgendaView";
import type { StaffScheduleAssignment, StaffShift } from "@/lib/types";

const mockDays = [
  new Date(2026, 10, 16), // Mon
  new Date(2026, 10, 17), // Tue
  new Date(2026, 10, 18), // Wed
  new Date(2026, 10, 19), // Thu
  new Date(2026, 10, 20), // Fri
  new Date(2026, 10, 21), // Sat
  new Date(2026, 10, 22), // Sun
];

const mockShifts: StaffShift[] = [
  { id: "sh-1", name: "Ca Sáng", startTime: "07:30", endTime: "11:30", minStaff: 2, maxStaff: 4, isActive: true },
  { id: "sh-2", name: "Ca Chiều", startTime: "13:00", endTime: "17:00", minStaff: 1, maxStaff: 3, isActive: true },
];

const mockAssignments: StaffScheduleAssignment[] = [
  {
    id: "a-1",
    staffId: "st-1",
    shiftId: "sh-1",
    zoneId: "z-1",
    workDate: "2026-11-16",
    status: "scheduled",
    staff: { id: "st-1", fullName: "Nguyễn Văn An", email: "an@test.com", role: "staff", status: "active" },
    shift: mockShifts[0],
    zone: { id: "z-1", floor: 1, zoneName: "Phòng đọc 1", description: null, isActive: true },
    attendance: { id: "att-1", scheduleId: "a-1", staffId: "st-1", checkInAt: "2026-11-16T07:45:00Z", checkOutAt: null, status: "present", method: "web", invalidatedReason: null, deletedAt: null },
    assignedBy: null,
    note: null,
  },
];

describe("DayAgendaView", () => {
  it("renders days flow and displays staff assignment with attendance time", () => {
    render(
      <DayAgendaView
        days={mockDays}
        shifts={mockShifts}
        assignments={mockAssignments}
        filter="all"
        isAdmin={true}
      />
    );

    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();
    expect(screen.getByText("Phòng đọc 1")).toBeInTheDocument();
    expect(screen.getByText(/Vào \d{2}:\d{2}/)).toBeInTheDocument();
  });

  it("calls onCellClick when adding staff to a shift", async () => {
    const user = userEvent.setup();
    const onCellClick = jest.fn();

    render(
      <DayAgendaView
        days={mockDays}
        shifts={mockShifts}
        assignments={mockAssignments}
        filter="all"
        isAdmin={true}
        onCellClick={onCellClick}
      />
    );

    const addButtons = screen.getAllByRole("button", { name: "Thêm nhân viên vào ca này" });
    expect(addButtons.length).toBeGreaterThan(0);
    await user.click(addButtons[0]);

    expect(onCellClick).toHaveBeenCalled();
  });

  it("calls onDeleteAssignment when deleting a staff assignment", async () => {
    const user = userEvent.setup();
    const onDeleteAssignment = jest.fn();

    render(
      <DayAgendaView
        days={mockDays}
        shifts={mockShifts}
        assignments={mockAssignments}
        filter="all"
        isAdmin={true}
        onDeleteAssignment={onDeleteAssignment}
      />
    );

    const deleteBtn = screen.getByRole("button", { name: "Xóa ca trực" });
    await user.click(deleteBtn);

    expect(onDeleteAssignment).toHaveBeenCalledWith("a-1");
  });
});
