import { act } from "@testing-library/react";
import { useTutorialStore } from "@/hooks/useTutorialStore";
import { getQuestsForUser, getRankTitle } from "@/lib/tutorial/quests";

describe("useTutorialStore & quest helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useTutorialStore.setState({
      hydratedUserId: null,
      completedQuestIds: [],
      welcomeSeen: false,
      activeQuestId: null,
      currentStepIndex: 0,
      questHubOpen: false,
      justCompletedQuestId: null,
    });
  });

  it("hydrates and persists progress per userId", () => {
    window.localStorage.setItem(
      "iuh_tutorial_progress_v1:u-1",
      JSON.stringify({ completedQuestIds: ["staff-welcome"], welcomeSeen: true }),
    );

    act(() => {
      useTutorialStore.getState().hydrateForUser("u-1");
    });

    expect(useTutorialStore.getState().completedQuestIds).toEqual(["staff-welcome"]);
    expect(useTutorialStore.getState().welcomeSeen).toBe(true);
  });

  it("navigates steps and completes quest on final step", () => {
    act(() => {
      useTutorialStore.getState().hydrateForUser("u-2");
      useTutorialStore.getState().startQuest("staff-welcome");
    });

    expect(useTutorialStore.getState().activeQuestId).toBe("staff-welcome");
    expect(useTutorialStore.getState().currentStepIndex).toBe(0);

    act(() => {
      useTutorialStore.getState().nextStep(2);
    });
    expect(useTutorialStore.getState().currentStepIndex).toBe(1);

    act(() => {
      useTutorialStore.getState().prevStep();
    });
    expect(useTutorialStore.getState().currentStepIndex).toBe(0);

    act(() => {
      useTutorialStore.getState().nextStep(2);
      useTutorialStore.getState().nextStep(2);
    });

    expect(useTutorialStore.getState().activeQuestId).toBeNull();
    expect(useTutorialStore.getState().completedQuestIds).toContain("staff-welcome");
    expect(useTutorialStore.getState().justCompletedQuestId).toBe("staff-welcome");
  });

  it("resets progress cleanly", () => {
    act(() => {
      useTutorialStore.getState().hydrateForUser("u-3");
      useTutorialStore.getState().startQuest("staff-welcome");
      useTutorialStore.getState().completeActiveQuest();
      useTutorialStore.getState().resetProgress();
    });

    expect(useTutorialStore.getState().completedQuestIds).toEqual([]);
    expect(useTutorialStore.getState().welcomeSeen).toBe(false);
  });

  it("filters quests by role and computes rank titles", () => {
    const staffQuests = getQuestsForUser("staff");
    const adminQuests = getQuestsForUser("admin");

    expect(staffQuests.some((q) => q.role === "admin")).toBe(false);
    expect(adminQuests.some((q) => q.role === "admin")).toBe(true);
    expect(adminQuests.length).toBeGreaterThan(staffQuests.length);

    expect(getRankTitle(0, 4, "staff")).toBe("Thủ thư Tân binh");
    expect(getRankTitle(2, 4, "staff")).toBe("Thủ thư Thành thạo");
    expect(getRankTitle(4, 4, "admin")).toBe("Tổng quản Tinh anh");
  });
});
