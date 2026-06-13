'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api, { getErrorMessage } from "@/lib/api-client";
import type { PatronPublic, PatronCreate, PatronUpdate } from "@/lib/types";
import MultiAngleCapture from "@/components/MultiAngleCapture";
import type { CaptureAngle } from "@/components/MultiAngleCapture";

type Step = 1 | 2 | 3;

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const defaultIssueDate = new Date().toISOString().split("T")[0];
const defaultExpiry = new Date();
defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);
const defaultExpiryStr = defaultExpiry.toISOString().split("T")[0];

export default function PatronsPage() {
  const router = useRouter();
  const [patrons, setPatrons] = useState<PatronPublic[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState<Step>(1);
  const [createForm, setCreateForm] = useState<PatronCreate>({
    full_name: "",
    student_code: "",
    class_name: "",
    issue_date: defaultIssueDate,
    membership_expiry: defaultExpiryStr,
  });
  const [createError, setCreateError] = useState("");

  const [enrollFiles, setEnrollFiles] = useState<Record<CaptureAngle, File> | null>(null);
  const [enrollError, setEnrollError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editTarget, setEditTarget] = useState<PatronPublic | null>(null);
  const [editForm, setEditForm] = useState<PatronUpdate>({});

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

  const closeCreate = () => {
    setShowCreate(false);
    setCreateStep(1);
    setCreateForm({ full_name: "", student_code: "", class_name: "", issue_date: defaultIssueDate, membership_expiry: defaultExpiryStr });
    setCreateError("");
    setEnrollFiles(null);
    setEnrollError("");
  };

  const handleCreateStep1 = () => {
    if (!createForm.full_name.trim()) { setCreateError("Vui lòng nhập họ tên"); return; }
    if (!createForm.student_code.trim()) { setCreateError("Vui lòng nhập MSSV"); return; }
    setCreateError("");
    setCreateStep(2);
  };

  const handleFilesReady = async (files: Record<CaptureAngle, File>) => {
    setEnrollFiles(files);
    setCreateStep(3);
  };

  const handleSubmit = async () => {
    if (!enrollFiles) return;
    setSubmitting(true);
    setCreateError("");
    try {
      const newPatron = await api.createPatron(createForm);
      await api.enrollPatronFaceBatch(newPatron.id, enrollFiles);
      closeCreate();
      load();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setCreateError("MSSV hoặc Mã thẻ đã tồn tại trong hệ thống");
      } else {
        setCreateError(getErrorMessage(err) || "Tạo độc giả thất bại");
      }
    } finally {
      setSubmitting(false);
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
    setPatrons((prev) => prev.filter((p) => p.id !== id));
    try {
      await api.deletePatron(id);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        alert("Độc giả đã bị xóa trước đó.");
      } else {
        alert("Xóa thất bại: " + (getErrorMessage(err) || "Lỗi không xác định"));
        load();
      }
    }
  };

  const cardNumber = createForm.student_code ? `THV-${createForm.student_code}` : 'THV-XXXXXXXX';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Quản lý độc giả</h1>
        <button
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-xl transition-colors shadow-lg shadow-amber-500/25"
          onClick={() => setShowCreate(true)}
        >
          + Thêm độc giả
        </button>
      </div>

      <div className="flex gap-2">
        <input className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
          value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Tìm theo tên, MSSV, mã thẻ..." />
        <button className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors" onClick={() => load()}>Tìm</button>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        {loading && patrons.length === 0 ? (
          <p className="p-4 text-slate-500">Đang tải...</p>
        ) : patrons.length === 0 ? (
          <p className="p-4 text-slate-500">Không có độc giả nào</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-3 text-left font-medium text-slate-600">Họ tên</th>
                <th className="p-3 text-left font-medium text-slate-600">MSSV</th>
                <th className="p-3 text-left font-medium text-slate-600">Email</th>
                <th className="p-3 text-left font-medium text-slate-600">SĐT</th>
                <th className="p-3 text-left font-medium text-slate-600">Hạn thẻ</th>
                <th className="p-3 text-left font-medium text-slate-600">Trạng thái</th>
                <th className="p-3 text-left font-medium text-slate-600">Khuôn mặt</th>
                <th className="p-3 text-left font-medium text-slate-600">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {patrons.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                  onClick={() => router.push(`/patrons/${p.id}`)}>
                  <td className="p-3 font-medium text-slate-800">{p.full_name}</td>
                  <td className="p-3 text-slate-600 font-mono">{p.student_code}</td>
                  <td className="p-3 text-slate-600">{p.email || "-"}</td>
                  <td className="p-3 text-slate-600">{p.phone || "-"}</td>
                  <td className="p-3 text-slate-600">{p.membership_expiry}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}>{p.status}</span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 text-sm ${p.has_face ? "text-emerald-600" : "text-slate-400"}`}>
                      {p.has_face ? "✓ Đã đăng ký" : "✗ Chưa có"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button className="px-2.5 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        onClick={() => openEdit(p)}>Sửa</button>
                      <button className="px-2.5 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                        onClick={() => handleRenew(p)}>Gia hạn</button>
                      <button className="px-2.5 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        onClick={() => handleDelete(p.id)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeCreate}>
          <div className="bg-slate-800 rounded-2xl w-full max-w-lg mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>

            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Thêm độc giả mới</h2>
                <button onClick={closeCreate} className="text-slate-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {([1, 2, 3] as Step[]).map((s, i) => (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      createStep > s ? "bg-emerald-500 text-white" :
                      createStep === s ? "bg-amber-500 text-slate-900" :
                      "bg-slate-700 text-slate-400"
                    }`}>
                      {createStep > s ? "✓" : s}
                    </div>
                    <span className={`text-sm font-medium hidden sm:block ${
                      createStep === s ? "text-amber-400" : "text-slate-500"
                    }`}>
                      {s === 1 ? "Thông tin" : s === 2 ? "Khuôn mặt" : "Xác nhận"}
                    </span>
                    {i < 2 && <div className={`flex-1 h-0.5 ${createStep > s ? "bg-emerald-500" : "bg-slate-700"}`} />}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6">
              {createError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
                  {createError}
                </div>
              )}

              {createStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Họ tên <span className="text-red-400">*</span></label>
                    <input value={createForm.full_name}
                      onChange={(e) => { setCreateForm({ ...createForm, full_name: e.target.value }); setCreateError(""); }}
                      placeholder="Nguyễn Văn A"
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">MSSV <span className="text-red-400">*</span></label>
                    <input value={createForm.student_code}
                      onChange={(e) => { setCreateForm({ ...createForm, student_code: e.target.value }); setCreateError(""); }}
                      placeholder="21001234"
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Lớp</label>
                    <input value={createForm.class_name}
                      onChange={(e) => setCreateForm({ ...createForm, class_name: e.target.value })}
                      placeholder="CNTT K61"
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Ngày cấp thẻ</label>
                      <input type="date" value={createForm.issue_date}
                        onChange={(e) => setCreateForm({ ...createForm, issue_date: e.target.value })}
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Hạn thẻ</label>
                      <input type="date" value={createForm.membership_expiry}
                        onChange={(e) => setCreateForm({ ...createForm, membership_expiry: e.target.value })}
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500" />
                    </div>
                  </div>

                  <button
                    onClick={handleCreateStep1}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-bold rounded-xl transition-all shadow-lg shadow-amber-500/25"
                  >
                    Tiếp tục →
                  </button>
                </div>
              )}

              {createStep === 2 && (
                <div className="space-y-4">
                  <p className="text-slate-400 text-sm text-center mb-2">
                    Chụp khuôn mặt từ 4 góc để đăng ký nhận diện tại cổng
                  </p>
                  <MultiAngleCapture
                    consent={true}
                    onFilesReady={handleFilesReady}
                  />
                  <button
                    onClick={() => setCreateStep(1)}
                    className="w-full py-2.5 text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    ← Quay lại
                  </button>
                </div>
              )}

              {createStep === 3 && enrollFiles && (
                <div className="space-y-4">
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-white font-semibold">{createForm.full_name}</p>
                        <p className="text-amber-400 font-mono text-sm">{cardNumber}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-slate-400">MSSV: <span className="text-white">{createForm.student_code}</span></div>
                      <div className="text-slate-400">Lớp: <span className="text-white">{createForm.class_name || "-"}</span></div>
                      <div className="text-slate-400">Cấp: <span className="text-white">{createForm.issue_date}</span></div>
                      <div className="text-slate-400">Hạn: <span className="text-white">{createForm.membership_expiry}</span></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {(["frontal", "right", "left", "down"] as CaptureAngle[]).map((angle) => (
                      <div key={angle} className="aspect-square rounded-lg overflow-hidden border border-slate-700 bg-slate-900 relative">
                        <span className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded capitalize">{angle}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50"
                  >
                    {submitting ? "Đang tạo..." : "✓ Tạo độc giả"}
                  </button>
                  <button
                    onClick={() => setCreateStep(2)}
                    className="w-full py-2.5 text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    ← Quay lại chụp ảnh
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}