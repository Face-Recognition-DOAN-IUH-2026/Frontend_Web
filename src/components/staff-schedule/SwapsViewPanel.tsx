"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api-client";
import type { ShiftSwap, ScheduleStaff } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

function getApiError(err: any): string {
  const data = err?.response?.data;
  return data?.error || data?.message || err?.message || "Có lỗi xảy ra";
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Chờ xử lý", color: "#f59e0b" },
  accepted: { label: "Đã chấp nhận", color: "#10b981" },
  rejected: { label: "Đã từ chối", color: "#ef4444" },
  cancelled: { label: "Đã hủy", color: "#6b7280" },
  expired: { label: "Hết hạn", color: "#6b7280" },
};

export default function SwapsViewPanel({ open, onClose }: Props) {
  const [swaps, setSwaps] = useState<ShiftSwap[]>([]);
  const [staff, setStaff] = useState<ScheduleStaff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("pending");
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [swapList, staffList] = await Promise.all([
        api.listAllSwaps({ status: filter === "all" ? undefined : filter }),
        api.getScheduleStaffOptions(),
      ]);
      setSwaps(swapList);
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

  const handleRespond = async (id: string, action: "accepted" | "rejected") => {
    if (!confirm(action === "accepted" ? "Chấp nhận yêu cầu đổi ca?" : "Từ chối yêu cầu đổi ca?")) return;
    setRespondingId(id);
    try {
      await api.respondSwap(id, { action });
      await loadData();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setRespondingId(null);
    }
  };

  const getStaffName = (id: string) => {
    const s = staff.find((x) => x.id === id);
    return s?.fullName || s?.email || "Nhân viên";
  };

  const isStale = (swap: ShiftSwap) => {
    const workDate = swap.requesterAssignment?.workDate;
    return workDate && workDate < today;
  };

  const visibleSwaps = filter === "pending"
    ? swaps.filter((s) => !isStale(s))
    : swaps;

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex justify-end" style={{ zIndex: 1300 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface w-96 h-full shadow-xl border-l border-border flex flex-col animate-slide-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-serif text-sm font-semibold text-primary">Yêu cầu đổi ca</h2>
          <button onClick={onClose} className="text-text-3 hover:text-text transition text-sm">&times;</button>
        </div>

        <div className="flex border-b border-border">
          {["pending", "accepted", "rejected", "all"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 text-xs font-medium transition border-b-2 ${
                filter === f
                  ? "border-primary text-primary"
                  : "border-transparent text-text-3 hover:text-text-2"
              }`}
            >
              {f === "pending" ? "Chờ xử lý" : f === "accepted" ? "Chấp nhận" : f === "rejected" ? "Từ chối" : "Tất cả"}
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

          {!loading && visibleSwaps.length === 0 && (
            <p className="text-xs text-text-3 italic text-center py-4">Không có yêu cầu nào</p>
          )}

          {visibleSwaps.map((swap) => {
            const status = STATUS_LABELS[swap.status] || { label: swap.status, color: "#6b7280" };
            const stale = isStale(swap);
            return (
              <div key={swap.id} className="rounded-lg border border-border bg-surface-2 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text">
                    {getStaffName(swap.requesterStaffId)} → {getStaffName(swap.targetStaffId)}
                  </span>
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
                <div className="text-[11px] text-text-2 space-y-1">
                  <div>
                    <span className="font-medium">Yêu cầu:</span>{" "}
                    {swap.requesterAssignment?.shift?.name || "N/A"} — {swap.requesterAssignment?.workDate || ""}
                  </div>
                  {swap.targetAssignment && (
                    <div>
                      <span className="font-medium">Đối tượng:</span>{" "}
                      {swap.targetAssignment.shift?.name || "N/A"} — {swap.targetAssignment.workDate}
                    </div>
                  )}
                </div>
                {swap.reason && (
                  <div className="text-[11px] text-text-3 italic">Lý do: {swap.reason}</div>
                )}
                {swap.responseNote && (
                  <div className="text-[11px] text-text-3 italic">Phản hồi: {swap.responseNote}</div>
                )}
                {swap.status === "pending" && !stale && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleRespond(swap.id, "accepted")}
                      disabled={respondingId === swap.id}
                      className="flex-1 py-1.5 rounded-md text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-50"
                    >
                      {respondingId === swap.id ? "..." : "Chấp nhận"}
                    </button>
                    <button
                      onClick={() => handleRespond(swap.id, "rejected")}
                      disabled={respondingId === swap.id}
                      className="flex-1 py-1.5 rounded-md text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-50"
                    >
                      {respondingId === swap.id ? "..." : "Từ chối"}
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
