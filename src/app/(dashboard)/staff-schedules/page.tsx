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
  IconButton,
  Paper,
  Stack,
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
import MapIcon from "@mui/icons-material/MapOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import UsersIcon from "@mui/icons-material/GroupsOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useColorMode } from "@/lib/mui-theme";
import type { LibraryZone, ScheduleStaff, StaffScheduleAssignment, StaffShift } from "@/lib/types";

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type ConfirmState =
  | { type: "assignment"; id: string; title: string; message: string }
  | { type: "zone"; zone: LibraryZone; title: string; message: string }
  | { type: "shift"; shift: StaffShift; title: string; message: string }
  | null;

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

function StaffCard({ staff }: { staff: ScheduleStaff }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `staff:${staff.id}` });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

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
        opacity: isDragging ? 0.65 : 1,
        borderColor: isDragging ? "primary.main" : "divider",
        bgcolor: "background.paper",
        boxShadow: isDragging ? 4 : 0,
        transition: "border-color 120ms ease, box-shadow 120ms ease",
        "&:hover": {
          borderColor: "primary.main",
          boxShadow: 2,
        },
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
        <Avatar sx={{ width: 40, height: 40, bgcolor: "primary.main", color: "primary.contrastText", fontSize: 13, fontWeight: 900 }}>
          {initials(staff.fullName, staff.email)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>{staff.fullName || staff.email}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{staff.email}</Typography>
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
  const displayEmail = item.staff?.email || "Nh?n vi?n tr?c";

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
        opacity: isDragging ? 0.7 : 1,
        bgcolor: "background.paper",
        cursor: "grab",
        touchAction: "none",
        userSelect: "none",
        borderColor: "divider",
        overflow: "hidden",
        "&:hover": { borderColor: "primary.main" },
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
            color={state.color}
            label={state.label}
            sx={{
              mt: 0.75,
              height: 22,
              minWidth: 74,
              maxWidth: "none",
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
      <Tooltip title="X?a l?ch">
        <IconButton
          size="small"
          color="error"
          sx={{
            position: "absolute",
            right: 6,
            top: 6,
            bgcolor: "background.default",
            "&:hover": { bgcolor: "error.main", color: "error.contrastText" },
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

function DropCell({
  id,
  assignments,
  minStaff,
  onDelete,
}: {
  id: string;
  assignments: StaffScheduleAssignment[];
  minStaff: number;
  onDelete: (item: StaffScheduleAssignment) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const understaffed = assignments.length < minStaff;
  const theme = useTheme();

  return (
    <Box
      ref={setNodeRef}
      sx={{
        minHeight: 156,
        border: 2,
        borderStyle: "dashed",
        borderColor: isOver ? "primary.main" : understaffed ? "warning.main" : "divider",
        bgcolor: isOver
          ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.22 : 0.12)
          : understaffed
            ? alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.16 : 0.1)
            : alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.72 : 0.88),
        color: "text.primary",
        borderRadius: 1,
        p: 1.25,
        transition: "background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease",
        boxShadow: isOver ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.25)}` : "none",
      }}
    >
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography
          variant="caption"
          color={understaffed && !isOver ? "warning.main" : "text.secondary"}
          noWrap
          sx={{ fontWeight: 800, minWidth: 92, flexShrink: 0 }}
        >
          {assignments.length}/{minStaff} nhân viên
        </Typography>
        {understaffed ? <Chip size="small" color="warning" label="Thiếu" sx={{ height: 20, flexShrink: 0, minWidth: 58 }} /> : null}
      </Stack>
      {assignments.length ? (
        <Stack spacing={1}>
          {assignments.map((item) => <AssignmentCard key={item.id} item={item} onDelete={onDelete} />)}
        </Stack>
      ) : (
        <Box sx={{ minHeight: 104, display: "grid", placeItems: "center", textAlign: "center", color: "text.secondary", borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.06 : 0.04) }}>
          <Typography variant="body2" sx={{ fontWeight: 800 }}>Thả nhân viên vào đây</Typography>
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const assignmentsForCell = (workDate: string, zoneId: string, shiftId: string) =>
    assignments.filter((item) => item.workDate === workDate && item.zoneId === zoneId && item.shiftId === shiftId && item.status !== "cancelled");

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
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 2 }}>
        {error ? <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert> : null}
        {loading ? (
          <Paper variant="outlined" sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
            <CircularProgress />
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
                    {staff.length ? staff.map((item) => <StaffCard key={item.id} staff={item} />) : (
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
                        {zones.map((zone) => (
                          <Paper key={zone.id} variant="outlined" sx={{ p: 1, display: "flex", alignItems: "center", gap: 1 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>{displayZoneName(zone)}</Typography>
                              <Typography variant="caption" color="text.secondary">Tầng {zone.floor}</Typography>
                            </Box>
                            <IconButton
                              size="small"
                              color="error"
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
                        {shifts.map((shift) => (
                          <Paper key={shift.id} variant="outlined" sx={{ p: 1, display: "flex", alignItems: "center", gap: 1 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>{shift.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {normalizeTime(shift.startTime)}-{normalizeTime(shift.endTime)} · {shift.minStaff} nhân viên
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              color="error"
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

              <Paper variant="outlined" sx={{ p: 2, overflow: "auto", maxHeight: { xl: "calc(100vh - 390px)" } }}>
                <Box sx={{ minWidth: 1740 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "200px repeat(7, minmax(215px, 1fr))", gap: 1.25 }}>
                    <Box />
                    {days.map((day, index) => (
                      <Paper key={day.toISOString()} variant="outlined" sx={{ p: 1, textAlign: "center", bgcolor: "background.default" }}>
                        <Typography variant="caption" color="primary" sx={{ fontWeight: 900 }}>{DAY_LABELS[index]}</Typography>
                        <Typography variant="body2">{toDateInput(day).slice(5)}</Typography>
                      </Paper>
                    ))}
                  </Box>
                  <Stack spacing={2} sx={{ mt: 1.5 }}>
                    {zones.map((zone) => (
                      <Box key={zone.id} sx={{ display: "grid", gridTemplateColumns: "200px repeat(7, minmax(215px, 1fr))", gap: 1.25 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "background.default" }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                            <MapIcon color="primary" fontSize="small" />
                            <Typography sx={{ fontWeight: 900 }}>{displayZoneName(zone)}</Typography>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">Tầng {zone.floor}</Typography>
                        </Paper>
                        {days.map((day) => (
                          <Stack key={`${zone.id}-${day.toISOString()}`} spacing={1}>
                            {shifts.map((shift) => {
                              const date = toDateInput(day);
                              return (
                                <Paper
                                  key={`${date}-${zone.id}-${shift.id}`}
                                  variant="outlined"
                                  sx={{
                                    p: 1.25,
                                    bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.92 : 1),
                                    borderColor: "divider",
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
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Lịch tuần của tôi</Typography>
            {assignments.length ? (
              <Stack spacing={1.5}>
                {assignments.map((item) => {
                  const state = timeStateLabel(item);
                  return (
                    <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between" }}>
                        <Box>
                          <Typography sx={{ fontWeight: 900 }}>{item.workDate} - {item.shift?.name || item.shiftId}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {normalizeTime(item.shift?.startTime)}-{normalizeTime(item.shift?.endTime)} tại {item.zone ? displayZoneName(item.zone) : item.zoneId}
                          </Typography>
                        </Box>
                        <Chip size="small" color={state.color} label={state.label} />
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            ) : (
              <Alert severity="info">Bạn chưa có ca trực trong tuần này.</Alert>
            )}
          </Paper>
        )}
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
    </Box>
  );
}
