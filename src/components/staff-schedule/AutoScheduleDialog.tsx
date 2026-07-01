"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, Typography, Box, Checkbox, IconButton, Tooltip,
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import DateRangeIcon from "@mui/icons-material/DateRange";
import YearIcon from "@mui/icons-material/CalendarMonth";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import CloseIcon from "@mui/icons-material/Close";

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
  onConfirmFinal: (selected: ProposedItem[]) => void;
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
  const [checkedSet, setCheckedSet] = useState<Set<number>>(new Set());
  const options = getQuickOptions();

  useEffect(() => {
    if (step === "preview" && proposals.length > 0) {
      const initial = new Set<number>();
      for (let i = 0; i < Math.min(proposals.length, 50); i++) initial.add(i);
      setCheckedSet(initial);
    } else if (step === "select") {
      setCheckedSet(new Set());
    }
  }, [step, proposals.length]);

  const displayProposals = useMemo(() => proposals.slice(0, 50), [proposals]);

  const allChecked = displayProposals.length > 0 && displayProposals.every((_, i) => checkedSet.has(i));
  const selectedCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < displayProposals.length; i++) {
      if (checkedSet.has(i)) count++;
    }
    for (let i = displayProposals.length; i < proposals.length; i++) {
      count++;
    }
    return count;
  }, [checkedSet, displayProposals.length, proposals.length]);

  const toggleAll = () => {
    if (allChecked) {
      setCheckedSet(new Set());
    } else {
      const next = new Set<number>();
      for (let i = 0; i < displayProposals.length; i++) next.add(i);
      setCheckedSet(next);
    }
  };

  const toggleRow = (idx: number) => {
    const next = new Set(checkedSet);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setCheckedSet(next);
  };

  const handleSelectConfirm = () => {
    if (useCustom) {
      if (!customFrom || !customTo) return;
      onConfirm(customFrom, customTo);
    } else if (selected !== null) {
      onConfirm(options[selected].from, options[selected].to);
    }
  };

  const handleConfirmFinal = () => {
    const selectedItems: ProposedItem[] = [];
    for (let i = 0; i < proposals.length; i++) {
      if (i < displayProposals.length) {
        if (checkedSet.has(i)) selectedItems.push(proposals[i]);
      } else {
        selectedItems.push(proposals[i]);
      }
    }
    onConfirmFinal(selectedItems);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth={step === "preview" ? "md" : "sm"} fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ width: 32, height: 32, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: step === "select" ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)" }}>
          {step === "select" ? <CalendarTodayIcon sx={{ fontSize: 18, color: "#f59e0b" }} /> : <CheckCircleIcon sx={{ fontSize: 18, color: "#10b981" }} />}
        </Box>
        {step === "select" ? "Gợi ý lịch tự động" : `Xác nhận tạo ${selectedCount} ca`}
      </DialogTitle>
      <DialogContent>
        {step === "select" ? (
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", mb: 1, display: "block" }}>
                Chọn nhanh:
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
                {options.map((opt, i) => (
                  <Box
                    key={i}
                    onClick={() => { setSelected(i); setUseCustom(false); }}
                    sx={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, p: 1.5, borderRadius: 2,
                      border: "2px solid",
                      borderColor: !useCustom && selected === i ? "#f59e0b" : "rgba(255,255,255,0.08)",
                      bgcolor: !useCustom && selected === i ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.02)",
                      cursor: "pointer", transition: "all 0.15s",
                      "&:hover": { borderColor: "#f59e0b" },
                    }}
                  >
                    <Box sx={{ color: !useCustom && selected === i ? "#f59e0b" : "text.disabled" }}>{opt.icon}</Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.7rem", color: !useCustom && selected === i ? "#f59e0b" : "text.primary" }}>
                      {opt.label}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "text.disabled" }}>
                      {opt.sub}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", mb: 1, display: "block" }}>
                Hoặc chọn khoảng ngày:
              </Typography>
              <Box
                onClick={() => { setUseCustom(true); setSelected(null); }}
                sx={{
                  display: "flex", alignItems: "center", gap: 1, p: 1.5, borderRadius: 2,
                  border: "2px solid",
                  borderColor: useCustom ? "#f59e0b" : "rgba(255,255,255,0.08)",
                  bgcolor: useCustom ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.02)",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                <input
                  type="date" value={customFrom}
                  onChange={(e) => { setCustomFrom(e.target.value); setUseCustom(true); setSelected(null); }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ flex: 1, fontSize: "0.75rem", padding: "4px 8px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "white" }}
                />
                <Typography variant="caption" sx={{ color: "text.disabled" }}>—</Typography>
                <input
                  type="date" value={customTo}
                  onChange={(e) => { setCustomTo(e.target.value); setUseCustom(true); setSelected(null); }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ flex: 1, fontSize: "0.75rem", padding: "4px 8px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "white" }}
                />
              </Box>
            </Box>
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            {proposals.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 3, color: "text.disabled" }}>
                <AssignmentIndIcon sx={{ fontSize: 32, opacity: 0.3, mb: 1 }} />
                <Typography variant="caption" sx={{ fontStyle: "italic", display: "block" }}>Không có đề xuất lịch mới</Typography>
                <Typography variant="caption" sx={{ fontSize: "0.6rem", display: "block", mt: 0.5 }}>Tất cả ca đã đủ nhân viên</Typography>
              </Box>
            ) : (
              <>
                {actualRange ? (
                  <Box sx={{ fontSize: "0.7rem", color: "text.disabled", textAlign: "center", py: 0.5, px: 1, borderRadius: 1, bgcolor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    Đề xuất từ <Box component="span" sx={{ color: "success.main", fontWeight: 600 }}>{formatDisplayDate(actualRange.from)}</Box> — <Box component="span" sx={{ color: "success.main", fontWeight: 600 }}>{formatDisplayDate(actualRange.to)}</Box>
                  </Box>
                ) : null}
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <Box sx={{ flex: 1, textAlign: "center", p: 1, borderRadius: 1, bgcolor: "rgba(16,185,129,0.1)" }}>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: "success.main" }}>{selectedCount}</Typography>
                    <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "text.disabled" }}>Ca đã chọn</Typography>
                  </Box>
                  {proposals.length - selectedCount > 0 ? (
                    <Box sx={{ flex: 1, textAlign: "center", p: 1, borderRadius: 1, bgcolor: "rgba(245,158,11,0.1)" }}>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: "warning.main" }}>{proposals.length - selectedCount}</Typography>
                      <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "text.disabled" }}>Bỏ chọn</Typography>
                    </Box>
                  ) : null}
                  {skippedCount > 0 ? (
                    <Box sx={{ flex: 1, textAlign: "center", p: 1, borderRadius: 1, bgcolor: "rgba(245,158,11,0.1)" }}>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: "warning.main" }}>{skippedCount}</Typography>
                      <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "text.disabled" }}>Bỏ qua</Typography>
                    </Box>
                  ) : null}
                </Box>

                <Box sx={{ maxHeight: 280, overflowY: "auto", "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(255,255,255,0.1)", borderRadius: 2 } }}>
                  <Box
                    onClick={toggleAll}
                    sx={{
                      display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 0.75, mb: 0.5,
                      borderRadius: 1, cursor: "pointer",
                      bgcolor: "rgba(255,255,255,0.03)", border: "1px solid", borderColor: "divider",
                      "&:hover": { bgcolor: "rgba(99,102,241,0.05)" },
                    }}
                  >
                    <Checkbox checked={allChecked} indeterminate={selectedCount > 0 && !allChecked} size="small" sx={{ p: 0.25 }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.7rem" }}>
                      {allChecked ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                    </Typography>
                  </Box>

                  {displayProposals.map((p, i) => {
                    const checked = checkedSet.has(i);
                    return (
                      <Box
                        key={i}
                        onClick={() => toggleRow(i)}
                        sx={{
                          display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, mb: 0.5,
                          borderRadius: 1, cursor: "pointer", transition: "background 0.1s",
                          bgcolor: checked ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.02)",
                          border: "1px solid",
                          borderColor: checked ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)",
                          "&:hover": { bgcolor: checked ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.04)" },
                        }}
                      >
                        <Checkbox checked={checked} size="small" sx={{ p: 0.25 }} />
                        <Box sx={{
                          width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.6rem", fontWeight: 700, bgcolor: "rgba(16,185,129,0.15)", color: "success.main", flexShrink: 0,
                        }}>
                          {i + 1}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" sx={{ fontWeight: 500, color: "text.primary", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.7rem" }}>
                            {p.staffName || p.staffId.slice(0, 8)}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "text.disabled" }}>
                            {p.shiftName || "Ca"} — {p.zoneName || "Zone"} — {p.workDate}
                          </Typography>
                        </Box>
                        <Box sx={{
                          fontSize: "0.55rem", px: 0.75, py: 0.25, borderRadius: 0.5,
                          bgcolor: "rgba(16,185,129,0.1)", color: "success.main", fontWeight: 600, flexShrink: 0,
                        }}>
                          {p.note?.includes("template") ? "template" : p.note?.includes("preference") ? "sở thích" : "auto"}
                        </Box>
                      </Box>
                    );
                  })}
                  {proposals.length > 50 ? (
                    <Typography variant="caption" sx={{ textAlign: "center", display: "block", color: "text.disabled", py: 0.5, fontSize: "0.6rem" }}>
                      ... và {proposals.length - 50} ca nữa (tự động chọn)
                    </Typography>
                  ) : null}
                </Box>
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
            sx={{ textTransform: "none", fontWeight: 600, bgcolor: "#f59e0b", "&:hover": { bgcolor: "#d97706" } }}
          >
            Xem đề xuất
          </Button>
        ) : (
          <Button
            onClick={handleConfirmFinal}
            variant="contained"
            disabled={loading || selectedCount === 0}
            sx={{ textTransform: "none", fontWeight: 600, bgcolor: "#10b981", "&:hover": { bgcolor: "#059669" } }}
          >
            {loading ? "Đang tạo..." : `Xác nhận tạo ${selectedCount} ca`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
