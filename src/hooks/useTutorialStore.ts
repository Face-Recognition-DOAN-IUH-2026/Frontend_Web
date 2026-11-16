"use client";

import { create } from "zustand";

interface PersistedTutorialState {
  completedQuestIds: string[];
  welcomeSeen: boolean;
}

interface TutorialStoreState extends PersistedTutorialState {
  hydratedUserId: string | null;
  activeQuestId: string | null;
  currentStepIndex: number;
  questHubOpen: boolean;
  justCompletedQuestId: string | null;

  hydrateForUser: (userId: string) => void;
  startQuest: (questId: string, startIndex?: number) => void;
  nextStep: (totalSteps: number) => void;
  prevStep: () => void;
  completeActiveQuest: () => void;
  closeTutorial: () => void;
  openQuestHub: () => void;
  closeQuestHub: () => void;
  markWelcomeSeen: () => void;
  clearJustCompleted: () => void;
  resetProgress: () => void;
}

const STORAGE_PREFIX = "iuh_tutorial_progress_v1:";

function readPersisted(userId: string): PersistedTutorialState {
  if (typeof window === "undefined") {
    return { completedQuestIds: [], welcomeSeen: false };
  }
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!raw) return { completedQuestIds: [], welcomeSeen: false };
    const parsed = JSON.parse(raw);
    return {
      completedQuestIds: Array.isArray(parsed?.completedQuestIds) ? parsed.completedQuestIds : [],
      welcomeSeen: Boolean(parsed?.welcomeSeen),
    };
  } catch {
    return { completedQuestIds: [], welcomeSeen: false };
  }
}

function writePersisted(userId: string | null, data: PersistedTutorialState) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(data));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export const useTutorialStore = create<TutorialStoreState>((set, get) => ({
  hydratedUserId: null,
  completedQuestIds: [],
  welcomeSeen: false,
  activeQuestId: null,
  currentStepIndex: 0,
  questHubOpen: false,
  justCompletedQuestId: null,

  hydrateForUser: (userId: string) => {
    if (!userId || get().hydratedUserId === userId) return;
    const saved = readPersisted(userId);
    set({
      hydratedUserId: userId,
      completedQuestIds: saved.completedQuestIds,
      welcomeSeen: saved.welcomeSeen,
    });
  },

  startQuest: (questId: string, startIndex = 0) => {
    set({
      activeQuestId: questId,
      currentStepIndex: startIndex,
      questHubOpen: false,
      justCompletedQuestId: null,
    });
  },

  nextStep: (totalSteps: number) => {
    const { currentStepIndex } = get();
    if (currentStepIndex + 1 < totalSteps) {
      set({ currentStepIndex: currentStepIndex + 1 });
    } else {
      get().completeActiveQuest();
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },

  completeActiveQuest: () => {
    const { activeQuestId, completedQuestIds, hydratedUserId, welcomeSeen } = get();
    if (!activeQuestId) return;
    const nextCompleted = completedQuestIds.includes(activeQuestId)
      ? completedQuestIds
      : [...completedQuestIds, activeQuestId];

    writePersisted(hydratedUserId, {
      completedQuestIds: nextCompleted,
      welcomeSeen: true,
    });

    set({
      activeQuestId: null,
      currentStepIndex: 0,
      completedQuestIds: nextCompleted,
      welcomeSeen: true,
      justCompletedQuestId: activeQuestId,
    });
  },

  closeTutorial: () => {
    const { hydratedUserId, completedQuestIds } = get();
    writePersisted(hydratedUserId, {
      completedQuestIds,
      welcomeSeen: true,
    });
    set({
      activeQuestId: null,
      currentStepIndex: 0,
      welcomeSeen: true,
    });
  },

  openQuestHub: () => set({ questHubOpen: true, justCompletedQuestId: null }),
  closeQuestHub: () => set({ questHubOpen: false }),

  markWelcomeSeen: () => {
    const { hydratedUserId, completedQuestIds } = get();
    writePersisted(hydratedUserId, {
      completedQuestIds,
      welcomeSeen: true,
    });
    set({ welcomeSeen: true });
  },

  clearJustCompleted: () => set({ justCompletedQuestId: null }),

  resetProgress: () => {
    const { hydratedUserId } = get();
    writePersisted(hydratedUserId, {
      completedQuestIds: [],
      welcomeSeen: false,
    });
    set({
      completedQuestIds: [],
      welcomeSeen: false,
      activeQuestId: null,
      currentStepIndex: 0,
      justCompletedQuestId: null,
    });
  },
}));
