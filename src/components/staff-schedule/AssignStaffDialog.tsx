"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api-client";
import type { ScheduleStaff, StaffShift, LibraryZone, StaffScheduleAssignment } from "@/lib/types";

interface AssignStaffDialogProps {
  open: boolean;
  date: string;
  shiftId: string;
  shiftName: string;
  shifts: StaffShift[];
  zones: LibraryZone[];
  staff: ScheduleStaff[];
  existingAssignments: StaffScheduleAssignment[];
  dayAssignments: StaffScheduleAssignment[];
  onClose: () => void;
  onAssigned: () => void;
}

export default function AssignStaffDialog({
  open,
  date,
  shiftId,
  shiftName,
  shifts,
  zones,
  staff,
  existingAssignments,
  dayAssignments,
  onClose,
  onAssigned,
}: AssignStaffDialogProps) {
  const [zoneId, setZoneId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvedLeaves, setApprovedLeaves] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      api.getScheduleAvailability({ status: "approved" })
        .then(setApprovedLeaves)
        .catch((err) => console.error("Failed to load approved leaves", err));
    }
  }, [open]);

  const shift = useMemo(() => shifts.find((s) => s.id === shiftId), [shifts, shiftId]);

  const existingStaffIds = useMemo(
    () => new Set(existingAssignments.map((a) => a.staffId)),
    [existingAssignments],
  );

  const availableStaff = useMemo(
    () => staff.filter((s) => !existingStaffIds.has(s.id)),
    [staff, existingStaffIds],
  );

  const reset = () => {
    setZoneId("");
    setStaffId("");
    setError(null);
  };

  const handleAssign = async () => {
    if (!zoneId || !staffId) {
      setError("Vui lòng chọn khu vực và nhân viên");
      return;
    }
    const selectedStaff = staff.find((s) => s.id === staffId);
    if (selectedStaff) {
      const isLeave = approvedLeaves.some(
        (l) => l.staffId === staffId && date >= l.dateFrom && date <= l.dateTo
      );
      if (isLeave) {
        setError(`${selectedStaff.fullName || selectedStaff.email} đang trong thời gian nghỉ phép`);
        return;
      }
      const existAsg = dayAssignments.find((a) => a.staffId === staffId);
      if (existAsg) {
        const existShift = shifts.find((sh) => sh.id === existAsg.shiftId);
        const newStart = shift?.startTime?.slice(0, 5);
        const newEnd = shift?.endTime?.slice(0, 5);
        const existStart = existShift?.startTime?.slice(0, 5);
        const existEnd = existShift?.endTime?.slice(0, 5);
        const isOverlap = newStart && newEnd && existStart && existEnd && (newStart < existEnd && newEnd > existStart);
        if (isOverlap) {
          setError(`${selectedStaff.fullName || selectedStaff.email} đã có ca ${existShift?.name || existAsg.shiftId} trùng giờ`);
          return;
        }
      }
    }
    setSaving(true);
    setError(null);
    try {
      await api.createScheduleAssignment({ staffId, shiftId, zoneId, workDate: date });
      reset();
      onAssigned();
    } catch (err: any) {
      const data = err?.response?.data;
      setError(data?.error || data?.message || data?.detail?.[0]?.message || err?.message || "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  const getStaffLabel = (s: ScheduleStaff) => {
    const isLeave = approvedLeaves.some(
      (l) => l.staffId === s.id && date >= l.dateFrom && date <= l.dateTo
    );
    const existAsg = dayAssignments.find((a) => a.staffId === s.id);
    if (isLeave) {
      return `${s.fullName || s.email} (⚠️ Xin nghỉ phép)`;
    }
    if (existAsg) {
      const existShift = shifts.find((sh) => sh.id === existAsg.shiftId);
      const newStart = shift?.startTime?.slice(0, 5);
      const newEnd = shift?.endTime?.slice(0, 5);
      const existStart = existShift?.startTime?.slice(0, 5);
      const existEnd = existShift?.endTime?.slice(0, 5);
      const isOverlap = newStart && newEnd && existStart && existEnd && (newStart < existEnd && newEnd > existStart);
      
      if (isOverlap) {
        return `${s.fullName || s.email} (⚠️ Trùng ca: ${existShift?.name || existAsg.shiftId})`;
      }
      return `${s.fullName || s.email} (Đã có ca: ${existShift?.name || existAsg.shiftId})`;
    }
    return s.fullName || s.email;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface rounded-xl shadow-xl border border-border w-80 p-5 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">Phân ca trực</h3>
          <button onClick={onClose} className="text-text-3 hover:text-text transition text-sm">&times;</button>
        </div>

        <div className="text-xs text-text-3 space-y-0.5">
          <div><span className="font-medium text-text-2">Ngày:</span> {date}</div>
          <div><span className="font-medium text-text-2">Ca:</span> <span className="text-primary">{shiftName}</span></div>
          {shift && (
            <div className="text-text-3">{shift.startTime?.slice(0, 5)} &ndash; {shift.endTime?.slice(0, 5)}</div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-text-3 block mb-1">Khu vực</label>
            <select
              value={zoneId}
              onChange={(e) => { setZoneId(e.target.value); setError(null); }}
              className="w-full px-2.5 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-text focus:outline-none focus:border-primary"
            >
              <option value="">Chọn khu vực</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.zoneName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-text-3 block mb-1">
              Nhân viên
              {availableStaff.length < staff.length && (
                <span className="text-text-3 font-normal ml-1">({staff.length - availableStaff.length} đã xếp)</span>
              )}
            </label>
            <select
              value={staffId}
              onChange={(e) => { setStaffId(e.target.value); setError(null); }}
              className="w-full px-2.5 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-text focus:outline-none focus:border-primary"
            >
              <option value="">Chọn nhân viên</option>
              {availableStaff.map((s) => (
                <option key={s.id} value={s.id}>{getStaffLabel(s)}</option>
              ))}
              {availableStaff.length === 0 && (
                <option disabled>Tất cả nhân viên đã được xếp</option>
              )}
            </select>
          </div>
        </div>

        {error && (
          <div className="text-xs text-error bg-error/10 border border-error/20 rounded-md px-2.5 py-1.5">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-text-2 hover:bg-surface-2 transition border border-border"
          >
            Hủy
          </button>
          <button
            onClick={handleAssign}
            disabled={saving || availableStaff.length === 0}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-bg bg-primary hover:bg-primary-dark transition disabled:opacity-50"
          >
            {saving ? "Đang xử lý..." : "Xếp ca"}
          </button>
        </div>
      </div>
    </div>
  );
}
