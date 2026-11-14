import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CopyWeekDialog from "@/app/(dashboard)/_components/staff-schedule/CopyWeekDialog";
import api from "@/lib/api-client";
import { ToastProvider } from "@/lib/toast-context";

jest.mock("@/lib/api-client");

const mockSourceAssignments = [
  {
    id: "src-1",
    staffId: "st-1",
    shiftId: "sh-1",
    zoneId: "z-1",
    workDate: "2026-11-09",
    status: "scheduled",
    staff: { fullName: "Lê Văn An", email: "an@test.com" },
    shift: { name: "Ca Sáng", startTime: "07:30", endTime: "11:30" },
    zone: { zoneName: "Phòng đọc 1" },
  },
  {
    id: "src-2",
    staffId: "st-2",
    shiftId: "sh-2",
    zoneId: "z-2",
    workDate: "2026-11-10",
    status: "scheduled",
    staff: { fullName: "Trần Thị Bích", email: "bich@test.com" },
    shift: { name: "Ca Chiều", startTime: "13:00", endTime: "17:00" },
    zone: { zoneName: "Quầy Mượn Trả" },
  },
];

describe("CopyWeekDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders source and target week ranges and loads source assignments", async () => {
    (api.getScheduleAssignments as jest.Mock).mockImplementation(({ from }) => {
      if (from === "2026-11-09") {
        return Promise.resolve({ items: mockSourceAssignments, total: 2 });
      }
      return Promise.resolve({ items: [], total: 0 });
    });

    render(
      <ToastProvider>
        <CopyWeekDialog
          open={true}
          onClose={jest.fn()}
          currentWeekFrom="2026-11-16"
          currentWeekTo="2026-11-22"
          onCopied={jest.fn()}
        />
      </ToastProvider>
    );

    expect(screen.getByText("Sao chép lịch trực tuần trước")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Lê Văn An")).toBeInTheDocument();
      expect(screen.getByText("Trần Thị Bích")).toBeInTheDocument();
    });

    expect(screen.getByText(/2 ca trực được tìm thấy/)).toBeInTheDocument();
  });

  it("copies selected assignments on confirmation", async () => {
    const user = userEvent.setup();
    const onCopied = jest.fn();
    const onClose = jest.fn();

    (api.getScheduleAssignments as jest.Mock).mockResolvedValue({
      items: mockSourceAssignments,
      total: 2,
    });
    (api.createScheduleAssignmentsBulk as jest.Mock).mockResolvedValue(mockSourceAssignments);

    render(
      <ToastProvider>
        <CopyWeekDialog
          open={true}
          onClose={onClose}
          currentWeekFrom="2026-11-16"
          currentWeekTo="2026-11-22"
          onCopied={onCopied}
        />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Lê Văn An")).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: "Xác nhận sao chép" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(api.createScheduleAssignmentsBulk).toHaveBeenCalled();
      expect(onCopied).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
