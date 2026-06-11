"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api, { getErrorMessage } from "@/lib/api-client";
import type { PatronPublic, PatronCreate, PatronUpdate } from "@/lib/types";

export default function PatronsPage() {
  const router = useRouter();
  const [patrons, setPatrons] = useState<PatronPublic[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<PatronCreate>({
    full_name: "", student_code: "", card_number: "", membership_expiry: "",
  });

  const [editTarget, setEditTarget] = useState<PatronPublic | null>(null);
  const [editForm, setEditForm] = useState<PatronUpdate>({});

  const [enrollTarget, setEnrollTarget] = useState<PatronPublic | null>(null);
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.searchPatrons(query || undefined);
      setPatrons(data);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const [createError, setCreateError] = useState("");

  const handleCreate = async () => {
    try {
      await api.createPatron(createForm);
      setShowCreate(false);
      setCreateError("");
      setCreateForm({ full_name: "", student_code: "", card_number: "", membership_expiry: "" });
      load();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setCreateError("MSSV hoặc Mã thẻ đã tồn tại trong hệ thống");
      } else {
        setCreateError(getErrorMessage(err) || "Tạo độc giả thất bại");
      }
    }
  };

  const openEdit = (p: PatronPublic) => {
    setEditTarget(p);
    setEditForm({
      full_name: p.full_name,
      identity_number: p.identity_number || undefined,
      email: p.email || undefined,
      phone: p.phone || undefined,
      membership_expiry: p.membership_expiry,
      status: p.status,
    });
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    await api.updatePatron(editTarget.id, editForm);
    setEditTarget(null);
    setEditForm({});
    load();
  };

  const handleRenew = async (p: PatronPublic) => {
    const current = new Date(p.membership_expiry);
    const next = new Date(current);
    next.setFullYear(next.getFullYear() + 1);
    const nextStr = next.toISOString().split("T")[0];
    await api.updatePatron(p.id, { membership_expiry: nextStr });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa độc giả này?")) return;
    await api.deletePatron(id);
    load();
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
    setEnrollError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEnrollPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const submitEnroll = async () => {
    if (!enrollTarget || !enrollFile) return;
    setEnrollLoading(true);
    setEnrollError("");
    setEnrollSuccess("");
    try {
      await api.enrollPatronFace(enrollTarget.id, enrollFile);
      setEnrollPreview(null);
      setEnrollFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      load();
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

  const closeEnroll = () => {
    stopEnrollCam();
    setEnrollTarget(null);
    setEnrollPreview(null);
    setEnrollFile(null);
    setEnrollError("");
    setEnrollSuccess("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Quản lý độc giả</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Hủy" : "Thêm độc giả"}
        </button>
      </div>

      {showCreate && (
        <div className="p-4 border rounded-lg space-y-3 max-w-md bg-white">
          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {createError}
            </div>
          )}
          {[["full_name", "Họ tên"], ["student_code", "MSSV"], ["card_number", "Mã thẻ"], ["membership_expiry", "Hạn thẻ"]].map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-sm font-medium">{label}:</span>
              <input className="mt-1 block w-full px-3 py-2 border rounded-md" value={(createForm as any)[key]}
                onChange={(e) => { setCreateForm({ ...createForm, [key]: e.target.value }); setCreateError(""); }}
                type={key === "membership_expiry" ? "date" : "text"} />
            </label>
          ))}
          <button className="px-4 py-2 bg-green-600 text-white rounded-md" onClick={handleCreate}>Tạo</button>
        </div>
      )}

      <div className="flex gap-2">
        <input className="flex-1 px-3 py-2 border rounded-md" value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Tìm theo tên, MSSV, mã thẻ..." />
        <button className="px-4 py-2 bg-gray-600 text-white rounded-md" onClick={() => load()}>Tìm</button>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        {loading && patrons.length === 0 ? (
          <p className="p-4 text-gray-500">Đang tải...</p>
        ) : patrons.length === 0 ? (
          <p className="p-4 text-gray-500">Không có độc giả nào</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left font-medium">Họ tên</th>
                <th className="p-3 text-left font-medium">MSSV</th>
                <th className="p-3 text-left font-medium">Email</th>
                <th className="p-3 text-left font-medium">SĐT</th>
                <th className="p-3 text-left font-medium">Hạn thẻ</th>
                <th className="p-3 text-left font-medium">Trạng thái</th>
                <th className="p-3 text-left font-medium">Khuôn mặt</th>
                <th className="p-3 text-left font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {patrons.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/patrons/${p.id}`)}>
                  <td className="p-3 font-medium">{p.full_name}</td>
                  <td className="p-3 text-gray-600">{p.student_code}</td>
                  <td className="p-3 text-gray-600">{p.email || "-"}</td>
                  <td className="p-3 text-gray-600">{p.phone || "-"}</td>
                  <td className="p-3">{p.membership_expiry}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>{p.status}</span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 ${p.has_face ? "text-green-600" : "text-gray-400"}`}>
                      {p.has_face ? "✓ Đã đăng ký" : "✗ Chưa có"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        onClick={() => openEdit(p)}>Sửa</button>
                      <button className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                        onClick={() => handleRenew(p)}>Gia hạn</button>
                      <button className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                        onClick={() => setEnrollTarget(p)}>Face</button>
                      <button className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        onClick={() => handleDelete(p.id)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditTarget(null)}>
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
              <button className="px-4 py-2 bg-gray-200 rounded-md" onClick={() => setEditTarget(null)}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {enrollTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeEnroll}>
          <div className="bg-white rounded-lg p-6 w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Đăng ký khuôn mặt</h2>
              <span className="text-sm text-gray-500">{enrollTarget.full_name} ({enrollTarget.student_code})</span>
            </div>

            {enrollSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                <span className="text-lg">✓</span> {enrollSuccess}
              </div>
            )}

            {enrollPreview ? (
              <div className="space-y-3">
                <img src={enrollPreview} className="w-full rounded-lg border" />
                {enrollError && <p className="text-red-500 text-sm">{enrollError}</p>}
                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-green-600 text-white rounded-md disabled:opacity-50"
                    onClick={submitEnroll} disabled={enrollLoading}>
                    {enrollLoading ? "Đang đăng ký..." : "Xác nhận & Gửi"}
                  </button>
                  <button className="px-4 py-2 bg-gray-200 rounded-md"
                    onClick={() => { setEnrollPreview(null); setEnrollFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Chụp lại</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleEnrollFileChange}
                />
                <div className="relative bg-black rounded-lg overflow-hidden">
                  {enrollStreaming ? (
                    <>
                      <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-64 border-4 border-dashed border-yellow-400 rounded-3xl opacity-80" />
                      </div>
                      {!enrollReady && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                          Đang mở camera...
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-gray-400">
                      {enrollError || "Bật camera hoặc tải ảnh lên từ máy"}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500">Đặt khuôn mặt vào khung bên dưới, đảm bảo đủ ánh sáng và nhìn thẳng vào camera.</p>
                {enrollError && <p className="text-red-500 text-sm">{enrollError}</p>}
                <div className="flex gap-3 flex-wrap">
                  {!enrollStreaming ? (
                    <>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-md" onClick={startEnrollCam}>
                        📷 Bật camera
                      </button>
                      <button className="px-4 py-2 bg-purple-600 text-white rounded-md" onClick={() => fileInputRef.current?.click()}>
                        📁 Tải ảnh lên
                      </button>
                    </>
                  ) : (
                    <button className="px-4 py-2 bg-green-600 text-white rounded-md disabled:opacity-50"
                      onClick={captureEnroll} disabled={!enrollReady}>
                      📸 Chụp ảnh
                    </button>
                  )}
                  <button className="px-4 py-2 bg-gray-200 rounded-md" onClick={closeEnroll}>Đóng</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}