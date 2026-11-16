import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TutorialOverlay from "@/app/(dashboard)/_components/tutorial/TutorialOverlay";
import { useTutorialStore } from "@/hooks/useTutorialStore";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/lib/mui-theme", () => ({
  useColorMode: () => ({ reducedMotion: "reduce" }),
}));

describe("TutorialOverlay", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTutorialStore.setState({
      hydratedUserId: "u-1",
      completedQuestIds: [],
      welcomeSeen: true,
      activeQuestId: "staff-welcome",
      currentStepIndex: 0,
      questHubOpen: false,
      justCompletedQuestId: null,
    });
  });

  it("renders RPG dialogue for active quest and advances steps", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <div data-tour="sidebar-nav" style={{ width: 200, height: 400 }}>
          Nav
        </div>
        <TutorialOverlay />
      </div>,
    );

    expect(screen.getByText("Bản đồ Điều hướng Thư viện")).toBeInTheDocument();
    expect(screen.getByText("Bước 1 / 4")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tiếp theo" }));

    expect(screen.getByText("Trung tâm Thông báo Realtime")).toBeInTheDocument();
    expect(screen.getByText("Bước 2 / 4")).toBeInTheDocument();
  });

  it("closes tutorial on Escape key press", () => {
    render(<TutorialOverlay />);
    expect(screen.getByText("Bản đồ Điều hướng Thư viện")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(useTutorialStore.getState().activeQuestId).toBeNull();
    expect(screen.queryByText("Bản đồ Điều hướng Thư viện")).not.toBeInTheDocument();
  });
});
