"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import PrevIcon from "@mui/icons-material/ArrowBack";
import NextIcon from "@mui/icons-material/ArrowForward";
import TodayIcon from "@mui/icons-material/TodayOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import SettingsIcon from "@mui/icons-material/SettingsOutlined";
import PrintIcon from "@mui/icons-material/PrintOutlined";
import GroupIcon from "@mui/icons-material/GroupsOutlined";
import ActiveIcon from "@mui/icons-material/CheckCircleOutlined";
import TotalIcon from "@mui/icons-material/AssignmentOutlined";
import StaffIcon from "@mui/icons-material/PersonOutlined";
import MapIcon from "@mui/icons-material/PinDropOutlined";
import HistoryIcon from "@mui/icons-material/HistoryOutlined";
import LeaveIcon from "@mui/icons-material/BeachAccessOutlined";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import type { ScheduleStaff, LibraryZone, StaffShift, StaffScheduleAssignment, ManualCheckInRequest } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import MuiStatCard from "@/components/ui/MuiStatCard";
import DashboardCard from "@/components/ui/DashboardCard";
import EmptyState from "@/components/ui/EmptyState";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import TimetableGrid from "@/components/staff-schedule/TimetableGrid";
import TimetableLegend from "@/components/staff-schedule/TimetableLegend";
import AssignStaffDialog from "@/components/staff-schedule/AssignStaffDialog";
import ScheduleManagementPanel from "@/components/staff-schedule/ScheduleManagementPanel";
import AvailabilityDialog from "@/components/staff-schedule/AvailabilityDialog";
import MySwapsPanel from "@/components/staff-schedule/MySwapsPanel";
import SwapRequestDialog from "@/components/staff-schedule/SwapRequestDialog";
import AutoScheduleDialog from "@/components/staff-schedule/AutoScheduleDialog";
import LeaveApprovalPanel from "@/components/staff-schedule/LeaveApprovalPanel";
import BidsReviewPanel from "@/components/staff-schedule/BidsReviewPanel";
import SwapsViewPanel from "@/components/staff-schedule/SwapsViewPanel";
import AuditLogsPanel from "@/components/staff-schedule/AuditLogsPanel";
import GeofenceConfigPanel from "@/components/staff-schedule/GeofenceConfigPanel";
import TemplateManagementPanel from "@/components/staff-schedule/TemplateManagementPanel";
import DeleteWeekDialog from "@/components/staff-schedule/DeleteWeekDialog";
import ManualCheckInAdmin from "@/components/staff-schedule/ManualCheckInAdmin";

const FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang trực" },
  { value: "future", label: "Sắp tới" },
  { value: "past", label: "Đã qua" },
] as const;

const STAT_GRADIENT = {
  total: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
  active: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  staff: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
};

const HEADER_GRADIENT = "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)";

function startOfWeek(date = new Date()) {
  const value = new Date(date);
  const day = value.getDay() || 7;
  value.setDate(value.getDate() - day + 1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function getWeekDays(anchor: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + i);
    return d;
  });
}

function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateRange(days: Date[]) {
  const from = days[0].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  const to = days[6].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${from} — ${to}`;
}

export default function StaffSchedulesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isStaff = !!user;
  const [weekStart, setWeekStart] = useState(startOfWeek);
  const [staff, setStaff] = useState<ScheduleStaff[]>([]);
  const [zones, setZones] = useState<LibraryZone[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [assignments, setAssignments] = useState<StaffScheduleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [zoneFilter, setZoneFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");

  const [showManagement, setShowManagement] = useState(false);
  const [assignDialog, setAssignDialog] = useState<{ date: string; shiftId: string; shiftName: string } | null>(null);
  const [showAvailability, setShowAvailability] = useState(false);
  const [showSwapRequest, setShowSwapRequest] = useState(false);
  const [swapRefreshKey, setSwapRefreshKey] = useState(0);
  const [showLeaveApproval, setShowLeaveApproval] = useState(false);
  const [showBidsReview, setShowBidsReview] = useState(false);
  const [showSwapsView, setShowSwapsView] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [showGeofence, setShowGeofence] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAutoSchedule, setShowAutoSchedule] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoStep, setAutoStep] = useState<"select" | "preview">("select");
  const [autoProposals, setAutoProposals] = useState<any[]>([]);
  const [autoSkipped, setAutoSkipped] = useState(0);
  const [autoActualRange, setAutoActualRange] = useState<{ from: string; to: string } | null>(null);
  const [showDeleteWeek, setShowDeleteWeek] = useState(false);
  const [showManualCheckIn, setShowManualCheckIn] = useState(false);
  const [pendingBidCount, setPendingBidCount] = useState(0);
  const [pendingSwapCount, setPendingSwapCount] = useState(0);
  const [pendingManualCount, setPendingManualCount] = useState(0);

  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const from = toDateInput(days[0]);
  const to = toDateInput(days[6]);

  const loadData = useCallback(async () => {
    if (!isStaff) return;
    setLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        const [staffResult, zoneResult, shiftResult, assignmentResult] = await Promise.all([
          api.getScheduleStaffOptions(),
          api.getScheduleZones(),
          api.getScheduleShifts(),
          api.getScheduleAssignments({ from, to }),
        ]);
        setStaff(staffResult.filter((s) => s.role === "admin" || s.role === "staff"));
        setZones(zoneResult.filter((z) => z.isActive));
        setShifts(shiftResult.filter((s) => s.isActive));
        setAssignments(assignmentResult.items);
      } else {
        const [result, staffResult, shiftResult, zoneResult] = await Promise.all([
          api.getMySchedules({ from, to }),
          api.getScheduleStaffOptions(),
          api.getScheduleShifts(),
          api.getScheduleZones(),
        ]);
        setAssignments(result.items);
        setStaff(staffResult.filter((s) => s.role === "admin" || s.role === "staff"));
        setShifts(shiftResult.filter((s) => s.isActive));
        setZones(zoneResult.filter((z) => z.isActive));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [from, isAdmin, isStaff, to]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!isAdmin) return;
    const loadCounts = async () => {
      try {
        const [bids, swaps, manuals] = await Promise.all([
          api.listAllBids({ status: "pending" }).catch(() => []),
          api.listAllSwaps({ status: "pending" }).catch(() => []),
          api.listManualCheckInRequests().catch(() => []),
        ]);
        setPendingBidCount(bids.length);
        setPendingSwapCount(swaps.length);
        setPendingManualCount(manuals.filter((m: ManualCheckInRequest) => m.status === "pending_manual").length);
      } catch {}
    };
    loadCounts();
    const interval = setInterval(loadCounts, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, loading]);

  const shiftList = useMemo(() => {
    return [...shifts].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  }, [shifts]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (zoneFilter && a.zoneId !== zoneFilter) return false;
      if (shiftFilter && a.shiftId !== shiftFilter) return false;
      return true;
    });
  }, [assignments, zoneFilter, shiftFilter]);

  const filteredShifts = useMemo(() => {
    if (!shiftFilter) return shiftList;
    return shiftList.filter((s) => s.id === shiftFilter);
  }, [shiftList, shiftFilter]);

  const weekStats = useMemo(() => {
    const total = assignments.filter((a) => a.status !== "cancelled").length;
    const today = new Date().toISOString().slice(0, 10);
    const active = assignments.filter((a) => a.status !== "cancelled" && a.workDate === today).length;
    return { total, active };
  }, [assignments]);

  const goPrevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const goNextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const goToday = () => setWeekStart(startOfWeek());

  const handleCellClick = (date: string, shiftId: string) => {
    const shift = shifts.find((s) => s.id === shiftId);
    setAssignDialog({ date, shiftId, shiftName: shift?.name || "" });
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("Xóa ca trực này?")) return;
    try { await api.deleteScheduleAssignment(id); await loadData(); }
    catch (err) { setError(getErrorMessage(err)); }
  };

  const handleAutoSchedule = async (autoFrom: string, autoTo: string) => {
    setAutoLoading(true);
    setError(null);
    try {
      const result = await api.autoSchedule({ from: autoFrom, to: autoTo });
      const count = result.proposed?.length || 0;
      setAutoActualRange(result.actualFrom && result.actualTo ? { from: result.actualFrom, to: result.actualTo } : null);
      if (count === 0) { setAutoProposals([]); setAutoSkipped(result.skipped || 0); setAutoStep("preview"); setAutoLoading(false); return; }
      setAutoProposals(result.proposed);
      setAutoSkipped(result.skipped || 0);
      setAutoStep("preview");
    } catch (err) { setError(getErrorMessage(err)); }
    setAutoLoading(false);
  };

  const handleAutoScheduleConfirm = async () => {
    setAutoLoading(true);
    try {
      await api.createScheduleAssignmentsBulk(autoProposals);
      await loadData();
      setShowAutoSchedule(false);
      setAutoStep("select");
    } catch (err) { setError(getErrorMessage(err)); }
    setAutoLoading(false);
  };

  if (!isStaff) {
    return (
      <EmptyState
        icon={<ScheduleOutlined sx={{ fontSize: 32 }} />}
        title="Không có quyền truy cập"
        description="Bạn không có quyền xem trang này."
      />
    );
  }

  const isCurrentWeek = toDateInput(days[0]) === toDateInput(getWeekDays(new Date())[0]);

  const headerActions = (
    <>
      <Tooltip title="Tuần trước">
        <IconButton onClick={goPrevWeek} size="small" sx={{ color: "#a5b4fc", border: "1px solid rgba(165,180,252,0.3)", "&:hover": { bgcolor: "rgba(165,180,252,0.1)" } }}>
          <PrevIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Button
        onClick={goToday}
        size="small"
        variant={isCurrentWeek ? "contained" : "outlined"}
        startIcon={<TodayIcon sx={{ fontSize: 16 }} />}
        sx={{
          borderRadius: 2,
          fontWeight: 700,
          fontSize: "0.75rem",
          ...(isCurrentWeek
            ? { bgcolor: "#6366f1", "&:hover": { bgcolor: "#4f46e5" } }
            : { color: "#a5b4fc", borderColor: "rgba(165,180,252,0.4)", "&:hover": { borderColor: "#a5b4fc", bgcolor: "rgba(165,180,252,0.08)" } }
          ),
        }}
      >
        Hôm nay
      </Button>
      <Tooltip title="Tuần sau">
        <IconButton onClick={goNextWeek} size="small" sx={{ color: "#a5b4fc", border: "1px solid rgba(165,180,252,0.3)", "&:hover": { bgcolor: "rgba(165,180,252,0.1)" } }}>
          <NextIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {isAdmin ? (
        <>
          <Tooltip title="Gợi ý lịch tự động">
            <IconButton onClick={() => setShowAutoSchedule(true)} size="small" sx={{ color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)", "&:hover": { bgcolor: "rgba(245,158,11,0.1)" } }}>
              <AutoAwesomeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Quản lý ca/khu vực">
            <IconButton onClick={() => setShowManagement(true)} size="small" sx={{ color: "#a5b4fc", border: "1px solid rgba(165,180,252,0.3)", "&:hover": { bgcolor: "rgba(165,180,252,0.1)" } }}>
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Duyệt đơn nghỉ">
            <IconButton onClick={() => setShowLeaveApproval(true)} size="small" sx={{ color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)", "&:hover": { bgcolor: "rgba(245,158,11,0.1)" } }}>
              <LeaveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Duyệt đăng ký ca">
            <IconButton onClick={() => setShowBidsReview(true)} size="small" sx={{ color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", "&:hover": { bgcolor: "rgba(16,185,129,0.1)" }, position: "relative" }}>
              <ActiveIcon fontSize="small" />
              {pendingBidCount > 0 ? (
                <Box sx={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: "50%", bgcolor: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Typography variant="caption" sx={{ color: "#fff", fontSize: "0.6rem", fontWeight: 800, lineHeight: 1 }}>{pendingBidCount > 9 ? "9+" : pendingBidCount}</Typography>
                </Box>
              ) : null}
            </IconButton>
          </Tooltip>
          <Tooltip title="Đổi ca chờ xử lý">
            <IconButton onClick={() => setShowSwapsView(true)} size="small" sx={{ color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)", "&:hover": { bgcolor: "rgba(59,130,246,0.1)" }, position: "relative" }}>
              <GroupIcon fontSize="small" />
              {pendingSwapCount > 0 ? (
                <Box sx={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: "50%", bgcolor: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Typography variant="caption" sx={{ color: "#fff", fontSize: "0.6rem", fontWeight: 800, lineHeight: 1 }}>{pendingSwapCount > 9 ? "9+" : pendingSwapCount}</Typography>
                </Box>
              ) : null}
            </IconButton>
          </Tooltip>
          <Tooltip title="Mẫu lịch">
            <IconButton onClick={() => setShowTemplates(true)} size="small" sx={{ color: "#a5b4fc", border: "1px solid rgba(165,180,252,0.3)", "&:hover": { bgcolor: "rgba(165,180,252,0.1)" } }}>
              <TotalIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Geofence">
            <IconButton onClick={() => setShowGeofence(true)} size="small" sx={{ color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)", "&:hover": { bgcolor: "rgba(245,158,11,0.1)" } }}>
              <MapIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Check-in thủ công">
            <IconButton onClick={() => setShowManualCheckIn(true)} size="small" sx={{ color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.3)", "&:hover": { bgcolor: "rgba(139,92,246,0.1)" }, position: "relative" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 18, height: 18 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              {pendingManualCount > 0 ? (
                <Box sx={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: "50%", bgcolor: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Typography variant="caption" sx={{ color: "#fff", fontSize: "0.6rem", fontWeight: 800, lineHeight: 1 }}>{pendingManualCount > 9 ? "9+" : pendingManualCount}</Typography>
                </Box>
              ) : null}
            </IconButton>
          </Tooltip>
          <Tooltip title="Nhật ký">
            <IconButton onClick={() => setShowAuditLogs(true)} size="small" sx={{ color: "#6b7280", border: "1px solid rgba(107,114,128,0.3)", "&:hover": { bgcolor: "rgba(107,114,128,0.1)" } }}>
              <HistoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Xóa lịch tuần này">
            <IconButton
              onClick={() => setShowDeleteWeek(true)}
              size="small"
              sx={{ color: "#ef4444", border: "1px solid rgba(239,68,68,0.35)", "&:hover": { bgcolor: "rgba(239,68,68,0.1)" } }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 18, height: 18 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </IconButton>
          </Tooltip>
        </>
      ) : (
        <>
          <Tooltip title="Xin nghỉ">
            <IconButton onClick={() => setShowAvailability(true)} size="small" sx={{ color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)", "&:hover": { bgcolor: "rgba(245,158,11,0.1)" } }}>
              <TodayIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Đổi ca">
            <IconButton onClick={() => setShowSwapRequest(true)} size="small" sx={{ color: "#a5b4fc", border: "1px solid rgba(165,180,252,0.3)", "&:hover": { bgcolor: "rgba(165,180,252,0.1)" } }}>
              <GroupIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      )}
      <Tooltip title="In lịch">
        <IconButton onClick={() => window.print()} size="small" sx={{ color: "#a5b4fc", border: "1px solid rgba(165,180,252,0.3)", "&:hover": { bgcolor: "rgba(165,180,252,0.1)" } }}>
          <PrintIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </>
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Lịch trực theo tuần"
        icon={ScheduleOutlined}
        gradient={HEADER_GRADIENT}
        statBadges={formatDateRange(days)}
        onRefresh={loadData}
        actions={headerActions}
      />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
        {[
          { key: "total", label: "Tổng ca tuần", value: weekStats.total, icon: TotalIcon, gradient: STAT_GRADIENT.total, pct: 100 },
          { key: "active", label: "Đang trực", value: weekStats.active, icon: ActiveIcon, gradient: STAT_GRADIENT.active, pct: weekStats.total ? (weekStats.active / weekStats.total) * 100 : 0 },
          { key: "staff", label: "Nhân viên", value: staff.length, icon: StaffIcon, gradient: STAT_GRADIENT.staff, pct: 100 },
        ].map((s, idx) => (
          <Box key={s.key} sx={staggerSx(idx)}>
            <MuiStatCard
              label={s.label}
              value={s.value}
              icon={s.icon}
              gradient={s.gradient}
              pct={s.pct}
              index={idx}
            />
          </Box>
        ))}
      </Box>

      <DashboardCard>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mr: 1, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.7rem" }}>
            Bộ lọc:
          </Typography>
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_, v) => v ? setFilter(v) : undefined}
            size="small"
            sx={{
              "& .MuiToggleButton-root": {
                px: 2, py: 0.6,
                borderRadius: "20px!important",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.78rem",
                border: "1px solid",
                borderColor: "divider",
              },
              gap: 0.5,
            }}
          >
            {FILTERS.map((f) => (
              <ToggleButton key={f.value} value={f.value}>{f.label}</ToggleButton>
            ))}
          </ToggleButtonGroup>

          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "20px",
              border: "1px solid rgba(165,180,252,0.3)",
              backgroundColor: "transparent",
              color: "#a5b4fc",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="" style={{ backgroundColor: "#1e1b4b", color: "#a5b4fc" }}>Tất cả khu vực</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id} style={{ backgroundColor: "#1e1b4b", color: "#a5b4fc" }}>{z.zoneName}</option>
            ))}
          </select>

          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "20px",
              border: "1px solid rgba(165,180,252,0.3)",
              backgroundColor: "transparent",
              color: "#a5b4fc",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="" style={{ backgroundColor: "#1e1b4b", color: "#a5b4fc" }}>Tất cả ca trực</option>
            {shiftList.map((s) => (
              <option key={s.id} value={s.id} style={{ backgroundColor: "#1e1b4b", color: "#a5b4fc" }}>{s.name}</option>
            ))}
          </select>
        </Stack>
      </DashboardCard>

      {error ? (
        <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      <LoadingOverlay loading={loading} message="Đang tải lịch trực...">
        <DashboardCard noPadding>
          <TimetableGrid
            days={days}
            shifts={filteredShifts}
            assignments={filteredAssignments}
            filter={filter}
            isAdmin={isAdmin}
            onCellClick={isAdmin ? handleCellClick : undefined}
            onDeleteAssignment={isAdmin ? handleDeleteAssignment : undefined}
          />
        </DashboardCard>
      </LoadingOverlay>

      <DashboardCard>
        <TimetableLegend />
      </DashboardCard>

      <AssignStaffDialog
        open={!!assignDialog}
        date={assignDialog?.date || ""}
        shiftId={assignDialog?.shiftId || ""}
        shiftName={assignDialog?.shiftName || ""}
        shifts={shiftList}
        zones={zones}
        staff={staff}
        existingAssignments={assignments.filter(
          (a) => a.shiftId === assignDialog?.shiftId && a.workDate === assignDialog?.date && a.status !== "cancelled"
        )}
        dayAssignments={assignments.filter(
          (a) => a.workDate === assignDialog?.date && a.status !== "cancelled"
        )}
        onClose={() => setAssignDialog(null)}
        onAssigned={() => { setAssignDialog(null); loadData(); }}
      />

      <ScheduleManagementPanel
        open={showManagement}
        onClose={() => setShowManagement(false)}
        zones={zones}
        shifts={shiftList}
        onUpdate={loadData}
      />

      <AvailabilityDialog
        open={showAvailability}
        onClose={() => setShowAvailability(false)}
        onSubmitted={() => { setShowAvailability(false); loadData(); }}
      />

      <SwapRequestDialog
        open={showSwapRequest}
        onClose={() => setShowSwapRequest(false)}
        onSubmitted={() => { setShowSwapRequest(false); setSwapRefreshKey((k) => k + 1); loadData(); }}
        myAssignments={assignments}
        allStaff={staff}
      />

      {!isAdmin ? (
        <DashboardCard title="Đổi ca chờ xử lý">
          <MySwapsPanel refreshKey={swapRefreshKey} onError={(msg) => setError(msg)} />
        </DashboardCard>
      ) : null}

      <LeaveApprovalPanel open={showLeaveApproval} onClose={() => setShowLeaveApproval(false)} onUpdated={loadData} />
      <BidsReviewPanel open={showBidsReview} onClose={() => setShowBidsReview(false)} onUpdated={loadData} />
      <SwapsViewPanel open={showSwapsView} onClose={() => setShowSwapsView(false)} onUpdated={loadData} />
      <AuditLogsPanel open={showAuditLogs} onClose={() => setShowAuditLogs(false)} />
      <GeofenceConfigPanel open={showGeofence} onClose={() => setShowGeofence(false)} zones={zones} onUpdated={loadData} />
      <TemplateManagementPanel open={showTemplates} onClose={() => setShowTemplates(false)} zones={zones} shifts={shifts} staff={staff} onUpdated={loadData} />
      <AutoScheduleDialog
        open={showAutoSchedule}
        onClose={() => { setShowAutoSchedule(false); setAutoStep("select"); }}
        onConfirm={handleAutoSchedule}
        onConfirmFinal={handleAutoScheduleConfirm}
        loading={autoLoading}
        step={autoStep}
        proposals={autoProposals}
        skippedCount={autoSkipped}
        actualRange={autoActualRange}
      />
      <ManualCheckInAdmin
        open={showManualCheckIn}
        onClose={() => setShowManualCheckIn(false)}
        onUpdated={() => { loadData(); }}
      />
      <DeleteWeekDialog
        open={showDeleteWeek}
        onClose={() => setShowDeleteWeek(false)}
        weekFrom={from}
        weekTo={to}
        onDeleted={loadData}
      />
    </Stack>
  );
}
