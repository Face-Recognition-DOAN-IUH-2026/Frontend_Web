"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api-client";
import type { LibraryZone, StaffShift, ScheduleStaff } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  zones: LibraryZone[];
  shifts: StaffShift[];
  staff: ScheduleStaff[];
  onUpdated: () => void;
}

function getApiError(err: any): string {
  const data = err?.response?.data;
  return data?.error || data?.message || err?.message || "Có lỗi xảy ra";
}

const DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export default function TemplateManagementPanel({ open, onClose, zones, shifts, staff, onUpdated }: Props) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([1]);
  const [shiftId, setShiftId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await api.getScheduleTemplates();
      setTemplates(result);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim() || !shiftId || !zoneId || !staffId || selectedDays.length === 0) {
      setError("Vui lòng điền tên mẫu, chọn ca trực, khu vực, nhân viên và ít nhất 1 ngày trong tuần");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      for (const day of selectedDays) {
        await api.createScheduleTemplate({
          name: name.trim(),
          dayOfWeek: day,
          shiftId,
          zoneId,
          staffId,
          validFrom: validFrom || undefined,
          validTo: validTo || undefined,
        });
      }
      setName(""); setShiftId(""); setZoneId(""); setStaffId(""); setValidFrom(""); setValidTo("");
      setSelectedDays([1]);
      await loadData();
      onUpdated();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa mẫu lịch này?")) return;
    try {
      await api.deleteScheduleTemplate(id);
      await loadData();
      onUpdated();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const getStaffName = (id: string) => {
    const s = staff.find((x) => x.id === id);
    return s?.fullName || s?.email || "Nhân viên";
  };
  const getShiftName = (id: string) => shifts.find((s) => s.id === id)?.name || "Ca";
  const getZoneName = (id: string) => zones.find((z) => z.id === id)?.zoneName || "Khu vực";

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex justify-end" style={{ zIndex: 1300 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface w-96 h-full shadow-xl border-l border-border flex flex-col animate-slide-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-serif text-sm font-semibold text-primary">Mẫu lịch tự động</h2>
          <button onClick={onClose} className="text-text-3 hover:text-text transition text-sm">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="text-xs text-error bg-error/10 border border-error/20 rounded-md px-2.5 py-1.5">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-text focus:outline-none focus:border-primary placeholder:text-text-3/50"
              placeholder="Tên mẫu (vd: Ca sáng T2-T6)"
            />
            <div className="space-y-1">
              <div className="flex gap-1 justify-between">
                {DAYS.map((d, i) => {
                  const selected = selectedDays.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedDays(prev =>
                          prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
                        );
                      }}
                      className={`flex-1 py-1 rounded text-[11px] font-semibold border transition text-center ${
                        selected
                          ? "bg-primary border-primary text-bg"
                          : "bg-surface-2 border-border text-text-2 hover:bg-surface-3"
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            <select
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              className="w-full px-2 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-text focus:outline-none focus:border-primary"
            >
              <option value="">Chọn ca trực</option>
              {shifts.filter((s) => s.isActive).map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.startTime?.slice(0, 5)}-{s.endTime?.slice(0, 5)})</option>
              ))}
            </select>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="w-full px-2 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-text focus:outline-none focus:border-primary"
            >
              <option value="">Chọn khu vực</option>
              {zones.filter((z) => z.isActive).map((z) => (
                <option key={z.id} value={z.id}>{z.zoneName} (Tầng {z.floor})</option>
              ))}
            </select>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full px-2 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-text focus:outline-none focus:border-primary"
            >
              <option value="">Chọn nhân viên</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName || s.email}</option>
              ))}
            </select>
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-medium text-text-3 block">Thời hạn áp dụng</label>
              <div className="flex gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setValidFrom("");
                    setValidTo("");
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] border transition ${
                    !validFrom && !validTo
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-surface-2 border-border text-text-2 hover:bg-surface-3"
                  }`}
                >
                  Vô thời hạn (Tất cả)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const y = now.getFullYear();
                    const m = now.getMonth();
                    const first = new Date(y, m, 1);
                    const last = new Date(y, m + 1, 0);
                    setValidFrom(first.toISOString().split("T")[0]);
                    setValidTo(last.toISOString().split("T")[0]);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] border transition ${
                    validFrom && validTo && validFrom.startsWith(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-surface-2 border-border text-text-2 hover:bg-surface-3"
                  }`}
                >
                  Tháng này
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const y = now.getFullYear();
                    const m = now.getMonth();
                    const first = new Date(y, m + 1, 1);
                    const last = new Date(y, m + 2, 0);
                    setValidFrom(first.toISOString().split("T")[0]);
                    setValidTo(last.toISOString().split("T")[0]);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] border transition ${
                    validFrom && validTo && validFrom.startsWith(`${new Date().getFullYear()}-${String(new Date().getMonth() + 2).padStart(2, '0')}`)
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-surface-2 border-border text-text-2 hover:bg-surface-3"
                  }`}
                >
                  Tháng sau
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-md bg-surface-2 border border-border text-[11px] text-text focus:outline-none focus:border-primary"
                  placeholder="Từ ngày"
                />
                <input
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-md bg-surface-2 border border-border text-[11px] text-text focus:outline-none focus:border-primary"
                  placeholder="Đến ngày"
                />
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="w-full py-1.5 rounded-md text-xs font-medium text-bg bg-primary hover:bg-primary-dark transition disabled:opacity-50"
            >
              {saving ? "Đang tạo..." : "Thêm mẫu"}
            </button>
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-[11px] text-text-3 font-medium uppercase tracking-wide">Đã tạo ({templates.length})</p>
            {loading && <p className="text-xs text-text-3 italic">Đang tải...</p>}
            {!loading && templates.length === 0 && (
              <p className="text-xs text-text-3 italic">Chưa có mẫu nào</p>
            )}
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-surface-2 border border-border">
                <div>
                  <div className="text-xs font-medium text-text">{t.name}</div>
                  <div className="text-[10px] text-text-3">
                    {DAYS[t.dayOfWeek]} &middot; {getShiftName(t.shiftId)} &middot; {getZoneName(t.zoneId)}
                  </div>
                  <div className="text-[10px] text-text-3">
                    {getStaffName(t.staffId)}
                    {t.validFrom ? ` (${t.validFrom} → ${t.validTo || "..."})` : " (Vô thời hạn)"}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-error/60 hover:text-error transition text-xs"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
