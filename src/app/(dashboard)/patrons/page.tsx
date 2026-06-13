"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api, { getErrorMessage } from "@/lib/api-client";
import type { PatronPublic, PatronCreate, PatronUpdate } from "@/lib/types";
import MultiAngleCapture from "@/components/MultiAngleCapture";
import type { CaptureAngle } from "@/components/MultiAngleCapture";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Users, Search, Plus, X } from "lucide-react";

type Step = 1 | 2 | 3;

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
    full_name: "", student_code: "", class_name: "",
    issue_date: defaultIssueDate, membership_expiry: defaultExpiryStr,
  });
  const [createError, setCreateError] = useState("");
  const [enrollFiles, setEnrollFiles] = useState<Record<CaptureAngle, File> | null>(null);
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
    setShowCreate(false); setCreateStep(1);
    setCreateForm({ full_name: "", student_code: "", class_name: "", issue_date: defaultIssueDate, membership_expiry: defaultExpiryStr });
    setCreateError(""); setEnrollFiles(null);
  };

  const handleCreateStep1 = () => {
    if (!createForm.full_name.trim()) { setCreateError("Vui lòng nhập họ tên"); return; }
    if (!createForm.student_code.trim()) { setCreateError("Vui lòng nhập MSSV"); return; }
    setCreateError(""); setCreateStep(2);
  };

  const handleFilesReady = (files: Record<CaptureAngle, File>) => {
    setEnrollFiles(files); setCreateStep(3);
  };

  const handleSubmit = async () => {
    if (!enrollFiles) return;
    setSubmitting(true); setCreateError("");
    try {
      const newPatron = await api.createPatron(createForm);
      await api.enrollPatronFaceBatch(newPatron.id, enrollFiles);
      closeCreate(); load();
    } catch (err: any) {
      if (err?.response?.status === 409) setCreateError("MSSV hoặc Mã thẻ đã tồn tại");
      else setCreateError(getErrorMessage(err) || "Tạo độc giả thất bại");
    } finally { setSubmitting(false); }
  };

  const openEdit = (p: PatronPublic) => {
    setEditTarget(p);
    setEditForm({
      full_name: p.full_name, identity_number: p.identity_number || undefined,
      email: p.email || undefined, phone: p.phone || undefined,
      membership_expiry: p.membership_expiry, status: p.status,
    });
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    await api.updatePatron(editTarget.id, editForm);
    setEditTarget(null); setEditForm({}); load();
  };

  const handleRenew = async (p: PatronPublic) => {
    const next = new Date(p.membership_expiry); next.setFullYear(next.getFullYear() + 1);
    await api.updatePatron(p.id, { membership_expiry: next.toISOString().split("T")[0] }); load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa độc giả này?")) return;
    setPatrons((prev) => prev.filter((p) => p.id !== id));
    try { await api.deletePatron(id); }
    catch (err: any) {
      if (err?.response?.status === 404) alert("Độc giả đã bị xóa trước đó.");
      else { alert("Xóa thất bại: " + (getErrorMessage(err) || "Lỗi không xác định")); load(); }
    }
  };

  const cardNumber = createForm.student_code ? `THV-${createForm.student_code}` : 'THV-XXXXXXXX';

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-end">
        <Button onClick={() => setShowCreate(true)} icon={<Plus size={16} />}>
          Thêm độc giả
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
          <input className="input pl-10" value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Tìm theo tên, MSSV, mã thẻ..." />
        </div>
        <Button variant="secondary" onClick={load}>Tìm</Button>
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          {loading && patrons.length === 0 ? (
            <div className="p-8 text-center text-text-3 text-body-sm">Đang tải...</div>
          ) : patrons.length === 0 ? (
            <div className="p-8 text-center text-text-3 text-body-sm">Không có độc giả nào</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>MSSV</th>
                  <th>Email</th>
                  <th>SĐT</th>
                  <th>Hạn thẻ</th>
                  <th>Trạng thái</th>
                  <th>Khuôn mặt</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {patrons.map((p) => (
                  <tr key={p.id} className="cursor-pointer" onClick={() => router.push(`/patrons/${p.id}`)}>
                    <td className="font-medium text-text">{p.full_name}</td>
                    <td className="font-mono text-text-3">{p.student_code}</td>
                    <td className="text-text-3">{p.email || "-"}</td>
                    <td className="text-text-3">{p.phone || "-"}</td>
                    <td className="text-text-3">{p.membership_expiry}</td>
                    <td>
                      <Badge variant={p.status === "active" ? "success" : "error"}>
                        {p.status === "active" ? "Hoạt động" : p.status}
                      </Badge>
                    </td>
                    <td>
                      <span className={`text-body-sm ${p.has_face ? "text-success" : "text-text-3"}`}>
                        {p.has_face ? "✓ Đã đăng ký" : "✗ Chưa có"}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button className="btn-ghost px-2.5 py-1 text-body-sm" onClick={() => openEdit(p)}>Sửa</button>
                        <button className="btn-ghost px-2.5 py-1 text-body-sm text-success" onClick={() => handleRenew(p)}>Gia hạn</button>
                        <button className="btn-ghost px-2.5 py-1 text-body-sm text-error" onClick={() => handleDelete(p.id)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeCreate}>
          <div className="bg-surface-2 rounded-2xl w-full max-w-lg mx-4 shadow-2xl border border-border" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-heading-lg text-text">Thêm độc giả mới</h2>
                <button onClick={closeCreate} className="text-text-3 hover:text-text transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-4">
                {([1, 2, 3] as Step[]).map((s, i) => (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      createStep > s ? "bg-success text-bg" : createStep === s ? "bg-primary text-bg" : "bg-surface-3 text-text-3"
                    }`}>
                      {createStep > s ? "✓" : s}
                    </div>
                    <span className={`text-body-sm hidden sm:block ${createStep === s ? "text-text" : "text-text-3"}`}>
                      {s === 1 ? "Thông tin" : s === 2 ? "Khuôn mặt" : "Xác nhận"}
                    </span>
                    {i < 2 && <div className={`flex-1 h-0.5 ${createStep > s ? "bg-success" : "bg-surface-3"}`} />}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-body-sm">{createError}</div>
              )}

              {createStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-body-sm font-medium text-text-2 mb-1.5">Họ tên <span className="text-error">*</span></label>
                    <input value={createForm.full_name}
                      onChange={(e) => { setCreateForm({ ...createForm, full_name: e.target.value }); setCreateError(""); }}
                      placeholder="Nguyễn Văn A" className="input" />
                  </div>
                  <div>
                    <label className="block text-body-sm font-medium text-text-2 mb-1.5">MSSV <span className="text-error">*</span></label>
                    <input value={createForm.student_code}
                      onChange={(e) => { setCreateForm({ ...createForm, student_code: e.target.value }); setCreateError(""); }}
                      placeholder="21001234" className="input font-mono" />
                  </div>
                  <div>
                    <label className="block text-body-sm font-medium text-text-2 mb-1.5">Lớp</label>
                    <input value={createForm.class_name}
                      onChange={(e) => setCreateForm({ ...createForm, class_name: e.target.value })}
                      placeholder="CNTT K61" className="input" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-body-sm font-medium text-text-2 mb-1.5">Ngày cấp thẻ</label>
                      <input type="date" value={createForm.issue_date}
                        onChange={(e) => setCreateForm({ ...createForm, issue_date: e.target.value })} className="input" />
                    </div>
                    <div>
                      <label className="block text-body-sm font-medium text-text-2 mb-1.5">Hạn thẻ</label>
                      <input type="date" value={createForm.membership_expiry}
                        onChange={(e) => setCreateForm({ ...createForm, membership_expiry: e.target.value })} className="input" />
                    </div>
                  </div>
                  <Button onClick={handleCreateStep1} className="w-full">Tiếp tục →</Button>
                </div>
              )}

              {createStep === 2 && (
                <div className="space-y-4">
                  <p className="text-body-sm text-text-3 text-center">Chụp khuôn mặt từ 4 góc để đăng ký nhận diện tại cổng</p>
                  <MultiAngleCapture consent={true} onFilesReady={handleFilesReady} />
                  <button onClick={() => setCreateStep(1)} className="w-full py-2.5 text-text-3 hover:text-text transition-colors text-body-sm">
                    ← Quay lại
                  </button>
                </div>
              )}

              {createStep === 3 && enrollFiles && (
                <div className="space-y-4">
                  <div className="bg-surface-3 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                        <Users size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-text font-semibold">{createForm.full_name}</p>
                        <p className="text-primary font-mono text-sm">{cardNumber}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-body-sm">
                      <div className="text-text-3">MSSV: <span className="text-text">{createForm.student_code}</span></div>
                      <div className="text-text-3">Lớp: <span className="text-text">{createForm.class_name || "-"}</span></div>
                      <div className="text-text-3">Cấp: <span className="text-text">{createForm.issue_date}</span></div>
                      <div className="text-text-3">Hạn: <span className="text-text">{createForm.membership_expiry}</span></div>
                    </div>
                  </div>
                  <Button onClick={handleSubmit} loading={submitting} className="w-full" icon={<Plus size={16} />}>
                    Tạo độc giả
                  </Button>
                  <button onClick={() => setCreateStep(2)} className="w-full py-2.5 text-text-3 hover:text-text transition-colors text-body-sm">
                    ← Quay lại chụp ảnh
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditTarget(null)}>
          <div className="bg-surface-2 rounded-2xl p-6 w-full max-w-md border border-border" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-heading-lg text-text mb-4">Sửa độc giả</h2>
            <div className="space-y-3">
              {([["full_name", "Họ tên"], ["identity_number", "CMND/CCCD"], ["email", "Email"], ["phone", "SĐT"]] as [string, string][]).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-body-sm font-medium text-text-2 mb-1.5">{label}</label>
                  <input className="input"
                    value={(editForm as any)[key] || ""}
                    onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} />
                </div>
              ))}
              <div>
                <label className="block text-body-sm font-medium text-text-2 mb-1.5">Hạn thẻ</label>
                <input type="date" className="input"
                  value={editForm.membership_expiry || ""}
                  onChange={(e) => setEditForm({ ...editForm, membership_expiry: e.target.value })} />
              </div>
              <div>
                <label className="block text-body-sm font-medium text-text-2 mb-1.5">Trạng thái</label>
                <select className="input"
                  value={editForm.status || ""}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="expired">expired</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button onClick={handleEdit} className="flex-1">Lưu</Button>
              <Button variant="ghost" onClick={() => setEditTarget(null)} className="flex-1">Hủy</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}