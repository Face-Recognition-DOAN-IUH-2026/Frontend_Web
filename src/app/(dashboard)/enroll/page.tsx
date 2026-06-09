"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, CheckCircle } from "lucide-react";
import api from "@/lib/api-client";

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
  const router = useRouter();

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
    };
  }, [isCameraOn]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOn(false);
    setCameraReady(false);
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !streamRef.current || !cameraReady) {
      setError("Camera is not ready. Please wait and try again.");
      return;
    }

    const video = videoRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError("Camera not ready. Please wait and try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Could not capture image");
      return;
    }

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const capturedFile = new File([blob], "face_capture.jpg", {
            type: "image/jpeg",
          });
          setFile(capturedFile);
          setImage(canvas.toDataURL("image/jpeg"));
          stopCamera();
        }
      },
      "image/jpeg",
      0.9
    );
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

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleSubmit = async (e: React.FormEvent) => {
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
      setError(err.response?.data?.detail || err.message || "Enrollment failed");
    } finally {
      setIsLoading(false);
    }
  };

  const pollForResult = async (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const data = await api.getTaskStatus(taskId);

        if (data.status === "SUCCESS") {
          clearInterval(interval);
          setResult(data.result);
        } else if (data.status === "FAILURE") {
          clearInterval(interval);
          setError("Enrollment failed");
        }
      } catch {
        clearInterval(interval);
        setError("Failed to poll task status");
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
  };

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
      ) : jobId ? (
        <div className="bg-white p-6 rounded-lg border text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold mb-2">Processing...</h2>
          <p className="text-gray-600 text-sm">Job ID: {jobId}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border space-y-6">
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

              {error && <div className="text-red-500 text-sm">{error}</div>}

              <div className="flex gap-3">
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
              <div className="flex gap-3">
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
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="w-5 h-5"
                />
                <label htmlFor="consent" className="text-sm text-gray-600">
                  I consent to the processing of my facial data for identification
                  purposes.
                </label>
              </div>

              <button
                type="submit"
                disabled={!consent || isLoading}
                className="w-full py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? "Enrolling..." : "Enroll Face"}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}