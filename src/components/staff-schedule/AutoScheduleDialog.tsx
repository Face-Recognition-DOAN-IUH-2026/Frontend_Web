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

function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (from: string, to: string) => void;
  loading?: boolean;
}

export default function AutoScheduleDialog({ open, onClose, onConfirm, loading }: Props) {
  const [selected, setSelected] = useState<number | null>(0);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const options = getQuickOptions();

  const handleConfirm = () => {
    if (useCustom) {
      if (!customFrom || !customTo) return;
      onConfirm(customFrom, customTo);
    } else if (selected !== null) {
      onConfirm(options[selected].from, options[selected].to);
    }
  };

  const selectedCount = useCustom
    ? (customFrom && customTo ? "~" : 0)
    : selected !== null
    ? (() => {
        const from = new Date(options[selected].from);
        const to = new Date(options[selected].to);
        const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return days;
      })()
    : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1.5 }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
          <CalendarTodayIcon sx={{ fontSize: 18, color: "#f59e0b" }} />
        </div>
        Gợi ý lịch tự động
      </DialogTitle>
      <DialogContent>
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

          {(useCustom ? (customFrom && customTo) : selected !== null) && (
            <div className="text-center text-[11px] text-text-3">
              Sẽ tạo lịch cho <span className="font-semibold text-amber-400">{selectedCount} ngày</span>
              {!useCustom && selected !== null && (
                <> từ <span className="text-white">{options[selected].from}</span> đến <span className="text-white">{options[selected].to}</span></>
              )}
            </div>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={loading} sx={{ textTransform: "none" }}>
          Hủy
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={loading || (useCustom ? !customFrom || !customTo : selected === null)}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            bgcolor: "#f59e0b",
            "&:hover": { bgcolor: "#d97706" },
            "&.Mui-disabled": { bgcolor: "action.disabledBackground" },
          }}
        >
          {loading ? "Đang tạo..." : `Tạo tự động (${selectedCount} ngày)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
