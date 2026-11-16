export type TutorialRole = "staff" | "admin" | "all";

export type TutorialPlacement = "top" | "bottom" | "left" | "right" | "center";

export interface TutorialStep {
  id: string;
  /** Route to navigate to before highlighting this step (optional). */
  route?: string;
  /** CSS selector for the spotlight target, e.g. `[data-tour="sidebar-borrow"]`. */
  targetSelector?: string;
  /** Step headline shown in the RPG dialogue box. */
  title: string;
  /** Concise actionable instruction for the user. */
  content: string;
  /** Optional pro-tip or keyboard shortcut hint. */
  hint?: string;
  /** Preferred dialogue placement relative to the spotlight target. */
  placement?: TutorialPlacement;
  /**
   * "next": user clicks the Next button in the dialogue.
   * "click-target": clicking the highlighted DOM target advances automatically (Next button still available as fallback).
   */
  actionMode?: "next" | "click-target";
}

export interface TutorialQuest {
  id: string;
  role: TutorialRole;
  /** Optional permission string `"resource:action"` required to see this quest (unless admin). */
  permission?: string;
  title: string;
  subtitle: string;
  badgeLabel: string;
  xp: number;
  estimatedMinutes: number;
  /** Route prefixes where this quest is contextually relevant. */
  matchRoutes: string[];
  steps: TutorialStep[];
}
