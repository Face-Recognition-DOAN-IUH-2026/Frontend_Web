"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import DateRangeIcon from "@mui/icons-material/DateRange";
import YearIcon from "@mui/icons-material/CalendarMonth";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";

function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
}

function getEndOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

interface QuickOption {
  label: string;
  sub: string;
  icon: React.ReactNode;
  from: string;
  to: string;
}

function getQuickOptions(): QuickOption[] {
  const now = new Date();
  const monday = getMonday(now);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = getEndOfMonth(now.getFullYear(), now.getMonth());

  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthEnd = getEndOfMonth(now.getFullYear(), now.getMonth() + 1);

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31);

  return [
    {
      label: "Tuần này",
      sub: `${monday.getDate()}/${monday.getMonth() + 1} — ${sunday.getDate()}/${sunday.getMonth() + 1}`,
      icon: <CalendarTodayIcon sx={{ fontSize: 20 }} />,
      from: toDateInput(monday),
      to: toDateInput(sunday),
    },
    {
      label: "Tuần sau",
      sub: `${nextMonday.getDate()}/${nextMonday.getMonth() + 1} — ${nextSunday.getDate()}/${nextSunday.getMonth() + 1}`,
      icon: <CalendarTodayIcon sx={{ fontSize: 20 }} />,
      from: toDateInput(nextMonday),
      to: toDateInput(nextSunday),
    },
    {
      label: "Tháng này",
      sub: `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`,
      icon: <DateRangeIcon sx={{ fontSize: 20 }} />,
      from: toDateInput(monthStart),
      to: toDateInput(monthEnd),
    },
    {
      label: "Tháng sau",
      sub: `Tháng ${now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2}/${now.getMonth() + 2 > 12 ? now.getFullYear() + 1 : now.getFullYear()}`,
      icon: <DateRangeIcon sx={{ fontSize: 20 }} />,
      from: toDateInput(nextMonthStart),
      to: toDateInput(nextMonthEnd),
    },
    {
      label: "Năm nay",
      sub: `${now.getFullYear()}`,
      icon: <YearIcon sx={{ fontSize: 20 }} />,
      from: toDateInput(yearStart),
      to: toDateInput(yearEnd),
    },
  ];
}

interface ProposedItem {
  staffId: string;
  shiftId: string;
  zoneId: string;
  workDate: string;
  note: string;
  staffName?: string;
  shiftName?: string;
  zoneName?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (from: string, to: string) => void;
  onConfirmFinal: () => void;
  loading?: boolean;
  step: "select" | "preview";
  proposals: ProposedItem[];
  skippedCount: number;
  actualRange?: { from: string; to: string } | null;
}

export default function AutoScheduleDialog({ open, onClose, onConfirm, onConfirmFinal, loading, step, proposals, skippedCount, actualRange }: Props) {
  const [selected, setSelected] = useState<number | null>(0);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const options = getQuickOptions();

  const handleSelectConfirm = () => {
    if (useCustom) {
      if (!customFrom || !customTo) return;
      onConfirm(customFrom, customTo);
    } else if (selected !== null) {
      onConfirm(options[selected].from, options[selected].to);
    }
  };

  const dateRange = useCustom
    ? { from: customFrom, to: customTo }
    : selected !== null
    ? { from: options[selected].from, to: options[selected].to }
    : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1.5 }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
          {step === "select" ? <CalendarTodayIcon sx={{ fontSize: 18, color: "#f59e0b" }} /> : <CheckCircleIcon sx={{ fontSize: 18, color: "#10b981" }} />}
        </div>
        {step === "select" ? "Gợi ý lịch tự động" : `Xác nhận tạo ${proposals.length} ca`}
      </DialogTitle>
      <DialogContent>
        {step === "select" ? (
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <div>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", mb: 1, display: "block" }}>
                Chọn nhanh:
              </Typography>
              <div className="grid grid-cols-3 gap-2">
                {options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelected(i); setUseCustom(false); }}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center"
                    style={{
                      borderColor: !useCustom && selected === i ? "#f59e0b" : "rgba(255,255,255,0.08)",
                      background: !useCustom && selected === i ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <span style={{ color: !useCustom && selected === i ? "#f59e0b" : "#9ca3af" }}>
                      {opt.icon}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: !useCustom && selected === i ? "#f59e0b" : "#e5e7eb" }}>
                      {opt.label}
                    </span>
                    <span className="text-[10px]" style={{ color: "#9ca3af" }}>
                      {opt.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", mb: 1, display: "block" }}>
                Hoặc chọn khoảng ngày:
              </Typography>
              <div
                className="flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all"
                style={{
                  borderColor: useCustom ? "#f59e0b" : "rgba(255,255,255,0.08)",
                  background: useCustom ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.02)",
                }}
                onClick={() => { setUseCustom(true); setSelected(null); }}
              >
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => { setCustomFrom(e.target.value); setUseCustom(true); setSelected(null); }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-xs px-2 py-1.5 bg-transparent border border-white/10 rounded-lg text-white"
                />
                <span className="text-text-3 text-xs">—</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => { setCustomTo(e.target.value); setUseCustom(true); setSelected(null); }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-xs px-2 py-1.5 bg-transparent border border-white/10 rounded-lg text-white"
                />
              </div>
            </div>
          </Stack>
        ) : (
          /* ── Preview Step ── */
          <Stack spacing={2} sx={{ mt: 1 }}>
            {proposals.length === 0 ? (
              <div className="text-center py-6 text-text-3">
                <AssignmentIndIcon sx={{ fontSize: 32, opacity: 0.3, mb: 1 }} />
                <p className="text-xs italic">Không có đề xuất lịch mới</p>
                <p className="text-[10px] text-text-3 mt-1">Tất cả ca đã đủ nhân viên</p>
              </div>
            ) : (
              <>
                {actualRange && (
                  <div className="text-[11px] text-text-3 text-center py-1 px-2 rounded bg-white/[0.03] border border-white/5">
                    Đề xuất từ <span className="text-emerald-400 font-medium">{formatDisplayDate(actualRange.from)}</span> — <span className="text-emerald-400 font-medium">{formatDisplayDate(actualRange.to)}</span>
                  </div>
                )}
                <div className="flex gap-3">
                  <div className="flex-1 text-center p-2 rounded-lg bg-emerald-500/10">
                    <div className="text-lg font-bold text-emerald-400">{proposals.length}</div>
                    <div className="text-[10px] text-text-3">Ca sẽ tạo</div>
                  </div>
                  {skippedCount > 0 && (
                    <div className="flex-1 text-center p-2 rounded-lg bg-amber-500/10">
                      <div className="text-lg font-bold text-amber-400">{skippedCount}</div>
                      <div className="text-[10px] text-text-3">Bỏ qua</div>
                    </div>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {proposals.slice(0, 50).map((p, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium text-text truncate">
                          {p.staffName || p.staffId.slice(0, 8)}
                        </div>
                        <div className="text-[10px] text-text-3">
                          {p.shiftName || "Ca"} — {p.zoneName || "Zone"} — {p.workDate}
                        </div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        {p.note?.includes("template") ? "template" : p.note?.includes("preference") ? "sở thích" : "auto"}
                      </span>
                    </div>
                  ))}
                  {proposals.length > 50 && (
                    <div className="text-center text-[10px] text-text-3 py-1">
                      ... và {proposals.length - 50} ca nữa
                    </div>
                  )}
                </div>
              </>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={loading} sx={{ textTransform: "none" }}>
          {step === "preview" ? "Hủy" : "Đóng"}
        </Button>
        {step === "select" ? (
          <Button
            onClick={handleSelectConfirm}
            variant="contained"
            disabled={useCustom ? !customFrom || !customTo : selected === null}
            sx={{
              textTransform: "none", fontWeight: 600,
              bgcolor: "#f59e0b", "&:hover": { bgcolor: "#d97706" },
            }}
          >
            Xem đề xuất
          </Button>
        ) : (
          <Button
            onClick={onConfirmFinal}
            variant="contained"
            disabled={loading || proposals.length === 0}
            sx={{
              textTransform: "none", fontWeight: 600,
              bgcolor: "#10b981", "&:hover": { bgcolor: "#059669" },
            }}
          >
            {loading ? "Đang tạo..." : `Xác nhận tạo ${proposals.length} ca`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
