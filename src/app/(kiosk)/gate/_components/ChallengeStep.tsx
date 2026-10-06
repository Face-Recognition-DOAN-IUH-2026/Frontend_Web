"use client";

import React, { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, LinearProgress, Stack, Typography } from "@mui/material";
import { api, getErrorMessage } from "@/lib/api-client";

export interface ChallengeStepProps {
  studentCode: string;
  patronId?: string | null;
  captureFrame: () => Promise<File>;
  frameCount?: number;
  intervalMs?: number;
  maxAttempts?: number;
  onLive: (frames: File[]) => void;
  onSpoof: (detail: string) => void;
  onDisabled: () => void;
  onCancel: () => void;
}

const INSTRUCTIONS = [
  "Quay đầu nhẹ sang trái rồi sang phải",
  "Gật đầu nhẹ lên xuống",
];

const COUNTDOWN_SECONDS = 3;
const RETRY_PAUSE_MS = 1000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Phase = "countdown" | "capturing" | "submitting" | "error";

export default function ChallengeStep({
  studentCode,
  patronId = null,
  captureFrame,
  frameCount = 3,
  intervalMs = 1500,
  maxAttempts = 3,
  onLive,
  onSpoof,
  onDisabled,
  onCancel,
}: ChallengeStepProps) {
  const [instruction] = useState(
    () => INSTRUCTIONS[Math.floor(Math.random() * INSTRUCTIONS.length)],
  );
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [phase, setPhase] = useState<Phase>("countdown");
  const [attempts, setAttempts] = useState(1);
  const [errorMsg, setErrorMsg] = useState("");
  const cancelledRef = useRef(false);
  const attemptsRef = useRef(1);
  const handlersRef = useRef({
    captureFrame,
    frameCount,
    intervalMs,
    maxAttempts,
    onLive,
    onSpoof,
    onDisabled,
    studentCode,
    patronId,
  });
  handlersRef.current = {
    captureFrame,
    frameCount,
    intervalMs,
    maxAttempts,
    onLive,
    onSpoof,
    onDisabled,
    studentCode,
    patronId,
  };

  const runRound = async (withCountdown: boolean): Promise<void> => {
    const h = handlersRef.current;
    if (withCountdown) {
      setPhase("countdown");
      for (let c = COUNTDOWN_SECONDS; c > 0; c -= 1) {
        if (cancelledRef.current) return;
        setCountdown(c);
        await sleep(1000);
      }
    }
    if (cancelledRef.current) return;
    setPhase("capturing");
    const frames: File[] = [];
    for (let i = 0; i < h.frameCount; i += 1) {
      if (cancelledRef.current) return;
      frames.push(await h.captureFrame());
      if (i < h.frameCount - 1) {
        await sleep(h.intervalMs);
      }
    }
    if (cancelledRef.current) return;
    setPhase("submitting");
    let result;
    try {
      result = await api.kioskLivenessActive(frames, h.studentCode, h.patronId ?? undefined);
    } catch (err) {
      if (cancelledRef.current) return;
      const msg = getErrorMessage(err);
      if (/disabled/i.test(msg)) {
        h.onDisabled();
        return;
      }
      setErrorMsg(msg);
      setPhase("error");
      return;
    }
    if (cancelledRef.current) return;
    if (result.verdict === "live") {
      h.onLive(frames);
      return;
    }
    if (result.verdict === "spoof") {
      h.onSpoof(result.detail || "Khuôn mặt không vượt qua kiểm tra sống.");
      return;
    }
    if (attemptsRef.current >= h.maxAttempts) {
      h.onSpoof(`Không xác định được khuôn mặt thật sau ${h.maxAttempts} lần thử.`);
      return;
    }
    attemptsRef.current += 1;
    setAttempts(attemptsRef.current);
    await sleep(RETRY_PAUSE_MS);
    await runRound(false);
  };

  useEffect(() => {
    cancelledRef.current = false;
    void runRound(true);
    return () => {
      cancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => {
    attemptsRef.current = 1;
    setAttempts(1);
    setErrorMsg("");
    cancelledRef.current = false;
    void runRound(true);
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    onCancel();
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 420, mx: "auto", textAlign: "center" }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Kiểm tra khuôn mặt thật
      </Typography>
      <Alert severity="info" sx={{ textAlign: "left" }}>
        Vui lòng thực hiện: <strong>{instruction}</strong>
      </Alert>

      {phase === "countdown" && (
        <Box>
          <Typography variant="body1">Bắt đầu sau: {countdown}s</Typography>
          <LinearProgress
            variant="determinate"
            value={((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100}
            sx={{ mt: 1 }}
          />
        </Box>
      )}

      {phase === "capturing" && (
        <Box>
          <Typography variant="body1">
            Đang chụp {frameCount} ảnh… giữ nguyên tư thế
          </Typography>
          <LinearProgress sx={{ mt: 1 }} />
        </Box>
      )}

      {phase === "submitting" && (
        <Box>
          <Typography variant="body1">Đang kiểm tra…</Typography>
          <LinearProgress sx={{ mt: 1 }} />
          {attempts > 1 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Lần thử {attempts}/{maxAttempts} — ảnh chưa rõ, vui lòng giữ yên
            </Typography>
          )}
        </Box>
      )}

      {phase === "error" && (
        <Box>
          <Alert severity="error" sx={{ textAlign: "left" }}>
            {errorMsg || "Có lỗi xảy ra."} Vui lòng thử lại.
          </Alert>
          <Button variant="contained" onClick={handleRetry} sx={{ mt: 2 }}>
            Thử lại
          </Button>
        </Box>
      )}

      <Button variant="text" color="inherit" onClick={handleCancel}>
        Hủy
      </Button>
    </Stack>
  );
}
