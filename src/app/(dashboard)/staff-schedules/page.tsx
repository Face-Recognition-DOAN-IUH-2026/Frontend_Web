"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import CalendarIcon from "@mui/icons-material/CalendarTodayOutlined";
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
import api, { getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { fadeInUp } from "@/lib/animations";
import type { ScheduleStaff, LibraryZone, StaffShift, StaffScheduleAssignment } from "@/lib/types";
import TimetableGrid from "@/components/staff-schedule/TimetableGrid";
import TimetableLegend from "@/components/staff-schedule/TimetableLegend";
import AssignStaffDialog from "@/components/staff-schedule/AssignStaffDialog";
import ScheduleManagementPanel from "@/components/staff-schedule/ScheduleManagementPanel";
import AvailabilityDialog from "@/components/staff-schedule/AvailabilityDialog";
import OpenShiftsPanel from "@/components/staff-schedule/OpenShiftsPanel";
import MySwapsPanel from "@/components/staff-schedule/MySwapsPanel";
import SwapRequestDialog from "@/components/staff-schedule/SwapRequestDialog";
import AutoScheduleDialog from "@/components/staff-schedule/AutoScheduleDialog";
import LeaveApprovalPanel from "@/components/staff-schedule/LeaveApprovalPanel";
import BidsReviewPanel from "@/components/staff-schedule/BidsReviewPanel";
import SwapsViewPanel from "@/components/staff-schedule/SwapsViewPanel";
import AuditLogsPanel from "@/components/staff-schedule/AuditLogsPanel";
import GeofenceConfigPanel from "@/components/staff-schedule/GeofenceConfigPanel";
import TemplateManagementPanel from "@/components/staff-schedule/TemplateManagementPanel";

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
    const active = assignments.filter((a) => a.status === "in_progress").length;
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
      if (count === 0) { setError("Không có đề xuất lịch mới"); setAutoLoading(false); return; }
      for (const item of result.proposed) { await api.createScheduleAssignment(item); }
      await loadData();
    } catch (err) { setError(getErrorMessage(err)); }
    setAutoLoading(false);
  };

  if (!isStaff) {
    return (
      <Box sx={{ minHeight: 300, display: "grid", placeItems: "center" }}>
        <Typography color="text.secondary">Bạn không có quyền xem trang này.</Typography>
      </Box>
    );
  }

  const isCurrentWeek = toDateInput(days[0]) === toDateInput(getWeekDays(new Date())[0]);

  return (
    <Stack spacing={3}>
      {/* ── Gradient Header ── */}
      <Box
        sx={{
          p: 3,
          borderRadius: 3,
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
          border: "1px solid",
          borderColor: "rgba(99,102,241,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box sx={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", bgcolor: "rgba(99,102,241,0.08)", pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -60, left: 200, width: 220, height: 220, borderRadius: "50%", bgcolor: "rgba(99,102,241,0.05)", pointerEvents: "none" }} />

        <Stack direction="row" spacing={2} sx={{ zIndex: 1, alignItems: "center" }}>
          <Avatar sx={{ bgcolor: "rgba(99,102,241,0.3)", width: 52, height: 52, border: "1px solid rgba(99,102,241,0.5)" }}>
            <CalendarIcon sx={{ color: "#a5b4fc", fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#e0e7ff" }}>
              Lịch trực theo tuần
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(199,210,254,0.7)", mt: 0.3 }}>
              {formatDateRange(days)}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ zIndex: 1, flexWrap: "wrap" }}>
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
          {isAdmin && (
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
                <IconButton onClick={() => setShowBidsReview(true)} size="small" sx={{ color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", "&:hover": { bgcolor: "rgba(16,185,129,0.1)" } }}>
                  <ActiveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Đổi ca chờ xử lý">
                <IconButton onClick={() => setShowSwapsView(true)} size="small" sx={{ color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)", "&:hover": { bgcolor: "rgba(59,130,246,0.1)" } }}>
                  <GroupIcon fontSize="small" />
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
              <Tooltip title="Nhật ký">
                <IconButton onClick={() => setShowAuditLogs(true)} size="small" sx={{ color: "#6b7280", border: "1px solid rgba(107,114,128,0.3)", "&:hover": { bgcolor: "rgba(107,114,128,0.1)" } }}>
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          {!isAdmin && (
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
        </Stack>
      </Box>

      {/* ── Stat Cards ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
        {[
          { key: "total", label: "Tổng ca tuần", value: weekStats.total, icon: <TotalIcon sx={{ fontSize: 22 }} />, gradient: STAT_GRADIENT.total, pct: 100 },
          { key: "active", label: "Đang trực", value: weekStats.active, icon: <ActiveIcon sx={{ fontSize: 22 }} />, gradient: STAT_GRADIENT.active, pct: weekStats.total ? (weekStats.active / weekStats.total) * 100 : 0 },
          { key: "staff", label: "Nhân viên", value: staff.length, icon: <StaffIcon sx={{ fontSize: 22 }} />, gradient: STAT_GRADIENT.staff, pct: 100 },
        ].map((s, idx) => (
          <Paper
            key={s.key}
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 3,
              position: "relative",
              overflow: "hidden",
              borderColor: "divider",
              transition: "transform 0.2s, box-shadow 0.2s",
              animation: `${fadeInUp} 0.4s ease-out`,
              animationDelay: `${idx * 0.07}s`,
              animationFillMode: "both",
              "&:hover": { transform: "translateY(-2px)", boxShadow: 4 },
            }}
          >
            <Box sx={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: s.gradient, opacity: 0.12, borderRadius: "0 12px 0 80px" }} />
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
              <Avatar sx={{ background: s.gradient, width: 44, height: 44, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                {s.icon}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {s.label}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  {s.value}
                </Typography>
              </Box>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={s.pct}
              sx={{
                mt: 1.5, height: 3, borderRadius: 2,
                bgcolor: "action.hover",
                "& .MuiLinearProgress-bar": { background: s.gradient, borderRadius: 2 },
              }}
            />
          </Paper>
        ))}
      </Box>

      {/* ── Filter Chips ── */}
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderColor: "divider" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mr: 1, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.7rem" }}>
            Bộ lọc:
          </Typography>
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_, v) => v && setFilter(v)}
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

          {/* Lọc theo Khu vực */}
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

          {/* Lọc theo Ca */}
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
      </Paper>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* ── Timetable Grid ── */}
      {loading ? (
        <Box sx={{ minHeight: 300, display: "grid", placeItems: "center" }}>
          <Stack spacing={2} sx={{ alignItems: "center" }}>
            <CircularProgress sx={{ animation: `${fadeInUp} 0.3s ease-out` }} />
            <Typography variant="body2" color="text.secondary">Đang tải lịch trực...</Typography>
          </Stack>
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
          <TimetableGrid
            days={days}
            shifts={filteredShifts}
            assignments={filteredAssignments}
            filter={filter}
            isAdmin={isAdmin}
            onCellClick={isAdmin ? handleCellClick : undefined}
            onDeleteAssignment={isAdmin ? handleDeleteAssignment : undefined}
          />
        </Paper>
      )}

      {/* ── Legend ── */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderColor: "divider" }}>
        <TimetableLegend />
      </Paper>

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

      {/* ── Staff Panels (non-admin) ── */}
      {!isAdmin && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, borderColor: "divider" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
            Đổi ca chờ xử lý
          </Typography>
          <MySwapsPanel refreshKey={swapRefreshKey} />
        </Paper>
      )}

      {/* ── Admin Panels ── */}
      <LeaveApprovalPanel open={showLeaveApproval} onClose={() => setShowLeaveApproval(false)} onUpdated={loadData} />
      <BidsReviewPanel open={showBidsReview} onClose={() => setShowBidsReview(false)} onUpdated={loadData} />
      <SwapsViewPanel open={showSwapsView} onClose={() => setShowSwapsView(false)} />
      <AuditLogsPanel open={showAuditLogs} onClose={() => setShowAuditLogs(false)} />
      <GeofenceConfigPanel open={showGeofence} onClose={() => setShowGeofence(false)} zones={zones} onUpdated={loadData} />
      <TemplateManagementPanel open={showTemplates} onClose={() => setShowTemplates(false)} zones={zones} shifts={shifts} staff={staff} onUpdated={loadData} />
      <AutoScheduleDialog open={showAutoSchedule} onClose={() => setShowAutoSchedule(false)} onConfirm={handleAutoSchedule} loading={autoLoading} />
    </Stack>
  );
}
