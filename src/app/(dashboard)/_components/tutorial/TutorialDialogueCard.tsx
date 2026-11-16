"use client";

import { useMemo } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import TipsAndUpdatesOutlinedIcon from "@mui/icons-material/TipsAndUpdatesOutlined";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import type { TutorialPlacement, TutorialQuest, TutorialStep } from "@/lib/tutorial/types";

export interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TutorialDialogueCardProps {
  quest: TutorialQuest;
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: TargetRect | null;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

const CARD_WIDTH = 380;
const MARGIN = 16;

function computeCardPosition(
  targetRect: TargetRect | null,
  preferred: TutorialPlacement = "bottom",
): { top?: number; left?: number; transform?: string; centered: boolean } {
  if (typeof window === "undefined" || !targetRect || preferred === "center") {
    return { centered: true };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = Math.min(CARD_WIDTH, vw - MARGIN * 2);
  const estCardH = 260;

  let top = vh / 2 - estCardH / 2;
  let left = vw / 2 - cardW / 2;

  const fitsBottom = targetRect.top + targetRect.height + MARGIN + estCardH <= vh;
  const fitsTop = targetRect.top - MARGIN - estCardH >= 0;
  const fitsRight = targetRect.left + targetRect.width + MARGIN + cardW <= vw;
  const fitsLeft = targetRect.left - MARGIN - cardW >= 0;

  let placement = preferred;
  if (placement === "bottom" && !fitsBottom && fitsTop) placement = "top";
  else if (placement === "top" && !fitsTop && fitsBottom) placement = "bottom";
  else if (placement === "right" && !fitsRight && fitsBottom) placement = "bottom";
  else if (placement === "left" && !fitsLeft && fitsBottom) placement = "bottom";

  if (placement === "right" && fitsRight) {
    left = targetRect.left + targetRect.width + MARGIN;
    top = targetRect.top;
  } else if (placement === "left" && fitsLeft) {
    left = targetRect.left - cardW - MARGIN;
    top = targetRect.top;
  } else if (placement === "top" && fitsTop) {
    left = targetRect.left + targetRect.width / 2 - cardW / 2;
    top = targetRect.top - estCardH - MARGIN;
  } else if (fitsBottom) {
    left = targetRect.left + targetRect.width / 2 - cardW / 2;
    top = targetRect.top + targetRect.height + MARGIN;
  } else {
    return { centered: true };
  }

  // Clamp inside viewport
  left = Math.max(MARGIN, Math.min(left, vw - cardW - MARGIN));
  top = Math.max(MARGIN, Math.min(top, vh - estCardH - MARGIN));

  return { top, left, centered: false };
}

export default function TutorialDialogueCard({
  quest,
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onClose,
}: TutorialDialogueCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isLastStep = stepIndex === totalSteps - 1;
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  const pos = useMemo(
    () => computeCardPosition(targetRect, step.placement),
    [targetRect, step.placement],
  );

  return (
    <Paper
      elevation={16}
      role="dialog"
      aria-label={`Hướng dẫn: ${step.title}`}
      sx={{
        position: "fixed",
        zIndex: 1502,
        width: { xs: `calc(100vw - ${MARGIN * 2}px)`, sm: CARD_WIDTH },
        ...(pos.centered
          ? {
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }
          : {
              top: pos.top,
              left: pos.left,
            }),
        borderRadius: 3,
        overflow: "hidden",
        border: "2px solid",
        borderColor: "#D4AF37",
        bgcolor: isDark ? "#0F172A" : "#FFFFFF",
        boxShadow: isDark
          ? "0 20px 50px rgba(0,0,0,0.75)"
          : "0 18px 45px rgba(10, 37, 64, 0.28)",
      }}
    >
      {/* Top Game Quest Banner */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          background: "linear-gradient(135deg, #0A2540 0%, #8B0000 100%)",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1.5,
              bgcolor: "rgba(212, 175, 55, 0.2)",
              border: "1px solid rgba(212, 175, 55, 0.6)",
              color: "#D4AF37",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <SportsEsportsRoundedIcon sx={{ fontSize: 17 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                fontWeight: 700,
                color: "#FDE68A",
                fontSize: "0.68rem",
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {quest.title}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.8)" }}>
              Bước {stepIndex + 1} / {totalSteps}
            </Typography>
          </Box>
        </Stack>

        <IconButton
          size="small"
          onClick={onClose}
          aria-label="Đóng hướng dẫn"
          sx={{ color: "rgba(255,255,255,0.8)", "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.12)" } }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 4,
          bgcolor: alpha("#D4AF37", 0.2),
          "& .MuiLinearProgress-bar": {
            bgcolor: "#D4AF37",
          },
        }}
      />

      {/* Dialogue Body */}
      <Box sx={{ p: 2.25 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.75, lineHeight: 1.3 }}>
          {step.title}
        </Typography>

        <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, mb: step.hint || step.actionMode === "click-target" ? 1.5 : 0 }}>
          {step.content}
        </Typography>

        {step.actionMode === "click-target" && targetRect && (
          <Chip
            size="small"
            label="Mẹo: Nhấn trực tiếp vào vùng đang phát sáng để qua bước!"
            sx={{
              mb: step.hint ? 1.25 : 0,
              height: "auto",
              py: 0.4,
              bgcolor: alpha("#D4AF37", 0.14),
              color: isDark ? "#FDE68A" : "#92400E",
              fontWeight: 700,
              fontSize: "0.72rem",
              "& .MuiChip-label": { whiteSpace: "normal" },
            }}
          />
        )}

        {step.hint && (
          <Stack
            direction="row"
            spacing={1}
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: isDark ? alpha("#3B82F6", 0.1) : alpha("#0A2540", 0.04),
              border: "1px solid",
              borderColor: isDark ? alpha("#3B82F6", 0.25) : alpha("#0A2540", 0.1),
              alignItems: "flex-start",
            }}
          >
            <TipsAndUpdatesOutlinedIcon sx={{ fontSize: 16, color: "#D4AF37", mt: 0.2, flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.45 }}>
              {step.hint}
            </Typography>
          </Stack>
        )}

        {/* Navigation Actions */}
        <Stack
          direction="row"
          spacing={1}
          sx={{ mt: 2.25, alignItems: "center", justifyContent: "space-between" }}
        >
          <Button
            size="small"
            color="inherit"
            onClick={onClose}
            sx={{ textTransform: "none", color: "text.secondary", fontWeight: 600, fontSize: "0.78rem" }}
          >
            Bỏ qua
          </Button>

          <Stack direction="row" spacing={1}>
            {stepIndex > 0 && (
              <Button
                size="small"
                variant="outlined"
                onClick={onPrev}
                startIcon={<ArrowBackRoundedIcon sx={{ fontSize: 16 }} />}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
              >
                Trước
              </Button>
            )}
            <Button
              size="small"
              variant="contained"
              onClick={onNext}
              endIcon={
                isLastStep ? (
                  <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />
                ) : (
                  <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
                )
              }
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 800,
                bgcolor: isLastStep ? "#059669" : "#8B0000",
                "&:hover": {
                  bgcolor: isLastStep ? "#047857" : "#700000",
                },
              }}
            >
              {isLastStep ? "Hoàn thành" : "Tiếp theo"}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
}
