"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import PrevIcon from "@mui/icons-material/ArrowBack";
import NextIcon from "@mui/icons-material/ArrowForward";
import TodayIcon from "@mui/icons-material/TodayOutlined";
import PrintIcon from "@mui/icons-material/PrintOutlined";
import GroupIcon from "@mui/icons-material/GroupsOutlined";
import TotalIcon from "@mui/icons-material/AssignmentOutlined";
import StaffIcon from "@mui/icons-material/PersonOutlined";
import ActiveIcon from "@mui/icons-material/CheckCircleOutlined";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import { useAuth } from "@/lib/auth-context";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import api, { getErrorMessage } from "@/lib/api-client";
import type { StaffScheduleAssignment } from "@/lib/types";
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
import AdminActionMenu from "@/components/staff-schedule/AdminActionMenu";
import MyBidsPanel from "@/components/staff-schedule/MyBidsPanel";
import MyAvailabilityPanel from "@/components/staff-schedule/MyAvailabilityPanel";
import { useScheduleData } from "@/hooks/useScheduleData";
import { useScheduleFilters } from "@/hooks/useScheduleFilters";
import { usePendingCounts } from "@/hooks/usePendingCounts";
import { useAutoSchedule } from "@/hooks/useAutoSchedule";

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

  const { assignments, staff, zones, shifts, loading, error, loadData, setError } =
    useScheduleData(weekStart, isAdmin);
  const { filter, setFilter, zoneFilter, setZoneFilter, shiftFilter, setShiftFilter,
    filteredAssignments, filteredShifts, shiftList, weekStats } =
    useScheduleFilters(assignments, shifts);
  const { pendingBidCount, pendingSwapCount, pendingManualCount } =
    usePendingCounts(isAdmin, loading);
  const autoSchedule = useAutoSchedule(loadData);

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
  const [showDeleteWeek, setShowDeleteWeek] = useState(false);
  const [showManualCheckIn, setShowManualCheckIn] = useState(false);
  const [showMyBids, setShowMyBids] = useState(false);
  const [showMyAvailability, setShowMyAvailability] = useState(false);

  const days = getWeekDays(weekStart);
  const from = toDateInput(days[0]);
  const to = toDateInput(days[6]);

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

  const handleAdminAction = (action: string) => {
    switch (action) {
      case "auto-schedule": setShowAutoSchedule(true); break;
      case "management": setShowManagement(true); break;
      case "templates": case "templates-config": setShowTemplates(true); break;
      case "delete-week": setShowDeleteWeek(true); break;
      case "leave-approval": setShowLeaveApproval(true); break;
      case "bids-review": setShowBidsReview(true); break;
      case "swaps-view": setShowSwapsView(true); break;
      case "manual-checkin": setShowManualCheckIn(true); break;
      case "geofence": setShowGeofence(true); break;
      case "audit-logs": setShowAuditLogs(true); break;
    }
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
        <AdminActionMenu
          pendingBidCount={pendingBidCount}
          pendingSwapCount={pendingSwapCount}
          pendingManualCount={pendingManualCount}
          onAction={handleAdminAction}
        />
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
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              displayEmpty
              sx={{ borderRadius: "20px", fontSize: "0.78rem", fontWeight: 600 }}
            >
              <MenuItem value="">Tất cả khu vực</MenuItem>
              {zones.map((z) => (
                <MenuItem key={z.id} value={z.id}>{z.zoneName}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              displayEmpty
              sx={{ borderRadius: "20px", fontSize: "0.78rem", fontWeight: 600 }}
            >
              <MenuItem value="">Tất cả ca trực</MenuItem>
              {shiftList.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
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

      {!isAdmin ? (
        <DashboardCard title="Đăng ký ca của tôi">
          <MyBidsPanel onError={(msg) => setError(msg)} />
        </DashboardCard>
      ) : null}

      {!isAdmin ? (
        <DashboardCard title="Yêu cầu nghỉ phép">
          <MyAvailabilityPanel onError={(msg) => setError(msg)} />
        </DashboardCard>
      ) : null}

      {!isAdmin ? (
        <DashboardCard title="Đổi ca chờ xử lý">
          <MySwapsPanel refreshKey={swapRefreshKey} onError={(msg) => setError(msg)} />
        </DashboardCard>
      ) : null}

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

      <LeaveApprovalPanel open={showLeaveApproval} onClose={() => setShowLeaveApproval(false)} onUpdated={loadData} />
      <BidsReviewPanel open={showBidsReview} onClose={() => setShowBidsReview(false)} onUpdated={loadData} />
      <SwapsViewPanel open={showSwapsView} onClose={() => setShowSwapsView(false)} onUpdated={loadData} />
      <AuditLogsPanel open={showAuditLogs} onClose={() => setShowAuditLogs(false)} />
      <GeofenceConfigPanel open={showGeofence} onClose={() => setShowGeofence(false)} zones={zones} onUpdated={loadData} />
      <TemplateManagementPanel open={showTemplates} onClose={() => setShowTemplates(false)} zones={zones} shifts={shifts} staff={staff} onUpdated={loadData} />
      <AutoScheduleDialog
        open={showAutoSchedule}
        onClose={() => { setShowAutoSchedule(false); autoSchedule.resetAuto(); }}
        onConfirm={autoSchedule.handleAutoSchedule}
        onConfirmFinal={autoSchedule.handleAutoScheduleConfirm}
        loading={autoSchedule.autoLoading}
        step={autoSchedule.autoStep}
        proposals={autoSchedule.autoProposals}
        skippedCount={autoSchedule.autoSkipped}
        actualRange={autoSchedule.autoActualRange}
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
