"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api-client";
import { Chip } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import GavelIcon from "@mui/icons-material/Gavel";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import TuneIcon from "@mui/icons-material/Tune";
import EventIcon from "@mui/icons-material/Event";
import PersonIcon from "@mui/icons-material/Person";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TodayIcon from "@mui/icons-material/Today";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import TimelineIcon from "@mui/icons-material/Timeline";
import SearchIcon from "@mui/icons-material/Search";
import BarChartIcon from "@mui/icons-material/BarChart";
import CloseIcon from "@mui/icons-material/Close";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

interface Props {
  open: boolean;
  onClose: () => void;
}

function getApiError(err: any): string {
  const data = err?.response?.data;
  return data?.error || data?.message || err?.message || "Có lỗi xảy ra";
}

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; category: string }> = {
  "assignment.created":                      { label: "Phân ca mới",        color: "#10b981", icon: <AssignmentIndIcon sx={{ fontSize: 14 }} />, category: "assignment" },
  "assignment.confirmed":                    { label: "Xác nhận ca",         color: "#3b82f6", icon: <AssignmentIndIcon sx={{ fontSize: 14 }} />, category: "assignment" },
  "assignment.admin_confirmed":              { label: "Admin xác nhận",      color: "#8b5cf6", icon: <AssignmentIndIcon sx={{ fontSize: 14 }} />, category: "assignment" },
  "assignment.cancelled":                    { label: "Hủy ca",              color: "#ef4444", icon: <AssignmentIndIcon sx={{ fontSize: 14 }} />, category: "assignment" },
  "assignment.cancelled_by_config_delete":   { label: "Hủy (xóa ca/zone)",  color: "#f97316", icon: <AssignmentIndIcon sx={{ fontSize: 14 }} />, category: "assignment" },
  "attendance.checked_in":                   { label: "Check-in",            color: "#10b981", icon: <FingerprintIcon sx={{ fontSize: 14 }} />,   category: "attendance" },
  "attendance.checked_out":                  { label: "Check-out",           color: "#3b82f6", icon: <FingerprintIcon sx={{ fontSize: 14 }} />,   category: "attendance" },
  "attendance.auto_checkout":                { label: "Auto check-out",      color: "#f59e0b", icon: <FingerprintIcon sx={{ fontSize: 14 }} />,   category: "attendance" },
  "attendance.admin_fixed":                  { label: "Admin sửa điểm danh", color: "#8b5cf6", icon: <FingerprintIcon sx={{ fontSize: 14 }} />,   category: "attendance" },
  "attendance.removed_orphaned":             { label: "Xóa attendance mồ côi", color: "#ef4444", icon: <FingerprintIcon sx={{ fontSize: 14 }} />, category: "attendance" },
  "availability.created":                    { label: "Đơn xin nghỉ",        color: "#f59e0b", icon: <EventBusyIcon sx={{ fontSize: 14 }} />,    category: "availability" },
  "availability.approved":                   { label: "Duyệt đơn nghỉ",      color: "#10b981", icon: <EventBusyIcon sx={{ fontSize: 14 }} />,    category: "availability" },
  "availability.rejected":                   { label: "Từ chối đơn nghỉ",    color: "#ef4444", icon: <EventBusyIcon sx={{ fontSize: 14 }} />,    category: "availability" },
  "availability.auto_rejected":              { label: "Tự từ chối (quá hạn)", color: "#6b7280", icon: <EventBusyIcon sx={{ fontSize: 14 }} />,   category: "availability" },
  "availability.approved_cascade_cancel":    { label: "Duyệt + hủy ca liên quan", color: "#f97316", icon: <EventBusyIcon sx={{ fontSize: 14 }} />, category: "availability" },
  "bid.created":                             { label: "Đăng ký bid",         color: "#3b82f6", icon: <GavelIcon sx={{ fontSize: 14 }} />,        category: "bid" },
  "bid.approved":                            { label: "Duyệt bid",           color: "#10b981", icon: <GavelIcon sx={{ fontSize: 14 }} />,        category: "bid" },
  "bid.rejected":                            { label: "Từ chối bid",         color: "#ef4444", icon: <GavelIcon sx={{ fontSize: 14 }} />,        category: "bid" },
  "bid.expired":                             { label: "Bid hết hạn",         color: "#6b7280", icon: <GavelIcon sx={{ fontSize: 14 }} />,        category: "bid" },
  "swap.created":                            { label: "Yêu cầu đổi ca",     color: "#3b82f6", icon: <SwapHorizIcon sx={{ fontSize: 14 }} />,    category: "swap" },
  "swap.accepted":                           { label: "Chấp nhận đổi ca",    color: "#10b981", icon: <SwapHorizIcon sx={{ fontSize: 14 }} />,    category: "swap" },
  "swap.rejected":                           { label: "Từ chối đổi ca",      color: "#ef4444", icon: <SwapHorizIcon sx={{ fontSize: 14 }} />,    category: "swap" },
  "swap.expired":                            { label: "Đổi ca hết hạn",      color: "#6b7280", icon: <SwapHorizIcon sx={{ fontSize: 14 }} />,    category: "swap" },
  "swap.cancelled_by_requester":             { label: "Hủy đổi ca",          color: "#6b7280", icon: <SwapHorizIcon sx={{ fontSize: 14 }} />,    category: "swap" },
  "zone.deactivated":                        { label: "Vô hiệu hóa zone",    color: "#ef4444", icon: <TuneIcon sx={{ fontSize: 14 }} />,         category: "config" },
  "shift.deactivated":                       { label: "Vô hiệu hóa ca",      color: "#ef4444", icon: <ScheduleIcon sx={{ fontSize: 14 }} />,     category: "config" },
  "template.deactivated":                    { label: "Vô hiệu hóa mẫu",     color: "#ef4444", icon: <EventIcon sx={{ fontSize: 14 }} />,        category: "config" },
};

const CATEGORY_ACTIONS: Record<string, string[]> = {
  assignment: ["assignment.created", "assignment.confirmed", "assignment.admin_confirmed", "assignment.cancelled", "assignment.cancelled_by_config_delete"],
  attendance: ["attendance.checked_in", "attendance.checked_out", "attendance.auto_checkout", "attendance.admin_fixed", "attendance.removed_orphaned"],
  availability: ["availability.created", "availability.approved", "availability.rejected", "availability.auto_rejected", "availability.approved_cascade_cancel"],
  bid: ["bid.created", "bid.approved", "bid.rejected", "bid.expired"],
  swap: ["swap.created", "swap.accepted", "swap.rejected", "swap.expired", "swap.cancelled_by_requester"],
  config: ["zone.deactivated", "shift.deactivated", "template.deactivated"],
};

const CATEGORY_FILTERS = [
  { key: "all",        label: "Tất cả",     icon: <TimelineIcon sx={{ fontSize: 14 }} /> },
  { key: "assignment", label: "Phân ca",    icon: <AssignmentIndIcon sx={{ fontSize: 14 }} /> },
  { key: "attendance", label: "Điểm danh",  icon: <FingerprintIcon sx={{ fontSize: 14 }} /> },
  { key: "availability", label: "Xin nghỉ", icon: <EventBusyIcon sx={{ fontSize: 14 }} /> },
  { key: "bid",        label: "Bid",         icon: <GavelIcon sx={{ fontSize: 14 }} /> },
  { key: "swap",       label: "Đổi ca",     icon: <SwapHorizIcon sx={{ fontSize: 14 }} /> },
  { key: "config",     label: "Cấu hình",   icon: <TuneIcon sx={{ fontSize: 14 }} /> },
];

const METADATA_LABELS: Record<string, string> = {
  staffName: "Nhân viên", shiftName: "Ca", zoneName: "Khu vực",
  workDate: "Ngày làm", reason: "Lý do", note: "Ghi chú",
  status: "Trạng thái", previousStatus: "Trạng thái cũ", newStatus: "Trạng thái mới",
  oldStatus: "Trạng thái cũ", targetStaffName: "NV nhận",
  distance: "Khoảng cách", required: "Yêu cầu", timestamp: "Thời gian",
  auto: "Tự động", maxStaff: "Tối đa NV", minStaff: "Tối thiểu NV",
  from: "Từ", to: "Đến", latitude: "Vĩ độ", longitude: "Kinh độ", radius: "Bán kính",
};

const SKIP_META_KEYS = new Set(["staffId", "targetStaffId", "shiftId", "zoneId"]);

function formatMetadata(metadata: Record<string, unknown> | null | undefined): { key: string; value: string }[] {
  if (!metadata || Object.keys(metadata).length === 0) return [];
  const result: { key: string; value: string }[] = [];
  for (const [k, v] of Object.entries(metadata)) {
    if (v === null || v === undefined || SKIP_META_KEYS.has(k)) continue;
    const key = METADATA_LABELS[k] || k;
    const value = typeof v === "object" ? JSON.stringify(v) : String(v);
    result.push({ key, value });
  }
  return result;
}

const ENTITY_LABELS: Record<string, string> = {
  staff_schedule: "Lịch làm việc", staff_availability_request: "Đơn xin nghỉ",
  shift_bid: "Bid ca", shift_swap: "Đổi ca", zone: "Khu vực",
  shift: "Ca", template: "Mẫu lịch", attendance: "Điểm danh",
};

function getDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Hôm nay";
  if (diffDays === 1) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AuditLogsPanel({ open, onClose }: Props) {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const limit = 50;

  const buildFilters = useCallback(() => {
    const f: any = { page, limit };
    if (fromDate) f.fromDate = fromDate;
    if (toDate) f.toDate = toDate;
    if (search.trim()) f.search = search.trim();
    return f;
  }, [page, limit, fromDate, toDate, search]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getAuditLogs(buildFilters());
      setLogs(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [buildFilters]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const s = await api.getAuditStats({ fromDate: fromDate || undefined, toDate: toDate || undefined });
      setStats(s);
    } catch { /* ignore */ } finally {
      setStatsLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    if (open) {
      setPage(1);
      setFilterCategory("all");
      setSearch("");
      setFromDate("");
      setToDate("");
      loadData();
    }
  }, [open]);

  useEffect(() => {
    if (open) loadData();
  }, [page, filterCategory, fromDate, toDate, search]);

  useEffect(() => {
    if (open && showStats) loadStats();
  }, [open, showStats, fromDate, toDate]);

  // client-side category filter + date grouping
  const groupedLogs = (() => {
    const filtered = filterCategory === "all"
      ? logs
      : logs.filter((log) => ACTION_CONFIG[log.action]?.category === filterCategory);
    const map = new Map<string, any[]>();
    for (const log of filtered) {
      const dk = log.createdAt ? getDateKey(log.createdAt) : "unknown";
      if (!map.has(dk)) map.set(dk, []);
      map.get(dk)!.push(log);
    }
    const groups: { label: string; dateKey: string; items: any[] }[] = [];
    for (const [dk, items] of map) {
      groups.push({ label: dk === "unknown" ? "Không rõ" : getRelativeDate(dk), dateKey: dk, items });
    }
    return groups;
  })();

  const totalPages = Math.ceil(total / limit);

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex justify-end" style={{ zIndex: 9999 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface h-full shadow-xl border-l border-border flex flex-col animate-slide-in" style={{ width: 540 }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(165,180,252,0.2)" }}>
              <TimelineIcon sx={{ fontSize: 18, color: "#a5b4fc" }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Nhật ký hoạt động</h2>
              <p className="text-[10px] text-indigo-200">{groupedLogs.reduce((s, g) => s + g.items.length, 0)} / {total} bản ghi</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className="p-1.5 rounded-lg transition"
              style={{ background: showStats ? "rgba(165,180,252,0.3)" : "transparent", color: "#a5b4fc" }}
            >
              <BarChartIcon sx={{ fontSize: 18 }} />
            </button>
            <button onClick={onClose} className="text-indigo-200 hover:text-white transition text-lg leading-none">&times;</button>
          </div>
        </div>

        {/* ── Stats Summary ── */}
        {showStats && (
          <div className="px-4 py-3 border-b border-border" style={{ background: "rgba(99,102,241,0.05)" }}>
            {statsLoading ? (
              <div className="flex items-center justify-center py-2">
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : stats ? (
              <div className="space-y-2">
                <div className="flex gap-3">
                  <div className="flex-1 text-center p-2 rounded-lg bg-white/5">
                    <div className="text-lg font-bold text-indigo-300">{stats.totalToday}</div>
                    <div className="text-[10px] text-text-3">Hôm nay</div>
                  </div>
                  <div className="flex-1 text-center p-2 rounded-lg bg-white/5">
                    <div className="text-lg font-bold text-indigo-300">{stats.totalThisWeek}</div>
                    <div className="text-[10px] text-text-3">Tuần này</div>
                  </div>
                </div>
                {stats.topActions?.length > 0 && (
                  <div>
                    <div className="text-[10px] text-text-3 mb-1 flex items-center gap-1"><TrendingUpIcon sx={{ fontSize: 11 }} /> Top hành động</div>
                    <div className="flex flex-wrap gap-1">
                      {stats.topActions.slice(0, 5).map((a: any) => (
                        <span key={a.action} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-text-2">
                          {ACTION_CONFIG[a.action]?.label || a.action} ({a.count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* ── Filter Bar ── */}
        <div className="px-4 py-2.5 border-b border-border space-y-2">
          {/* Search */}
          <div className="relative">
            <SearchIcon sx={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "text.secondary" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm theo tên nhân viên, metadata..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-2 border border-border rounded-lg text-text placeholder:text-text-3 focus:outline-none focus:border-indigo-400"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-3 hover:text-text">
                <CloseIcon sx={{ fontSize: 14 }} />
              </button>
            )}
          </div>
          {/* Date range */}
          <div className="flex gap-2">
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="flex-1 text-[11px] px-2 py-1 bg-surface-2 border border-border rounded text-text" />
            <span className="text-text-3 self-center text-[10px]">—</span>
            <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="flex-1 text-[11px] px-2 py-1 bg-surface-2 border border-border rounded text-text" />
          </div>
          {/* Category pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <FilterListIcon sx={{ fontSize: 14, color: "text.secondary", mr: 0.5, flexShrink: 0 }} />
            {CATEGORY_FILTERS.map((cat) => (
              <Chip
                key={cat.key}
                icon={cat.icon as any}
                label={cat.label}
                size="small"
                onClick={() => { setFilterCategory(cat.key); setPage(1); }}
                variant={filterCategory === cat.key ? "filled" : "outlined"}
                sx={{
                  height: 26, fontSize: 11, borderRadius: "13px", flexShrink: 0,
                  fontWeight: filterCategory === cat.key ? 700 : 500,
                  bgcolor: filterCategory === cat.key ? "#6366f1" : "transparent",
                  color: filterCategory === cat.key ? "#fff" : "text.secondary",
                  borderColor: filterCategory === cat.key ? "#6366f1" : "divider",
                  "& .MuiChip-icon": { color: filterCategory === cat.key ? "#fff" : "text.secondary", fontSize: 14 },
                  "&:hover": { bgcolor: filterCategory === cat.key ? "#4f46e5" : "action.hover" },
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-4 mt-3 text-xs text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2">{error}</div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-xs text-text-3">Đang tải...</span>
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-text-3">
              <TimelineIcon sx={{ fontSize: 32, opacity: 0.3, mb: 1 }} />
              <p className="text-xs italic">Không có nhật ký</p>
            </div>
          )}

          {groupedLogs.map((group) => (
            <div key={group.dateKey}>
              <div className="flex items-center gap-2 px-5 py-2 sticky top-0 z-10" style={{ background: "#1e1b2e" }}>
                <TodayIcon sx={{ fontSize: 13, color: "#6366f1" }} />
                <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wide">{group.label}</span>
                <span className="text-[10px] text-text-3 ml-auto">{group.items.length} hoạt động</span>
              </div>

              <div className="px-4">
                {group.items.map((log: any) => {
                  const config = ACTION_CONFIG[log.action] || { label: log.action, color: "#6b7280", icon: <TimelineIcon sx={{ fontSize: 14 }} />, category: "unknown" };
                  const time = log.createdAt ? new Date(log.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";
                  const meta = formatMetadata(log.metadata);

                  return (
                    <div key={log.id} className="flex gap-3 py-2.5 border-b border-border/30 last:border-0 group hover:bg-white/[0.02] transition-colors rounded-md px-1 -mx-1">
                      <div className="flex flex-col items-center pt-1 flex-shrink-0">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: `${config.color}18`, color: config.color }}>
                          {config.icon}
                        </div>
                        <div className="w-px flex-1 bg-border/50 mt-1" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold" style={{ color: config.color }}>{config.label}</span>
                          {log.entityType && (
                            <span className="text-[10px] text-text-3 bg-white/5 px-1.5 py-0.5 rounded">
                              {ENTITY_LABELS[log.entityType] || log.entityType}
                            </span>
                          )}
                        </div>

                        {meta.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                            {meta.map((m, i) => (
                              <span key={i} className="text-[10px] text-text-2">
                                <span className="text-text-3">{m.key}:</span>{" "}
                                <span className="font-medium">{m.value}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-1 mt-1">
                          <ScheduleIcon sx={{ fontSize: 10, color: "text.secondary" }} />
                          <span className="text-[10px] text-text-3">{time}</span>
                          {log.actorName && (
                            <>
                              <span className="text-[10px] text-text-3 mx-1">·</span>
                              <PersonIcon sx={{ fontSize: 10, color: "text.secondary" }} />
                              <span className="text-[10px] text-text-2">{log.actorName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-surface">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-xs text-text-3 hover:text-indigo-400 disabled:opacity-30 transition"
            >
              <ArrowBackIosNewIcon sx={{ fontSize: 12 }} /> Trước
            </button>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = page - 2 + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className="w-6 h-6 rounded-full text-[11px] font-medium transition"
                    style={{ background: page === pageNum ? "#6366f1" : "transparent", color: page === pageNum ? "#fff" : "#9ca3af" }}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 text-xs text-text-3 hover:text-indigo-400 disabled:opacity-30 transition"
            >
              Sau <ArrowForwardIosIcon sx={{ fontSize: 12 }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
