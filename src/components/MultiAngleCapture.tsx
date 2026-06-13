'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, RefreshCw } from "lucide-react";

export type CaptureAngle = "frontal" | "right" | "left" | "down";
export type MultiAngleCaptureStatus = "pending" | "capturing" | "done";

export interface AngleConfig {
  angle: CaptureAngle;
  instruction: string;
  tip: string;
}

export interface CapturedAngle {
  angle: CaptureAngle;
  status: MultiAngleCaptureStatus;
  file: File | null;
  dataUrl: string | null;
}

export interface MultiAngleCaptureProps {
  angles?: AngleConfig[];
  consent: boolean;
  setConsent?: (v: boolean) => void;
  onFilesReady: (files: Record<CaptureAngle, File>) => Promise<void> | void;
  className?: string;
}

function captureFromVideo(video: HTMLVideoElement, cameraReady: boolean) {
  return new Promise<{ file: File; dataUrl: string }>((resolve, reject) => {
    if (!cameraReady) return reject(new Error("Camera not ready"));
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return reject(new Error("Camera not initialized"));
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Could not create canvas"));

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Could not create image"));
        resolve({ file: new File([blob], "face_capture.jpg", { type: "image/jpeg" }), dataUrl });
      },
      "image/jpeg",
      0.9
    );
  });
}

export default function MultiAngleCapture({
  angles,
  consent,
  setConsent,
  onFilesReady,
  className,
}: MultiAngleCaptureProps) {
  const defaultAngles = useMemo<AngleConfig[]>(
    () =>
      angles ?? [
        { angle: "frontal", instruction: "Nhìn thẳng", tip: "Giữ mặt thẳng, mắt mở tự nhiên" },
        { angle: "right", instruction: "Quay phải", tip: "Xoay đầu sang phải khoảng 30°" },
        { angle: "left", instruction: "Quay trái", tip: "Xoay đầu sang trái khoảng 30°" },
        { angle: "down", instruction: "Cúi xuống", tip: "Cúi nhẹ cằm xuống ngực" },
      ],
    [angles]
  );

  const ANGLE_CONFIG = defaultAngles;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);

  const [isSequenceRunning, setIsSequenceRunning] = useState(false);
  const [currentAngleIdx, setCurrentAngleIdx] = useState(-1);
  const [countdown, setCountdown] = useState<number | null>(null);

  const [captures, setCaptures] = useState<CapturedAngle[]>(
    ANGLE_CONFIG.map((c) => ({ angle: c.angle, status: "pending", file: null, dataUrl: null }))
  );

  useEffect(() => {
    setCaptures(ANGLE_CONFIG.map((c) => ({ angle: c.angle, status: "pending", file: null, dataUrl: null })));
  }, [ANGLE_CONFIG]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraOn(false);
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setCameraReady(false);
      setIsCameraOn(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraOn(true);
    } catch (err: any) {
      setIsCameraOn(false);
      setCameraReady(false);
    }
  }, []);

  useEffect(() => {
    if (!isCameraOn || !videoRef.current || !streamRef.current) return;

    const video = videoRef.current;

    const onReady = () => setCameraReady(true);
    const handleError = () => setCameraReady(false);

    video.onloadedmetadata = onReady;
    video.onplaying = onReady;
    video.onerror = handleError;
    video.srcObject = streamRef.current;

    if (video.readyState >= 2) onReady();

    const t = setTimeout(() => setCameraReady(true), 3000);

    return () => {
      clearTimeout(t);
      video.onloadedmetadata = null;
      video.onplaying = null;
      video.onerror = null;
      video.srcObject = null;
    };
  }, [isCameraOn]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const retakeAngle = useCallback(
    async (idx: number) => {
      setCaptures((prev) =>
        prev.map((s, i) => (i === idx ? { ...s, status: "pending", file: null, dataUrl: null } : s))
      );
      await startCamera();
      setTimeout(() => setCurrentAngleIdx(idx), 500);
    },
    [startCamera]
  );

  const startSequence = useCallback(async () => {
    setCaptures(ANGLE_CONFIG.map((c) => ({ angle: c.angle, status: "pending", file: null, dataUrl: null })));
    setCurrentAngleIdx(0);
    setIsSequenceRunning(true);
    setCountdown(null);
    await startCamera();
  }, [ANGLE_CONFIG, startCamera]);

  useEffect(() => {
    if (currentAngleIdx < 0 || currentAngleIdx >= ANGLE_CONFIG.length) return;
    if (!cameraReady || !isSequenceRunning) return;

    let cancelled = false;
    let c = 5;

    setCountdown(c);
    setCaptures((prev) => prev.map((s, i) => (i === currentAngleIdx ? { ...s, status: "capturing" } : s)));

    const timer = window.setInterval(async () => {
      c--;
      if (cancelled) {
        clearInterval(timer);
        return;
      }

      if (c <= 0) {
        clearInterval(timer);
        setCountdown(null);

        try {
          const video = videoRef.current;
          if (!video) throw new Error("Video not found");

          const { file, dataUrl } = await captureFromVideo(video, cameraReady);

          if (cancelled) return;

          setCaptures((prev) =>
            prev.map((s, i) => (i === currentAngleIdx ? { ...s, status: "done", file, dataUrl } : s))
          );

          const nextIdx = currentAngleIdx + 1;
          if (nextIdx >= ANGLE_CONFIG.length) {
            setIsSequenceRunning(false);
            setCurrentAngleIdx(-1);
            stopCamera();
          } else {
            setTimeout(() => {
              if (!cancelled) setCurrentAngleIdx(nextIdx);
            }, 800);
          }
        } catch {
          if (cancelled) return;
          setCaptures((prev) => prev.map((s, i) => (i === currentAngleIdx ? { ...s, status: "pending" } : s)));
          setIsSequenceRunning(false);
          setCurrentAngleIdx(-1);
          stopCamera();
        }
      } else {
        setCountdown(c);
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [currentAngleIdx, cameraReady, isSequenceRunning, ANGLE_CONFIG.length, stopCamera]);

  const allCaptured = captures.every((c) => c.status === "done" && !!c.file);

  const capturedFiles = useMemo(() => {
    const result = {} as Record<CaptureAngle, File>;
    for (const c of captures) {
      if (c.status === "done" && c.file) {
        result[c.angle] = c.file;
      }
    }
    return result;
  }, [captures]);

  const submit = useCallback(async () => {
    if (!consent) return;
    if (!allCaptured) return;
    await onFilesReady(capturedFiles);
  }, [allCaptured, capturedFiles, consent, onFilesReady]);

  const instructionLabels: Record<CaptureAngle, string> = {
    frontal: "Nhìn thẳng",
    right: "Quay phải",
    left: "Quay trái",
    down: "Cúi xuống",
  };

  return (
    <div className={className}>
      {!allCaptured && !isSequenceRunning && currentAngleIdx < 0 && (
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Camera className="w-8 h-8 text-amber-400" />
          </div>
          <p className="text-slate-300 mb-1">Chụp khuôn mặt từ 4 góc</p>
          <p className="text-slate-500 text-sm mb-2">Nhận diện nhanh hơn, chính xác hơn tại cổng</p>
          <div className="bg-slate-900/50 rounded-lg p-3 mb-4 text-left text-xs text-slate-400 space-y-1">
            <p className="text-amber-400 font-medium">Lưu ý khi chụp:</p>
            <p>• Đủ ánh sáng, không ngược sáng</p>
            <p>• Giữ yên khi đếm ngược về 0</p>
            <p>• Mặt vừa đủ trong khung tròn</p>
          </div>
          <button
            type="button"
            onClick={startSequence}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/25"
          >
            <Camera className="w-5 h-5 inline mr-2" />
            Bắt đầu chụp
          </button>
        </div>
      )}

      {(isSequenceRunning || currentAngleIdx >= 0) && (
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-32 h-32 border-2 border-amber-400/50 rounded-full" />
          </div>
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-slate-300">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm">Đang mở camera...</p>
              </div>
            </div>
          )}
          {countdown !== null && currentAngleIdx >= 0 && currentAngleIdx < ANGLE_CONFIG.length && (() => {
            const cfg = ANGLE_CONFIG[currentAngleIdx];
            return (
              <div className="absolute inset-0 flex items-center justify-center bg-black/75">
                <div className="text-center">
                  <p className="text-white text-xl font-semibold mb-1">{cfg.instruction}</p>
                  <p className="text-slate-300 text-sm mb-4">{cfg.tip}</p>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    {ANGLE_CONFIG.map((c, i) => (
                      <span
                        key={c.angle}
                        className={`w-3 h-3 rounded-full transition-colors ${
                          i < captures.filter((x) => x.status === "done").length
                            ? "bg-emerald-500"
                            : i === currentAngleIdx
                              ? "bg-amber-400 animate-pulse"
                              : "bg-slate-600"
                        }`}
                      />
                    ))}
                  </div>
                  {countdown === 1 && (
                    <p className="text-red-400 text-lg font-bold mb-2 animate-pulse">GIỮ YÊN!</p>
                  )}
                  <p className="text-white text-6xl font-bold drop-shadow-lg">{countdown}</p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {allCaptured && (
        <>
          <div className="grid grid-cols-4 gap-2">
            {captures.map((c, i) => (
              <div
                key={c.angle}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                  c.status === "done" ? "border-emerald-500" : "border-slate-600"
                }`}
              >
                {c.dataUrl ? (
                  <img src={c.dataUrl} alt={c.angle} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full bg-slate-800 text-slate-500">
                    <Camera className="w-6 h-6" />
                  </div>
                )}
                <div className="absolute bottom-1 left-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded capitalize">
                  {instructionLabels[c.angle]}
                </div>
                {c.status === "done" && (
                  <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-3">
            {captures.map((c, i) =>
              c.status === "done" ? (
                <button
                  key={c.angle}
                  type="button"
                  onClick={() => retakeAngle(i)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  {instructionLabels[c.angle]}
                </button>
              ) : null
            )}
          </div>

          <div className="flex items-center gap-3 mt-4 p-3 bg-slate-900/50 rounded-xl border border-slate-700">
            <input
              type="checkbox"
              id="consent-multi"
              checked={consent}
              onChange={(e) => setConsent?.(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
              disabled={!setConsent}
            />
            <label htmlFor="consent-multi" className="text-sm text-slate-400">
              Tôi đồng ý cho hệ thống xử lý dữ liệu khuôn mặt để nhận diện tại cổng
            </label>
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={!consent}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Xác nhận {captures.filter((c) => c.status === "done").length} góc ảnh
          </button>
        </>
      )}
    </div>
  );
}