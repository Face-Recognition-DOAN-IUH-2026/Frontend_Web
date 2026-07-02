"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import api from "@/lib/api-client";
import type { LibraryZone, StaffShift, ScheduleStaff } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  zones: LibraryZone[];
  shifts: StaffShift[];
  staff: ScheduleStaff[];
  onUpdated: () => void;
}

function getApiError(err: any): string {
  const data = err?.response?.data;
  return data?.error || data?.message || err?.message || "Có lỗi xảy ra";
}

const DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export default function TemplateManagementPanel({ open, onClose, zones, shifts, staff, onUpdated }: Props) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([1]);
  const [shiftId, setShiftId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await api.getScheduleTemplates();
      setTemplates(result);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim() || !shiftId || !zoneId || !staffId || selectedDays.length === 0) {
      setError("Vui lòng điền tên mẫu, chọn ca trực, khu vực, nhân viên và ít nhất 1 ngày trong tuần");
      return;
    }
    const duplicate = selectedDays.some((day) =>
      templates.some((t) => t.shiftId === shiftId && t.zoneId === zoneId && t.dayOfWeek === day && t.staffId === staffId)
    );
    if (duplicate) {
      setError("Nhân viên này đã có ca trực trong khung giờ/khu vực này vào ngày đã chọn");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      for (const day of selectedDays) {
        await api.createScheduleTemplate({
          name: name.trim(),
          dayOfWeek: day,
          shiftId,
          zoneId,
          staffId,
          validFrom: validFrom || undefined,
          validTo: validTo || undefined,
        });
      }
      setName(""); setShiftId(""); setZoneId(""); setStaffId(""); setValidFrom(""); setValidTo("");
      setSelectedDays([1]);
      await loadData();
      onUpdated();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (id: string) => {
    setDeleteTargetId(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await api.deleteScheduleTemplate(deleteTargetId);
      await loadData();
      onUpdated();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteTargetId(null);
    }
  };

  const getStaffName = (id: string) => {
    const s = staff.find((x) => x.id === id);
    return s?.fullName || s?.email || "Nhân viên";
  };
  const getShiftName = (id: string) => shifts.find((s) => s.id === id)?.name || "Ca";
  const getZoneName = (id: string) => zones.find((z) => z.id === id)?.zoneName || "Khu vực";

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose} sx={{ zIndex: 1300 }}>
        <Box sx={{ width: { xs: "100%", sm: 420 }, height: "100%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700 }}>
              Mẫu lịch tự động
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

            <Stack spacing={1.5}>
              <TextField
                size="small"
                placeholder="Tên mẫu (vd: Ca sáng T2-T6)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
              />

              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Ngày trong tuần</Typography>
                <ToggleButtonGroup
                  value={selectedDays}
                  onChange={(_, v) => setSelectedDays(v)}
                  size="small"
                  sx={{ flexWrap: "wrap", gap: 0.5, "& .MuiToggleButton-root": { px: 1, py: 0.25, fontSize: "0.7rem", textTransform: "none", borderRadius: 1 } }}
                >
                  {DAYS.map((d, i) => (
                    <ToggleButton key={i} value={i}>{d}</ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              <TextField
                select
                size="small"
                label="Ca trực"
                value={shiftId}
                onChange={(e) => setShiftId(e.target.value)}
                fullWidth
              >
                <MenuItem value="">Chọn ca trực</MenuItem>
                {shifts.filter((s) => s.isActive).map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name} ({s.startTime?.slice(0, 5)}-{s.endTime?.slice(0, 5)})</MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Khu vực"
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                fullWidth
              >
                <MenuItem value="">Chọn khu vực</MenuItem>
                {zones.filter((z) => z.isActive).map((z) => (
                  <MenuItem key={z.id} value={z.id}>{z.zoneName} (Tầng {z.floor})</MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Nhân viên"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                fullWidth
              >
                <MenuItem value="">Chọn nhân viên</MenuItem>
                {staff.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.fullName || s.email}</MenuItem>
                ))}
              </TextField>

              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Thời hạn áp dụng</Typography>
                <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
                  <Button
                    size="small"
                    variant={!validFrom && !validTo ? "contained" : "outlined"}
                    onClick={() => { setValidFrom(""); setValidTo(""); }}
                    sx={{ fontSize: "0.65rem", textTransform: "none" }}
                  >
                    Vô thời hạn
                  </Button>
                  <Button
                    size="small"
                    variant={validFrom && validTo && validFrom.startsWith(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`) ? "contained" : "outlined"}
                    onClick={() => {
                      const now = new Date();
                      const first = new Date(now.getFullYear(), now.getMonth(), 1);
                      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                      setValidFrom(first.toISOString().split("T")[0]);
                      setValidTo(last.toISOString().split("T")[0]);
                    }}
                    sx={{ fontSize: "0.65rem", textTransform: "none" }}
                  >
                    Tháng này
                  </Button>
                  <Button
                    size="small"
                    variant={validFrom && validTo && validFrom.startsWith(`${new Date().getFullYear()}-${String(new Date().getMonth() + 2).padStart(2, '0')}`) ? "contained" : "outlined"}
                    onClick={() => {
                      const now = new Date();
                      const first = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                      const last = new Date(now.getFullYear(), now.getMonth() + 2, 0);
                      setValidFrom(first.toISOString().split("T")[0]);
                      setValidTo(last.toISOString().split("T")[0]);
                    }}
                    sx={{ fontSize: "0.65rem", textTransform: "none" }}
                  >
                    Tháng sau
                  </Button>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small"
                    type="date"
                    label="Từ ngày"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    sx={{ flex: 1 }}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    size="small"
                    type="date"
                    label="Đến ngày"
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                    sx={{ flex: 1 }}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="small"
                onClick={handleCreate}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
              >
                {saving ? "Đang tạo..." : "Thêm mẫu"}
              </Button>
            </Stack>

            <Divider />

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Đã tạo ({templates.length})
              </Typography>
              {loading && <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", mt: 0.5 }}>Đang tải...</Typography>}
              {!loading && templates.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", mt: 0.5 }}>Chưa có mẫu nào</Typography>
              )}
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                {templates.map((t) => (
                  <Box key={t.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1.5, py: 1, borderRadius: 1, bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{t.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {DAYS[t.dayOfWeek]} · {getShiftName(t.shiftId)} · {getZoneName(t.zoneId)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {getStaffName(t.staffId)}
                        {t.validFrom ? ` (${t.validFrom} → ${t.validTo || "..."})` : " (Vô thời hạn)"}
                      </Typography>
                    </Box>
                    <IconButton size="small" color="error" onClick={() => openDeleteConfirm(t.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Box>
        </Box>
      </Drawer>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <DialogContentText>Xóa mẫu lịch này?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Hủy</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">Xóa</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
