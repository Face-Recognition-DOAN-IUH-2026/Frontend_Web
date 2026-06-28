"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api-client";
import type { StaffAvailabilityRequest, ScheduleStaff } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

function getApiError(err: any): string {
  const data = err?.response?.data;
  return data?.error || data?.message || err?.message || "Có lỗi xảy ra";
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Chờ duyệt", color: "#f59e0b" },
  approved: { label: "Đã duyệt", color: "#10b981" },
  rejected: { label: "Từ chối", color: "#ef4444" },
};

export default function LeaveApprovalPanel({ open, onClose, onUpdated }: Props) {
  const [requests, setRequests] = useState<StaffAvailabilityRequest[]>([]);
  const [staff, setStaff] = useState<ScheduleStaff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("pending");

  const today = new Date().toISOString().slice(0, 10);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqs, staffList] = await Promise.all([
        api.getScheduleAvailability({ status: filter === "all" ? undefined : filter }),
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
  }, [open, filter]);

  const handleApprove = async (id: string) => {
    try {
      await api.approveScheduleAvailability(id);
      await loadData();
      onUpdated();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.rejectScheduleAvailability(id);
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

  const isStale = (req: StaffAvailabilityRequest) => {
    return req.dateTo < today;
  };

  const visibleRequests = filter === "pending"
    ? requests.filter((r) => !isStale(r))
    : requests;

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex justify-end" style={{ zIndex: 1300 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface w-96 h-full shadow-xl border-l border-border flex flex-col animate-slide-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-serif text-sm font-semibold text-primary">Duyệt đơn nghỉ phép</h2>
          <button onClick={onClose} className="text-text-3 hover:text-text transition text-sm">&times;</button>
        </div>

        <div className="flex border-b border-border">
          {["pending", "approved", "rejected", "all"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 text-xs font-medium transition border-b-2 ${
                filter === f
                  ? "border-primary text-primary"
                  : "border-transparent text-text-3 hover:text-text-2"
              }`}
            >
              {f === "pending" ? "Chờ duyệt" : f === "approved" ? "Đã duyệt" : f === "rejected" ? "Từ chối" : "Tất cả"}
            </button>
          ))}
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

          {!loading && visibleRequests.length === 0 && (
            <p className="text-xs text-text-3 italic text-center py-4">Không có đơn nào</p>
          )}

          {visibleRequests.map((req) => {
            const status = STATUS_LABELS[req.status] || { label: req.status, color: "#6b7280" };
            const stale = isStale(req);
            return (
              <div key={req.id} className="rounded-lg border border-border bg-surface-2 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text">{getStaffName(req.staffId)}</span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${status.color}20`, color: status.color }}
                  >
                    {status.label}
                  </span>
                  {stale && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">
                      Quá hạn
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-text-2">
                  <span className="font-medium">Từ:</span> {req.dateFrom} &mdash; <span className="font-medium">Đến:</span> {req.dateTo}
                </div>
                {req.reason && (
                  <div className="text-[11px] text-text-3 italic">Lý do: {req.reason}</div>
                )}
                {req.status === "pending" && !stale && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="flex-1 py-1.5 rounded-md text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition"
                    >
                      Duyệt
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="flex-1 py-1.5 rounded-md text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition"
                    >
                      Từ chối
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
