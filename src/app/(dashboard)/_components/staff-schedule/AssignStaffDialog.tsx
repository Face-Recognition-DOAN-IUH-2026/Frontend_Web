"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import api from "@/lib/api-client";
import type { ScheduleStaff, StaffShift, LibraryZone, StaffScheduleAssignment } from "@/lib/types";

interface AssignStaffDialogProps {
  open: boolean;
  date: string;
  shiftId: string;
  shiftName: string;
  shifts: StaffShift[];
  zones: LibraryZone[];
  staff: ScheduleStaff[];
  existingAssignments: StaffScheduleAssignment[];
  dayAssignments: StaffScheduleAssignment[];
  onClose: () => void;
  onAssigned: () => void;
}

export default function AssignStaffDialog({
  open,
  date,
  shiftId,
  shiftName,
  shifts,
  zones,
  staff,
  existingAssignments,
  dayAssignments,
  onClose,
  onAssigned,
}: AssignStaffDialogProps) {
  const [zoneId, setZoneId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forceSave, setForceSave] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const shift = useMemo(() => shifts.find((s) => s.id === shiftId), [shifts, shiftId]);

  const existingStaffIds = useMemo(
    () => new Set(existingAssignments.map((a) => a.staffId)),
    [existingAssignments],
  );

  const availableStaff = useMemo(
    () => staff.filter((s) => !existingStaffIds.has(s.id)),
    [staff, existingStaffIds],
  );

  const reset = () => {
    setZoneId("");
    setStaffId("");
    setError(null);
    setForceSave(false);
    setWarnings([]);
  };

  const gatherWarnings = (): string[] => {
    const w: string[] = [];
    const selectedStaff = staff.find((s) => s.id === staffId);
    if (!selectedStaff) return w;
    const existAsg = dayAssignments.find((a) => a.staffId === staffId);
    if (existAsg) {
      const existShift = shifts.find((sh) => sh.id === existAsg.shiftId);
      const newStart = shift?.startTime?.slice(0, 5);
      const newEnd = shift?.endTime?.slice(0, 5);
      const existStart = existShift?.startTime?.slice(0, 5);
      const existEnd = existShift?.endTime?.slice(0, 5);
      const isOverlap = newStart && newEnd && existStart && existEnd && (newStart < existEnd && newEnd > existStart);
      if (isOverlap) {
        w.push(`${selectedStaff.fullName || selectedStaff.email} đã có ca ${existShift?.name || existAsg.shiftId} trùng giờ`);
      }
    }
    return w;
  };

  const handleAssign = async () => {
    if (!zoneId || !staffId) {
      setError("Vui lòng chọn khu vực và nhân viên");
      return;
    }
    const w = gatherWarnings();
    if (w.length > 0 && !forceSave) {
      setWarnings(w);
      return;
    }
    setSaving(true);
    setError(null);
    setWarnings([]);
    try {
      const params: any = { staffId, shiftId, zoneId, workDate: date };
      if (forceSave && w.length > 0) params.force = true;
      await api.createScheduleAssignment(params);
      reset();
      onAssigned();
    } catch (err: any) {
      const data = err?.response?.data;
      setError(data?.error || data?.message || data?.detail?.[0]?.message || err?.message || "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  const getStaffLabel = (s: ScheduleStaff) => {
    const existAsg = dayAssignments.find((a) => a.staffId === s.id);
    if (existAsg) {
      const existShift = shifts.find((sh) => sh.id === existAsg.shiftId);
      const newStart = shift?.startTime?.slice(0, 5);
      const newEnd = shift?.endTime?.slice(0, 5);
      const existStart = existShift?.startTime?.slice(0, 5);
      const existEnd = existShift?.endTime?.slice(0, 5);
      const isOverlap = newStart && newEnd && existStart && existEnd && (newStart < existEnd && newEnd > existStart);

      if (isOverlap) {
        return `${s.fullName || s.email} (⚠ Trùng ca: ${existShift?.name || existAsg.shiftId})`;
      }
      return `${s.fullName || s.email} (Đã có ca: ${existShift?.name || existAsg.shiftId})`;
    }
    return s.fullName || s.email;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        Phân ca trực
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Ngày: {date}
            </Typography>
            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, ml: 1 }}>
              Ca: {shiftName}
            </Typography>
            {shift && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {shift.startTime?.slice(0, 5)} &ndash; {shift.endTime?.slice(0, 5)}
              </Typography>
            )}
          </Box>

          <TextField
            select
            size="small"
            label="Khu vực"
            value={zoneId}
            onChange={(e) => { setZoneId(e.target.value); setError(null); }}
            fullWidth
          >
            <MenuItem value="">Chọn khu vực</MenuItem>
            {zones.map((z) => (
              <MenuItem key={z.id} value={z.id}>{z.zoneName}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label={
              <span>
                Nhân viên
                {availableStaff.length < staff.length && (
                  <span style={{ fontWeight: 400, color: "#999", marginLeft: 4 }}>
                    ({staff.length - availableStaff.length} đã xếp)
                  </span>
                )}
              </span>
            }
            value={staffId}
            onChange={(e) => { setStaffId(e.target.value); setError(null); }}
            fullWidth
          >
            <MenuItem value="">Chọn nhân viên</MenuItem>
            {availableStaff.map((s) => (
              <MenuItem key={s.id} value={s.id}>{getStaffLabel(s)}</MenuItem>
            ))}
            {availableStaff.length === 0 && (
              <MenuItem disabled>Tất cả nhân viên đã được xếp</MenuItem>
            )}
          </TextField>

          {error && <Alert severity="error">{error}</Alert>}

          {warnings.length > 0 && (
            <Box>
              <Alert severity="warning" sx={{ mb: 1 }}>
                {warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
              </Alert>
              <FormControlLabel
                control={<Checkbox checked={forceSave} onChange={(e) => setForceSave(e.target.checked)} size="small" />}
                label="Vẫn xếp ca bất chấp cảnh báo"
              />
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" size="small">Hủy</Button>
        <Button
          onClick={handleAssign}
          variant="contained"
          size="small"
          disabled={saving || availableStaff.length === 0}
        >
          {saving ? <CircularProgress size={14} color="inherit" /> : "Xếp ca"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
