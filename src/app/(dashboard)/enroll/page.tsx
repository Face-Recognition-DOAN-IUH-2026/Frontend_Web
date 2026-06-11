"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload, CheckCircle, RefreshCw, ArrowRight, ArrowLeft, ArrowDown, Eye } from "lucide-react";
import api, { getErrorMessage } from "@/lib/api-client";

const ANGLE_CONFIG = [
  { angle: "frontal", icon: Eye, instruction: "Nhìn thẳng vào camera", tip: "Giữ mặt thẳng, mắt mở tự nhiên" },
  { angle: "right", icon: ArrowLeft, instruction: "Quay mặt sang phải", tip: "Xoay đầu sang phải khoảng 30°" },
  { angle: "left", icon: ArrowRight, instruction: "Quay mặt sang trái", tip: "Xoay đầu sang trái khoảng 30°" },
  { angle: "down", icon: ArrowDown, instruction: "Cúi mặt xuống", tip: "Cúi nhẹ cằm xuống ngực" },
];

type CaptureMode = "quick" | "full";

interface CaptureSlot {
  angle: string;
  status: "pending" | "capturing" | "done";
  file: File | null;
  dataUrl: string | null;
}

export default function EnrollPage() {
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [captureMode, setCaptureMode] = useState<CaptureMode>("full");
  const [captures, setCaptures] = useState<CaptureSlot[]>(
    ANGLE_CONFIG.map((c) => ({ angle: c.angle, status: "pending", file: null, dataUrl: null }))
  );
  const [currentAngleIdx, setCurrentAngleIdx] = useState(-1);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSequenceRunning, setIsSequenceRunning] = useState(false);
  const [quickSubmitted, setQuickSubmitted] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setError("");
      setCameraReady(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
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
      if (err.name === "NotAllowedError") {
        setError("Camera access denied. Please allow camera permission in browser settings.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found on this device. Please use Upload instead.");
      } else {
        setError("Could not start camera. Try clicking Start Camera again.");
      }
      setIsCameraOn(false);
    }
  }, []);

  useEffect(() => {
    if (!isCameraOn || !videoRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const stream = streamRef.current;

    const onReady = () => {
      setCameraReady(true);
    };

    video.onloadedmetadata = onReady;
    video.onplaying = onReady;
    video.onerror = () => setError("Camera error occurred");
    video.srcObject = stream;

    if (video.readyState >= 2) onReady();

    readyTimeoutRef.current = setTimeout(() => {
      setCameraReady(true);
    }, 3000);

    return () => {
      if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
      video.onloadedmetadata = null;
      video.onplaying = null;
      video.onerror = null;
      video.srcObject = null;
    };
  }, [isCameraOn]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOn(false);
    setCameraReady(false);
  }, []);

  const captureImage = useCallback((): Promise<{ file: File; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      if (!video || !streamRef.current || !cameraReady || video.videoWidth === 0 || video.videoHeight === 0) {
        reject(new Error("Camera not ready"));
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Could not create canvas")); return; }

      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg");
      canvas.toBlob((blob) => {
        if (blob) {
          resolve({ file: new File([blob], "face_capture.jpg", { type: "image/jpeg" }), dataUrl });
        } else {
          reject(new Error("Could not create image"));
        }
      }, "image/jpeg", 0.9);
    });
  }, [cameraReady]);

  const capturePhoto = async () => {
    try {
      const { file, dataUrl } = await captureImage();
      setFile(file);
      setImage(dataUrl);
      stopCamera();
    } catch {
      setError("Capture failed. Please try again.");
    }
  };

  const startSequence = useCallback(async () => {
    setError("");
    setQuickSubmitted(false);
    setCaptures(ANGLE_CONFIG.map((c) => ({ angle: c.angle, status: "pending", file: null, dataUrl: null })));
    setCurrentAngleIdx(0);
    setIsSequenceRunning(true);
    await startCamera();
  }, [startCamera]);

  useEffect(() => {
    if (currentAngleIdx < 0 || currentAngleIdx >= ANGLE_CONFIG.length) return;
    if (!cameraReady || !isSequenceRunning) return;

    let cancelled = false;
    let c = 3;
    setCountdown(c);
    setCaptures((prev) =>
      prev.map((s, i) => (i === currentAngleIdx ? { ...s, status: "capturing" } : s))
    );

    const timer = setInterval(async () => {
      c--;
      if (cancelled) { clearInterval(timer); return; }

      if (c <= 0) {
        clearInterval(timer);
        setCountdown(null);

        try {
          const { file, dataUrl } = await captureImage();
          if (!cancelled) {
            setCaptures((prev) =>
              prev.map((s, i) =>
                i === currentAngleIdx
                  ? { ...s, status: "done", file, dataUrl }
                  : s
              )
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
          }
        } catch {
          if (!cancelled) {
            setCaptures((prev) =>
              prev.map((s, i) =>
                i === currentAngleIdx ? { ...s, status: "pending" } : s
              )
            );
            setCurrentAngleIdx(-1);
            setIsSequenceRunning(false);
            setError("Capture failed. Please try again.");
          }
        }
      } else {
        setCountdown(c);
      }
    }, 1000);

    return () => { cancelled = true; clearInterval(timer); };
  }, [currentAngleIdx, cameraReady, isSequenceRunning, captureImage, stopCamera]);

  const retakeAngle = (idx: number) => {
    startCamera();
    setCaptures((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, status: "pending", file: null, dataUrl: null } : s))
    );
    setTimeout(() => setCurrentAngleIdx(idx), 500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setError("");
    setIsLoading(true);
    setJobId(null);
    setResult(null);

    try {
      const data = await api.enrollFace(file, consent);
      setJobId(data.job_id);
      pollForResult(data.job_id);
    } catch (err: any) {
      setError(getErrorMessage(err) || "Enrollment failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitMulti = async () => {
    const readyCaptures = captures.filter((c) => c.status === "done" && c.file);
    if (readyCaptures.length < 2) {
      setError("Please capture at least 2 angles");
      return;
    }

    setError("");
    setIsLoading(true);
    setQuickSubmitted(true);

    try {
      // Enroll tuần tự để tránh race condition (DB/Milvus/MinIO) khi nhiều góc chạy song song
      const results = [] as Array<Awaited<ReturnType<typeof api.enrollFace>>>;
      for (const c of readyCaptures) {
        // eslint-disable-next-line no-await-in-loop
        const r = await api.enrollFace(c.file!, consent, c.angle);
        results.push(r);
      }
      const jobId = results[0]?.job_id;
      if (jobId) {
        setJobId(jobId);
        pollForResult(jobId);
      } else {
        setResult({ success: true, message: `${results.length} angles enrolled` });
      }
    } catch (err: any) {
      setError(getErrorMessage(err) || "Multi-angle enrollment failed");
      setIsLoading(false);
    }
  };

  const pollForResult = async (taskId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const data = await api.getTaskStatus(taskId);

        if (data.status === "SUCCESS") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setResult(data.result);
          setIsLoading(false);
        } else if (data.status === "FAILURE") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setError("Enrollment failed");
          setIsLoading(false);
        }
      } catch {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        setError("Failed to poll task status");
        setIsLoading(false);
      }
    }, 2000);
  };

  const handleReset = () => {
    setImage(null);
    setFile(null);
    setConsent(false);
    setJobId(null);
    setResult(null);
    setError("");
    setQuickSubmitted(false);
    setCurrentAngleIdx(-1);
    setIsSequenceRunning(false);
    setCountdown(null);
    setCaptures(ANGLE_CONFIG.map((c) => ({ angle: c.angle, status: "pending", file: null, dataUrl: null })));
  };

  const allCaptured = captures.every((c) => c.status === "done");

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Enroll Face</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}

      {result ? (
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center gap-3 text-green-600 mb-4">
            <CheckCircle className="w-8 h-8" />
            <h2 className="text-xl font-semibold">Enrollment Successful!</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Your face has been enrolled successfully.
          </p>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Enroll Another
          </button>
        </div>
      ) : jobId && !result ? (
        <div className="bg-white p-6 rounded-lg border text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold mb-2">Processing...</h2>
          <p className="text-gray-600 text-sm">Job ID: {jobId}</p>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg border space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => { setCaptureMode("quick"); handleReset(); }}
              className={`px-4 py-2 rounded-md text-sm font-medium ${captureMode === "quick" ? "bg-primary text-primary-foreground" : "bg-gray-100"}`}
            >
              Quick (1 photo)
            </button>
            <button
              type="button"
              onClick={() => { setCaptureMode("full"); handleReset(); }}
              className={`px-4 py-2 rounded-md text-sm font-medium ${captureMode === "full" ? "bg-primary text-primary-foreground" : "bg-gray-100"}`}
            >
              Full (4 angles)
            </button>
          </div>

          {captureMode === "quick" ? (
            <form onSubmit={handleSubmitSingle}>
              {!image ? (
                <>
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    {isCameraOn ? (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-contain"
                        />
                        {!cameraReady && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                            Loading camera...
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 text-center p-4">
                        {error || "Click 'Start Camera' to begin, or use 'Upload'"}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-4">
                    {!isCameraOn ? (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        <Camera className="w-5 h-5" />
                        Start Camera
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={capturePhoto}
                        disabled={!cameraReady}
                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
                      >
                        Capture
                      </button>
                    )}

                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer">
                      <Upload className="w-5 h-5" />
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>

                    {isCameraOn && (
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-4 py-2 text-red-600 bg-red-50 rounded-md hover:bg-red-100"
                      >
                        Stop
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <img
                      src={image}
                      alt="Captured"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex gap-3 mt-4">
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer">
                      <Upload className="w-5 h-5" />
                      Change
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </>
              )}

              {image && (
                <>
                  <div className="flex items-center gap-3 mt-6">
                    <input
                      type="checkbox"
                      id="consent"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="w-5 h-5"
                    />
                    <label htmlFor="consent" className="text-sm text-gray-600">
                      I consent to the processing of my facial data for identification purposes.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={!consent || isLoading}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 mt-4"
                  >
                    {isLoading ? "Enrolling..." : "Enroll Face"}
                  </button>
                </>
              )}
            </form>
          ) : (
            <div className="space-y-6">
              {!allCaptured && !isSequenceRunning && currentAngleIdx < 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">
                    Capture your face from 4 angles for better walk-through recognition
                  </p>
                  <button
                    type="button"
                    onClick={startSequence}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90"
                  >
                    <Camera className="w-5 h-5 inline mr-2" />
                    Start Multi-Angle Capture
                  </button>
                </div>
              )}

              {(isSequenceRunning || currentAngleIdx >= 0) && (
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                      Loading camera...
                    </div>
                  )}
                  {countdown !== null && (() => {
                    const cfg = ANGLE_CONFIG[currentAngleIdx];
                    const ArrowIcon = cfg?.icon;
                    return (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                        <div className="text-center">
                          {ArrowIcon && (
                            <div className="animate-bounce mb-2">
                              <ArrowIcon className="w-10 h-10 mx-auto text-yellow-400" />
                            </div>
                          )}
                          <p className="text-white text-xl font-semibold mb-1">
                            {cfg?.instruction}
                          </p>
                          <p className="text-gray-300 text-sm mb-4">
                            {cfg?.tip}
                          </p>
                          <div className="flex items-center justify-center gap-2 mb-2">
                            {ANGLE_CONFIG.map((_, i) => (
                              <span
                                key={i}
                                className={`w-3 h-3 rounded-full ${
                                  i < captures.filter(c => c.status === "done").length
                                    ? "bg-green-500"
                                    : i === currentAngleIdx
                                    ? "bg-yellow-400"
                                    : "bg-gray-600"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-white text-5xl font-bold drop-shadow-lg">{countdown}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {allCaptured && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {captures.map((c, i) => (
                      <div
                        key={c.angle}
                        className={`relative aspect-video rounded-lg overflow-hidden border-2 ${c.status === "done" ? "border-green-500" : "border-gray-200"}`}
                      >
                        {c.dataUrl ? (
                          <img src={c.dataUrl} alt={c.angle} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full bg-gray-100 text-gray-400">
                            <Camera className="w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                          {(() => { const Icon = ANGLE_CONFIG[i].icon; return Icon ? <Icon className="w-3 h-3" /> : null; })()}
                          {ANGLE_CONFIG[i].instruction}
                        </div>
                        {c.status === "done" && (
                          <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-0.5">
                            <CheckCircle className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    {captures.map((c, i) =>
                      c.status === "done" ? (
                        <button
                          key={c.angle}
                          type="button"
                          onClick={() => retakeAngle(i)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 rounded-md text-sm hover:bg-gray-200"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Retake
                        </button>
                      ) : null
                    )}
                  </div>
                </>
              )}

              {allCaptured && (
                <>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="consent-multi"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="w-5 h-5"
                    />
                    <label htmlFor="consent-multi" className="text-sm text-gray-600">
                      I consent to the processing of my facial data for identification purposes.
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitMulti}
                    disabled={!consent || isLoading}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
                  >
                    {isLoading ? "Enrolling..." : `Enroll ${captures.filter(c => c.status === "done").length} Angles`}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
