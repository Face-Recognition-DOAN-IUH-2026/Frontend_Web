"use client";

import { useState } from "react";
import api from "@/lib/api-client";

interface Props {
  open: boolean;
  onClose: () => void;
  weekFrom: string; // ISO YYYY-MM-DD (Monday of the selected week)
  weekTo: string;   // ISO YYYY-MM-DD (Sunday of the selected week)
  onDeleted: () => void;
}

function getApiError(err: any): string {
  const data = err?.response?.data;
  return data?.error || data?.message || err?.message || "Có lỗi xảy ra";
}

export default function DeleteWeekDialog({ open, onClose, weekFrom, weekTo, onDeleted }: Props) {
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ cancelled: number; skipped: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  // Count future days in the range
  const effectiveFrom = weekFrom < today ? today : weekFrom;
  const isPast = effectiveFrom > weekTo;

  const fmtDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.deleteWeekScheduleAssignments(weekFrom, weekTo, notify);
      setResult(res);
      onDeleted();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-surface rounded-xl shadow-2xl border border-border w-full max-w-sm mx-4 p-5 flex flex-col gap-4 animate-fade-in">

        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">Xóa lịch trực trong tuần</h3>
            <p className="text-xs text-text-3 mt-0.5">
              {fmtDate(weekFrom)} → {fmtDate(weekTo)}
            </p>
          </div>
        </div>

        {/* Result after delete */}
        {result ? (
          <div className="space-y-2">
            <div className="rounded-lg bg-success/10 border border-success/20 px-3 py-2.5 text-xs text-success font-medium">
              ✓ {result.message}
            </div>
            {result.skipped > 0 && (
              <p className="text-[11px] text-text-3">
                ⚠ Đã bỏ qua {result.skipped} ca trong quá khứ (không thể hủy).
              </p>
            )}
            <button
              onClick={handleClose}
              className="w-full py-1.5 rounded-md text-xs font-medium bg-surface-2 border border-border text-text hover:bg-surface-3 transition"
            >
              Đóng
            </button>
          </div>
        ) : (
          <>
            {/* Warning */}
            {isPast ? (
              <div className="rounded-lg bg-warning/10 border border-warning/20 px-3 py-2.5 text-xs text-warning">
                ⚠ Toàn bộ lịch trong tuần này đã qua. Không có ca nào để hủy.
              </div>
            ) : (
              <>
                <div className="rounded-lg bg-surface-2 border border-border px-3 py-2.5 space-y-1 text-xs text-text-2">
                  <p>Thao tác này sẽ <span className="text-error font-semibold">hủy toàn bộ ca trực</span> từ hôm nay đến cuối tuần:</p>
                  <p className="font-medium text-text">
                    {effectiveFrom === today && weekFrom < today
                      ? `${fmtDate(today)} → ${fmtDate(weekTo)} (các ngày quá khứ đã bỏ qua)`
                      : `${fmtDate(weekFrom)} → ${fmtDate(weekTo)}`
                    }
                  </p>
                  <p className="text-[11px] text-text-3 pt-1">
                    Tất cả yêu cầu đăng ký ca (bids) và đổi ca (swaps) đang chờ duyệt liên quan cũng sẽ bị hủy tự động.
                  </p>
                </div>

                {/* Notify toggle */}
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div
                    onClick={() => setNotify((v) => !v)}
                    className={`w-9 h-5 rounded-full border-2 transition flex items-center px-0.5 ${
                      notify ? "bg-primary border-primary" : "bg-surface-3 border-border"
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${notify ? "translate-x-4" : "translate-x-0"}`} />
                  </div>
                  <span className="text-xs text-text">Gửi thông báo hủy lịch đến nhân viên</span>
                </label>

                {notify && (
                  <p className="text-[11px] text-primary/80 bg-primary/5 border border-primary/20 rounded-md px-2.5 py-1.5">
                    ✓ Nhân viên bị ảnh hưởng sẽ nhận thông báo qua hệ thống.
                  </p>
                )}
              </>
            )}

            {error && (
              <div className="text-xs text-error bg-error/10 border border-error/20 rounded-md px-2.5 py-1.5">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleClose}
                disabled={loading}
                className="flex-1 py-1.5 rounded-md text-xs font-medium bg-surface-2 border border-border text-text hover:bg-surface-3 transition disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              {!isPast && (
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 py-1.5 rounded-md text-xs font-medium bg-error hover:bg-error/80 text-white transition disabled:opacity-50"
                >
                  {loading ? "Đang xử lý..." : "Xác nhận xóa"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
