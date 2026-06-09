"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api-client";
import type { AccessLogPublic, CameraEvent, CameraStatus, KioskResult, PatronLookupResult } from "@/lib/types";

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
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
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

  const [cameraReady, setCameraReady] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [camStatus, setCamStatus] = useState<"checking" | "available" | "unavailable" | "blocked">("checking");
  const [entryCamOk, setEntryCamOk] = useState<boolean | null>(null);
  const [exitCamOk, setExitCamOk] = useState<boolean | null>(null);
  const [cameraStatusList, setCameraStatusList] = useState<CameraStatus[]>([]);
  const [todayCounts, setTodayCounts] = useState({ entries: 0, exits: 0, no_match: 0, spoof: 0 });
  const [showCamDetail, setShowCamDetail] = useState(false);

  const addToast = useCallback((t: Omit<Toast, "id">) => {
    const id = ++toastId;
    setToasts((prev) => [{ ...t, id }, ...prev.slice(0, 4)]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 6000);
  }, []);

  const stopCamera = useCallback(() => {
    if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraOn(false);
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      setCameraReady(false);

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
        addToast({ type: "error", message: "Không có quyền truy cập camera. Vui lòng cho phép camera trong trình duyệt." });
      } else if (err.name === "NotFoundError") {
        addToast({ type: "error", message: "Không tìm thấy camera trên thiết bị." });
      } else {
        addToast({ type: "error", message: `Lỗi camera: ${err.message}` });
      }
      setIsCameraOn(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!isCameraOn || !videoRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const stream = streamRef.current;

    const onReady = () => setCameraReady(true);

    video.onloadedmetadata = onReady;
    video.onplaying = onReady;
    video.onerror = () => addToast({ type: "error", message: "Lỗi camera" });
    video.srcObject = stream;

    if (video.readyState >= 2) onReady();

    readyTimeoutRef.current = setTimeout(() => setCameraReady(true), 1500);

    return () => {
      if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
    };
  }, [isCameraOn, addToast]);

  const captureImage = useCallback((): Promise<File> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      if (!video || !video.videoWidth) {
        reject(new Error("Camera chưa sẵn sàng"));
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Không thể tạo canvas"));
        return;
      }
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "face_capture.jpg", { type: "image/jpeg" });
          setCaptured(canvas.toDataURL("image/jpeg"));
          resolve(file);
        } else {
          reject(new Error("Không thể tạo ảnh"));
        }
      }, "image/jpeg", 0.9);
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

  const pollTask = useCallback(async (jobId: string, intervalMs = 1000, timeoutMs = 30000): Promise<any> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, intervalMs));
      try {
        const task = await api.getTaskStatus(jobId);
        if (task.status === "SUCCESS") return task.result;
        if (task.status === "FAILURE") throw new Error(task.result?.error || "Task failed");
        setStatusText(task.result?.status === "granted" ? "Đã ghi nhận..." : "Đang xử lý...");
      } catch {
      }
    }
    throw new Error("Timeout waiting for result");
  }, []);

  const handleEnroll = async () => {
    if (!form.full_name) return;
    setLoading(true);
    setStatusText("Đang chụp ảnh...");
    try {
      const imageFile = await captureImage();
      stopCamera();
      setStatusText("Đang gửi dữ liệu...");
      const res = await api.kioskEnroll(imageFile, form.full_name, mssv, `CARD-${mssv || Date.now()}`,
        "2027-12-31", form.identity_number || undefined, form.email || undefined, form.phone || undefined);
      if (res.job_id) {
        setStatusText("Đang xử lý ảnh...");
        await pollTask(res.job_id);
      }
      setResult(res);
      setStep("result");
      setForm({ full_name: "", identity_number: "", email: "", phone: "" });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || "Đăng ký thất bại";
      setResult({ success: false, message: msg, patron: null, job_id: null });
      setStep("result");
      addToast({ type: "error", message: msg });
    } finally {
      setLoading(false);
      setStatusText("");
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setStatusText("Đang chụp ảnh...");
    try {
      const imageFile = await captureImage();
      stopCamera();
      setStatusText("Đang gửi dữ liệu...");
      const res = await api.kioskEnter(imageFile, mssv);
      if (res.job_id) {
        setStatusText("Đang xác thực khuôn mặt...");
        const taskResult = await pollTask(res.job_id);
        const success = taskResult?.status === "success";
        setResult({
          success,
          message: success
            ? `Xác thực thành công — ${taskResult?.access_type === "exit" ? "Ra" : "Vào"} thư viện`
            : (taskResult?.error || "Xác thực thất bại"),
          patron: res.patron,
          job_id: res.job_id,
        });
      } else {
        setResult(res);
      }
      setStep("result");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || "Xác thực thất bại";
      setResult({ success: false, message: msg, patron: null, job_id: null });
      setStep("result");
      addToast({ type: "error", message: msg });
    } finally {
      setLoading(false);
      setStatusText("");
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

  useEffect(() => {
    const cleanup = api.connectAccessSSE((event: CameraEvent) => {
      if (event.status === "granted") {
        const type = event.access_type === "entry" ? "entry" : "exit";
        addToast({
          type,
          message: `${event.full_name} — ${type === "entry" ? "Vào" : "Ra"} thư viện`,
          patron_name: event.full_name,
        });
        setTodayCounts((c) => ({ ...c, [type === "entry" ? "entries" : "exits"]: c[type === "entry" ? "entries" : "exits"] + 1 }));
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
        setTodayCounts((c) => ({ ...c, no_match: c.no_match + 1 }));
        addToast({ type: "info", message: event.full_name ? `${event.full_name} — chưa có lượt vào, bỏ qua` : "Khuôn mặt mới — không nhận diện được" });
      } else if (event.status === "expired") {
        addToast({ type: "error", message: `${event.full_name} — thẻ đã hết hạn` });
      } else if (event.status === "spoof") {
        setTodayCounts((c) => ({ ...c, spoof: c.spoof + 1 }));
        addToast({ type: "error", message: "Phát hiện giả mạo!" });
      } else if (event.status === "error") {
        addToast({ type: "error", message: `Lỗi xử lý: ${event.error || "không xác định"}` });
      } else {
        addToast({ type: "info", message: `${event.status} — ${event.full_name || ""}` });
      }
    });
    return cleanup;
  }, [addToast, step]);

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setCamStatus("unavailable");
      return;
    }
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const hasCam = devices.some((d) => d.kind === "videoinput");
      setCamStatus(hasCam ? "available" : "unavailable");
    }).catch(() => setCamStatus("blocked"));
  }, []);

  useEffect(() => {
    api.getRecentLogs().then((data) => setRecentLogs(data.items)).catch(() => {});
  }, []);

  useEffect(() => {
    const poll = async () => {
      try { setCameraStatusList(await api.getCameraStatus()); } catch {}
    };
    poll();
    const iv = setInterval(poll, 10000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="space-y-6">
      <button onClick={() => router.push("/dashboard")} className="text-blue-600 hover:underline text-sm">&larr; Quay lại Dashboard</button>
      <h1 className="text-3xl font-bold">Gate Kiosk</h1>

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
              {t.patron_name && <strong>{t.patron_name}</strong>} {t.message}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg overflow-hidden bg-black">
          <div className="bg-gray-800 text-white px-3 py-1 text-sm font-medium flex items-center gap-2">
            <span>Cổng vào — Camera 1</span>
            <span className={`inline-block w-2 h-2 rounded-full ${entryCamOk === null ? "bg-yellow-400" : entryCamOk ? "bg-green-400" : "bg-red-400"}`} />
          </div>
          <img src={`${ENTRY_CAM}?_t=${entryTs}`} className="w-full h-64 object-contain" alt="Entry cam"
            onLoad={() => setEntryCamOk(true)} onError={() => setEntryCamOk(false)} />
        </div>
        <div className="border rounded-lg overflow-hidden bg-black">
          <div className="bg-gray-800 text-white px-3 py-1 text-sm font-medium flex items-center gap-2">
            <span>Cổng ra — Camera 2</span>
            <span className={`inline-block w-2 h-2 rounded-full ${exitCamOk === null ? "bg-yellow-400" : exitCamOk ? "bg-green-400" : "bg-red-400"}`} />
          </div>
          <img src={`${EXIT_CAM}?_t=${exitTs}`} className="w-full h-64 object-contain" alt="Exit cam"
            onLoad={() => setExitCamOk(true)} onError={() => setExitCamOk(false)} />
        </div>
      </div>

      {/* Camera stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{todayCounts.entries}</p>
          <p className="text-xs text-green-600">Vào hôm nay</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-orange-700">{todayCounts.exits}</p>
          <p className="text-xs text-orange-600">Ra hôm nay</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-700">{todayCounts.no_match}</p>
          <p className="text-xs text-gray-600">Không nhận diện</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{todayCounts.spoof}</p>
          <p className="text-xs text-red-600">Giả mạo</p>
        </div>
      </div>

      {/* Camera status detail */}
      {cameraStatusList.length > 0 && (
        <div>
          <button className="text-sm text-blue-600 hover:underline" onClick={() => setShowCamDetail(!showCamDetail)}>
            {showCamDetail ? "Ẩn" : "Chi tiết"} trạng thái camera
          </button>
          {showCamDetail && (
            <div className="mt-2 space-y-2">
              {cameraStatusList.map((cs) => (
                <div key={cs.camera_id} className="border rounded-lg p-3 bg-white text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{cs.camera_id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      cs.connected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>{cs.connected ? "Online" : "Offline"}</span>
                  </div>
                  <div className="mt-1 text-gray-500 grid grid-cols-3 gap-2 text-xs">
                    <span>Frames: {cs.frames_processed}</span>
                    <span>Lần thử lại: {cs.retry_count}</span>
                    <span>{cs.last_frame_time ? `Cuối: ${new Date(cs.last_frame_time).toLocaleTimeString("vi-VN")}` : "Chưa có frame"}</span>
                  </div>
                  {cs.last_error && <p className="text-red-500 text-xs mt-1">{cs.last_error}</p>}
                  {!cs.connected && (
                    <button className="mt-2 text-xs text-blue-600 hover:underline"
                      onClick={() => api.reconnectCamera(cs.camera_id)}>Reconnect</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "idle" && (
        <div className="max-w-md space-y-4">
          <div className="flex items-center gap-2 text-sm p-2 rounded-md bg-gray-50 border">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${
              camStatus === "checking" ? "bg-yellow-400 animate-pulse" :
              camStatus === "available" ? "bg-green-500" : "bg-red-500"
            }`} />
            <span>
              {camStatus === "checking" && "Đang kiểm tra camera..."}
              {camStatus === "available" && "Camera sẵn sàng"}
              {camStatus === "unavailable" && "Không tìm thấy camera — dùng upload ảnh"}
              {camStatus === "blocked" && "Camera bị chặn — cho phép camera trong trình duyệt"}
            </span>
          </div>

          <label className="block">
            <span className="text-sm font-medium">Nhập MSSV:</span>
            <input className="mt-1 block w-full px-3 py-2 border rounded-md" value={mssv} onChange={(e) => setMssv(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLookup()} placeholder="MSSV" />
          </label>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md" onClick={handleLookup} disabled={loading}>
              {loading ? "Đang kiểm tra..." : "Tra cứu"}
            </button>
            {camStatus === "checking" && (
              <button className="px-4 py-2 bg-gray-200 text-gray-600 rounded-md text-sm" onClick={() => setCamStatus("unavailable")}>Bỏ qua</button>
            )}
          </div>
        </div>
      )}

      {(step === "enroll_form" || step === "verify") && (
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg" />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                  Đang mở camera...
                </div>
              )}
            </div>
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
                {statusText && <p className="text-blue-600 text-sm animate-pulse">{statusText}</p>}
              </>
            )}
          </div>
        </div>
      )}

      {step === "result" && (
        <div className="space-y-4">
          {statusText && <p className="text-blue-600 text-sm animate-pulse">{statusText}</p>}
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
          <button onClick={reset} className="px-4 py-2 bg-blue-600 text-white rounded-md">Làm lại</button>
        </div>
      )}

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