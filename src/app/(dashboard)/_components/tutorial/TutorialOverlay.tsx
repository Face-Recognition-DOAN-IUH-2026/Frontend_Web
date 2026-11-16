"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Alert, Box, Snackbar, Stack, Typography } from "@mui/material";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import { useTutorialStore } from "@/hooks/useTutorialStore";
import { TUTORIAL_QUESTS } from "@/lib/tutorial/quests";
import { useColorMode } from "@/lib/mui-theme";
import TutorialDialogueCard, { type TargetRect } from "./TutorialDialogueCard";

const SPOTLIGHT_PADDING = 8;

export default function TutorialOverlay() {
  const pathname = usePathname();
  const router = useRouter();
  const { reducedMotion } = useColorMode();

  const {
    activeQuestId,
    currentStepIndex,
    justCompletedQuestId,
    nextStep,
    prevStep,
    closeTutorial,
    clearJustCompleted,
  } = useTutorialStore();

  const activeQuest = useMemo(
    () => TUTORIAL_QUESTS.find((q) => q.id === activeQuestId) ?? null,
    [activeQuestId],
  );

  const completedQuest = useMemo(
    () => TUTORIAL_QUESTS.find((q) => q.id === justCompletedQuestId) ?? null,
    [justCompletedQuestId],
  );

  const currentStep = activeQuest?.steps[currentStepIndex] ?? null;
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  // Navigate automatically if the step targets a different route
  useEffect(() => {
    if (!currentStep?.route || !pathname) return;
    if (pathname !== currentStep.route) {
      router.push(currentStep.route);
    }
  }, [currentStep?.route, currentStep?.id, pathname, router]);

  const measureTarget = useCallback((): HTMLElement | null => {
    if (typeof document === "undefined" || !currentStep?.targetSelector) {
      setTargetRect(null);
      return null;
    }
    const el = document.querySelector<HTMLElement>(currentStep.targetSelector);
    if (!el) {
      setTargetRect(null);
      return null;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setTargetRect(null);
      return null;
    }
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
    return el;
  }, [currentStep?.targetSelector]);

  // Locate target element (with MutationObserver + brief polling for async page renders)
  useEffect(() => {
    if (!activeQuest || !currentStep) {
      setTargetRect(null);
      return;
    }

    let scrolled = false;
    const syncAndScroll = () => {
      const el = measureTarget();
      if (el && !scrolled) {
        scrolled = true;
        const r = el.getBoundingClientRect();
        const inViewport = r.top >= 64 && r.bottom <= window.innerHeight - 32;
        if (!inViewport) {
          el.scrollIntoView({
            behavior: reducedMotion === "reduce" ? "auto" : "smooth",
            block: "center",
          });
          setTimeout(measureTarget, 260);
        }
      }
    };

    syncAndScroll();

    const observer = new MutationObserver(syncAndScroll);
    observer.observe(document.body, { childList: true, subtree: true });

    const interval = setInterval(syncAndScroll, 250);
    const stopPollingTimer = setTimeout(() => clearInterval(interval), 3000);

    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);

    return () => {
      observer.disconnect();
      clearInterval(interval);
      clearTimeout(stopPollingTimer);
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [activeQuest, currentStep, pathname, measureTarget, reducedMotion]);

  // Support interactive click-target mode
  useEffect(() => {
    if (!activeQuest || !currentStep || currentStep.actionMode !== "click-target") return;
    if (!currentStep.targetSelector) return;

    const el = document.querySelector<HTMLElement>(currentStep.targetSelector);
    if (!el) return;

    const handleTargetClick = () => {
      nextStep(activeQuest.steps.length);
    };

    el.addEventListener("click", handleTargetClick, { once: true });
    return () => {
      el.removeEventListener("click", handleTargetClick);
    };
  }, [activeQuest, currentStep, targetRect, nextStep]);

  // Keyboard shortcuts (Esc to exit, ArrowRight to advance)
  useEffect(() => {
    if (!activeQuest) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeTutorial();
      } else if (e.key === "ArrowRight") {
        nextStep(activeQuest.steps.length);
      } else if (e.key === "ArrowLeft" && currentStepIndex > 0) {
        prevStep();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeQuest, currentStepIndex, nextStep, prevStep, closeTutorial]);

  return (
    <>
      {activeQuest && currentStep && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 1500,
            pointerEvents: "none",
          }}
        >
          {/* SVG Backdrop with rounded spotlight cutout */}
          <svg
            width="100%"
            height="100%"
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: currentStep.actionMode === "click-target" ? "none" : "auto",
            }}
            onClick={() => {
              if (currentStep.actionMode !== "click-target") {
                // Allow clicking backdrop gently without closing abruptly
              }
            }}
          >
            <defs>
              <mask id="iuh-tutorial-spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {targetRect && (
                  <rect
                    x={Math.max(0, targetRect.left - SPOTLIGHT_PADDING)}
                    y={Math.max(0, targetRect.top - SPOTLIGHT_PADDING)}
                    width={targetRect.width + SPOTLIGHT_PADDING * 2}
                    height={targetRect.height + SPOTLIGHT_PADDING * 2}
                    rx={10}
                    ry={10}
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(10, 18, 32, 0.68)"
              mask="url(#iuh-tutorial-spotlight-mask)"
            />
          </svg>

          {/* Highlight ring around target */}
          {targetRect && (
            <Box
              sx={{
                position: "fixed",
                top: Math.max(0, targetRect.top - SPOTLIGHT_PADDING),
                left: Math.max(0, targetRect.left - SPOTLIGHT_PADDING),
                width: targetRect.width + SPOTLIGHT_PADDING * 2,
                height: targetRect.height + SPOTLIGHT_PADDING * 2,
                borderRadius: "10px",
                border: "2.5px solid #D4AF37",
                boxShadow: "0 0 0 4px rgba(212, 175, 55, 0.25), 0 0 24px rgba(212, 175, 55, 0.45)",
                pointerEvents: "none",
                zIndex: 1501,
                ...(reducedMotion === "reduce"
                  ? {}
                  : {
                      animation: "iuhTutorialPulse 1.8s ease-in-out infinite",
                      "@keyframes iuhTutorialPulse": {
                        "0%, 100%": { boxShadow: "0 0 0 3px rgba(212, 175, 55, 0.25), 0 0 18px rgba(212, 175, 55, 0.4)" },
                        "50%": { boxShadow: "0 0 0 7px rgba(212, 175, 55, 0.4), 0 0 28px rgba(212, 175, 55, 0.65)" },
                      },
                    }),
              }}
            />
          )}

          {/* Dialogue Box */}
          <Box sx={{ pointerEvents: "auto" }}>
            <TutorialDialogueCard
              quest={activeQuest}
              step={currentStep}
              stepIndex={currentStepIndex}
              totalSteps={activeQuest.steps.length}
              targetRect={targetRect}
              onNext={() => nextStep(activeQuest.steps.length)}
              onPrev={prevStep}
              onClose={closeTutorial}
            />
          </Box>
        </Box>
      )}

      {/* Quest Completion Toast */}
      <Snackbar
        open={Boolean(completedQuest)}
        autoHideDuration={4500}
        onClose={clearJustCompleted}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={clearJustCompleted}
          severity="success"
          icon={<CheckCircleOutlineRoundedIcon sx={{ color: "#10B981" }} />}
          sx={{
            borderRadius: 2.5,
            border: "1px solid #10B981",
            bgcolor: "#0A2540",
            color: "#FFFFFF",
            boxShadow: "0 12px 32px rgba(10,37,64,0.35)",
            "& .MuiAlert-action": { color: "#FFFFFF" },
          }}
        >
          <Stack spacing={0.25}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
              Đã hoàn thành hướng dẫn: {completedQuest?.title}
            </Typography>
          </Stack>
        </Alert>
      </Snackbar>
    </>
  );
}
