"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  alpha,
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Fade,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarIcon from "@mui/icons-material/CalendarMonth";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import GavelIcon from "@mui/icons-material/GavelOutlined";
import MapIcon from "@mui/icons-material/MapOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import LocationOnIcon from "@mui/icons-material/LocationOnOutlined";
import SwapHorizIcon from "@mui/icons-material/SwapHorizOutlined";
import { fadeInUp, shimmer, slideInRight, successPop } from "@/lib/animations";
import UsersIcon from "@mui/icons-material/GroupsOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useColorMode } from "@/lib/mui-theme";
import type { LibraryZone, OpenShift, ScheduleStaff, StaffScheduleAssignment, ShiftBid, ShiftSwap, StaffShift } from "@/lib/types";

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type ConfirmState =
  | { type: "assignment"; id: string; title: string; message: string }
  | { type: "zone"; zone: LibraryZone; title: string; message: string }
  | { type: "shift"; shift: StaffShift; title: string; message: string }
  | null;

type AssignDialogState = {
  open: boolean;
  staffId: string;
  workDate: string;
  zoneId: string;
  shiftId: string;
  shiftName: string;
  timeRange: string;
  zoneName: string;
  existingAssignments: StaffScheduleAssignment[];
} | null;

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(date = new Date()) {
  const value = new Date(date);
  const day = value.getDay() || 7;
  value.setDate(value.getDate() - day + 1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function getWeekDays(anchor: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(anchor);
    value.setDate(anchor.getDate() + index);
    return value;
  });
}

function normalizeTime(time?: string) {
  return (time || "").slice(0, 5);
}

function displayZoneName(zone: LibraryZone) {
  const compact = zone.zoneName.match(/^(Tang|Tầng)\s*(\d+)/i);
  return compact ? `Tầng ${compact[2]}` : zone.zoneName;
}

function initials(name?: string | null, email?: string) {
  const source = name || email || "S";
  return source.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function timeStateLabel(item: StaffScheduleAssignment) {
  const now = new Date();
  const today = toDateInput(now);
  if (item.workDate < today) return { label: "Đã qua", color: "default" as const };
  if (item.workDate > today) return { label: "Sắp tới", color: "info" as const };
  const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const start = normalizeTime(item.shift?.startTime);
  const end = normalizeTime(item.shift?.endTime);
  if (start && end && current >= start && current <= end) return { label: "Đang trực", color: "success" as const };
  return { label: "Hôm nay", color: "primary" as const };
}

function StaffCard({ staff, index = 0 }: { staff: ScheduleStaff; index?: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `staff:${staff.id}` });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const isAdmin = staff.role === "admin";

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      variant="outlined"
      sx={{
        p: 1.5,
        minHeight: 66,
        cursor: "grab",
        touchAction: "none",
        userSelect: "none",
        opacity: isDragging ? 0.5 : 1,
        borderColor: isDragging ? "primary.main" : "divider",
        bgcolor: isDragging ? (t) => alpha(t.palette.primary.main, 0.04) : "background.paper",
        boxShadow: isDragging ? 6 : 0,
        transform: isDragging ? "scale(1.04)" : "scale(1)",
        transition: "border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease, opacity 150ms ease, background-color 150ms ease",
        animation: `${fadeInUp} 0.3s ease-out`,
        animationDelay: `${index * 0.04}s`,
        animationFillMode: "both",
        "&:hover": {
          borderColor: "primary.main",
          boxShadow: 3,
          transform: "translateY(-1px)",
        },
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
        <Avatar
          sx={{
            width: 40,
            height: 40,
            bgcolor: isAdmin ? "secondary.main" : "primary.main",
            color: "primary.contrastText",
            fontSize: 13,
            fontWeight: 900,
            transition: "background-color 200ms ease",
          }}
        >
          {initials(staff.fullName, staff.email)}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>{staff.fullName || staff.email}</Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>{staff.email}</Typography>
            {isAdmin && <Chip label="Admin" size="small" color="secondary" sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: 10 } }} />}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}

function AssignmentCard({ item, onDelete }: { item: StaffScheduleAssignment; onDelete: (item: StaffScheduleAssignment) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `assignment:${item.id}` });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const state = timeStateLabel(item);
  const displayName = item.staff?.fullName || item.staff?.email || item.staffId;
  const displayEmail = item.staff?.email || "Nhân viên trực";
  const theme = useTheme();

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      variant="outlined"
      sx={{
        position: "relative",
        p: 1.25,
        pr: 4.5,
        minHeight: 92,
        opacity: isDragging ? 0.5 : 1,
        bgcolor: isDragging ? (t) => alpha(t.palette.primary.main, 0.04) : "background.paper",
        cursor: "grab",
        touchAction: "none",
        userSelect: "none",
        borderColor: isDragging ? "primary.main" : "divider",
        overflow: "hidden",
        transform: isDragging ? "scale(1.03)" : "scale(1)",
        transition: "border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease, opacity 150ms ease, background-color 150ms ease",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: 3,
          height: "100%",
          bgcolor: state.color === "success" ? "success.main" : state.color === "info" ? "info.main" : state.color === "primary" ? "primary.main" : "action.disabled",
          borderRadius: "0 2px 2px 0",
          opacity: 0.7,
        },
        "&:hover": {
          borderColor: isDragging ? "primary.main" : (t) => t.palette.primary.main,
          boxShadow: 2,
          transform: "translateY(-1px)",
        },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", minWidth: 0 }}>
        <Avatar sx={{ width: 30, height: 30, bgcolor: "primary.main", color: "primary.contrastText", fontSize: 11, fontWeight: 900 }}>
          {initials(item.staff?.fullName, item.staff?.email || item.staffId)}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 900, lineHeight: 1.25 }} noWrap title={displayName}>
            {displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.35 }} noWrap title={displayEmail}>
            {displayEmail}
          </Typography>
          <Chip
            size="small"
            color={state.color as any}
            label={state.label}
            sx={{
              mt: 0.75,
              height: 22,
              minWidth: 74,
              maxWidth: "none",
              fontWeight: 700,
              animation: `${successPop} 0.35s ease-out`,
              "& .MuiChip-label": {
                px: 1,
                overflow: "visible",
                textOverflow: "clip",
                whiteSpace: "nowrap",
              },
            }}
          />
        </Box>
      </Stack>
      <Tooltip title="Xóa lịch">
        <IconButton
          size="small"
          color="error"
          sx={{
            position: "absolute",
            right: 6,
            top: 6,
            width: 24,
            height: 24,
            bgcolor: (t) => alpha(t.palette.background.default, 0.8),
            opacity: 0.5,
            transition: "opacity 150ms ease, background-color 150ms ease, color 150ms ease",
            "&:hover": { bgcolor: "error.main", color: "error.contrastText", opacity: 1 },
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(item);
          }}
        >
          <DeleteIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
    </Paper>
  );
}

interface DropCellProps {
  id: string;
  assignments: StaffScheduleAssignment[];
  minStaff: number;
  onDelete: (item: StaffScheduleAssignment) => void;
  disabled?: boolean;
  onCellClick?: (workDate: string, zoneId: string, shiftId: string, shiftName: string, timeRange: string, zoneName: string) => void;
  shiftName?: string;
  timeRange?: string;
  zoneName?: string;
}
const DropCell = ({ id, assignments, minStaff, onDelete, disabled, onCellClick, shiftName, timeRange, zoneName }: DropCellProps) => {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });
  const understaffed = assignments.length < minStaff;
  const theme = useTheme();

  const handleClick = () => {
    if (disabled || !onCellClick) return;
    const parts = id.split(":");
    if (parts.length < 4 || parts[0] !== "cell") return;
    const [, workDate, zoneId, shiftId] = parts;
    onCellClick(workDate, zoneId, shiftId, shiftName || "", timeRange || "", zoneName || "");
  };

  return (
    <Box
      ref={setNodeRef}
      onClick={handleClick}
      sx={{
        position: "relative",
        minHeight: 156,
        border: 2,
        borderStyle: "dashed",
        borderRadius: 2,
        borderColor: disabled ? "text.disabled" : isOver ? "primary.main" : understaffed ? "warning.main" : alpha(theme.palette.divider, 0.6),
        bgcolor: disabled
          ? alpha(theme.palette.action.disabledBackground, theme.palette.mode === "dark" ? 0.24 : 0.16)
          : isOver
            ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.1)
            : understaffed
              ? alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.12 : 0.07)
              : alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.72 : 0.88),
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: 4,
          height: "100%",
          borderRadius: "2px 0 0 2px",
          bgcolor: disabled
            ? "text.disabled"
            : isOver
              ? "primary.main"
              : understaffed
                ? "warning.main"
                : "transparent",
          opacity: disabled || understaffed || isOver ? 1 : 0,
          transition: "opacity 200ms ease",
        },
        color: disabled ? "text.disabled" : "text.primary",
        p: 1.25,
        transition: "background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease",
        boxShadow: isOver && !disabled ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}` : understaffed && !disabled ? `0 0 0 1px ${alpha(theme.palette.warning.main, 0.15)}` : "none",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography
          variant="caption"
          color={disabled ? "text.disabled" : understaffed && !isOver ? "warning.main" : "text.secondary"}
          noWrap
          sx={{ fontWeight: 800, minWidth: 92, flexShrink: 0 }}
        >
          {disabled ? "Đã qua" : `${assignments.length}/${minStaff} nhân viên`}
        </Typography>
        {understaffed && !disabled ? <Chip size="small" color="warning" label="Thiếu" sx={{ height: 20, flexShrink: 0, minWidth: 58, fontWeight: 800 }} /> : null}
      </Stack>
      {assignments.length ? (
        <Stack spacing={0.75}>
          {assignments.map((item, idx) => <Box key={item.id} sx={{ animation: `${fadeInUp} 0.3s ease-out`, animationDelay: `${idx * 0.04}s`, animationFillMode: "both" }}><AssignmentCard item={item} onDelete={onDelete} /></Box>)}
        </Stack>
      ) : (
        <Box sx={{ minHeight: 104, display: "grid", placeItems: "center", textAlign: "center", color: disabled ? "text.disabled" : "text.secondary", borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.06 : 0.04) }}>
          <Typography variant="body2" sx={{ fontWeight: 800, opacity: 0.65 }}>{disabled ? "Không thể chỉnh sửa" : "Thả nhân viên vào đây"}</Typography>
        </Box>
      )}
    </Box>
  );
}

function DragPreview({ staff, assignment }: { staff?: ScheduleStaff | null; assignment?: StaffScheduleAssignment | null }) {
  if (staff) {
    return (
      <Paper elevation={12} sx={{ width: 300, p: 1.75, border: 2, borderColor: "primary.main", bgcolor: "background.paper" }}>
        <Typography variant="body2" sx={{ fontWeight: 900 }}>{staff.fullName || staff.email}</Typography>
        <Typography variant="caption" color="text.secondary">{staff.email}</Typography>
      </Paper>
    );
  }
  if (assignment) {
    return (
      <Paper elevation={12} sx={{ width: 260, p: 1.5, border: 2, borderColor: "primary.main", bgcolor: "background.paper" }}>
        <Typography variant="body2" sx={{ fontWeight: 900 }}>{assignment.staff?.fullName || assignment.staff?.email || assignment.staffId}</Typography>
        <Typography variant="caption" color="text.secondary">{assignment.shift?.name}</Typography>
      </Paper>
    );
  }
  return null;
}

export default function StaffSchedulesPage() {
  const router = useRouter();
  const theme = useTheme();
  const { mode, toggleMode } = useColorMode();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "admin" || user?.role === "staff";
  const [weekStart, setWeekStart] = useState(() => startOfWeek());
  const [staff, setStaff] = useState<ScheduleStaff[]>([]);
  const [zones, setZones] = useState<LibraryZone[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [assignments, setAssignments] = useState<StaffScheduleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoneForm, setZoneForm] = useState({ floor: "1", zoneName: "" });
  const [shiftForm, setShiftForm] = useState({ name: "", startTime: "08:00", endTime: "12:00", minStaff: "1" });
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [assignDialog, setAssignDialog] = useState<AssignDialogState>(null);
  const [tab, setTab] = useState(0);
  const [openShifts, setOpenShifts] = useState<OpenShift[]>([]);
  const [bids, setBids] = useState<ShiftBid[]>([]);
  const [swaps, setSwaps] = useState<ShiftSwap[]>([]);
  const [bidDialog, setBidDialog] = useState<{ open: boolean; assignmentId: string; note: string }>({ open: false, assignmentId: "", note: "" });
  const [swapDialog, setSwapDialog] = useState<{ open: boolean; assignmentId: string; targetStaffId: string; note: string }>({ open: false, assignmentId: "", targetStaffId: "", note: "" });
  const [autoDialog, setAutoDialog] = useState<{ open: boolean; proposed: Array<{ staffId: string; shiftId: string; zoneId: string; workDate: string; note: string }>; skipped: number; saving: boolean }>({ open: false, proposed: [], skipped: 0, saving: false });
  const [geofenceDialog, setGeofenceDialog] = useState(false);
  const [geofenceConfigs, setGeofenceConfigs] = useState<Array<{ id: string; zoneId: string; latitude: number; longitude: number; radiusMeters: number; addressHint: string | null; zone: { id: string; zoneName: string; floor: number } | null }>>([]);
  const [editingGeofence, setEditingGeofence] = useState<{ zoneId: string; zoneName: string; latitude: string; longitude: string; radiusMeters: string; addressHint: string } | null>(null);
  const [myStaffId, setMyStaffId] = useState<string>("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
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
        setStaff(staffResult.filter((item) => item.role === "admin" || item.role === "staff"));
        setZones(zoneResult.filter((item) => item.isActive));
        setShifts(shiftResult.filter((item) => item.isActive));
        setAssignments(assignmentResult.items);
      } else {
        const assignmentResult = await api.getMySchedules({ from, to });
        setAssignments(assignmentResult.items);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [from, isAdmin, isStaff, to]);

  const loadBiddingAndSwapData = useCallback(async () => {
    if (!isStaff) return;
    try {
      const [openShiftsResult, bidsResult, swapsResult] = await Promise.all([
        api.getOpenShifts(),
        api.listMyBids(),
        api.listMySwaps(),
      ]);
      setOpenShifts(openShiftsResult);
      setBids(bidsResult);
      setSwaps(swapsResult);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [isStaff]);

  useEffect(() => {
    loadData();
    loadBiddingAndSwapData();
  }, [loadData, loadBiddingAndSwapData]);

  const assignmentsForCell = (workDate: string, zoneId: string, shiftId: string) =>
    assignments.filter((item) => item.workDate === workDate && item.zoneId === zoneId && item.shiftId === shiftId && item.status !== "cancelled");

  const weekStats = useMemo(() => {
    const total = assignments.length;
    const confirmed = assignments.filter((a) => a.status === "confirmed").length;
    const inProgress = assignments.filter((a) => a.status === "in_progress").length;
    const completed = assignments.filter((a) => a.status === "completed").length;
    let understaffed = 0;
    for (const zone of zones) {
      for (const day of days) {
        for (const shift of shifts) {
          const date = toDateInput(day);
          if (assignmentsForCell(date, zone.id, shift.id).length < (shift.minStaff || 1)) understaffed++;
        }
      }
    }
    return { total, confirmed, inProgress, completed, understaffed };
  }, [assignments, zones, days, shifts]);

  const createDefaults = async () => {
    setSaving(true);
    setError(null);
    try {
      if (!zones.length) {
        await Promise.all([
          api.createScheduleZone({ floor: 1, zoneName: "Tầng 1" }),
          api.createScheduleZone({ floor: 2, zoneName: "Tầng 2" }),
        ]);
      }
      if (!shifts.length) {
        await Promise.all([
          api.createScheduleShift({ name: "Ca sáng", startTime: "07:30", endTime: "11:30", minStaff: 1 }),
          api.createScheduleShift({ name: "Ca chiều", startTime: "13:00", endTime: "17:00", minStaff: 1 }),
          api.createScheduleShift({ name: "Ca tối", startTime: "17:30", endTime: "20:30", minStaff: 1 }),
        ]);
      }
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const createZone = async () => {
    const floor = Number(zoneForm.floor) || 1;
    setSaving(true);
    setError(null);
    try {
      await api.createScheduleZone({ floor, zoneName: zoneForm.zoneName.trim() || `Tầng ${floor}` });
      setZoneForm((value) => ({ ...value, zoneName: "" }));
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const createShift = async () => {
    if (!shiftForm.name.trim()) {
      setError("Vui lòng nhập tên ca trực");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.createScheduleShift({
        name: shiftForm.name.trim(),
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        minStaff: Math.max(1, Number(shiftForm.minStaff) || 1),
      });
      setShiftForm((value) => ({ ...value, name: "" }));
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const overId = String(event.over?.id || "");
    const activeId = String(event.active.id || "");
    if (!overId.startsWith("cell:")) return;

    const [, workDate, zoneId, shiftId] = overId.split(":");
    const movingAssignment = activeId.startsWith("assignment:")
      ? assignments.find((item) => item.id === activeId.replace("assignment:", ""))
      : null;
    const staffId = activeId.startsWith("staff:") ? activeId.replace("staff:", "") : movingAssignment?.staffId;
    if (!staffId) return;

    if (movingAssignment && movingAssignment.workDate === workDate && movingAssignment.zoneId === zoneId && movingAssignment.shiftId === shiftId) return;

    const duplicateAssignment = assignments.find((item) => (
      item.id !== movingAssignment?.id
      && item.staffId === staffId
      && item.workDate === workDate
      && item.zoneId === zoneId
      && item.shiftId === shiftId
      && item.status !== "cancelled"
      && item.status !== "completed"
    ));
    if (duplicateAssignment) {
      setError("Nhân viên này đã có trong đúng ô ca trực này.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (activeId.startsWith("staff:")) {
        await api.createScheduleAssignment({ staffId, workDate, zoneId, shiftId });
      } else if (activeId.startsWith("assignment:")) {
        await api.moveScheduleAssignment(activeId.replace("assignment:", ""), { workDate, zoneId, shiftId });
      }
      await loadData();
    } catch (err: any) {
      setError(err?.response?.status === 409 ? "Nhân viên này đã có trong đúng ô ca trực này." : getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setSaving(true);
    setError(null);
    try {
      if (confirm.type === "assignment") await api.deleteScheduleAssignment(confirm.id);
      if (confirm.type === "zone") await api.deleteScheduleZone(confirm.zone.id);
      if (confirm.type === "shift") await api.deleteScheduleShift(confirm.shift.id);
      setConfirm(null);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const runAssign = async () => {
    if (!assignDialog || !assignDialog.staffId) return;
    setSaving(true);
    setError(null);
    try {
      await api.createScheduleAssignment({
        staffId: assignDialog.staffId,
        shiftId: assignDialog.shiftId,
        zoneId: assignDialog.zoneId,
        workDate: assignDialog.workDate,
      });
      setAssignDialog(null);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const activeDragStaff = activeDragId?.startsWith("staff:") ? staff.find((item) => item.id === activeDragId.replace("staff:", "")) : null;
  const activeDragAssignment = activeDragId?.startsWith("assignment:")
    ? assignments.find((item) => item.id === activeDragId.replace("assignment:", ""))
    : null;

  if (!isStaff) {
    return <Alert severity="error">Bạn không có quyền xem lịch trực.</Alert>;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
        <Toolbar sx={{ gap: 1.5, minHeight: 68 }}>
          <IconButton
            color="inherit"
            title="Quay lại"
            aria-label="Quay lại"
            onClick={() => {
              if (window.history.length > 1) router.back();
              else router.push("/dashboard");
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Avatar sx={{ bgcolor: "primary.main", color: "primary.contrastText", borderRadius: 2 }}>
            <CalendarIcon />
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6" noWrap>Bảng điều phối lịch trực</Typography>
            <Typography variant="body2" color="text.secondary" noWrap>Quản lý theo tuần, tầng và ca trực</Typography>
          </Box>
          <Button variant="outlined" onClick={() => setWeekStart((value) => new Date(value.setDate(value.getDate() - 7)))}>Tuần trước</Button>
          <Chip label={`${from} - ${to}`} sx={{ fontWeight: 800 }} />
          <Button variant="outlined" onClick={() => setWeekStart((value) => new Date(value.setDate(value.getDate() + 7)))}>Tuần sau</Button>
          <Tooltip title={mode === "dark" ? "Chế độ sáng" : "Chế độ tối"}>
            <IconButton color="inherit" onClick={toggleMode}>{mode === "dark" ? "☀" : "☾"}</IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={loadData} disabled={loading}>Tải lại</Button>
          {isAdmin && (
            <Button variant="contained" color="secondary" startIcon={<AutoAwesomeIcon />} onClick={async () => {
              if (!from || !to) return;
              setSaving(true);
              try {
                const result = await api.autoSchedule({ from, to });
                setAutoDialog({ open: true, proposed: result.proposed, skipped: result.skipped, saving: false });
              } catch (err) {
                setError(getErrorMessage(err));
              } finally {
                setSaving(false);
              }
            }} disabled={loading || saving} sx={{ fontWeight: 800 }}>
              Gợi ý lịch
            </Button>
          )}
          {isAdmin && (
            <Button variant="contained" startIcon={<LocationOnIcon />} onClick={async () => {
              try {
                const configs = await api.getGeofenceConfigs();
                setGeofenceConfigs(configs);
              } catch {}
              setGeofenceDialog(true);
            }} sx={{ fontWeight: 800 }}>
              GPS
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" },
            gap: 2,
            mb: 2.5,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              gridColumn: { xs: "span 1", sm: "span 1", lg: "span 1" },
              p: 2.5,
              borderRadius: 3,
              background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.12)} 0%, ${alpha(t.palette.primary.main, 0.03)} 100%)`,
              border: "1px solid",
              borderColor: (t) => alpha(t.palette.primary.main, 0.2),
              animation: `${fadeInUp} 0.35s ease-out`,
              animationFillMode: "both",
            }}
          >
            <Stack spacing={0.5}>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 900, lineHeight: 1 }}>{weekStats.total}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Tổng ca tuần này</Typography>
            </Stack>
          </Paper>
          <Paper
            elevation={0}
            sx={{
              gridColumn: { xs: "span 1", sm: "span 1", lg: "span 1" },
              p: 2.5,
              borderRadius: 3,
              background: (t) => `linear-gradient(135deg, ${alpha(t.palette.success.main, 0.12)} 0%, ${alpha(t.palette.success.main, 0.03)} 100%)`,
              border: "1px solid",
              borderColor: (t) => alpha(t.palette.success.main, 0.2),
              animation: `${fadeInUp} 0.35s ease-out`,
              animationDelay: "0.06s",
              animationFillMode: "both",
            }}
          >
            <Stack spacing={0.5}>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 900, lineHeight: 1 }}>{weekStats.confirmed}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Đã xác nhận</Typography>
            </Stack>
          </Paper>
          <Paper
            elevation={0}
            sx={{
              gridColumn: { xs: "span 1", sm: "span 1", lg: "span 1" },
              p: 2.5,
              borderRadius: 3,
              background: (t) => `linear-gradient(135deg, ${alpha(t.palette.info.main, 0.12)} 0%, ${alpha(t.palette.info.main, 0.03)} 100%)`,
              border: "1px solid",
              borderColor: (t) => alpha(t.palette.info.main, 0.2),
              animation: `${fadeInUp} 0.35s ease-out`,
              animationDelay: "0.12s",
              animationFillMode: "both",
            }}
          >
            <Stack spacing={0.5}>
              <Typography variant="h4" color="info.main" sx={{ fontWeight: 900, lineHeight: 1 }}>{weekStats.inProgress}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Đang trực</Typography>
            </Stack>
          </Paper>
          <Paper
            elevation={0}
            sx={{
              gridColumn: { xs: "span 1", sm: "span 1", lg: "span 1" },
              p: 2.5,
              borderRadius: 3,
              background: (t) => `linear-gradient(135deg, ${alpha(t.palette.warning.main, 0.12)} 0%, ${alpha(t.palette.warning.main, 0.03)} 100%)`,
              border: "1px solid",
              borderColor: (t) => alpha(t.palette.warning.main, 0.2),
              animation: `${fadeInUp} 0.35s ease-out`,
              animationDelay: "0.18s",
              animationFillMode: "both",
            }}
          >
            <Stack spacing={0.5}>
              <Typography variant="h4" color={weekStats.understaffed > 0 ? "warning.main" : "text.secondary"} sx={{ fontWeight: 900, lineHeight: 1 }}>{weekStats.understaffed}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Ca thiếu nhân sự</Typography>
            </Stack>
          </Paper>
          <Paper
            elevation={0}
            sx={{
              gridColumn: { xs: "span 2", sm: "span 2", lg: "span 2" },
              p: 2.5,
              borderRadius: 3,
              background: (t) => `linear-gradient(135deg, ${weekStats.understaffed > 0 ? alpha(t.palette.warning.main, 0.1) : alpha(t.palette.success.main, 0.1)} 0%, transparent 100%)`,
              border: "1px solid",
              borderColor: (t) => weekStats.understaffed > 0 ? alpha(t.palette.warning.main, 0.25) : alpha(t.palette.success.main, 0.25),
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              animation: `${slideInRight} 0.4s ease-out`,
              animationDelay: "0.24s",
              animationFillMode: "both",
            }}
          >
            {weekStats.understaffed > 0 ? (
              <>
                <Avatar sx={{ bgcolor: "warning.main", color: "warning.contrastText", width: 40, height: 40 }}>!</Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 900, mb: 0.25 }}>Cảnh báo thiếu nhân sự</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>{weekStats.understaffed} ca trực chưa đủ nhân viên trong tuần này. Kéo thả nhân viên vào ô tương ứng để bổ sung.</Typography>
                </Box>
              </>
            ) : (
              <>
                <Avatar sx={{ bgcolor: "success.main", color: "success.contrastText", width: 40, height: 40 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></svg>
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 900, mb: 0.25 }}>Đủ nhân sự</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>Tất cả ca trực đã được phân bổ đủ nhân viên trong tuần này.</Typography>
                </Box>
              </>
            )}
          </Paper>
        </Box>

        {error ? <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert> : null}

        <Paper variant="outlined" sx={{ mb: 2.5, borderRadius: 3, overflow: "hidden", animation: `${fadeInUp} 0.35s ease-out`, animationFillMode: "both" }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ minHeight: 52, "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0" }, "& .MuiTab-root": { minHeight: 52, fontWeight: 700, textTransform: "none", gap: 0.5 } }}>
            <Tab label="Lịch trực" icon={<CalendarIcon fontSize="small" />} iconPosition="start" />
            <Tab label="Ca trống" icon={<GavelIcon fontSize="small" />} iconPosition="start" />
            <Tab label="Đổi ca" icon={<SwapHorizIcon fontSize="small" />} iconPosition="start" />
          </Tabs>
        </Paper>

        <Box key={tab}>
        {(() => {
          switch (tab) {
            case 0:
              return (<>{loading ? (
          <Paper variant="outlined" sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
            <CircularProgress sx={{ animation: `${shimmer} 1.5s ease-in-out infinite` }} />
          </Paper>
        ) : isAdmin ? (
          <DndContext
            sensors={sensors}
            onDragStart={(event: DragStartEvent) => setActiveDragId(String(event.active.id || ""))}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveDragId(null)}
          >
            <Stack spacing={2}>
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", md: "minmax(360px, 0.8fr) minmax(620px, 1.2fr)" },
                  alignItems: "start",
                }}
              >
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                    <UsersIcon color="primary" />
                    <Typography sx={{ fontWeight: 900 }}>Danh sách nhân viên</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Kéo nhân viên vào bất kỳ ô ca trực. Một nhân viên có thể làm nhiều ca trong ngày.
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gap: 1,
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" },
                      maxHeight: 260,
                      overflowY: "auto",
                      pr: 0.5,
                    }}
                  >
                    {staff.length ? staff.map((item, idx) => <StaffCard key={item.id} staff={item} index={idx} />) : (
                      <Alert severity="warning">Chưa lấy được danh sách nhân viên từ user-service.</Alert>
                    )}
                  </Box>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                    <MapIcon color="primary" />
                    <Typography sx={{ fontWeight: 900 }}>Cấu hình tầng và ca</Typography>
                  </Stack>
                  <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
                    <Card variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900 }}>THÊM TẦNG</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <TextField
                          label="Tầng"
                          type="number"
                          size="small"
                          value={zoneForm.floor}
                          onChange={(event) => setZoneForm((value) => ({ ...value, floor: event.target.value }))}
                          slotProps={{ htmlInput: { min: 1 } }}
                          sx={{ width: 92 }}
                        />
                        <TextField
                          label="Tên hiển thị"
                          size="small"
                          value={zoneForm.zoneName}
                          onChange={(event) => setZoneForm((value) => ({ ...value, zoneName: event.target.value }))}
                          placeholder="VD: Tầng 3"
                          fullWidth
                        />
                      </Stack>
                      <Button fullWidth variant="outlined" startIcon={<AddIcon />} onClick={createZone} disabled={saving} sx={{ mt: 1.5 }}>
                        Thêm tầng
                      </Button>
                      <Stack spacing={1} sx={{ mt: 1.5 }}>
                        {zones.map((zone, idx) => (
                          <Paper key={zone.id} variant="outlined" sx={{ p: 1, display: "flex", alignItems: "center", gap: 1, borderRadius: 1.5, animation: `${slideInRight} 0.3s ease-out`, animationDelay: `${idx * 0.04}s`, animationFillMode: "both", borderLeft: "3px solid", borderLeftColor: "primary.main", "&:hover": { borderLeftColor: "error.main" }, transition: "border-left-color 150ms ease" }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>{displayZoneName(zone)}</Typography>
                              <Typography variant="caption" color="text.secondary">Tầng {zone.floor}</Typography>
                            </Box>
                            <IconButton
                              size="small"
                              color="error"
                              sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}
                              onClick={() => setConfirm({
                                type: "zone",
                                zone,
                                title: `Xóa ${displayZoneName(zone)}?`,
                                message: "Các lịch chưa hoàn tất ở tầng này sẽ bị hủy.",
                              })}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Paper>
                        ))}
                      </Stack>
                    </Card>

                    <Card variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900 }}>THÊM CA TRỰC</Typography>
                      <TextField
                        label="Tên ca"
                        size="small"
                        value={shiftForm.name}
                        onChange={(event) => setShiftForm((value) => ({ ...value, name: event.target.value }))}
                        placeholder="VD: Ca tối tầng 4"
                        fullWidth
                        sx={{ mt: 1 }}
                      />
                      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1, mt: 1 }}>
                        <TextField label="Bắt đầu" type="time" size="small" value={shiftForm.startTime} onChange={(event) => setShiftForm((value) => ({ ...value, startTime: event.target.value }))} fullWidth />
                        <TextField label="Kết thúc" type="time" size="small" value={shiftForm.endTime} onChange={(event) => setShiftForm((value) => ({ ...value, endTime: event.target.value }))} fullWidth />
                        <TextField
                          label="Số nhân viên tối thiểu"
                          type="number"
                          size="small"
                          value={shiftForm.minStaff}
                          onChange={(event) => setShiftForm((value) => ({ ...value, minStaff: event.target.value }))}
                          slotProps={{ htmlInput: { min: 1 } }}
                          sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}
                          fullWidth
                        />
                      </Box>
                      <Button fullWidth variant="outlined" startIcon={<AddIcon />} onClick={createShift} disabled={saving} sx={{ mt: 1.5 }}>
                        Thêm ca trực
                      </Button>
                      <Stack spacing={1} sx={{ mt: 1.5 }}>
                        {shifts.map((shift, idx) => (
                          <Paper key={shift.id} variant="outlined" sx={{ p: 1, display: "flex", alignItems: "center", gap: 1, borderRadius: 1.5, animation: `${slideInRight} 0.3s ease-out`, animationDelay: `${idx * 0.04}s`, animationFillMode: "both", borderLeft: "3px solid", borderLeftColor: "info.main", "&:hover": { borderLeftColor: "error.main" }, transition: "border-left-color 150ms ease" }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>{shift.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {normalizeTime(shift.startTime)}-{normalizeTime(shift.endTime)} · {shift.minStaff} nhân viên
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              color="error"
                              sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}
                              onClick={() => setConfirm({
                                type: "shift",
                                shift,
                                title: `Xóa ca trực "${shift.name}"?`,
                                message: "Các lịch chưa hoàn tất dùng ca này sẽ bị hủy.",
                              })}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Paper>
                        ))}
                      </Stack>
                    </Card>

                    {(!zones.length || !shifts.length) ? (
                      <Alert
                        severity="warning"
                        action={<Button color="inherit" size="small" onClick={createDefaults} disabled={saving}>Tạo mẫu</Button>}
                      >
                        Cần ít nhất một tầng và một ca trực để bắt đầu điều phối.
                      </Alert>
                    ) : null}
                  </Box>
                </Paper>
              </Box>

              <Paper variant="outlined" sx={{ p: 2, overflow: "auto", maxHeight: { xl: "calc(100vh - 390px)" }, borderRadius: 2 }}>
                <Box sx={{ minWidth: 1740 }}>
<Box sx={{ display: "grid", gridTemplateColumns: "200px repeat(7, minmax(215px, 1fr))", gap: 1.25 }}>
                      <Box />
                      {days.map((day, index) => {
                        const isWeekend = index >= 5;
                        const isToday = toDateInput(day) === toDateInput(new Date());
                        return (
                          <Paper
                            key={day.toISOString()}
                            variant="outlined"
                            sx={{
                              p: 1,
                              textAlign: "center",
                              borderColor: isToday ? "primary.main" : isWeekend ? (t) => alpha(t.palette.secondary.main, 0.3) : "divider",
                              bgcolor: isWeekend
                                ? (t) => alpha(t.palette.secondary.main, t.palette.mode === "dark" ? 0.08 : 0.05)
                                : isToday
                                  ? (t) => alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.12 : 0.08)
                                  : "background.default",
                              animation: `${fadeInUp} 0.3s ease-out`,
                              animationDelay: `${index * 0.06}s`,
                              animationFillMode: "both",
                            }}
                          >
                            <Typography variant="caption" color={isWeekend ? "secondary.main" : "primary.main"} sx={{ fontWeight: 900, letterSpacing: 0.5 }}>{DAY_LABELS[index]}</Typography>
                            <Typography variant="body2" sx={{ fontWeight: isToday ? 900 : 500, color: isToday ? "primary.main" : "text.primary" }}>{toDateInput(day).slice(5)}</Typography>
                            {isToday && <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "primary.main", mx: "auto", mt: 0.25 }} />}
                          </Paper>
                        );
                      })}
                    </Box>
                  <Stack spacing={2} sx={{ mt: 1.5 }}>
                    {zones.map((zone) => (
                      <Box key={zone.id} sx={{ display: "grid", gridTemplateColumns: "200px repeat(7, minmax(215px, 1fr))", gap: 1.25 }}>
                        <Paper variant="outlined" sx={{ p: 1.75, bgcolor: "background.default", borderColor: "divider", borderRadius: 2, animation: `${slideInRight} 0.3s ease-out`, animationFillMode: "both" }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                            <MapIcon color="primary" fontSize="small" />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 900, lineHeight: 1.25 }} noWrap>{displayZoneName(zone)}</Typography>
                              <Typography variant="caption" color="text.secondary">Tầng {zone.floor}</Typography>
                            </Box>
                          </Stack>
                        </Paper>
                        {days.map((day) => (
                          <Stack key={`${zone.id}-${day.toISOString()}`} spacing={1}>
                            {shifts.map((shift) => {
                              const date = toDateInput(day);
                              const isPast = date < toDateInput(new Date());
                              return (
                                <Paper
                                  key={`${date}-${zone.id}-${shift.id}`}
                                  variant="outlined"
                                  sx={{
                                    p: 1.25,
                                    bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.92 : 1),
                                    borderColor: "divider",
                                    animation: `${fadeInUp} 0.3s ease-out`,
                                    animationFillMode: "both",
                                  }}
                                >
                                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 900 }} noWrap>{shift.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">{normalizeTime(shift.startTime)}-{normalizeTime(shift.endTime)}</Typography>
                                  </Stack>
                                  <DropCell
                                    id={`cell:${date}:${zone.id}:${shift.id}`}
                                    assignments={assignmentsForCell(date, zone.id, shift.id)}
                                    minStaff={shift.minStaff || 1}
                                    disabled={isPast}
                                    shiftName={shift.name}
                                    timeRange={`${normalizeTime(shift.startTime)}-${normalizeTime(shift.endTime)}`}
                                    zoneName={displayZoneName(zone)}
                                    onCellClick={(workDate, zoneId, shiftId, shiftName, timeRange, zoneName) => {
                                      setAssignDialog({
                                        open: true,
                                        staffId: "",
                                        workDate,
                                        zoneId,
                                        shiftId,
                                        shiftName,
                                        timeRange,
                                        zoneName,
                                        existingAssignments: assignmentsForCell(workDate, zoneId, shiftId),
                                      });
                                    }}
                                    onDelete={(item) => setConfirm({
                                      type: "assignment",
                                      id: item.id,
                                      title: "Xóa lịch trực đã phân?",
                                      message: `${item.staff?.fullName || item.staff?.email || "Nhân viên"} sẽ được gỡ khỏi ca ${shift.name} ngày ${date}.`,
                                    })}
                                  />
                                </Paper>
                              );
                            })}
                          </Stack>
                        ))}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Paper>
            </Stack>
            <DragOverlay dropAnimation={null}>
              <DragPreview staff={activeDragStaff} assignment={activeDragAssignment} />
            </DragOverlay>
          </DndContext>
        ) : (
          <Paper variant="outlined" sx={{ p: 2, animation: `${fadeInUp} 0.4s ease-out`, animationFillMode: "both" }}>
            <Typography variant="h6" sx={{ mb: 2, animation: `${fadeInUp} 0.3s ease-out`, animationFillMode: "both" }}>Lịch tuần của tôi</Typography>
            {assignments.length ? (
              <Stack spacing={1.5}>
                {assignments.map((item, idx) => {
                  const state = timeStateLabel(item);
                  const canCheckIn = item.status === "scheduled" || item.status === "confirmed";
                  const canCheckOut = item.status === "in_progress";
                  return (
                    <Paper key={item.id} variant="outlined" sx={{ p: 2, animation: `${fadeInUp} 0.3s ease-out`, animationDelay: `${idx * 0.06}s`, animationFillMode: "both" }}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 900 }}>{item.workDate} - {item.shift?.name || item.shiftId}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {normalizeTime(item.shift?.startTime)}-{normalizeTime(item.shift?.endTime)} tại {item.zone ? displayZoneName(item.zone) : item.zoneId}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0 }}>
                          <Chip size="small" color={state.color} label={state.label} sx={{ animation: `${successPop} 0.35s ease-out` }} />
                          {canCheckIn && (
                            <Button size="small" variant="contained" color="success" onClick={async () => {
                              try {
                                let lat: number | undefined;
                                let lng: number | undefined;
                                if (navigator.geolocation) {
                                  const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
                                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
                                  ).catch(() => null);
                                  if (pos) { lat = pos.coords.latitude; lng = pos.coords.longitude; }
                                }
                                await api.checkInScheduleAssignment(item.id, { method: "web", lat, lng });
                                await loadData();
                              } catch (err) { setError(getErrorMessage(err)); }
                            }}>Check-in</Button>
                          )}
                          {canCheckOut && (
                            <Button size="small" variant="outlined" color="warning" onClick={async () => {
                              try {
                                await api.checkOutScheduleAssignment(item.id);
                                await loadData();
                              } catch (err) { setError(getErrorMessage(err)); }
                            }}>Check-out</Button>
                          )}
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            ) : (
              <Alert severity="info">Bạn chưa có ca trực trong tuần này.</Alert>
            )}
          </Paper>
        )}</>);

            case 1:
              return (
                <Stack spacing={2} sx={{ animation: `${fadeInUp} 0.35s ease-out`, animationFillMode: "both" }}>
                  <Paper variant="outlined" sx={{ p: 2.5 }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2 }}>
                      <Avatar sx={{ bgcolor: "warning.main", color: "warning.contrastText" }}><GavelIcon /></Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 900 }}>Ca trống cần đăng ký</Typography>
                        <Typography variant="body2" color="text.secondary">Các ca thiếu nhân sự — Nhấn "Đăng ký" để ứng tuyển ca trống.</Typography>
                      </Box>
                    </Stack>
                    {openShifts.length === 0 ? (
                      <Alert severity="success">Hiện tại không có ca trống nào cần đăng ký.</Alert>
                    ) : (
                      <Stack spacing={1.5} sx={{ maxHeight: 520, overflowY: "auto" }}>
                        {openShifts.map((item, idx) => {
                          const key = `${item.workDate}-${item.zone.id}-${item.shift.id}`;
                          const myPendingBid = bids.find((b) => b.assignmentId === key && b.status === "pending");
                          return (
                            <Paper key={key} variant="outlined" sx={{ p: 2, animation: `${slideInRight} 0.3s ease-out`, animationDelay: `${idx * 0.04}s`, animationFillMode: "both" }}>
                              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
                                <Box>
                                  <Typography variant="body1" sx={{ fontWeight: 900 }}>{item.shift.name} — {displayZoneName(item.zone)}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {item.workDate} · {normalizeTime(item.shift.startTime)}-{normalizeTime(item.shift.endTime)}
                                  </Typography>
                                </Box>
                                <Button
                                  variant={myPendingBid ? "outlined" : "contained"}
                                  color={myPendingBid ? "success" : "primary"}
                                  size="small"
                                  disabled={!!myPendingBid}
                                  onClick={() => setBidDialog({ open: true, assignmentId: key, note: "" })}
                                  sx={{ flexShrink: 0 }}
                                >
                                  {myPendingBid ? "Đã đăng ký" : "Đăng ký"}
                                </Button>
                              </Stack>
                            </Paper>
                          );
                        })}
                      </Stack>
                    )}
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 2.5 }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2 }}>
                      <Avatar sx={{ bgcolor: "info.main", color: "info.contrastText" }}><GavelIcon /></Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 900 }}>Đăng ký của tôi</Typography>
                        <Typography variant="body2" color="text.secondary">Các ca bạn đã đăng ký ứng tuyển.</Typography>
                      </Box>
                    </Stack>
                    {bids.length === 0 ? (
                      <Alert severity="info">Bạn chưa đăng ký ca trống nào.</Alert>
                    ) : (
                      <Stack spacing={1}>
                        {bids.map((bid, idx) => (
                          <Paper key={bid.id} variant="outlined" sx={{ p: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", animation: `${fadeInUp} 0.3s ease-out`, animationDelay: `${idx * 0.04}s`, animationFillMode: "both" }}>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                {bid.assignment?.shift?.name || "Ca"} — {bid.assignment?.zone ? displayZoneName(bid.assignment.zone) : ""}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">{bid.assignment?.workDate || ""}</Typography>
                            </Box>
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                              <Chip size="small" color={bid.status === "pending" ? "warning" : bid.status === "approved" ? "success" : "default"} label={bid.status === "pending" ? "Chờ duyệt" : bid.status === "approved" ? "Đã duyệt" : "Đã hủy"} />
                              {bid.status === "pending" && (
                                <Button size="small" color="error" onClick={() => api.cancelBid(bid.id).then(loadBiddingAndSwapData)}>Hủy</Button>
                              )}
                            </Stack>
                          </Paper>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                </Stack>
              );

            case 2:
              return (
                <Stack spacing={2} sx={{ animation: `${fadeInUp} 0.35s ease-out`, animationFillMode: "both" }}>
                  <Paper variant="outlined" sx={{ p: 2.5 }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2 }}>
                      <Avatar sx={{ bgcolor: "secondary.main", color: "secondary.contrastText" }}><SwapHorizIcon /></Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 900 }}>Yêu cầu đổi ca</Typography>
                        <Typography variant="body2" color="text.secondary">Gửi yêu cầu đổi ca với đồng nghiệp hoặc phê duyệt yêu cầu từ người khác.</Typography>
                      </Box>
                    </Stack>
                    {swaps.length === 0 ? (
                      <Alert severity="info">Chưa có yêu cầu đổi ca nào.</Alert>
                    ) : (
                      <Stack spacing={1.5}>
                        {swaps.map((swap, idx) => {
                          const isTarget = swap.targetStaffId === user?.id;
                          return (
                            <Paper key={swap.id} variant="outlined" sx={{ p: 2, animation: `${slideInRight} 0.3s ease-out`, animationDelay: `${idx * 0.04}s`, animationFillMode: "both" }}>
                              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between" }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 900 }}>{swap.requester?.fullName || swap.requesterStaffId}</Typography>
                                    <SwapHorizIcon fontSize="small" color="action" />
                                    <Typography variant="body2" sx={{ fontWeight: 900 }}>{swap.target?.fullName || swap.targetStaffId}</Typography>
                                  </Stack>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                                    {swap.requesterAssignment?.workDate} · {swap.requesterAssignment?.shift?.name || ""} tại {swap.requesterAssignment?.zone ? displayZoneName(swap.requesterAssignment.zone) : ""}
                                  </Typography>
                                  {swap.reason && <Typography variant="caption" color="text.secondary">Lý do: {swap.reason}</Typography>}
                                </Box>
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0 }}>
                                  <Chip size="small" color={swap.status === "pending" ? "warning" : swap.status === "accepted" ? "success" : "default"} label={swap.status === "pending" ? "Chờ duyệt" : swap.status === "accepted" ? "Đã chấp nhận" : "Từ chối"} />
                                  {swap.status === "pending" && isTarget && (
                                    <>
                                      <Button size="small" color="success" variant="contained" onClick={() => api.respondSwap(swap.id, { action: "accepted" }).then(loadBiddingAndSwapData)}>Chấp nhận</Button>
                                      <Button size="small" color="error" onClick={() => api.respondSwap(swap.id, { action: "rejected" }).then(loadBiddingAndSwapData)}>Từ chối</Button>
                                    </>
                                  )}
                                </Stack>
                              </Stack>
                            </Paper>
                          );
                        })}
                      </Stack>
                    )}
                  </Paper>
                </Stack>
              );

            default:
              return null;
          }
        })()}
        </Box>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)}>
        <DialogTitle>{confirm?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirm?.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Hủy</Button>
          <Button color="error" variant="contained" onClick={runConfirm} disabled={saving}>Xóa</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!assignDialog}
        onClose={() => !saving && setAssignDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Phân ca trực</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            <Paper variant="outlined" sx={{ p: 1.75 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                <MapIcon fontSize="small" color="primary" />
                <Typography variant="body2" sx={{ fontWeight: 900 }}>{assignDialog?.shiftName}</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ pl: 3.5 }}>
                {assignDialog?.timeRange} &bull; {assignDialog?.zoneName} &bull; {assignDialog?.workDate}
              </Typography>
            </Paper>

            {assignDialog && assignDialog.existingAssignments.length > 0 && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", display: "block", mb: 1 }}>
                  Đã phân ({assignDialog.existingAssignments.length})
                </Typography>
                <Stack spacing={1}>
                  {assignDialog.existingAssignments.map((item) => (
                    <Paper key={item.id} variant="outlined" sx={{ p: 1.25, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", color: "primary.contrastText", fontSize: 12, fontWeight: 900 }}>
                          {initials(item.staff?.fullName, item.staff?.email)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>{item.staff?.fullName || item.staff?.email}</Typography>
                          <Typography variant="caption" color="text.secondary">{item.staff?.email}</Typography>
                        </Box>
                      </Stack>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setAssignDialog(null);
                          setConfirm({
                            type: "assignment",
                            id: item.id,
                            title: "Xóa lịch trực đã phân?",
                            message: `${item.staff?.fullName || item.staff?.email || "Nhân viên"} sẽ được gỡ khỏi ca ${assignDialog.shiftName} ngày ${assignDialog.workDate}.`,
                          });
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}

            <FormControl fullWidth size="small">
              <InputLabel>Chọn nhân viên</InputLabel>
              <Select
                value={assignDialog?.staffId ?? ""}
                label="Chọn nhân viên"
                onChange={(e) => {
                  const staffId = e.target.value;
                  if (staffId) {
                    setAssignDialog((prev) => prev ? { ...prev, staffId } : null);
                  }
                }}
              >
                {staff
                  .filter((s) => s.role === "admin" || s.role === "staff")
                  .filter((s) => !assignDialog?.existingAssignments.some((a) => a.staffId === s.id))
                  .map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                        <Avatar sx={{ width: 30, height: 30, bgcolor: "primary.main", color: "primary.contrastText", fontSize: 11, fontWeight: 900 }}>
                          {initials(s.fullName, s.email)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>{s.fullName || s.email}</Typography>
                          <Typography variant="caption" color="text.secondary">{s.email}</Typography>
                        </Box>
                      </Stack>
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog(null)} disabled={saving}>Hủy</Button>
          <Button
            variant="contained"
            onClick={runAssign}
            disabled={saving || !assignDialog?.staffId}
          >
            Phân
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bidDialog.open} onClose={() => setBidDialog((d) => ({ ...d, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>Đăng ký ca trống</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            <Alert severity="info">
              Bạn sẽ gửi đơn đăng ký cho ca trống này. Admin sẽ xét duyệt.
            </Alert>
            <TextField
              label="Ghi chú (tùy chọn)"
              fullWidth
              multiline
              rows={2}
              value={bidDialog.note}
              onChange={(e) => setBidDialog((d) => ({ ...d, note: e.target.value }))}
              placeholder="VD: Tôi có thể làm thêm ca này..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBidDialog((d) => ({ ...d, open: false }))}>Hủy</Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await api.createBid({ assignmentId: bidDialog.assignmentId, note: bidDialog.note || null });
                setBidDialog((d) => ({ ...d, open: false }));
                await loadBiddingAndSwapData();
              } catch (err) {
                setError(getErrorMessage(err));
              } finally {
                setSaving(false);
              }
            }}
          >
            Gửi đăng ký
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={autoDialog.open} onClose={() => setAutoDialog((d) => ({ ...d, open: false }))} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <AutoAwesomeIcon color="secondary" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Gợi ý lịch trực tự động</Typography>
              <Typography variant="caption" color="text.secondary">{from} → {to}</Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Alert severity="info">{autoDialog.proposed.length} ca được đề xuất · {autoDialog.skipped} ca bỏ qua do xung đột.</Alert>
            <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
              <Stack spacing={1}>
                {autoDialog.proposed.map((p, idx) => {
                  const shift = shifts.find((s) => s.id === p.shiftId);
                  const zone = zones.find((z) => z.id === p.zoneId);
                  const s = staff.find((s) => s.id === p.staffId);
                  return (
                    <Paper key={`${p.workDate}-${p.shiftId}-${p.zoneId}-${p.staffId}`} variant="outlined" sx={{ p: 1.5, animation: `${fadeInUp} 0.25s ease-out`, animationDelay: `${idx * 0.02}s`, animationFillMode: "both" }}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main", color: "secondary.contrastText", fontSize: 11, fontWeight: 900 }}>
                          {initials(s?.fullName, s?.email)}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>{s?.fullName || s?.email || p.staffId}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {p.workDate} · {shift?.name || ""} · {zone ? displayZoneName(zone) : ""} ({normalizeTime(shift?.startTime)}-{normalizeTime(shift?.endTime)})
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAutoDialog((d) => ({ ...d, open: false }))}>Hủy</Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AutoAwesomeIcon />}
            disabled={autoDialog.saving || autoDialog.proposed.length === 0}
            onClick={async () => {
              setAutoDialog((d) => ({ ...d, saving: true }));
              try {
                for (const p of autoDialog.proposed) {
                  await api.createScheduleAssignment(p);
                }
                setAutoDialog({ open: false, proposed: [], skipped: 0, saving: false });
                await loadData();
              } catch (err) {
                setError(getErrorMessage(err));
                setAutoDialog((d) => ({ ...d, saving: false }));
              }
            }}
          >
            {autoDialog.saving ? "Đang tạo..." : `Áp dụng ${autoDialog.proposed.length} ca`}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={geofenceDialog} onClose={() => setGeofenceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <LocationOnIcon color="primary" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Cấu hình GPS khu vực</Typography>
              <Typography variant="caption" color="text.secondary">Thiết lập tọa độ cho từng tầng để xác thực check-in.</Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {zones.map((zone) => {
              const config = geofenceConfigs.find((c) => c.zoneId === zone.id);
              const isEditing = editingGeofence?.zoneId === zone.id;
              return (
                <Paper key={zone.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{displayZoneName(zone)}</Typography>
                      {config && !isEditing ? (
                        <Chip size="small" color="success" label={`${config.radiusMeters}m · ${config.latitude.toFixed(4)}, ${config.longitude.toFixed(4)}`} />
                      ) : null}
                    </Stack>
                    {isEditing ? (
                      <Stack spacing={1.5}>
                        <Stack direction="row" spacing={1}>
                          <TextField label="Vĩ độ" type="number" size="small" value={editingGeofence!.latitude} onChange={(e) => setEditingGeofence((d) => d ? { ...d, latitude: e.target.value } : null)} fullWidth slotProps={{ htmlInput: { step: 0.0001 } }} />
                          <TextField label="Kinh độ" type="number" size="small" value={editingGeofence!.longitude} onChange={(e) => setEditingGeofence((d) => d ? { ...d, longitude: e.target.value } : null)} fullWidth slotProps={{ htmlInput: { step: 0.0001 } }} />
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <TextField label="Bán kính (m)" type="number" size="small" value={editingGeofence!.radiusMeters} onChange={(e) => setEditingGeofence((d) => d ? { ...d, radiusMeters: e.target.value } : null)} sx={{ width: 150 }} slotProps={{ htmlInput: { min: 10 } }} />
                          <TextField label="Gợi ý địa chỉ" size="small" value={editingGeofence!.addressHint} onChange={(e) => setEditingGeofence((d) => d ? { ...d, addressHint: e.target.value } : null)} fullWidth placeholder="VD: Tầng 1, Đại học..." />
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="contained" onClick={async () => {
                            if (!editingGeofence) return;
                            const lat = parseFloat(editingGeofence.latitude);
                            const lng = parseFloat(editingGeofence.longitude);
                            if (isNaN(lat) || isNaN(lng)) { setError("Vui lòng nhập tọa độ (vĩ độ, kinh độ) hợp lệ."); return; }
                            try {
                              await api.setGeofenceConfig({
                                zoneId: editingGeofence.zoneId,
                                latitude: lat,
                                longitude: lng,
                                radiusMeters: parseInt(editingGeofence.radiusMeters) || 100,
                                addressHint: editingGeofence.addressHint || null,
                              });
                              setEditingGeofence(null);
                              setGeofenceConfigs(await api.getGeofenceConfigs());
                            } catch (err) { setError(getErrorMessage(err)); }
                          }}>Lưu</Button>
                          <Button size="small" onClick={() => setEditingGeofence(null)}>Hủy</Button>
                          <Button size="small" color="secondary" onClick={() => {
                            if (!navigator.geolocation) { setError("Trình duyệt không hỗ trợ GPS."); return; }
                            navigator.geolocation.getCurrentPosition(
                              (pos) => setEditingGeofence((d) => d ? { ...d, latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude) } : null),
                              () => setError("Không thể lấy vị trí GPS."),
                              { timeout: 10000 },
                            );
                          }}>Lấy vị trí hiện tại</Button>
                        </Stack>
                      </Stack>
                    ) : (
                      <Stack direction="row" spacing={1}>
                        <Button size="small" startIcon={<LocationOnIcon />} onClick={() => {
                          setEditingGeofence({
                            zoneId: zone.id,
                            zoneName: displayZoneName(zone),
                            latitude: String(config?.latitude ?? ""),
                            longitude: String(config?.longitude ?? ""),
                            radiusMeters: String(config?.radiusMeters ?? 100),
                            addressHint: config?.addressHint ?? "",
                          });
                        }}>
                          {config ? "Sửa" : "Thiết lập"}
                        </Button>
                        {config && (
                          <Button size="small" color="error" onClick={async () => {
                            try {
                              await api.deleteGeofenceConfig(zone.id);
                              setGeofenceConfigs(await api.getGeofenceConfigs());
                            } catch (err) { setError(getErrorMessage(err)); }
                          }}>Xóa</Button>
                        )}
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setGeofenceDialog(false); setEditingGeofence(null); }}>Đóng</Button>
        </DialogActions>
      </Dialog>
        </Box>
      </Box>
  );
}
