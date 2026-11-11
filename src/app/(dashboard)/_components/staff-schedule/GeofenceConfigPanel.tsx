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

  const [locating, setLocating] = useState(false);

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

  const handleFillIUH = () => {
    setLat("10.822158");
    setLng("106.687498");
    setRadius("150");
  };

  const handleGetGPS = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Trình duyệt không hỗ trợ Geolocation");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
      },
      (err) => {
        setLocating(false);
        setError(`Không lấy được vị trí GPS: ${err.message}. Vui lòng cấp quyền định vị cho trình duyệt.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSet = async () => {
    if (!zoneId || !lat || !lng) { setError("Vui lòng nhập đầy đủ thông tin"); return; }
    const cleanLat = String(lat).replace(",", ".");
    const cleanLng = String(lng).replace(",", ".");
    const latVal = parseFloat(cleanLat);
    const lngVal = parseFloat(cleanLng);
    const radiusVal = parseInt(radius) || 150;
    if (isNaN(latVal) || latVal < -90 || latVal > 90) { setError("Vĩ độ phải từ -90 đến 90"); return; }
    if (isNaN(lngVal) || lngVal < -180 || lngVal > 180) { setError("Kinh độ phải từ -180 đến 180"); return; }
    if (radiusVal < 10 || radiusVal > 10000) { setError("Bán kính phải từ 10m đến 10,000m"); return; }
    setSaving(true);
    setError(null);
    try {
      const isGlobal = zoneId === "global";
      await api.setGeofenceConfig({
        zoneId: isGlobal ? null : zoneId,
        isGlobal,
        latitude: latVal,
        longitude: lngVal,
        radiusMeters: radiusVal,
        addressHint: isGlobal ? "Thư viện Đại học Công nghiệp TP.HCM" : undefined,
      });
      setZoneId(""); setLat(""); setLng(""); setRadius("150");
      await loadData();
      onUpdated();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (zId: string | null, isGlobal?: boolean) => {
    if (!confirm("Xóa cấu hình geofence này?")) return;
    try {
      await api.deleteGeofenceConfig(isGlobal || !zId ? "global" : zId);
      await loadData();
      onUpdated();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} sx={{ zIndex: 1300 }}>
      <Box sx={{ width: { xs: "100%", sm: 440 }, height: "100%", display: "flex", flexDirection: "column" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700 }}>
            Cấu hình Geofence (Vị trí điểm danh)
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
              label="Phạm vi / Khu vực"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              fullWidth
            >
              <MenuItem value="">-- Chọn phạm vi áp dụng --</MenuItem>
              <MenuItem value="global" sx={{ fontWeight: 700, color: "primary.main" }}>
                🌐 Toàn Thư viện IUH (Toạ độ chung mặc định cho tất cả khu vực)
              </MenuItem>
              {zones.filter((z) => z.isActive).map((z) => (
                <MenuItem key={z.id} value={z.id}>📍 {z.zoneName} (Tầng {z.floor})</MenuItem>
              ))}
            </TextField>

            {/* Quick Fill Actions */}
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                color="info"
                onClick={handleFillIUH}
                sx={{ textTransform: "none", fontSize: "0.78rem", py: 0.5, flex: 1 }}
              >
                🏫 ĐH Công nghiệp (IUH)
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="primary"
                onClick={handleGetGPS}
                disabled={locating}
                sx={{ textTransform: "none", fontSize: "0.78rem", py: 0.5, flex: 1 }}
              >
                {locating ? "Đang lấy GPS..." : "🎯 Lấy GPS hiện tại"}
              </Button>
            </Stack>

            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                label="Vĩ độ (Latitude)"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                sx={{ flex: 1 }}
                placeholder="10.822158"
              />
              <TextField
                size="small"
                label="Kinh độ (Longitude)"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                sx={{ flex: 1 }}
                placeholder="106.687498"
              />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <TextField
                size="small"
                type="number"
                label="Bán kính cho phép (mét)"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                sx={{ flex: 1 }}
                slotProps={{ htmlInput: { min: 10, max: 10000, step: 10 } }}
              />
              <Button
                size="small"
                variant="contained"
                onClick={handleSet}
                disabled={saving}
                sx={{ whiteSpace: "nowrap", px: 3, fontWeight: 700 }}
              >
                {saving ? <CircularProgress size={14} color="inherit" /> : "Lưu vị trí"}
              </Button>
            </Stack>
          </Stack>

          <Box sx={{ pt: 2, borderTop: 1, borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 1 }}>
              Vị trí Geofence đã cấu hình ({configs.length})
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
            <Stack spacing={1}>
              {configs.map((cfg) => (
                <Box
                  key={cfg.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 1.5,
                    py: 1,
                    borderRadius: 1.5,
                    bgcolor: cfg.isGlobal ? "rgba(16, 185, 129, 0.08)" : "background.paper",
                    border: 1,
                    borderColor: cfg.isGlobal ? "success.main" : "divider"
                  }}
                >
                  <Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                        {cfg.isGlobal ? "🌐 Toàn Thư viện IUH (Toạ độ chung)" : (cfg.zone?.zoneName || "Khu vực")}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" sx={{ display: "block", mt: 0.3 }} color="text.secondary">
                      📍 {cfg.latitude}, {cfg.longitude} · Bán kính: {cfg.radiusMeters}m
                    </Typography>
                    {cfg.addressHint && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic", fontSize: "0.72rem" }}>
                        {cfg.addressHint}
                      </Typography>
                    )}
                  </Box>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(cfg.zoneId, cfg.isGlobal)}
                    title="Xóa cấu hình vị trí này"
                  >
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
