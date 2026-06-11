"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload } from "lucide-react";

export default function CameraCapture({
  onCapture,
}: {
  onCapture: (file: File, dataUrl: string) => void;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [error, setError] = useState<string>("");
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const startCamera = useCallback(async () => {
    try {
      setError("");
      setCameraReady(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user", 
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 }
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

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOn(false);
    setCameraReady(false);
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !streamRef.current || !cameraReady) {
      setError("Camera is not ready. Please wait a moment and try again.");
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
          const dataUrl = canvas.toDataURL("image/jpeg");
          setImage(dataUrl);
          onCapture(capturedFile, dataUrl);
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
        const dataUrl = event.target?.result as string;
        setImage(dataUrl);
        onCapture(selectedFile, dataUrl);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const reset = () => {
    setImage(null);
    setFile(null);
    setError("");
    stopCamera();
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (image) {
    return (
      <div className="space-y-4">
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          <img
            src={image}
            alt="Captured"
            className="w-full h-full object-contain"
          />
        </div>
        <button
          type="button"
          onClick={reset}
          className="w-full px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Retake Photo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

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
    </div>
  );
}