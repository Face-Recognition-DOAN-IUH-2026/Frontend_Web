"use client";

import { useState, useMemo } from "react";
import { Alert, Box, Button, Divider, IconButton, MenuItem, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import PrevIcon from "@mui/icons-material/ArrowBack";
import NextIcon from "@mui/icons-material/ArrowForward";
import TodayIcon from "@mui/icons-material/TodayOutlined";
import PrintIcon from "@mui/icons-material/PrintOutlined";
import ActiveIcon from "@mui/icons-material/CheckCircleOutlined";
import TotalIcon from "@mui/icons-material/AssignmentOutlined";
import StaffIcon from "@mui/icons-material/PersonOutlined";
import MapIcon from "@mui/icons-material/PinDropOutlined";
import HistoryIcon from "@mui/icons-material/HistoryOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import SettingsIcon from "@mui/icons-material/SettingsOutlined";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import { useAuth } from "@/lib/auth-context";
import { usePermission } from "@/lib/permission-context";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import { useScheduleData, formatDateRange } from "@/hooks/useScheduleData";
import { useScheduleFilters } from "@/hooks/useScheduleFilters";
import { useAutoSchedule } from "@/hooks/useAutoSchedule";
import api, { getErrorMessage } from "@/lib/api-client";
import type { StaffScheduleAssignment } from "@/lib/types";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import MuiStatCard from "@/app/(dashboard)/_components/ui/MuiStatCard";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import TimetableGrid from "@/app/(dashboard)/_components/staff-schedule/TimetableGrid";
import TimetableLegend from "@/app/(dashboard)/_components/staff-schedule/TimetableLegend";
import AssignStaffDialog from "@/app/(dashboard)/_components/staff-schedule/AssignStaffDialog";
import ScheduleManagementPanel from "@/app/(dashboard)/_components/staff-schedule/ScheduleManagementPanel";
import AutoScheduleDialog from "@/app/(dashboard)/_components/staff-schedule/AutoScheduleDialog";
import AuditLogsPanel from "@/app/(dashboard)/_components/staff-schedule/AuditLogsPanel";
import GeofenceConfigPanel from "@/app/(dashboard)/_components/staff-schedule/GeofenceConfigPanel";
import TemplateManagementPanel from "@/app/(dashboard)/_components/staff-schedule/TemplateManagementPanel";
import DeleteWeekDialog from "@/app/(dashboard)/_components/staff-schedule/DeleteWeekDialog";
import MyShiftPanel from "@/app/(dashboard)/_components/staff-schedule/MyShiftPanel";
import CheckInMapModal from "@/app/(dashboard)/_components/staff-schedule/CheckInMapModal";
import ScheduleFilterBar from "@/app/(dashboard)/_components/staff-schedule/ScheduleFilterBar";
import UndoSnackbar from "@/app/_components/UndoSnackbar";
import useUndo from "@/lib/hooks/useUndo";
import { useToast } from "@/lib/toast-context";

const STAT_GRADIENT = {
  total: "linear-gradient(135deg, #0A2540 0%, #0F3C5C 100%)",
  active: "linear-gradient(135deg, #059669 0%, #047857 100%)",
  staff: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
};

export default function StaffSchedulesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { can } = usePermission();
  const isAdmin = user?.role === "admin";
  const isStaff = !!user;

  // Quyền thao tác lịch: Admin toàn quyền, hoặc nhân viên được cấp quyền riêng qua RBAC
  const canCreate = isAdmin || can("schedules", "create");
  const canUpdate = isAdmin || can("schedules", "update");
  const canDelete = isAdmin || can("schedules", "delete");
  const canManage = isAdmin || canCreate || canUpdate || canDelete;

  const {
    staff, zones, shifts, assignments, loading, error, setError,
    weekStart, days, from, to,
    goPrevWeek, goNextWeek, goToday, loadData,
  } = useScheduleData(canManage);

  const {
    filter, zoneFilter, shiftFilter,
    setFilter, setZoneFilter, setShiftFilter,
    shiftList, filteredAssignments, filteredShifts, weekStats,
  } = useScheduleFilters(assignments, shifts, staff, zones);


  const auto = useAutoSchedule(loadData, setError);

  const [showManagement, setShowManagement] = useState(false);
  const [assignDialog, setAssignDialog] = useState<{ date: string; shiftId: string; shiftName: string } | null>(null);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [showGeofence, setShowGeofence] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showDeleteWeek, setShowDeleteWeek] = useState(false);
  const [showCheckInMap, setShowCheckInMap] = useState(false);
  const [mapAssignmentId, setMapAssignmentId] = useState<string | null>(null);
  const [mapZoneName, setMapZoneName] = useState("");  const handleCellClick = (date: string, shiftId: string) => {
    const shift = shifts.find((s) => s.id === shiftId);
    setAssignDialog({ date, shiftId, shiftName: shift?.name || "" });
  };

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const { pendingDelete, countdown, markForDelete, undo } = useUndo<string>({
    onConfirm: async (id) => {
      setConfirmingId(id);
      try {
        await api.deleteScheduleAssignment(id);
        await loadData();
        toast.success("Đã xóa vĩnh viễn phân công trực.");
      } catch (err) {
        const msg = getErrorMessage(err);
        setError(msg);
        toast.error(msg);
      } finally {
        setConfirmingId(null);
      }
    },
  });

  const hiddenIds = useMemo(() => new Set([pendingDelete, confirmingId].filter(Boolean) as string[]), [pendingDelete, confirmingId]);
  const filteredAssignmentsWithUndo = useMemo(
    () => filteredAssignments.filter((a) => !hiddenIds.has(a.id)),
    [filteredAssignments, hiddenIds],
  );

  const handleDeleteAssignment = (id: string) => markForDelete(id);

  if (!isStaff) {
    return (
      <EmptyState
        icon={<ScheduleOutlined sx={{ fontSize: 32 }} />}
        title="Không có quyền truy cập"
        description="Bạn không có quyền xem trang này."
      />
    );
  }

  const isCurrentWeek = from === (() => { const d = new Date(); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); return d; })().toISOString().slice(0, 10);

  const headerActions = (
    <>
      <Tooltip title="Tuần trước">
        <IconButton onClick={goPrevWeek} size="small" sx={{ border: "1px solid", borderColor: "divider", color: "text.secondary", "&:hover": { bgcolor: "action.hover", color: "primary.main" } }}>
          <PrevIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Button onClick={goToday} size="small" variant={isCurrentWeek ? "contained" : "outlined"} startIcon={<TodayIcon sx={{ fontSize: 16 }} />}
        sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.75rem",
          ...(isCurrentWeek
            ? { bgcolor: "primary.main", "&:hover": { bgcolor: "primary.dark" } }
            : { color: "text.secondary", borderColor: "divider", "&:hover": { borderColor: "primary.main", color: "primary.main" } }
          ),
        }}
      >
        Hôm nay
      </Button>
      <Tooltip title="Tuần sau">
        <IconButton onClick={goNextWeek} size="small" sx={{ border: "1px solid", borderColor: "divider", color: "text.secondary", "&:hover": { bgcolor: "action.hover", color: "primary.main" } }}>
          <NextIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {canCreate && (
        <Tooltip title="Gợi ý lịch tự động">
          <IconButton onClick={() => auto.setShowAutoSchedule(true)} size="small" sx={{ color: "#D4AF37", border: "1px solid rgba(212,175,55,0.4)", "&:hover": { bgcolor: "rgba(212,175,55,0.1)" } }}>
            <AutoAwesomeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {(isAdmin || canUpdate) && (
        <Tooltip title="Quản lý ca/khu vực">
          <IconButton onClick={() => setShowManagement(true)} size="small" sx={{ border: "1px solid", borderColor: "divider", color: "text.secondary", "&:hover": { bgcolor: "action.hover", color: "primary.main" } }}>
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {(isAdmin || canCreate) && (
        <Tooltip title="Mẫu lịch">
          <IconButton onClick={() => setShowTemplates(true)} size="small" sx={{ border: "1px solid", borderColor: "divider", color: "text.secondary", "&:hover": { bgcolor: "action.hover", color: "primary.main" } }}>
            <TotalIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {(isAdmin || canUpdate) && (
        <Tooltip title="Geofence">
          <IconButton onClick={() => setShowGeofence(true)} size="small" sx={{ color: "#D97706", border: "1px solid rgba(217,119,6,0.3)", "&:hover": { bgcolor: "rgba(217,119,6,0.1)" } }}>
            <MapIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {canManage && (
        <Tooltip title="Nhật ký">
          <IconButton onClick={() => setShowAuditLogs(true)} size="small" sx={{ border: "1px solid", borderColor: "divider", color: "text.secondary", "&:hover": { bgcolor: "action.hover", color: "primary.main" } }}>
            <HistoryIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {canDelete && (
        <Tooltip title="Xóa lịch tuần này">
          <IconButton
            onClick={() => setShowDeleteWeek(true)}
            size="small"
            sx={{ color: "#ef4444", border: "1px solid rgba(239,68,68,0.35)", "&:hover": { bgcolor: "rgba(239,68,68,0.1)" } }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 18, height: 18 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="In lịch">
        <IconButton onClick={() => window.print()} size="small" sx={{ border: "1px solid", borderColor: "divider", color: "text.secondary", "&:hover": { bgcolor: "action.hover", color: "primary.main" } }}>
          <PrintIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </>
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Lịch trực theo tuần"
        subtitle={formatDateRange(days)}
        icon={ScheduleOutlined}
        onRefresh={loadData}
        actions={headerActions}
      />

      <MyShiftPanel
        onChanged={canManage ? loadData : undefined}
        onOpenMap={(item) => {
          setMapAssignmentId(item.id);
          setMapZoneName(item.shift?.name ?? item.zone?.zoneName ?? "Khu vực");
          setShowCheckInMap(true);
        }}
      />

      {mapAssignmentId && (
        <CheckInMapModal open={showCheckInMap} onClose={() => setShowCheckInMap(false)} assignmentId={mapAssignmentId} zoneName={mapZoneName} onSuccess={loadData} />
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
        {[
          { key: "total", label: "Tổng ca tuần", value: weekStats.total, icon: TotalIcon, gradient: STAT_GRADIENT.total, pct: 100 },
          { key: "active", label: "Đang trực", value: weekStats.active, icon: ActiveIcon, gradient: STAT_GRADIENT.active, pct: weekStats.total ? (weekStats.active / weekStats.total) * 100 : 0 },
          { key: "staff", label: "Nhân viên", value: weekStats.staffCount, icon: StaffIcon, gradient: STAT_GRADIENT.staff, pct: 100 },
        ].map((s, idx) => (
          <MuiStatCard key={s.key} label={s.label} value={s.value} icon={s.icon} gradient={s.gradient} pct={s.pct} index={idx} />
        ))}
      </Box>

      <ScheduleFilterBar
        filter={filter}
        setFilter={setFilter}
        zoneFilter={zoneFilter}
        setZoneFilter={setZoneFilter}
        shiftFilter={shiftFilter}
        setShiftFilter={setShiftFilter}
        zones={zones}
        shiftList={shiftList}
      />

      {error ? (
        <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>{error}</Alert>
      ) : null}

      <LoadingOverlay loading={loading} message="Đang tải lịch trực...">
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            bgcolor: "background.paper",
            borderColor: "divider",
            overflow: "hidden",
            height: "auto",
            display: "block",
            boxShadow: (theme) =>
              theme.palette.mode === "dark"
                ? "0 4px 20px rgba(0, 0, 0, 0.25)"
                : "0 2px 10px rgba(0, 0, 0, 0.03)",
          }}
        >
          <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Bảng phân công trực theo tuần
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDateRange(days)}
            </Typography>
          </Box>
          <Divider sx={{ borderColor: "divider" }} />
          <Box sx={{ width: "100%" }}>
            <TimetableGrid
              days={days} shifts={filteredShifts} assignments={filteredAssignmentsWithUndo}
              filter={filter} isAdmin={canManage}
              onCellClick={canCreate ? handleCellClick : undefined}
              onDeleteAssignment={canDelete ? handleDeleteAssignment : undefined}
            />
          </Box>
          <Divider sx={{ borderColor: "divider" }} />
          <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.4)" : "rgba(248, 250, 252, 0.6)" }}>
            <TimetableLegend />
          </Box>
        </Paper>
      </LoadingOverlay>

      <AssignStaffDialog
        open={!!assignDialog} date={assignDialog?.date || ""} shiftId={assignDialog?.shiftId || ""} shiftName={assignDialog?.shiftName || ""}
        shifts={shiftList} zones={zones} staff={staff}
        existingAssignments={assignments.filter((a) => a.shiftId === assignDialog?.shiftId && a.workDate === assignDialog?.date && a.status !== "cancelled")}
        dayAssignments={assignments.filter((a) => a.workDate === assignDialog?.date && a.status !== "cancelled")}
        onClose={() => setAssignDialog(null)}
        onAssigned={() => { setAssignDialog(null); loadData(); }}
      />

      <ScheduleManagementPanel open={showManagement} onClose={() => setShowManagement(false)} zones={zones} shifts={shiftList} onUpdate={loadData} />
      <AuditLogsPanel open={showAuditLogs} onClose={() => setShowAuditLogs(false)} />
      <GeofenceConfigPanel open={showGeofence} onClose={() => setShowGeofence(false)} zones={zones} onUpdated={loadData} />
      <TemplateManagementPanel open={showTemplates} onClose={() => setShowTemplates(false)} zones={zones} shifts={shifts} staff={staff} onUpdated={loadData} />
      <AutoScheduleDialog
        open={auto.showAutoSchedule}
        onClose={() => { auto.setShowAutoSchedule(false); }}
        onConfirm={auto.handleAutoSchedule}
        onConfirmFinal={auto.handleAutoScheduleConfirm}
        loading={auto.autoLoading} step={auto.autoStep}
        proposals={auto.autoProposals} skippedCount={auto.autoSkipped} actualRange={auto.autoActualRange}
      />
      <DeleteWeekDialog
        open={showDeleteWeek} onClose={() => setShowDeleteWeek(false)}
        weekFrom={from} weekTo={to}
        affectedCount={assignments.filter(a => a.status !== "cancelled" && a.workDate >= from && a.workDate <= to).length}
        onDeleted={loadData}
      />

      <UndoSnackbar
        open={!!pendingDelete}
        message="Đã xóa lịch trực"
        countdown={countdown}
        onUndo={undo}
      />
    </Stack>
  );
}
