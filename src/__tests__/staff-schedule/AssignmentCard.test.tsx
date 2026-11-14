import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AssignmentCard from "@/app/(dashboard)/_components/staff-schedule/AssignmentCard";
import TimetableCell from "@/app/(dashboard)/_components/staff-schedule/TimetableCell";
import type { StaffScheduleAssignment } from "@/lib/types";

const assignment = {
  id: "a1",
  staffId: "s1",
  shiftId: "sh1",
  zoneId: "z1",
  workDate: "2026-10-06",
  status: "approved",
  assignedBy: null,
  note: null,
  staff: { fullName: "Nguyen Van A", email: "a@example.com" },
  zone: { zoneName: "Tầng 1" },
} as unknown as StaffScheduleAssignment;

describe("AssignmentCard", () => {
  it("renders staff name and status chip", () => {
    render(<AssignmentCard assignment={assignment} />);

    expect(screen.getByText("Nguyen Van A")).toBeInTheDocument();
    expect(screen.getByText("Tầng 1")).toBeInTheDocument();
  });

  it("shows a delete button that calls onDelete with the assignment id", async () => {
    const user = userEvent.setup();
    const onDelete = jest.fn();
    render(<AssignmentCard assignment={assignment} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: "Xóa ca trực" }));
    expect(onDelete).toHaveBeenCalledWith("a1");
  });

  it("shows no delete button when onDelete is not provided", () => {
    render(<AssignmentCard assignment={assignment} />);

    expect(screen.queryByRole("button", { name: "Xóa ca trực" })).not.toBeInTheDocument();
  });

  it("renders check-in time when attendance is present", () => {
    const checkedInAssignment = {
      ...assignment,
      attendance: {
        id: "att-1",
        scheduleId: "a1",
        staffId: "s1",
        checkInAt: "2026-10-06T08:15:00Z",
        checkOutAt: null,
        status: "present",
        method: "web",
      },
    } as any;

    render(<AssignmentCard assignment={checkedInAssignment} />);
    expect(screen.getByText(/Vào \d{2}:\d{2}/)).toBeInTheDocument();
  });

  it("renders check-out time when attendance has completed check-out", () => {
    const checkedOutAssignment = {
      ...assignment,
      attendance: {
        id: "att-2",
        scheduleId: "a1",
        staffId: "s1",
        checkInAt: "2026-10-06T08:00:00Z",
        checkOutAt: "2026-10-06T12:00:00Z",
        status: "completed",
        method: "mobile",
      },
    } as any;

    render(<AssignmentCard assignment={checkedOutAssignment} />);
    expect(screen.getByText(/Ra ca \d{2}:\d{2}/)).toBeInTheDocument();
  });
});

describe("TimetableCell context menu", () => {
  it("does not offer the dead Xem nhân viên item, only Xóa ca trực", () => {
    const onDeleteAssignment = jest.fn();
    render(
      <TimetableCell
        assignments={[assignment]}
        date="2026-10-06"
        shiftId="sh1"
        isAdmin
        onDeleteAssignment={onDeleteAssignment}
      />
    );

    fireEvent.contextMenu(screen.getByText("Nguyen Van A"));

    expect(screen.queryByText("Xem nhân viên")).not.toBeInTheDocument();
    expect(screen.getByText("Xóa ca trực")).toBeInTheDocument();
  });
});
