"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { fireAlarmAudio } from "@/lib/fire-alarm-sound";
import { fireAlertBus } from "@/lib/fire-alert-bus";

export interface DetectedBox {
  label: string;
  confidence?: number;
  box: [number, number, number, number];
  norm_box: [number, number, number, number];
  width: number;
  height: number;
  area: number;
}

export interface DetectionResponse {
  success: boolean;
  filename?: string;
  image_size?: { width: number; height: number };
  has_fire: boolean;
  has_smoke: boolean;
  fire_count: number;
  smoke_count: number;
  boxes: DetectedBox[];
  latency_ms: number;
  raw_response: string;
  annotated_image_base64?: string;
}

export interface IncidentLog {
  id: string;
  timestamp: string;
  cameraName: string;
  type: "fire" | "smoke" | "safe";
  severity: "high" | "medium" | "low";
  confidence: number;
  status: "Đã kích hoạt cảnh báo" | "Đang giám sát" | "Bình thường";
  thumbnail?: string;
}

// Ngưỡng tin cậy tối thiểu để kích hoạt báo động (mặc định 60% theo yêu cầu)
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.60;

interface FireSurveillanceContextType {
  isCameraActive: boolean;
  isAutoScanning: boolean;
  selectedCamera: string;
  confidenceThreshold: number;
  stream: MediaStream | null;
  lastResult: DetectionResponse | null;
  lastScanTime: string | null;
  isProcessing: boolean;
  error: string | null;
  serviceHealthy: boolean | null;
  incidents: IncidentLog[];
  isAudioMuted: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  setSelectedCamera: (cam: string) => void;
  setIsAutoScanning: (val: boolean) => void;
  setConfidenceThreshold: (val: number) => void;
  toggleAudioMute: () => void;
  acknowledgeAlert: () => void;
  checkHealth: () => Promise<void>;
  fetchIncidents: () => Promise<void>;
  clearIncidents: () => Promise<void>;
  evaluateBlob: (blob: Blob, isManual?: boolean) => Promise<DetectionResponse>;
  captureFrameBlob: () => Promise<Blob>;
}

const FireSurveillanceContext = createContext<FireSurveillanceContextType | null>(null);

export function FireSurveillanceProvider({ children }: { children: React.ReactNode }) {
  const serviceUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:80";

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAutoScanning, setIsAutoScanning] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState("CAM-PCCC-01");
  const [confidenceThreshold, setConfidenceThreshold] = useState(DEFAULT_CONFIDENCE_THRESHOLD);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [lastResult, setLastResult] = useState<DetectionResponse | null>(null);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceHealthy, setServiceHealthy] = useState<boolean | null>(null);
  const [incidents, setIncidents] = useState<IncidentLog[]>([]);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Background video & canvas elements for continuous scanning across pages
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoScanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProcessingRef = useRef(false);

  // Giữ ref đồng bộ
  const selectedCameraRef = useRef(selectedCamera);
  selectedCameraRef.current = selectedCamera;

  const confidenceThresholdRef = useRef(confidenceThreshold);
  confidenceThresholdRef.current = confidenceThreshold;

  const isAudioMutedRef = useRef(isAudioMuted);
  isAudioMutedRef.current = isAudioMuted;

  // Tải danh sách sự cố
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch(`${serviceUrl}/api/v1/detect/incidents?limit=50`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.items)) {
          const mapped: IncidentLog[] = data.items.map((item: any) => ({
            id: item.id,
            timestamp: item.timestamp,
            cameraName: item.location || item.camera_id,
            type: item.type,
            severity: item.severity,
            confidence: Math.round((item.confidence || 0.9) * 100),
            status: item.status,
            thumbnail: item.thumbnail,
          }));
          setIncidents(mapped);
          try {
            localStorage.setItem("iuh_fire_incidents", JSON.stringify(mapped));
          } catch {}
          return;
        }
      }
    } catch {}

    try {
      const stored = localStorage.getItem("iuh_fire_incidents");
      if (stored) {
        setIncidents(JSON.parse(stored));
      }
    } catch {}
  }, [serviceUrl]);

  // Kiểm tra health check
  const checkHealth = useCallback(async () => {
    try {
      let res = await fetch(`${serviceUrl}/api/fire/health`, { method: "GET" }).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`${serviceUrl}/health`, { method: "GET" }).catch(() => null);
      }
      setServiceHealthy(Boolean(res && res.ok));
    } catch {
      setServiceHealthy(false);
    }
  }, [serviceUrl]);

  useEffect(() => {
    checkHealth();
    fetchIncidents();
  }, [checkHealth, fetchIncidents]);

  // Dọn dẹp còi khi unmount
  useEffect(() => {
    return () => {
      fireAlarmAudio.stop();
    };
  }, []);

  // Chụp frame từ background video
  const captureFrameBlob = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = bgVideoRef.current;
      if (!video || !streamRef.current) {
        return reject(new Error("Camera chưa kích hoạt"));
      }
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        return reject(new Error("Video chưa sẵn sàng frame"));
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Không tạo được context vẽ"));

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Không capture được frame"));
        },
        "image/jpeg",
        0.88
      );
    });
  }, []);

  // Gửi frame tới AI Gateway để đánh giá
  const evaluateBlob = useCallback(
    async (blob: Blob, isManual: boolean = false): Promise<DetectionResponse> => {
      const currentCam = selectedCameraRef.current;
      const camLocation = currentCam === "CAM-PCCC-01" ? "Kho sách Tầng 1" : "Sảnh chính";
      const threshold = confidenceThresholdRef.current;

      const formData = new FormData();
      formData.append("file", blob, "cctv_frame.jpg");
      formData.append("return_annotated", "true");
      formData.append("camera_id", currentCam);
      formData.append("location", camLocation);

      const res = await fetch(`${serviceUrl}/api/v1/detect/image`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Lỗi máy chủ phân tích (${res.status})`);
      }

      const data: DetectionResponse = await res.json();
      setLastResult(data);
      const timeStr = new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLastScanTime(timeStr);

      // Tính toán độ tin cậy cao nhất trong các boxes
      const maxBoxConf =
        data.boxes && data.boxes.length > 0
          ? Math.max(...data.boxes.map((b) => (typeof b.confidence === "number" ? b.confidence : 0.9)))
          : 0;

      // CHỈ BÁO ĐỘNG KHI ĐỘ TIN CẬY TRÊN 60% (>= threshold = 0.60)
      const isConfirmedHazard = (data.has_fire || data.has_smoke) && maxBoxConf >= threshold;

      if (isConfirmedHazard) {
        const confPercent = Math.round(maxBoxConf * 100);
        const newIncident: IncidentLog = {
          id: `INC-${Date.now().toString().slice(-6)}`,
          timestamp: timeStr,
          cameraName: camLocation,
          type: data.has_fire ? "fire" : "smoke",
          severity: data.has_fire ? "high" : "medium",
          confidence: confPercent,
          status: "Đã kích hoạt cảnh báo",
          thumbnail: data.annotated_image_base64,
        };

        setIncidents((prev) => {
          const updated = [newIncident, ...prev.filter((x) => x.id !== newIncident.id).slice(0, 49)];
          try {
            localStorage.setItem("iuh_fire_incidents", JSON.stringify(updated));
          } catch {}
          return updated;
        });

        const detectedHazardType: "fire" | "smoke" | "both" =
          data.has_fire && data.has_smoke ? "both" : data.has_fire ? "fire" : "smoke";

        // Phát sự kiện toàn cục đa tab (phân biệt rõ sự cố khói và sự cố cháy)
        fireAlertBus.publish({
          active: true,
          cameraName: currentCam,
          location: camLocation,
          hazardType: detectedHazardType,
          fireCount: data.fire_count || (data.has_fire ? 1 : 0),
          smokeCount: data.smoke_count || (data.has_smoke ? 1 : 0),
          timestamp: timeStr,
        });

        // Bật còi hú cảnh báo nếu chưa bị tắt tiếng
        if (!isAudioMutedRef.current) {
          fireAlarmAudio.start();
        }
      } else {
        // Nếu không có lửa hoặc độ tin cậy < 60% (bỏ qua cảnh báo giả)
        if (fireAlertBus.getCurrent()?.active) {
          fireAlertBus.clear();
        }
        fireAlarmAudio.stop();
      }

      return data;
    },
    [serviceUrl]
  );

  // Khởi động Camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      if (streamRef.current) {
        // Đã có stream đang chạy
        return;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 25 } },
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsCameraActive(true);

      if (bgVideoRef.current) {
        bgVideoRef.current.srcObject = mediaStream;
        bgVideoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      const msg = "Không thể mở camera: " + (err.message || "Vui lòng cấp quyền webcam");
      setError(msg);
      throw err;
    }
  }, []);

  // Dừng Camera hoàn toàn
  const stopCamera = useCallback(() => {
    if (autoScanIntervalRef.current) {
      clearInterval(autoScanIntervalRef.current);
      autoScanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStream(null);
    setIsCameraActive(false);

    if (bgVideoRef.current) {
      bgVideoRef.current.srcObject = null;
    }

    if (fireAlertBus.getCurrent()?.active) {
      fireAlertBus.clear();
    }
    fireAlarmAudio.stop();
  }, []);

  // Vòng lặp tự động quét ngầm liên tục (kể cả khi chuyển trang)
  useEffect(() => {
    if (!isCameraActive || !isAutoScanning) {
      if (autoScanIntervalRef.current) {
        clearInterval(autoScanIntervalRef.current);
        autoScanIntervalRef.current = null;
      }
      return;
    }

    const scanRoutine = async () => {
      if (isProcessingRef.current) return;
      const video = bgVideoRef.current;
      if (!video || video.videoWidth === 0) return;

      isProcessingRef.current = true;
      setIsProcessing(true);
      try {
        const blob = await captureFrameBlob();
        await evaluateBlob(blob, false);
      } catch {
        // Bỏ qua lỗi gián đoạn frame
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    };

    // Chu kỳ quét 600ms ổn định & tối ưu tài nguyên ngầm
    autoScanIntervalRef.current = setInterval(scanRoutine, 600);

    return () => {
      if (autoScanIntervalRef.current) {
        clearInterval(autoScanIntervalRef.current);
        autoScanIntervalRef.current = null;
      }
    };
  }, [isCameraActive, isAutoScanning, captureFrameBlob, evaluateBlob]);

  // Điều khiển âm thanh
  const toggleAudioMute = useCallback(() => {
    setIsAudioMuted((prev) => {
      const next = !prev;
      fireAlarmAudio.setMuted(next);
      return next;
    });
  }, []);

  const acknowledgeAlert = useCallback(() => {
    fireAlarmAudio.stop();
    setIsAudioMuted(true);
    fireAlertBus.clear();
  }, []);

  const clearIncidents = useCallback(async () => {
    try {
      await fetch(`${serviceUrl}/api/v1/detect/incidents`, { method: "DELETE" }).catch(() => null);
    } catch {}
    setIncidents([]);
    try {
      localStorage.removeItem("iuh_fire_incidents");
    } catch {}
  }, [serviceUrl]);

  return (
    <FireSurveillanceContext.Provider
      value={{
        isCameraActive,
        isAutoScanning,
        selectedCamera,
        confidenceThreshold,
        stream,
        lastResult,
        lastScanTime,
        isProcessing,
        error,
        serviceHealthy,
        incidents,
        isAudioMuted,
        startCamera,
        stopCamera,
        setSelectedCamera,
        setIsAutoScanning,
        setConfidenceThreshold,
        toggleAudioMute,
        acknowledgeAlert,
        checkHealth,
        fetchIncidents,
        clearIncidents,
        evaluateBlob,
        captureFrameBlob,
      }}
    >
      {/* Background Video Element: Duy trì stream & frame capture liên tục xuyên suốt mọi trang */}
      <video
        ref={bgVideoRef}
        muted
        autoPlay
        playsInline
        style={{
          position: "fixed",
          top: -9999,
          left: -9999,
          width: 640,
          height: 480,
          pointerEvents: "none",
          opacity: 0,
          zIndex: -1,
        }}
      />
      {children}
    </FireSurveillanceContext.Provider>
  );
}

export function useFireSurveillance() {
  const context = useContext(FireSurveillanceContext);
  if (!context) {
    throw new Error("useFireSurveillance must be used within a FireSurveillanceProvider");
  }
  return context;
}
