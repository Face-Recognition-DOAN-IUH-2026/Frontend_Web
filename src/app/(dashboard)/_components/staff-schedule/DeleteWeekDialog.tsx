"use client";

import { useCallback, useEffect, useState } from "react";
import Modal from "antd/es/modal";
import Alert from "antd/es/alert";
import Switch from "antd/es/switch";
import { useColorMode } from "@/lib/mui-theme";
import api from "@/lib/api-client";
import type { StaffScheduleAssignment } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  weekFrom: string;
  weekTo: string;
  affectedCount?: number;
  onDeleted: () => void;
}

function getApiError(err: any): string {
  const data = err?.response?.data;
  return data?.error || data?.message || err?.message || "Có lỗi xảy ra";
}

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function DeleteWeekDialog({ open, onClose, weekFrom, weekTo, affectedCount, onDeleted }: Props) {
  const { effectiveMode } = useColorMode();
  const isDark = effectiveMode === "dark";
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ cancelled: number; skipped: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAffectedCount, setFetchedAffectedCount] = useState<number | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const effectiveFrom = weekFrom < today ? today : weekFrom;
  const isPast = effectiveFrom > weekTo;

  const loadAffectedCount = useCallback(async () => {
    if (!open || isPast) return;
    try {
      const res = await api.getScheduleAssignments({ from: effectiveFrom, to: weekTo });
      const activeAssignments = res.items.filter(
        (a: StaffScheduleAssignment) => a.status !== "cancelled" && a.status !== "completed"
      );
      setFetchedAffectedCount(activeAssignments.length);
    } catch {
      setFetchedAffectedCount(null);
    }
  }, [open, isPast, effectiveFrom, weekTo]);

  useEffect(() => { loadAffectedCount(); }, [loadAffectedCount]);

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
    setFetchedAffectedCount(null);
    onClose();
  };

  const displayCount = affectedCount ?? fetchedAffectedCount;

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={result ? "Đã xóa lịch trực" : "Xóa lịch trực trong tuần"}
      width={440}
      okText={result ? "Đóng" : "Xác nhận xóa"}
      cancelText={result ? undefined : "Hủy bỏ"}
      okButtonProps={result ? {} : { danger: true, loading, onClick: handleConfirm }}
      cancelButtonProps={result ? { style: { display: "none" } } : { disabled: loading }}
      onOk={result ? handleClose : undefined}
      mask={{ closable: !loading }}
    >
      {result ? (
        <div>
          <Alert message={result.message} type="success" showIcon style={{ marginBottom: 8 }} />
          {result.skipped > 0 && (
            <div style={{ fontSize: "0.75rem", color: "#d97706" }}>
              Đã bỏ qua {result.skipped} ca trong quá khứ (không thể hủy).
            </div>
          )}
        </div>
      ) : isPast ? (
        <Alert message="Toàn bộ lịch trong tuần này đã qua. Không có ca nào để hủy." type="warning" showIcon />
      ) : (
        <div>
          <div style={{ padding: 12, borderRadius: 8, border: `1px solid ${isDark ? "#2E3345" : "#D0D7E2"}`, marginBottom: 12, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: "0.75rem", color: isDark ? "#B8B0A4" : "#344054", marginBottom: 4 }}>
              Thao tác này sẽ <span style={{ color: "#ef4444", fontWeight: 700 }}>hủy toàn bộ ca trực</span> từ hôm nay đến cuối tuần:
            </div>
            <div style={{ fontWeight: 600, fontSize: "0.875rem", color: isDark ? "#EDE2DF" : "#101828" }}>
              {effectiveFrom === today && weekFrom < today
                ? `${fmtDate(today)} → ${fmtDate(weekTo)} (các ngày quá khứ đã bỏ qua)`
                : `${fmtDate(weekFrom)} → ${fmtDate(weekTo)}`
              }
            </div>
            <div style={{ fontSize: "0.7rem", color: isDark ? "#B8B0A4" : "#999", marginTop: 6 }}>
              Tất cả yêu cầu đăng ký ca (bids) và đổi ca (swaps) đang chờ duyệt liên quan cũng sẽ bị hủy tự động.
            </div>
          </div>

          {displayCount !== undefined && displayCount !== null && (
            <Alert message={`${displayCount} ca trực sẽ bị ảnh hưởng trong khoảng thời gian này.`} type="info" showIcon style={{ marginBottom: 12 }} />
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Switch checked={notify} onChange={setNotify} size="small" />
            <span style={{ fontSize: "0.75rem", fontWeight: 500 }}>Gửi thông báo hủy lịch đến nhân viên</span>
          </div>

          {notify && (
            <div style={{ fontSize: "0.7rem", color: "#6366f1", background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 6, padding: 8 }}>
              Nhân viên bị ảnh hưởng sẽ nhận thông báo qua hệ thống.
            </div>
          )}

          {error && <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} style={{ marginTop: 12 }} />}
        </div>
      )}
    </Modal>
  );
}
