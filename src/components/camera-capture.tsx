"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";

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
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640, min: 320 }, height: { ideal: 480, min: 240 } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraOn(true);
    } catch (err: any) {
      if (err.name === "NotAllowedError") setError("Không có quyền truy cập camera.");
      else if (err.name === "NotFoundError") setError("Không tìm thấy camera trên thiết bị.");
      else setError("Không thể khởi động camera.");
      setIsCameraOn(false);
    }
  }, []);

  useEffect(() => {
    if (!isCameraOn || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const onReady = () => setCameraReady(true);
    video.onloadedmetadata = onReady;
    video.onplaying = onReady;
    video.onerror = () => setError("Lỗi camera");
    video.srcObject = streamRef.current;
    if (video.readyState >= 2) onReady();
    readyTimeoutRef.current = setTimeout(() => setCameraReady(true), 3000);
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
    if (!videoRef.current || !cameraReady || videoRef.current.videoWidth === 0) {
      setError("Camera chưa sẵn sàng.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) { setError("Không thể chụp ảnh"); return; }
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const capturedFile = new File([blob], "face_capture.jpg", { type: "image/jpeg" });
      const dataUrl = canvas.toDataURL("image/jpeg");
      setFile(capturedFile);
      setImage(dataUrl);
      onCapture(capturedFile, dataUrl);
      stopCamera();
    }, "image/jpeg", 0.9);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFile(selectedFile);
      setImage(dataUrl);
      onCapture(selectedFile, dataUrl);
    };
    reader.readAsDataURL(selectedFile);
  };

  const reset = () => {
    setImage(null);
    setFile(null);
    setError("");
    stopCamera();
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  if (image) {
    return (
      <div className="space-y-3">
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          <img src={image} alt="Captured" className="w-full h-full object-contain" />
        </div>
        <Button variant="secondary" onClick={reset} icon={<RefreshCw size={15} />} className="w-full">
          Chụp lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        {isCameraOn ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-text-3 text-body-sm">
                Đang kết nối camera...
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-center p-4">
            <p className="text-text-3 text-body-sm">{error || "Bật camera hoặc tải ảnh lên"}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!isCameraOn ? (
          <Button variant="secondary" onClick={startCamera} icon={<Camera size={15} />} className="flex-1">
            Bật camera
          </Button>
        ) : (
          <Button onClick={capturePhoto} disabled={!cameraReady} className="flex-1">
            Chụp ảnh
          </Button>
        )}
        <label className="flex-1">
          <div className="btn-secondary flex items-center justify-center gap-2 w-full px-4 py-2.5 cursor-pointer">
            <Upload size={15} />
            Tải ảnh
          </div>
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
        {isCameraOn && (
          <Button variant="ghost" onClick={stopCamera} className="text-error px-3">
            Tắt
          </Button>
        )}
      </div>
    </div>
  );
}