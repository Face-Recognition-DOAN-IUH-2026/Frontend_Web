"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api-client";
import type { ManualCheckInRequest, ScheduleStaff } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

function getApiError(err: any): string {
  const data = err?.response?.data;
  return data?.error || data?.message || err?.message || "Có lỗi xảy ra";
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_manual: { label: "Chờ duyệt", color: "#f59e0b" },
  check_in: { label: "Đã check-in", color: "#10b981" },
  check_out: { label: "Đã check-out", color: "#3b82f6" },
  rejected: { label: "Từ chối", color: "#ef4444" },
};

export default function ManualCheckInAdmin({ open, onClose, onUpdated }: Props) {
  const [requests, setRequests] = useState<ManualCheckInRequest[]>([]);
  const [staff, setStaff] = useState<ScheduleStaff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqs, staffList] = await Promise.all([
        api.listManualCheckInRequests(),
        api.getScheduleStaffOptions(),
      ]);
      setRequests(reqs);
      setStaff(staffList);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  const getStaffName = (id: string) => {
    const s = staff.find((x) => x.id === id);
    return s?.fullName || s?.email || "Nhân viên";
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Duyệt check-in thủ công này?")) return;
    setActioningId(id);
    try {
      await api.approveManualCheckIn(id);
      await loadData();
      onUpdated?.();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = rejectReason.trim() || "Từ chối bởi quản lý";
    setActioningId(id);
    try {
      await api.rejectManualCheckIn(id, reason);
      await loadData();
      setRejectingId(null);
      setRejectReason("");
      onUpdated?.();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setActioningId(null);
    }
  };

  const startReject = (id: string) => {
    setRejectingId(id);
    setRejectReason("");
  };

  const cancelReject = () => {
    setRejectingId(null);
    setRejectReason("");
  };

  if (!open) return null;

  const pending = requests.filter((r) => r.status === "pending_manual");
  const others = requests.filter((r) => r.status !== "pending_manual");

  return (
    <div className="fixed inset-0 flex justify-end" style={{ zIndex: 1300 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface w-96 h-full shadow-xl border-l border-border flex flex-col animate-slide-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-serif text-sm font-semibold text-primary">Check-in thủ công</h2>
          <button onClick={onClose} className="text-text-3 hover:text-text transition text-sm">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div className="text-xs text-error bg-error/10 border border-error/20 rounded-md px-2.5 py-1.5">
              {error}
            </div>
          )}

          {loading && (
            <p className="text-xs text-text-3 italic text-center py-4">Đang tải...</p>
          )}

          {!loading && pending.length === 0 && others.length === 0 && (
            <p className="text-xs text-text-3 italic text-center py-4">Không có yêu cầu nào</p>
          )}

          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Chờ duyệt ({pending.length})</p>
              {pending.map((req) => {
                const status = STATUS_LABELS[req.status] || { label: req.status, color: "#6b7280" };
                return (
                  <div key={req.id} className="rounded-lg border border-amber-400/30 bg-amber-500/5 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-text">{getStaffName(req.staffId)}</span>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${status.color}20`, color: status.color }}
                      >
                        {status.label}
                      </span>
                    </div>
                    {req.invalidatedReason && (
                      <div className="text-[11px] text-text-3 italic">Lý do: {req.invalidatedReason.replace("manual_checkin_request:", "")}</div>
                    )}
                    <div className="text-[10px] text-text-3">Giờ check-in: {req.checkInAt ? new Date(req.checkInAt).toLocaleString("vi-VN") : "Chưa"}</div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={actioningId === req.id}
                        className="flex-1 py-1.5 rounded-md text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-50"
                      >
                        {actioningId === req.id ? "..." : "Duyệt"}
                      </button>
                      {rejectingId === req.id ? (
                        <button
                          onClick={cancelReject}
                          className="flex-1 py-1.5 rounded-md text-xs font-medium text-text-2 bg-surface-2 border border-border hover:bg-surface transition"
                        >
                          Hủy
                        </button>
                      ) : (
                        <button
                          onClick={() => startReject(req.id)}
                          disabled={actioningId === req.id}
                          className="flex-1 py-1.5 rounded-md text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-50"
                        >
                          Từ chối
                        </button>
                      )}
                    </div>
                    {rejectingId === req.id ? (
                      <div className="space-y-1.5 pt-1">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Lý do từ chối (không bắt buộc)"
                          className="w-full px-2.5 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-text focus:outline-none focus:border-primary"
                        />
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={actioningId === req.id}
                          className="w-full py-1.5 rounded-md text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-50"
                        >
                          {actioningId === req.id ? "Đang xử lý..." : "Xác nhận từ chối"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {others.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-text-3 uppercase tracking-wider">Đã xử lý</p>
              {others.map((req) => {
                const status = STATUS_LABELS[req.status] || { label: req.status, color: "#6b7280" };
                return (
                  <div key={req.id} className="rounded-lg border border-border bg-surface-2 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-text">{getStaffName(req.staffId)}</span>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${status.color}20`, color: status.color }}
                      >
                        {status.label}
                      </span>
                    </div>
                    {req.invalidatedReason ? (
                      <div className="text-[11px] text-text-3 italic">{req.invalidatedReason.replace("manual_checkin_rejected:", "Từ chối: ").replace("manual_checkin_request:", "")}</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
