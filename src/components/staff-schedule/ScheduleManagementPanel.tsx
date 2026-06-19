"use client";

import { useState } from "react";
import api from "@/lib/api-client";
import type { LibraryZone, StaffShift } from "@/lib/types";

interface ScheduleManagementPanelProps {
  open: boolean;
  onClose: () => void;
  zones: LibraryZone[];
  shifts: StaffShift[];
  onUpdate: () => void;
}

function getApiError(err: any): string {
  const data = err?.response?.data;
  return data?.error || data?.message || err?.message || "Có lỗi xảy ra";
}

export default function ScheduleManagementPanel({
  open, onClose, zones, shifts, onUpdate,
}: ScheduleManagementPanelProps) {
  const [tab, setTab] = useState<"zones" | "shifts">("zones");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [zoneFloor, setZoneFloor] = useState("1");
  const [zoneName, setZoneName] = useState("");

  const [shiftName, setShiftName] = useState("");
  const [startTime, setStartTime] = useState("07:30");
  const [endTime, setEndTime] = useState("11:30");
  const [minStaff, setMinStaff] = useState("1");

  const handleCreateZone = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.createScheduleZone({ floor: Number(zoneFloor) || 1, zoneName: zoneName.trim() || `Tầng ${zoneFloor}` });
      setZoneName("");
      onUpdate();
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (!confirm("Xóa khu vực này?")) return;
    setSaving(true);
    try {
      await api.deleteScheduleZone(id);
      onUpdate();
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateShift = async () => {
    if (!shiftName.trim()) { setError("Vui lòng nhập tên ca"); return; }
    setSaving(true);
    setError(null);
    try {
      await api.createScheduleShift({
        name: shiftName.trim(),
        startTime, endTime,
        minStaff: Math.max(1, Number(minStaff) || 1),
      });
      setShiftName("");
      onUpdate();
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm("Xóa ca trực này?")) return;
    setSaving(true);
    try {
      await api.deleteScheduleShift(id);
      onUpdate();
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const createDefaults = async () => {
    setSaving(true);
    setError(null);
    try {
      if (!zones.length) {
        await Promise.all([
          api.createScheduleZone({ floor: 1, zoneName: "Tầng 1" }),
          api.createScheduleZone({ floor: 2, zoneName: "Tầng 2" }),
        ]);
      }
      if (!shifts.length) {
        await Promise.all([
          api.createScheduleShift({ name: "Ca sáng", startTime: "07:30", endTime: "11:30", minStaff: 1 }),
          api.createScheduleShift({ name: "Ca chiều", startTime: "13:00", endTime: "17:00", minStaff: 1 }),
          api.createScheduleShift({ name: "Ca tối", startTime: "17:30", endTime: "20:30", minStaff: 1 }),
        ]);
      }
      onUpdate();
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface w-80 h-full shadow-xl border-l border-border flex flex-col animate-slide-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-serif text-sm font-semibold text-primary">Quản lý lịch trực</h2>
          <button onClick={onClose} className="text-text-3 hover:text-text transition text-sm">&times;</button>
        </div>

        <div className="flex border-b border-border">
          <button
            onClick={() => setTab("zones")}
            className={`flex-1 py-2 text-xs font-medium transition border-b-2 ${
              tab === "zones"
                ? "border-primary text-primary"
                : "border-transparent text-text-3 hover:text-text-2"
            }`}
          >
            Khu vực
          </button>
          <button
            onClick={() => setTab("shifts")}
            className={`flex-1 py-2 text-xs font-medium transition border-b-2 ${
              tab === "shifts"
                ? "border-primary text-primary"
                : "border-transparent text-text-3 hover:text-text-2"
            }`}
          >
            Ca trực
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="text-xs text-error bg-error/10 border border-error/20 rounded-md px-2.5 py-1.5">
              {error}
            </div>
          )}

          {tab === "zones" && (
            <>
              <div className="space-y-2">
                {zones.length === 0 && (
                  <p className="text-xs text-text-3 italic">Chưa có khu vực nào</p>
                )}
                {zones.map((z) => (
                  <div key={z.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-surface-2 border border-border">
                    <div>
                      <div className="text-xs font-medium text-text">{z.zoneName}</div>
                      <div className="text-[10px] text-text-3">Tầng {z.floor}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteZone(z.id)}
                      className="text-error/60 hover:text-error transition text-xs"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={1}
                    value={zoneFloor}
                    onChange={(e) => setZoneFloor(e.target.value)}
                    className="w-16 px-2 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-text focus:outline-none focus:border-primary"
                    placeholder="Tầng"
                  />
                  <input
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-text focus:outline-none focus:border-primary placeholder:text-text-3/50"
                    placeholder="Tên khu vực"
                  />
                  <button
                    onClick={handleCreateZone}
                    disabled={saving}
                    className="px-2.5 py-1.5 rounded-md text-xs font-medium text-bg bg-primary hover:bg-primary-dark transition disabled:opacity-50"
                  >
                    Thêm
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === "shifts" && (
            <>
              <div className="space-y-2">
                {shifts.length === 0 && (
                  <p className="text-xs text-text-3 italic">Chưa có ca trực nào</p>
                )}
                {shifts.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-surface-2 border border-border">
                    <div>
                      <div className="text-xs font-medium text-text">{s.name}</div>
                      <div className="text-[10px] text-text-3">
                        {s.startTime?.slice(0, 5)}-{s.endTime?.slice(0, 5)} &middot; {s.minStaff} NV
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteShift(s.id)}
                      className="text-error/60 hover:text-error transition text-xs"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <input
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-text focus:outline-none focus:border-primary placeholder:text-text-3/50"
                  placeholder="Tên ca (vd: Ca sáng)"
                />
                <div className="flex gap-1.5">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-text focus:outline-none focus:border-primary"
                  />
                  <span className="text-xs text-text-3 self-center">&ndash;</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-text focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-text-3 whitespace-nowrap">Số NV tối thiểu:</label>
                  <input
                    type="number"
                    min={1}
                    value={minStaff}
                    onChange={(e) => setMinStaff(e.target.value)}
                    className="w-16 px-2 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-text focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={handleCreateShift}
                    disabled={saving}
                    className="ml-auto px-2.5 py-1.5 rounded-md text-xs font-medium text-bg bg-primary hover:bg-primary-dark transition disabled:opacity-50"
                  >
                    Thêm
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border">
          <button
            onClick={createDefaults}
            disabled={saving}
            className="w-full py-2 rounded-md text-xs font-medium text-text-2 bg-surface-2 hover:bg-surface-3 transition disabled:opacity-50"
          >
            {saving ? "Đang xử lý..." : "Tạo mẫu (2 khu vực + 3 ca)"}
          </button>
        </div>
      </div>
    </div>
  );
}
