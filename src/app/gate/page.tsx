"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api-client";
import type { AccessLogPublic, CameraEvent, KioskResult, PatronLookupResult } from "@/lib/types";

const ENTRY_CAM = process.env.NEXT_PUBLIC_ENTRY_CAM || "http://192.168.1.121:8080/video";
const EXIT_CAM = process.env.NEXT_PUBLIC_EXIT_CAM || "http://192.168.1.240:8080/video";

type Step = "idle" | "lookup" | "enroll_form" | "verify" | "result";

interface Toast {
  id: number;
  type: "entry" | "exit" | "error" | "info";
  message: string;
  patron_name?: string;
}

let toastId = 0;

export default function GatePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [mssv, setMssv] = useState("");
  const [lookup, setLookup] = useState<PatronLookupResult | null>(null);
  const [result, setResult] = useState<KioskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);
  const [entryTs] = useState(Date.now());
  const [exitTs] = useState(Date.now());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [recentLogs, setRecentLogs] = useState<AccessLogPublic[]>([]);

  const [form, setForm] = useState({
    full_name: "",
    identity_number: "",
    email: "",
    phone: "",
  });

  const addToast = useCallback((t: Omit<Toast, "id">) => {
    const id = ++toastId;
    setToasts((prev) => [Object.assign(t, { id }), ...prev.slice(0, 4)]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 6000);
  }, []);

  const startCamera = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoRef.current) videoRef.current.srcObject = stream;
    streamRef.current = stream;
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const captureImage = useCallback((): Promise<File> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      if (!video) return;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
          setCaptured(canvas.toDataURL("image/jpeg"));
          resolve(file);
        }
      }, "image/jpeg");
    });
  }, []);

  const handleLookup = async () => {
    if (!mssv.trim()) return;
    setLoading(true);
    try {
      const res = await api.kioskLookup(mssv.trim());
      setLookup(res);
      if (res.exists && res.has_face && !res.is_expired) {
        setStep("verify");
        await startCamera();
      } else if (res.exists && !res.has_face) {
        setStep("enroll_form");
        await startCamera();
      } else if (res.exists && res.is_expired) {
        setStep("result");
        setResult({ success: false, message: "Thẻ hội viên đã hết hạn", patron: null, job_id: null });
      } else {
        setStep("enroll_form");
        await startCamera();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!form.full_name) return;
    setLoading(true);
    try {
      const imageFile = await captureImage();
      const res = await api.kioskEnroll(imageFile, form.full_name, mssv, mssv, "2027-12-31", form.identity_number || undefined, form.email || undefined, form.phone || undefined);
      setResult(res);
      setStep("result");
      stopCamera();
      addToast({ type: "info", message: `Đăng ký thành công cho ${form.full_name}` });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const imageFile = await captureImage();
      const res = await api.kioskEnter(imageFile, mssv);
      setResult(res);
      setStep("result");
      stopCamera();
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep("idle");
    setMssv("");
    setLookup(null);
    setResult(null);
    setCaptured(null);
    stopCamera();
  };

  // SSE real-time events
  useEffect(() => {
    const cleanup = api.connectAccessSSE((event: CameraEvent) => {
      if (event.status === "granted") {
        const type = event.access_type === "entry" ? "entry" : "exit";
        addToast({
          type,
          message: `${event.full_name} — ${type === "entry" ? "Vào" : "Ra"} thư viện`,
          patron_name: event.full_name,
        });
        setRecentLogs((prev) => {
          const newLog: AccessLogPublic = {
            id: `sse-${Date.now()}`,
            patron_id: event.patron_id || null,
            patron_name: event.full_name || null,
            student_code: event.student_code || null,
            access_type: event.access_type || "entry",
            verify_method: "face",
            confidence: event.score || null,
            camera_id: event.camera_id,
            access_time: new Date().toISOString(),
            status: "success",
          };
          return [newLog, ...prev.slice(0, 19)];
        });
      } else if (event.status === "no_match") {
        addToast({ type: "info", message: "Khuôn mặt mới — không nhận diện được" });
      } else if (event.status === "expired") {
        addToast({ type: "error", message: `${event.full_name} — thẻ đã hết hạn` });
      } else if (event.status === "spoof") {
        addToast({ type: "error", message: "Phát hiện giả mạo!" });
      }
    });
    return cleanup;
  }, [addToast]);

  // Load recent history (public endpoint, no auth needed)
  useEffect(() => {
    api.getRecentLogs().then((data) => setRecentLogs(data.items)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gate Kiosk</h1>

      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-slide-in ${
                t.type === "entry" ? "bg-green-600" :
                t.type === "exit" ? "bg-orange-600" :
                t.type === "error" ? "bg-red-600" : "bg-blue-600"
              }`}
            >
              {t.type === "entry" && "🚪"}
              {t.type === "exit" && "🚶"}
              {t.patron_name && <strong>{t.patron_name}</strong>} {t.message}
            </div>
          ))}
        </div>
      )}

      {/* Camera feeds */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg overflow-hidden bg-black">
          <div className="bg-gray-800 text-white px-3 py-1 text-sm font-medium">Cổng vào — Camera 1</div>
          <img src={`${ENTRY_CAM}?_t=${entryTs}`} className="w-full h-64 object-contain" alt="Entry cam" />
        </div>
        <div className="border rounded-lg overflow-hidden bg-black">
          <div className="bg-gray-800 text-white px-3 py-1 text-sm font-medium">Cổng ra — Camera 2</div>
          <img src={`${EXIT_CAM}?_t=${exitTs}`} className="w-full h-64 object-contain" alt="Exit cam" />
        </div>
      </div>

      {/* Kiosk form */}
      {step === "idle" && (
        <div className="max-w-md space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Nhập MSSV:</span>
            <input className="mt-1 block w-full px-3 py-2 border rounded-md" value={mssv} onChange={(e) => setMssv(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLookup()} placeholder="MSSV" />
          </label>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md" onClick={handleLookup} disabled={loading}>
            {loading ? "Đang kiểm tra..." : "Tra cứu"}
          </button>
        </div>
      )}

      {(step === "enroll_form" || step === "verify") && (
        <div className="grid grid-cols-2 gap-6">
          <div>
            <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg border" />
            {captured && <img src={captured} className="w-full mt-2 rounded-lg border" />}
          </div>
          <div className="space-y-4">
            {step === "enroll_form" && (
              <>
                <h2 className="text-xl font-semibold">Đăng ký mới</h2>
                <p className="text-gray-600">Vui lòng nhìn vào camera và điền thông tin</p>
                {[["full_name", "Họ tên"], ["identity_number", "MSSV"], ["email", "Email"], ["phone", "SĐT"]].map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="text-sm font-medium">{label}:</span>
                    <input className="mt-1 block w-full px-3 py-2 border rounded-md" value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                  </label>
                ))}
                <button className="px-4 py-2 bg-green-600 text-white rounded-md" onClick={handleEnroll} disabled={loading}>
                  {loading ? "Đang đăng ký..." : "Đăng ký & Vào cổng"}
                </button>
              </>
            )}
            {step === "verify" && (
              <>
                <h2 className="text-xl font-semibold">Xác thực khuôn mặt</h2>
                <p className="text-gray-600">Đã tìm thấy thông tin. Vui lòng nhìn vào camera để xác thực.</p>
                <p><strong>Họ tên:</strong> {lookup?.patron?.full_name}</p>
                <p><strong>MSSV:</strong> {lookup?.patron?.student_code}</p>
                <button className="px-4 py-2 bg-green-600 text-white rounded-md" onClick={handleVerify} disabled={loading}>
                  {loading ? "Đang xác thực..." : "Vào cổng"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {step === "result" && (
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${result?.success ? "bg-green-100" : "bg-red-100"}`}>
            <p className="text-lg font-semibold">{result?.success ? "Thành công" : "Thất bại"}</p>
            <p>{result?.message}</p>
            {result?.patron && (
              <>
                <p><strong>Họ tên:</strong> {result.patron.full_name}</p>
                <p><strong>MSSV:</strong> {result.patron.student_code}</p>
              </>
            )}
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md" onClick={reset}>Làm lại</button>
        </div>
      )}

      {/* Recent history */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Lịch sử ra vào gần đây</h2>
        {recentLogs.length === 0 ? (
          <p className="text-gray-500 text-sm">Chưa có dữ liệu</p>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-2 font-medium">Thời gian</th>
                  <th className="p-2 font-medium">Họ tên</th>
                  <th className="p-2 font-medium">MSSV</th>
                  <th className="p-2 font-medium">Loại</th>
                  <th className="p-2 font-medium">Cổng</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-gray-50">
                    <td className="p-2 whitespace-nowrap text-gray-600">{new Date(log.access_time).toLocaleTimeString("vi-VN")}</td>
                    <td className="p-2 font-medium">{log.patron_name || "-"}</td>
                    <td className="p-2 text-gray-600">{log.student_code || "-"}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.access_type === "entry" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                      }`}>
                        {log.access_type === "entry" ? "Vào" : "Ra"}
                      </span>
                    </td>
                    <td className="p-2 text-gray-600">{log.camera_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
