"use client";

import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Switch, Stack, Alert, Box,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useCallback, useEffect, useState } from "react";
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
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ cancelled: number; skipped: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [affectedCount, setAffectedCount] = useState<number | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const effectiveFrom = weekFrom < today ? today : weekFrom;
  const isPast = effectiveFrom > weekTo;

  const fmtDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  const loadAffectedCount = useCallback(async () => {
    if (!open || isPast) return;
    try {
      const result = await api.getScheduleAssignments({ from: effectiveFrom, to: weekTo });
      const activeAssignments = result.items.filter(
        (a: StaffScheduleAssignment) => a.status !== "cancelled" && a.status !== "completed"
      );
      setAffectedCount(activeAssignments.length);
    } catch {
      setAffectedCount(null);
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
    setAffectedCount(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(239,68,68,0.1)" }}>
          {result ? (
            <CheckCircleIcon sx={{ fontSize: 18, color: "success.main" }} />
          ) : (
            <WarningAmberIcon sx={{ fontSize: 18, color: "error.main" }} />
          )}
        </Box>
        {result ? "Đã xóa lịch trực" : "Xóa lịch trực trong tuần"}
      </DialogTitle>
      <DialogContent>
        {result ? (
          <Stack spacing={1.5}>
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              {result.message}
            </Alert>
            {result.skipped > 0 ? (
              <Typography variant="caption" sx={{ color: "warning.main" }}>
                Đã bỏ qua {result.skipped} ca trong quá khứ (không thể hủy).
              </Typography>
            ) : null}
          </Stack>
        ) : isPast ? (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            Toàn bộ lịch trong tuần này đã qua. Không có ca nào để hủy.
          </Alert>
        ) : (
          <Stack spacing={2}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: "rgba(255,255,255,0.03)", border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
                Thao tác này sẽ <Box component="span" sx={{ color: "error.main", fontWeight: 700 }}>hủy toàn bộ ca trực</Box> từ hôm nay đến cuối tuần:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                {effectiveFrom === today && weekFrom < today
                  ? `${fmtDate(today)} → ${fmtDate(weekTo)} (các ngày quá khứ đã bỏ qua)`
                  : `${fmtDate(weekFrom)} → ${fmtDate(weekTo)}`
                }
              </Typography>
              <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 0.75, fontSize: "0.7rem" }}>
                Tất cả yêu cầu đăng ký ca (bids) và đổi ca (swaps) đang chờ duyệt liên quan cũng sẽ bị hủy tự động.
              </Typography>
            </Box>

            {affectedCount !== undefined ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                {affectedCount} ca trực sẽ bị ảnh hưởng trong khoảng thời gian này.
              </Alert>
            ) : null}

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Switch
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
                size="small"
                sx={{ "& .MuiSwitch-switchBase.MuiChecked": { color: "primary.main" } }}
              />
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                Gửi thông báo hủy lịch đến nhân viên
              </Typography>
            </Box>

            {notify ? (
              <Typography variant="caption" sx={{ color: "primary.main", bgcolor: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 1, p: 1.5, display: "block", fontSize: "0.7rem" }}>
                Nhân viên bị ảnh hưởng sẽ nhận thông báo qua hệ thống.
              </Typography>
            ) : null}

            {error ? (
              <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
            ) : null}
          </Stack>
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
                  {affectedCount !== null && affectedCount > 0 && (
                    <div className="mt-2 p-2 rounded-md bg-error/5 border border-error/20">
                      <p className="text-error font-semibold">
                        {affectedCount} ca trực sẽ bị hủy
                      </p>
                      <p className="text-[11px] text-text-3 mt-1">
                        Hành động này không thể hoàn tác.
                      </p>
                    </div>
                  )}
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
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={loading} sx={{ textTransform: "none" }}>
          {result ? "Đóng" : "Hủy bỏ"}
        </Button>
        {!result && !isPast ? (
          <Button
            onClick={handleConfirm}
            disabled={loading}
            variant="contained"
            color="error"
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {loading ? "Đang xử lý..." : "Xác nhận xóa"}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
