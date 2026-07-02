"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Pagination,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import TuneIcon from "@mui/icons-material/Tune";
import EventIcon from "@mui/icons-material/Event";
import PersonIcon from "@mui/icons-material/Person";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TodayIcon from "@mui/icons-material/Today";
import TimelineIcon from "@mui/icons-material/Timeline";
import SearchIcon from "@mui/icons-material/Search";
import BarChartIcon from "@mui/icons-material/BarChart";
import CloseIcon from "@mui/icons-material/Close";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import InputAdornment from "@mui/material/InputAdornment";
import api from "@/lib/api-client";

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
  "zone.deactivated":                        { label: "Vô hiệu hóa zone",    color: "#ef4444", icon: <TuneIcon sx={{ fontSize: 14 }} />,         category: "config" },
  "shift.deactivated":                       { label: "Vô hiệu hóa ca",      color: "#ef4444", icon: <ScheduleIcon sx={{ fontSize: 14 }} />,     category: "config" },
  "template.deactivated":                    { label: "Vô hiệu hóa mẫu",     color: "#ef4444", icon: <EventIcon sx={{ fontSize: 14 }} />,        category: "config" },
};

const CATEGORY_ACTIONS: Record<string, string[]> = {
  assignment: ["assignment.created", "assignment.confirmed", "assignment.admin_confirmed", "assignment.cancelled", "assignment.cancelled_by_config_delete"],
  attendance: ["attendance.checked_in", "attendance.checked_out", "attendance.auto_checkout", "attendance.admin_fixed", "attendance.removed_orphaned"],
  config: ["zone.deactivated", "shift.deactivated", "template.deactivated"],
};

const CATEGORY_FILTERS = [
  { key: "all",        label: "Tất cả",     icon: <TimelineIcon sx={{ fontSize: 14 }} /> },
  { key: "assignment", label: "Phân ca",    icon: <AssignmentIndIcon sx={{ fontSize: 14 }} /> },
  { key: "attendance", label: "Điểm danh",  icon: <FingerprintIcon sx={{ fontSize: 14 }} /> },
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
  staff_schedule: "Lịch làm việc", zone: "Khu vực",
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

  return (
    <Drawer anchor="right" open={open} onClose={onClose} sx={{ zIndex: 9999 }}>
      <Box sx={{ width: { xs: "100%", sm: 540 }, height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: "divider", background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(165,180,252,0.2)" }}>
              <TimelineIcon sx={{ fontSize: 18, color: "#a5b4fc" }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "common.white" }}>Nhật ký hoạt động</Typography>
              <Typography variant="caption" sx={{ color: "#c7d2fe" }}>
                {groupedLogs.reduce((s, g) => s + g.items.length, 0)} / {total} bản ghi
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton
              size="small"
              onClick={() => setShowStats(!showStats)}
              sx={{ color: "#a5b4fc", bgcolor: showStats ? "rgba(165,180,252,0.3)" : "transparent" }}
            >
              <BarChartIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton size="small" onClick={onClose} sx={{ color: "#c7d2fe" }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Stats Summary */}
        {showStats && (
          <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: "divider", bgcolor: "rgba(99,102,241,0.05)" }}>
            {statsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                <CircularProgress size={16} />
              </Box>
            ) : stats ? (
              <Stack spacing={1}>
                <Stack direction="row" spacing={2}>
                  <Box sx={{ flex: 1, textAlign: "center", p: 1, borderRadius: 1, bgcolor: "rgba(255,255,255,0.05)" }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "#a5b4fc" }}>{stats.totalToday}</Typography>
                    <Typography variant="caption" color="text.secondary">Hôm nay</Typography>
                  </Box>
                  <Box sx={{ flex: 1, textAlign: "center", p: 1, borderRadius: 1, bgcolor: "rgba(255,255,255,0.05)" }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "#a5b4fc" }}>{stats.totalThisWeek}</Typography>
                    <Typography variant="caption" color="text.secondary">Tuần này</Typography>
                  </Box>
                </Stack>
                {stats.topActions?.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                      <TrendingUpIcon sx={{ fontSize: 11 }} /> Top hành động
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }} useFlexGap>
                      {stats.topActions.slice(0, 5).map((a: any) => (
                        <Chip key={a.action} label={`${ACTION_CONFIG[a.action]?.label || a.action} (${a.count})`} size="small" sx={{ height: 22, fontSize: 10, bgcolor: "rgba(255,255,255,0.05)" }} />
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            ) : null}
          </Box>
        )}

        {/* Filter Bar */}
        <Box sx={{ px: 3, py: 1.5, borderBottom: 1, borderColor: "divider", display: "flex", flexDirection: "column", gap: 1.5 }}>
          <TextField
            size="small"
            placeholder="Tìm theo tên nhân viên, metadata..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            fullWidth
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 15 }} /></InputAdornment>,
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch("")}>
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              },
            }}
            sx={{ "& .MuiInputBase-root": { fontSize: "0.8rem" } }}
          />
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              sx={{ flex: 1, "& .MuiInputBase-root": { fontSize: "0.7rem" } }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>—</Typography>
            <TextField
              size="small"
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              sx={{ flex: 1, "& .MuiInputBase-root": { fontSize: "0.7rem" } }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", overflowX: "auto", "&::-webkit-scrollbar": { display: "none" } }}>
            <FilterListIcon sx={{ fontSize: 14, color: "text.secondary", flexShrink: 0 }} />
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
          </Stack>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflowY: "auto" }}>
          {error && (
            <Alert severity="error" sx={{ mx: 3, mt: 2 }}>{error}</Alert>
          )}

          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 4, gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">Đang tải...</Typography>
            </Box>
          )}

          {!loading && logs.length === 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8 }}>
              <TimelineIcon sx={{ fontSize: 32, opacity: 0.3, mb: 1 }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>Không có nhật ký</Typography>
            </Box>
          )}

          {groupedLogs.map((group) => (
            <Box key={group.dateKey}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 3, py: 1, position: "sticky", top: 0, zIndex: 10, bgcolor: "#1e1b2e" }}>
                <TodayIcon sx={{ fontSize: 13, color: "#6366f1" }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {group.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                  {group.items.length} hoạt động
                </Typography>
              </Box>

              <Box sx={{ px: 3 }}>
                {group.items.map((log: any) => {
                  const config = ACTION_CONFIG[log.action] || { label: log.action, color: "#6b7280", icon: <TimelineIcon sx={{ fontSize: 14 }} />, category: "unknown" };
                  const time = log.createdAt ? new Date(log.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";
                  const meta = formatMetadata(log.metadata);

                  return (
                    <Box key={log.id} sx={{ display: "flex", gap: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 }, "&:hover": { bgcolor: "rgba(255,255,255,0.02)" }, borderRadius: 0.5, px: 0.5 }}>
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 0.5, flexShrink: 0 }}>
                        <Box sx={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: `${config.color}18`, color: config.color }}>
                          {config.icon}
                        </Box>
                        <Box sx={{ width: 1, flex: 1, bgcolor: "divider", mt: 0.5 }} />
                      </Box>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: config.color, fontSize: "0.8rem" }}>{config.label}</Typography>
                          {log.entityType && (
                            <Chip label={ENTITY_LABELS[log.entityType] || log.entityType} size="small" sx={{ height: 20, fontSize: 9, bgcolor: "rgba(255,255,255,0.05)" }} />
                          )}
                        </Box>

                        {meta.length > 0 && (
                          <Box sx={{ mt: 0.5, display: "flex", flexWrap: "wrap", gap: "2px 12px" }}>
                            {meta.map((m, i) => (
                              <Typography key={i} variant="caption" sx={{ fontSize: "0.65rem", color: "text.secondary" }}>
                                {m.key}: <Box component="span" sx={{ fontWeight: 500, color: "text.primary" }}>{m.value}</Box>
                              </Typography>
                            ))}
                          </Box>
                        )}

                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                          <ScheduleIcon sx={{ fontSize: 10, color: "text.secondary" }} />
                          <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "text.secondary" }}>{time}</Typography>
                          {log.actorName && (
                            <>
                              <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "text.secondary", mx: 0.5 }}>·</Typography>
                              <PersonIcon sx={{ fontSize: 10, color: "text.secondary" }} />
                              <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>{log.actorName}</Typography>
                            </>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ px: 3, py: 1.5, borderTop: 1, borderColor: "divider", bgcolor: "background.paper", display: "flex", justifyContent: "center" }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => setPage(p)}
              size="small"
              color="primary"
            />
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
