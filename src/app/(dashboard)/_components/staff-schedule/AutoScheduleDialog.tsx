"use client";

import { useState, useMemo, useEffect } from "react";
import Modal from "antd/es/modal";
import Button from "antd/es/button";
import Checkbox from "antd/es/checkbox";
import Steps from "antd/es/steps";
import DatePicker from "antd/es/date-picker";
import Tag from "antd/es/tag";
import dayjs from "dayjs";
import { useColorMode } from "@/lib/mui-theme";

const { RangePicker } = DatePicker;

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
    { label: "Tuần này", sub: `${monday.getDate()}/${monday.getMonth() + 1} — ${sunday.getDate()}/${sunday.getMonth() + 1}`, from: toDateInput(monday), to: toDateInput(sunday) },
    { label: "Tuần sau", sub: `${nextMonday.getDate()}/${nextMonday.getMonth() + 1} — ${nextSunday.getDate()}/${nextSunday.getMonth() + 1}`, from: toDateInput(nextMonday), to: toDateInput(nextSunday) },
    { label: "Tháng này", sub: `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`, from: toDateInput(monthStart), to: toDateInput(monthEnd) },
    { label: "Tháng sau", sub: `Tháng ${now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2}/${now.getMonth() + 2 > 12 ? now.getFullYear() + 1 : now.getFullYear()}`, from: toDateInput(nextMonthStart), to: toDateInput(nextMonthEnd) },
    { label: "Năm nay", sub: `${now.getFullYear()}`, from: toDateInput(yearStart), to: toDateInput(yearEnd) },
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
  const { effectiveMode } = useColorMode();
  const isDark = effectiveMode === "dark";
  const [selected, setSelected] = useState<number | null>(0);
  const [useCustom, setUseCustom] = useState(false);
  const [customRange, setCustomRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
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
      if (!customRange || !customRange[0] || !customRange[1]) return;
      onConfirm(customRange[0].format("YYYY-MM-DD"), customRange[1].format("YYYY-MM-DD"));
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
    <Modal
      open={open}
      onCancel={onClose}
      width={step === "preview" ? 640 : 480}
      title={step === "select" ? "Gợi ý lịch tự động" : `Xác nhận tạo ${selectedCount} ca`}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onClose} disabled={loading}>
            {step === "preview" ? "Hủy" : "Đóng"}
          </Button>
          {step === "select" ? (
            <Button
              type="primary"
              onClick={handleSelectConfirm}
              disabled={useCustom ? !customRange || !customRange[0] || !customRange[1] : selected === null}
              style={{ background: "#f59e0b", borderColor: "#f59e0b" }}
            >
              Xem đề xuất
            </Button>
          ) : (
            <Button
              type="primary"
              onClick={handleConfirmFinal}
              loading={loading}
              disabled={selectedCount === 0}
              style={{ background: "#10b981", borderColor: "#10b981" }}
            >
              {loading ? "Đang tạo..." : `Xác nhận tạo ${selectedCount} ca`}
            </Button>
          )}
        </div>
      }
      maskClosable={!loading}
    >
      {step === "select" ? (
        <div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: isDark ? "#B8B0A4" : "#344054", marginBottom: 8 }}>Chọn nhanh:</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {options.map((opt, i) => (
                <div
                  key={i}
                  onClick={() => { setSelected(i); setUseCustom(false); }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: 12, borderRadius: 8,
                    border: `2px solid ${!useCustom && selected === i ? "#f59e0b" : isDark ? "#2E3345" : "#D0D7E2"}`,
                    background: !useCustom && selected === i ? "rgba(245,158,11,0.08)" : isDark ? "rgba(255,255,255,0.03)" : "#F5F7FA",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.75rem", color: !useCustom && selected === i ? "#f59e0b" : isDark ? "#EDE2DF" : "#101828" }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: isDark ? "#B8B0A4" : "#999" }}>
                    {opt.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: isDark ? "#B8B0A4" : "#344054", marginBottom: 8 }}>Hoặc chọn khoảng ngày:</div>
            <div
              onClick={() => { setUseCustom(true); setSelected(null); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: 12, borderRadius: 8,
                border: `2px solid ${useCustom ? "#f59e0b" : isDark ? "#2E3345" : "#D0D7E2"}`,
                background: useCustom ? "rgba(245,158,11,0.08)" : isDark ? "rgba(255,255,255,0.03)" : "#F5F7FA",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <RangePicker
                value={customRange as any}
                onChange={(dates) => {
                  setCustomRange(dates as any);
                  setUseCustom(true);
                  setSelected(null);
                }}
                format="DD/MM/YYYY"
                style={{ flex: 1 }}
                placeholder={["Từ ngày", "Đến ngày"]}
              />
            </div>
          </div>
        </div>
      ) : (
        <div>
          {proposals.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: isDark ? "#B8B0A4" : "#999" }}>
              <div style={{ fontSize: "0.875rem", fontStyle: "italic" }}>Không có đề xuất lịch mới</div>
              <div style={{ fontSize: "0.7rem", marginTop: 4 }}>Tất cả ca đã đủ nhân viên</div>
            </div>
          ) : (
            <>
              {actualRange && (
                <div style={{ fontSize: "0.7rem", color: isDark ? "#B8B0A4" : "#999", textAlign: "center", padding: "6px 12px", borderRadius: 6, background: isDark ? "rgba(255,255,255,0.03)" : "#F5F7FA", border: `1px solid ${isDark ? "#2E3345" : "#D0D7E2"}`, marginBottom: 12 }}>
                  Đề xuất từ <span style={{ color: "#10b981", fontWeight: 600 }}>{formatDisplayDate(actualRange.from)}</span> — <span style={{ color: "#10b981", fontWeight: 600 }}>{formatDisplayDate(actualRange.to)}</span>
                </div>
              )}

              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1, textAlign: "center", padding: 8, borderRadius: 6, background: "rgba(16,185,129,0.1)" }}>
                  <div style={{ fontWeight: 700, color: "#10b981", fontSize: "1rem" }}>{selectedCount}</div>
                  <div style={{ fontSize: "0.6rem", color: isDark ? "#B8B0A4" : "#999" }}>Ca đã chọn</div>
                </div>
                {proposals.length - selectedCount > 0 && (
                  <div style={{ flex: 1, textAlign: "center", padding: 8, borderRadius: 6, background: "rgba(245,158,11,0.1)" }}>
                    <div style={{ fontWeight: 700, color: "#f59e0b", fontSize: "1rem" }}>{proposals.length - selectedCount}</div>
                    <div style={{ fontSize: "0.6rem", color: isDark ? "#B8B0A4" : "#999" }}>Bỏ chọn</div>
                  </div>
                )}
                {skippedCount > 0 && (
                  <div style={{ flex: 1, textAlign: "center", padding: 8, borderRadius: 6, background: "rgba(245,158,11,0.1)" }}>
                    <div style={{ fontWeight: 700, color: "#f59e0b", fontSize: "1rem" }}>{skippedCount}</div>
                    <div style={{ fontSize: "0.6rem", color: isDark ? "#B8B0A4" : "#999" }}>Bỏ qua</div>
                  </div>
                )}
              </div>

              <div style={{ maxHeight: 280, overflowY: "auto" }}>
                <div
                  onClick={toggleAll}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 4,
                    borderRadius: 6, cursor: "pointer", background: isDark ? "rgba(255,255,255,0.03)" : "#F5F7FA", border: `1px solid ${isDark ? "#2E3345" : "#D0D7E2"}`,
                  }}
                >
                  <Checkbox checked={allChecked} indeterminate={selectedCount > 0 && !allChecked} />
                  <span style={{ fontWeight: 600, color: isDark ? "#B8B0A4" : "#344054", fontSize: "0.7rem" }}>
                    {allChecked ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </span>
                </div>

                {displayProposals.map((p, i) => {
                  const checked = checkedSet.has(i);
                  return (
                    <div
                      key={i}
                      onClick={() => toggleRow(i)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 4,
                        borderRadius: 6, cursor: "pointer", transition: "background 0.1s",
                        background: checked ? "rgba(16,185,129,0.05)" : isDark ? "rgba(255,255,255,0.03)" : "#F5F7FA",
                        border: `1px solid ${checked ? "rgba(16,185,129,0.2)" : isDark ? "#2E3345" : "#D0D7E2"}`,
                      }}
                    >
                      <Checkbox checked={checked} />
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.6rem", fontWeight: 700, background: "rgba(16,185,129,0.15)", color: "#10b981", flexShrink: 0,
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: "0.7rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isDark ? "#EDE2DF" : "#101828" }}>
                          {p.staffName || p.staffId.slice(0, 8)}
                        </div>
                        <div style={{ fontSize: "0.6rem", color: isDark ? "#B8B0A4" : "#999" }}>
                          {p.shiftName || "Ca"} — {p.zoneName || "Zone"} — {p.workDate}
                        </div>
                      </div>
                      <Tag color={p.note?.includes("template") ? "blue" : p.note?.includes("preference") ? "purple" : "default"} style={{ fontSize: "0.55rem" }}>
                        {p.note?.includes("template") ? "template" : p.note?.includes("preference") ? "sở thích" : "auto"}
                      </Tag>
                    </div>
                  );
                })}
                {proposals.length > 50 && (
                  <div style={{ textAlign: "center", fontSize: "0.6rem", color: isDark ? "#B8B0A4" : "#999", padding: "6px 0" }}>
                    ... và {proposals.length - 50} ca nữa (tự động chọn)
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
