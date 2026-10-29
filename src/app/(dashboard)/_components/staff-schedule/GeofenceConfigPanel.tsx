"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "@/lib/api-client";
import type { LibraryZone } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  zones: LibraryZone[];
  onUpdated: () => void;
}

function getApiError(err: any): string {
  const data = err?.response?.data;
  return data?.error || data?.message || err?.message || "Có lỗi xảy ra";
}

export default function GeofenceConfigPanel({ open, onClose, zones, onUpdated }: Props) {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoneId, setZoneId] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("100");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await api.getGeofenceConfigs();
      setConfigs(result);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  const handleSet = async () => {
    if (!zoneId || !lat || !lng) { setError("Vui lòng nhập đầy đủ thông tin"); return; }
    const latVal = parseFloat(lat);
    const lngVal = parseFloat(lng);
    const radiusVal = parseInt(radius) || 100;
    if (isNaN(latVal) || latVal < -90 || latVal > 90) { setError("Vĩ độ phải từ -90 đến 90"); return; }
    if (isNaN(lngVal) || lngVal < -180 || lngVal > 180) { setError("Kinh độ phải từ -180 đến 180"); return; }
    if (radiusVal < 10 || radiusVal > 10000) { setError("Bán kính phải từ 10m đến 10,000m"); return; }
    setSaving(true);
    setError(null);
    try {
      await api.setGeofenceConfig({
        zoneId,
        latitude: latVal,
        longitude: lngVal,
        radiusMeters: radiusVal,
      });
      setZoneId(""); setLat(""); setLng(""); setRadius("100");
      await loadData();
      onUpdated();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (zId: string) => {
    if (!confirm("Xóa cấu hình geofence?")) return;
    try {
      await api.deleteGeofenceConfig(zId);
      await loadData();
      onUpdated();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} sx={{ zIndex: 1300 }}>
      <Box sx={{ width: { xs: "100%", sm: 400 }, height: "100%", display: "flex", flexDirection: "column" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700 }}>
            Cấu hình Geofence
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

          <Stack spacing={1.5}>
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
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                type="number"
                label="Vĩ độ"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                sx={{ flex: 1 }}
                slotProps={{ htmlInput: { step: "any" } }}
              />
              <TextField
                size="small"
                type="number"
                label="Kinh độ"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                sx={{ flex: 1 }}
                slotProps={{ htmlInput: { step: "any" } }}
              />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <TextField
                size="small"
                type="number"
                label="Bán kính (m)"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                sx={{ flex: 1 }}
                slotProps={{ htmlInput: { min: 10, max: 10000 } }}
              />
              <Button
                size="small"
                variant="contained"
                onClick={handleSet}
                disabled={saving}
                sx={{ whiteSpace: "nowrap" }}
              >
                {saving ? <CircularProgress size={14} color="inherit" /> : "Lưu"}
              </Button>
            </Stack>
          </Stack>

          <Box sx={{ pt: 2, borderTop: 1, borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 1 }}>
              Đã cấu hình
            </Typography>
            {loading && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={12} />
                <Typography variant="caption" color="text.secondary">Đang tải...</Typography>
              </Box>
            )}
            {!loading && configs.length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                Chưa có geofence nào
              </Typography>
            )}
            <Stack spacing={0.5}>
              {configs.map((cfg) => (
                <Box key={cfg.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1.5, py: 1, borderRadius: 1, bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>{cfg.zone?.zoneName || "Khu vực"}</Typography>
                    <Typography variant="caption" sx={{ display: "block" }} color="text.secondary">
                      {cfg.latitude}, {cfg.longitude} · {cfg.radiusMeters}m
                    </Typography>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => handleDelete(cfg.zoneId)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
