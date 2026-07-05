"use client";

import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import Alert from "antd/es/alert";
import Modal from "antd/es/modal";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import api from "@/lib/api-client";
import type { LibraryZone, StaffShift } from "@/lib/types";

interface ScheduleManagementPanelProps {
  open: boolean;
  onClose: () => void;
  zones: LibraryZone[];
  shifts: StaffShift[];
  onUpdate: () => void;
}

function getApiError(err: any): string {
  const data = err?.response?.data;
  return data?.error || data?.message || err?.message || "Có lỗi xảy ra";
}

export default function ScheduleManagementPanel({
  open, onClose, zones, shifts, onUpdate,
}: ScheduleManagementPanelProps) {
  const [tab, setTab] = useState<"zones" | "shifts">("zones");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [zoneFloor, setZoneFloor] = useState("1");
  const [zoneName, setZoneName] = useState("");

  const [shiftName, setShiftName] = useState("");
  const [startTime, setStartTime] = useState("07:30");
  const [endTime, setEndTime] = useState("11:30");
  const [minStaff, setMinStaff] = useState("1");

  const handleCreateZone = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.createScheduleZone({ floor: Number(zoneFloor) || 1, zoneName: zoneName.trim() || `Tầng ${zoneFloor}` });
      setZoneName("");
      onUpdate();
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const openDeleteZoneConfirm = async (id: string) => {
    let warning = "";
    try {
      const assignments = await api.getScheduleAssignments({ zoneId: id });
      const active = assignments.items.filter((a: any) => a.status === "scheduled" || a.status === "confirmed");
      if (active.length > 0) warning = `Có ${active.length} ca trực đang chờ xử lý sử dụng khu vực này. `;
    } catch {}
    Modal.confirm({
      title: "Xác nhận xóa",
      content: (
        <div>
          {warning && <Alert message={warning} type="warning" showIcon style={{ marginBottom: 8 }} />}
          <span>Xóa khu vực này?</span>
        </div>
      ),
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        setSaving(true);
        try {
          await api.deleteScheduleZone(id);
          onUpdate();
        } catch (err: any) {
          setError(getApiError(err));
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const openDeleteShiftConfirm = async (id: string) => {
    let warning = "";
    try {
      const assignments = await api.getScheduleAssignments({ shiftId: id });
      const active = assignments.items.filter((a: any) => a.status === "scheduled" || a.status === "confirmed");
      if (active.length > 0) warning = `Có ${active.length} ca trực đang chờ xử lý sử dụng ca này. `;
    } catch {}
    Modal.confirm({
      title: "Xác nhận xóa",
      content: (
        <div>
          {warning && <Alert message={warning} type="warning" showIcon style={{ marginBottom: 8 }} />}
          <span>Xóa ca trực này?</span>
        </div>
      ),
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        setSaving(true);
        try {
          await api.deleteScheduleShift(id);
          onUpdate();
        } catch (err: any) {
          setError(getApiError(err));
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const handleCreateShift = async () => {
    if (!shiftName.trim()) { setError("Vui lòng nhập tên ca"); return; }
    setSaving(true);
    setError(null);
    try {
      await api.createScheduleShift({
        name: shiftName.trim(),
        startTime, endTime,
        minStaff: Math.max(1, Number(minStaff) || 1),
      });
      setShiftName("");
      onUpdate();
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

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
      onUpdate();
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose} sx={{ zIndex: 1300 }}>
        <Box sx={{ width: { xs: "100%", sm: 400 }, height: "100%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700 }}>
              Quản lý lịch trực
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: "divider", minHeight: 36 }}
          >
            <Tab label="Khu vực" value="zones" sx={{ minHeight: 36, py: 0, textTransform: "none", fontWeight: 600, fontSize: "0.8rem" }} />
            <Tab label="Ca trực" value="shifts" sx={{ minHeight: 36, py: 0, textTransform: "none", fontWeight: 600, fontSize: "0.8rem" }} />
          </Tabs>

          <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            {error && <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} />}

            {tab === "zones" && (
              <>
                <Stack spacing={1}>
                  {zones.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>Chưa có khu vực nào</Typography>
                  )}
                  {zones.map((z) => (
                    <Box key={z.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1.5, py: 1, borderRadius: 1, bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{z.zoneName}</Typography>
                        <Typography variant="caption" color="text.secondary">Tầng {z.floor}</Typography>
                      </Box>
                      <IconButton size="small" color="error" onClick={() => openDeleteZoneConfirm(z.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>

                <Divider />

                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small"
                    type="number"
                    label="Tầng"
                    value={zoneFloor}
                    onChange={(e) => setZoneFloor(e.target.value)}
                    sx={{ width: 70 }}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                  <TextField
                    size="small"
                    placeholder="Tên khu vực"
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                    fullWidth
                  />
                  <Button size="small" variant="contained" onClick={handleCreateZone} disabled={saving} startIcon={<AddIcon />}>
                    Thêm
                  </Button>
                </Stack>
              </>
            )}

            {tab === "shifts" && (
              <>
                <Stack spacing={1}>
                  {shifts.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>Chưa có ca trực nào</Typography>
                  )}
                  {shifts.map((s) => (
                    <Box key={s.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1.5, py: 1, borderRadius: 1, bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{s.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {s.startTime?.slice(0, 5)}-{s.endTime?.slice(0, 5)} · {s.minStaff} NV
                        </Typography>
                      </Box>
                      <IconButton size="small" color="error" onClick={() => openDeleteShiftConfirm(s.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>

                <Divider />

                <Stack spacing={1.5}>
                  <TextField
                    size="small"
                    placeholder="Tên ca (vd: Ca sáng)"
                    value={shiftName}
                    onChange={(e) => setShiftName(e.target.value)}
                    fullWidth
                  />
                   <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <TextField
                      size="small"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">–</Typography>
                    <TextField
                      size="small"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      sx={{ flex: 1 }}
                    />
                  </Stack>
                   <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>Số NV tối thiểu:</Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={minStaff}
                      onChange={(e) => setMinStaff(e.target.value)}
                      sx={{ width: 70 }}
                      slotProps={{ htmlInput: { min: 1 } }}
                    />
                    <Button size="small" variant="contained" onClick={handleCreateShift} disabled={saving} sx={{ ml: "auto" }} startIcon={<AddIcon />}>
                      Thêm
                    </Button>
                  </Stack>
                </Stack>
              </>
            )}
          </Box>

          <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: "divider" }}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={createDefaults}
              disabled={saving}
            >
              {saving ? <CircularProgress size={14} color="inherit" /> : "Tạo mẫu (2 khu vực + 3 ca)"}
            </Button>
          </Box>
        </Box>
      </Drawer>

    </>
  );
}
