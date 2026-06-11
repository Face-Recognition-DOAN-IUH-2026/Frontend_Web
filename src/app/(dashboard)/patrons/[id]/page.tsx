"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api, { getErrorMessage } from "@/lib/api-client";
import type { AccessLogPublic, PatronPublic, PatronUpdate } from "@/lib/types";

export default function PatronDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [patron, setPatron] = useState<PatronPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AccessLogPublic[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsSkip, setLogsSkip] = useState(0);
  const logsLimit = 20;

  const [editForm, setEditForm] = useState<PatronUpdate>({});
  const [showEdit, setShowEdit] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const enrollReadyRef = useRef<ReturnType<typeof setTimeout>>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [enrollStreaming, setEnrollStreaming] = useState(false);
  const [enrollReady, setEnrollReady] = useState(false);
  const [enrollPreview, setEnrollPreview] = useState<string | null>(null);
  const [enrollFile, setEnrollFile] = useState<File | null>(null);
  const [enrollError, setEnrollError] = useState("");
  const [enrollSuccess, setEnrollSuccess] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);

  const loadPatron = useCallback(async () => {
    try {
      const data = await api.getPatron(id);
      setPatron(data);
    } catch { return null; }
  }, [id]);

  const loadLogs = useCallback(async (append = false) => {
    try {
      const data = await api.getAccessLogs({ patronId: id, skip: logsSkip, limit: logsLimit });
      if (append) setLogs((prev) => [...prev, ...data.items]);
      else setLogs(data.items);
      setLogsTotal(data.total);
    } catch { }
  }, [id, logsSkip]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadPatron();
      await loadLogs();
      setLoading(false);
    })();
  }, [loadPatron, loadLogs]);

  const handleEdit = async () => {
    if (!patron) return;
    await api.updatePatron(patron.id, editForm);
    setShowEdit(false);
    setEditForm({});
    await loadPatron();
  };

  const handleRenew = async () => {
    if (!patron) return;
    const current = new Date(patron.membership_expiry);
    const next = new Date(current);
    next.setFullYear(next.getFullYear() + 1);
    await api.updatePatron(patron.id, { membership_expiry: next.toISOString().split("T")[0] });
    await loadPatron();
  };

  const handleDelete = async () => {
    if (!patron || !confirm("Xóa độc giả này?")) return;
    await api.deletePatron(patron.id);
    router.push("/patrons");
  };

  const startEnrollCam = async () => {
    try {
      setEnrollError("");
      setEnrollReady(false);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setEnrollStreaming(true);
    } catch (err: any) {
      if (err.name === "NotAllowedError") setEnrollError("Không có quyền truy cập camera");
      else if (err.name === "NotFoundError") setEnrollError("Không tìm thấy camera");
      else setEnrollError(`Lỗi camera: ${err.message}`);
    }
  };

  useEffect(() => {
    if (!enrollStreaming || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    const onReady = () => setEnrollReady(true);
    video.onloadedmetadata = onReady;
    video.onplaying = onReady;
    video.srcObject = stream;
    if (video.readyState >= 2) onReady();
    enrollReadyRef.current = setTimeout(() => setEnrollReady(true), 1500);
    return () => { if (enrollReadyRef.current) clearTimeout(enrollReadyRef.current); };
  }, [enrollStreaming]);

  const stopEnrollCam = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setEnrollStreaming(false);
    setEnrollReady(false);
  };

  const captureEnroll = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) { setEnrollError("Camera chưa sẵn sàng"); return; }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "face.jpg", { type: "image/jpeg" });
      setEnrollFile(file);
      setEnrollPreview(canvas.toDataURL("image/jpeg"));
      stopEnrollCam();
    }, "image/jpeg", 0.9);
  };

  const handleEnrollFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setEnrollError("Vui lòng chọn file ảnh");
      return;
    }
    setEnrollFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEnrollPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const submitEnroll = async () => {
    if (!patron || !enrollFile) return;
    setEnrollLoading(true);
    setEnrollError("");
    setEnrollSuccess("");
    try {
      await api.enrollPatronFace(patron.id, enrollFile);
      setEnrollPreview(null);
      setEnrollFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadPatron();
      setEnrollSuccess("Đăng ký khuôn mặt thành công!");
    } catch (err: any) {
      const errCode = err?.response?.data?.error || err?.response?.data?.detail;
      const errorMessages: Record<string, string> = {
        LIVENESS_FAILED: "Ảnh không phải khuôn mặt thật, vui lòng chụp ảnh trực tiếp",
        NO_FACE_DETECTED: "Không tìm thấy khuôn mặt trong ảnh, vui lòng thử lại",
        MULTIPLE_FACES: "Có nhiều hơn 1 khuôn mặt trong ảnh, vui lòng chụp lại",
        LOW_QUALITY: "Ảnh quá mờ hoặc thiếu sáng, vui lòng chụp lại với điều kiện ánh sáng tốt hơn",
        FACE_DETECTION_FAILED: "Không thể trích xuất khuôn mặt, vui lòng thử lại",
      };
      setEnrollError(errorMessages[errCode] || getErrorMessage(err) || "Đăng ký thất bại");
    } finally {
      setEnrollLoading(false);
    }
  };

  if (loading) return <p className="text-gray-500">Đang tải...</p>;
  if (!patron) return <p className="text-gray-500">Không tìm thấy độc giả</p>;

  const pageCount = Math.max(1, Math.ceil(logsTotal / logsLimit));
  const currentPage = Math.floor(logsSkip / logsLimit) + 1;

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => router.push("/patrons")} className="text-blue-600 hover:underline text-sm">&larr; Quay lại danh sách</button>

      <div className="border rounded-lg p-6 bg-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{patron.full_name}</h1>
            <p className="text-gray-500">MSSV: {patron.student_code} &middot; Mã thẻ: {patron.card_number}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            patron.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}>{patron.status}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div><span className="text-gray-500">Họ tên:</span> <span className="font-medium">{patron.full_name}</span></div>
          <div><span className="text-gray-500">MSSV:</span> <span className="font-medium">{patron.student_code}</span></div>
          <div><span className="text-gray-500">CMND/CCCD:</span> <span className="font-medium">{patron.identity_number || "-"}</span></div>
          <div><span className="text-gray-500">Mã thẻ:</span> <span className="font-medium">{patron.card_number}</span></div>
          <div><span className="text-gray-500">Email:</span> <span className="font-medium">{patron.email || "-"}</span></div>
          <div><span className="text-gray-500">SĐT:</span> <span className="font-medium">{patron.phone || "-"}</span></div>
          <div><span className="text-gray-500">Ngày cấp thẻ:</span> <span className="font-medium">{patron.issue_date || "-"}</span></div>
          <div><span className="text-gray-500">Hạn thẻ:</span>
            <span className={`font-medium ml-1 ${new Date(patron.membership_expiry) < new Date() ? "text-red-600" : "text-green-600"}`}>
              {patron.membership_expiry}
            </span>
          </div>
          <div><span className="text-gray-500">Khuôn mặt:</span>
            <span className={`font-medium ml-1 ${patron.has_face ? "text-green-600" : "text-gray-400"}`}>
              {patron.has_face ? "✓ Đã đăng ký" : "✗ Chưa đăng ký"}
            </span>
          </div>
          <div><span className="text-gray-500">Tạo lúc:</span> <span className="font-medium">{new Date(patron.created_at).toLocaleString("vi-VN")}</span></div>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm" onClick={() => { setEditForm({
            full_name: patron.full_name, identity_number: patron.identity_number || undefined,
            email: patron.email || undefined, phone: patron.phone || undefined,
            membership_expiry: patron.membership_expiry, status: patron.status,
          }); setShowEdit(true); }}>Sửa thông tin</button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-md text-sm" onClick={handleRenew}>Gia hạn thẻ</button>
          {!patron.has_face && (
            <>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm"
                onClick={startEnrollCam}>📷 Chụp ảnh</button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm"
                onClick={() => fileInputRef.current?.click()}>📁 Tải ảnh lên</button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleEnrollFileChange}
              />
            </>
          )}
          <button className="px-4 py-2 bg-red-600 text-white rounded-md text-sm ml-auto" onClick={handleDelete}>Xóa</button>
        </div>
        {enrollSuccess && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
            <span className="text-lg">✓</span> {enrollSuccess}
          </div>
        )}
      </div>

      {enrollPreview ? (
        <div className="border rounded-lg p-4 space-y-3 bg-white">
          <h3 className="font-semibold">Xác nhận ảnh khuôn mặt</h3>
          <img src={enrollPreview} className="w-64 rounded-lg border" />
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-green-600 text-white rounded-md disabled:opacity-50"
              onClick={submitEnroll} disabled={enrollLoading}>
              {enrollLoading ? "Đang đăng ký..." : "Xác nhận & Gửi"}
            </button>
            <button className="px-4 py-2 bg-gray-200 rounded-md"
              onClick={() => { setEnrollPreview(null); setEnrollFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Chụp lại</button>
          </div>
          {enrollError && <p className="text-red-500 text-sm">{enrollError}</p>}
        </div>
      ) : enrollStreaming ? (
        <div className="border rounded-lg p-4 space-y-3 bg-white">
          <h3 className="font-semibold">Đăng ký khuôn mặt</h3>
          <p className="text-sm text-gray-500">Đặt khuôn mặt vào khung bên dưới, đảm bảo đủ ánh sáng và nhìn thẳng vào camera.</p>
          <div className="relative bg-black rounded-lg overflow-hidden max-w-md">
            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-64 border-4 border-dashed border-yellow-400 rounded-3xl opacity-80" />
            </div>
            {!enrollReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                Đang mở camera...
              </div>
            )}
          </div>
          {enrollError && <p className="text-red-500 text-sm">{enrollError}</p>}
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-green-600 text-white rounded-md disabled:opacity-50"
              onClick={captureEnroll} disabled={!enrollReady}>Chụp ảnh</button>
            <button className="px-4 py-2 bg-gray-200 rounded-md" onClick={stopEnrollCam}>Tắt camera</button>
          </div>
        </div>
      ) : null}

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowEdit(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Sửa độc giả</h2>
            {[["full_name", "Họ tên"], ["identity_number", "CMND/CCCD"], ["email", "Email"], ["phone", "SĐT"],
              ["membership_expiry", "Hạn thẻ"], ["status", "Trạng thái"]
            ].map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-sm font-medium">{label}:</span>
                {key === "status" ? (
                  <select className="mt-1 block w-full px-3 py-2 border rounded-md"
                    value={(editForm as any)[key] || ""}
                    onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="expired">expired</option>
                  </select>
                ) : (
                  <input className="mt-1 block w-full px-3 py-2 border rounded-md"
                    value={(editForm as any)[key] || ""}
                    onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                    type={key === "membership_expiry" ? "date" : "text"} />
                )}
              </label>
            ))}
            <div className="flex gap-3 pt-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md" onClick={handleEdit}>Lưu</button>
              <button className="px-4 py-2 bg-gray-200 rounded-md" onClick={() => setShowEdit(false)}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      <div className="border rounded-lg bg-white">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Lịch sử ra vào</h2>
        </div>
        {logs.length === 0 ? (
          <p className="p-4 text-gray-500 text-sm">Chưa có lịch sử ra vào</p>
        ) : (
          <>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3 text-left font-medium">Thời gian</th>
                  <th className="p-3 text-left font-medium">Loại</th>
                  <th className="p-3 text-left font-medium">Cổng</th>
                  <th className="p-3 text-left font-medium">Phương thức</th>
                  <th className="p-3 text-left font-medium">Độ tin cậy</th>
                  <th className="p-3 text-left font-medium">Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 whitespace-nowrap">{new Date(log.access_time).toLocaleString("vi-VN")}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.access_type === "entry" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                      }`}>{log.access_type === "entry" ? "Vào" : "Ra"}</span>
                    </td>
                    <td className="p-3 text-gray-600">{log.camera_id}</td>
                    <td className="p-3 text-gray-600">{log.verify_method}</td>
                    <td className="p-3">
                      {log.confidence != null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${
                              log.confidence >= 0.8 ? "bg-green-500" : log.confidence >= 0.6 ? "bg-yellow-500" : "bg-red-500"
                            }`} style={{ width: `${(log.confidence * 100).toFixed(0)}%` }} />
                          </div>
                          <span className="text-xs">{(log.confidence * 100).toFixed(0)}%</span>
                        </div>
                      ) : "-"}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.status === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>{log.status === "success" ? "✓" : "✗"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logsTotal > logsLimit && (
              <div className="flex items-center justify-between p-4 border-t text-sm">
                <span className="text-gray-500">Tổng: {logsTotal}</span>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 border rounded-md disabled:opacity-40"
                    disabled={currentPage <= 1}
                    onClick={() => setLogsSkip(0)}>«</button>
                  <span>Trang {currentPage} / {pageCount}</span>
                  <button className="px-3 py-1 border rounded-md disabled:opacity-40"
                    disabled={currentPage >= pageCount}
                    onClick={() => setLogsSkip((pageCount - 1) * logsLimit)}>»</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}