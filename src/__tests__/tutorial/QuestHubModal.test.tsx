import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuestHubModal from "@/app/(dashboard)/_components/tutorial/QuestHubModal";
import { useTutorialStore } from "@/hooks/useTutorialStore";

let mockRole = "staff";

jest.mock("next/navigation", () => ({
  usePathname: () => "/staff-schedules",
}));

jest.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { id: "u-1", role: mockRole, email: "test@iuh.edu.vn" },
  }),
}));

jest.mock("@/lib/permission-context", () => ({
  usePermission: () => ({
    can: () => true,
  }),
}));

describe("QuestHubModal", () => {
  beforeEach(() => {
    mockRole = "staff";
    useTutorialStore.setState({
      hydratedUserId: "u-1",
      completedQuestIds: [],
      welcomeSeen: true,
      activeQuestId: null,
      currentStepIndex: 0,
      questHubOpen: true,
      justCompletedQuestId: null,
    });
  });

  it("renders staff guides and contextual recommendation for /staff-schedules", () => {
    render(<QuestHubModal />);

    expect(screen.getByText("Trung tâm Hướng dẫn Sử dụng")).toBeInTheDocument();
    expect(screen.getByText("Hướng dẫn cho trang bạn đang mở")).toBeInTheDocument();
    expect(screen.getAllByText(/3\. Xem Lịch trực & Điểm danh GPS/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Admin 1:/)).not.toBeInTheDocument();
  });

  it("renders admin guides when user role is admin", () => {
    mockRole = "admin";
    render(<QuestHubModal />);

    expect(screen.getByText(/Admin 1: Quản lý Nhân sự & Khuôn mặt/)).toBeInTheDocument();
    expect(screen.getByText(/Admin 2: Phân quyền Động/)).toBeInTheDocument();
  });

  it("starts selected guide when clicking Xem hướng dẫn", async () => {
    const user = userEvent.setup();
    render(<QuestHubModal />);

    const startButtons = screen.getAllByRole("button", { name: "Xem hướng dẫn" });
    await user.click(startButtons[0]);

    expect(useTutorialStore.getState().questHubOpen).toBe(false);
    expect(useTutorialStore.getState().activeQuestId).toBeTruthy();
  });
});
