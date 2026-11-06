"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Box, Chip, Typography, keyframes, Stack } from "@mui/material";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import CenterFocusWeakIcon from "@mui/icons-material/CenterFocusWeak";
import {
  PassiveMotionDetector,
  type LivenessVerdict,
  type LandmarkPoint,
} from "@/lib/liveness/passive-motion-detector";

export interface PassiveLivenessScannerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  active?: boolean;
  onLivenessVerified?: (blob: Blob) => void;
  onSpoofDetected?: (reason: string) => void;
}

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
`;

const pulseRedGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
  70% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
`;

// Shared MediaPipe FaceLandmarker singleton
let sharedFaceLandmarker: any = null;
let landmarkerLoadingPromise: Promise<any> | null = null;

async function getFaceLandmarkerInstance(): Promise<any> {
  if (sharedFaceLandmarker) return sharedFaceLandmarker;
  if (landmarkerLoadingPromise) return landmarkerLoadingPromise;

  landmarkerLoadingPromise = (async () => {
    try {
      const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
      );
      const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
        runningMode: "VIDEO",
        numFaces: 1,
      });
      sharedFaceLandmarker = landmarker;
      return landmarker;
    } catch (err) {
      console.warn("[PassiveLiveness] Could not load MediaPipe FaceLandmarker:", err);
      return null;
    } finally {
      landmarkerLoadingPromise = null;
    }
  })();

  return landmarkerLoadingPromise;
}

export default function PassiveLivenessScanner({
  videoRef,
  active = true,
  onLivenessVerified,
  onSpoofDetected,
}: PassiveLivenessScannerProps) {
  const detectorRef = useRef<PassiveMotionDetector>(
    new PassiveMotionDetector({
      windowDurationMs: 1000,
      minFramesRequired: 15,
    })
  );

  const [status, setStatus] = useState<"initializing" | "scanning" | "live" | "spoof">("initializing");
  const [spoofReason, setSpoofReason] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const lastProcessedTimeRef = useRef<number>(0);
  const consecutiveLiveCountRef = useRef<number>(0);
  const lastCaptureTimeRef = useRef<number>(0);

  // Ref giữ callback mới nhất → vòng lặp rAF không bị khởi động lại chỉ vì
  // parent truyền arrow inline.
  const onLivenessVerifiedRef = useRef(onLivenessVerified);
  const onSpoofDetectedRef = useRef(onSpoofDetected);
  onLivenessVerifiedRef.current = onLivenessVerified;
  onSpoofDetectedRef.current = onSpoofDetected;

  const captureVideoBlob = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;

    const offscreen = document.createElement("canvas");
    offscreen.width = video.videoWidth || 640;
    offscreen.height = video.videoHeight || 480;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return new Promise<Blob | null>((resolve) => {
      offscreen.toBlob((b) => resolve(b), "image/jpeg", 0.9);
    });
  }, [videoRef]);

  useEffect(() => {
    if (!active) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let isMounted = true;
    let landmarker: any = null;

    getFaceLandmarkerInstance().then((instance) => {
      if (!isMounted) return;
      landmarker = instance;
      setStatus("scanning");
    });

    const processVideoLoop = () => {
      if (!isMounted) return;

      const video = videoRef.current;
      const now = performance.now();

      if (
        video &&
        video.readyState >= 2 &&
        landmarker &&
        now - lastProcessedTimeRef.current >= 33 // ~30 FPS throttling
      ) {
        lastProcessedTimeRef.current = now;

        try {
          const results = landmarker.detectForVideo(video, Math.round(now));
          if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
            const rawLandmarks: LandmarkPoint[] = results.faceLandmarks[0];
            detectorRef.current.feedFrame(rawLandmarks, Date.now());

            const frameCount = detectorRef.current.getFrameCount();
            setProgress(Math.min(100, Math.round((frameCount / 15) * 100)));

            const verdict: LivenessVerdict = detectorRef.current.evaluate();

            if (verdict.verdict === "spoof") {
              consecutiveLiveCountRef.current = 0;
              setStatus("spoof");
              const reasonText =
                verdict.reasons[0] === "STATIC_PHOTO_DETECTED"
                  ? "Phát hiện ảnh chụp tĩnh (Print Attack)"
                  : "Phát hiện màn hình 2D (Planar Spoof)";
              setSpoofReason(reasonText);
              onSpoofDetectedRef.current?.(reasonText);
            } else if (verdict.verdict === "live") {
              consecutiveLiveCountRef.current += 1;
              setStatus("live");
              setSpoofReason("");

              // Continuously transmit live frames every ~1200ms while live human is present
              const nowMs = Date.now();
              if (consecutiveLiveCountRef.current >= 2 && nowMs - lastCaptureTimeRef.current >= 1200) {
                lastCaptureTimeRef.current = nowMs;
                captureVideoBlob().then((blob) => {
                  if (blob && isMounted) {
                    onLivenessVerifiedRef.current?.(blob);
                  }
                });
              }
            } else {
              // Inconclusive / gathering frames
              if (status !== "spoof") {
                setStatus("scanning");
              }
            }
          } else {
            // No face in camera
            detectorRef.current.reset();
            setProgress(0);
            consecutiveLiveCountRef.current = 0;
            if (status !== "initializing") {
              setStatus("scanning");
            }
          }
        } catch {
          // Ignore individual frame landmark errors
        }
      }

      animFrameRef.current = requestAnimationFrame(processVideoLoop);
    };

    animFrameRef.current = requestAnimationFrame(processVideoLoop);

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [active, videoRef, status, captureVideoBlob]);

  return (
    <Box
      sx={{
        position: "absolute",
        top: 14,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      {status === "live" && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            bgcolor: "rgba(6, 78, 59, 0.9)",
            backdropFilter: "blur(8px)",
            px: 2,
            py: 0.75,
            borderRadius: 2,
            border: "1px solid #10b981",
            animation: `${pulseGlow} 2s infinite`,
          }}
        >
          <CheckCircleOutlineOutlinedIcon sx={{ color: "#34d399", fontSize: 18 }} />
          <Typography
            sx={{
              color: "#ecfdf5",
              fontSize: "0.8rem",
              fontWeight: 700,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            ĐÃ XÁC NHẬN NGƯỜI THẬT • ĐANG NHẬN DIỆN...
          </Typography>
        </Stack>
      )}

      {status === "spoof" && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            bgcolor: "rgba(127, 29, 29, 0.9)",
            backdropFilter: "blur(8px)",
            px: 2,
            py: 0.75,
            borderRadius: 2,
            border: "1px solid #ef4444",
            animation: `${pulseRedGlow} 1.5s infinite`,
          }}
        >
          <WarningAmberOutlinedIcon sx={{ color: "#f87171", fontSize: 18 }} />
          <Typography
            sx={{
              color: "#fef2f2",
              fontSize: "0.8rem",
              fontWeight: 700,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {spoofReason || "CẢNH BÁO: PHÁT HIỆN ẢNH GIẢ MẠO"}
          </Typography>
        </Stack>
      )}

      {status === "scanning" && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            bgcolor: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(6px)",
            px: 1.5,
            py: 0.5,
            borderRadius: 2,
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}
        >
          <CenterFocusWeakIcon sx={{ color: "#60a5fa", fontSize: 16 }} />
          <Typography
            sx={{
              color: "#e2e8f0",
              fontSize: "0.75rem",
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            PASSIVE LIVENESS: {progress}%
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
