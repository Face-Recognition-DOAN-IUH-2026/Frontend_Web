"use client";

import { useEffect, useState } from "react";
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

  const getZoneName = (id: string) => zones.find((z) => z.id === id)?.zoneName || "Khu vực";

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex justify-end" style={{ zIndex: 1300 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface w-96 h-full shadow-xl border-l border-border flex flex-col animate-slide-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-serif text-sm font-semibold text-primary">Cấu hình Geofence</h2>
          <button onClick={onClose} className="text-text-3 hover:text-text transition text-sm">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="text-xs text-error bg-error/10 border border-error/20 rounded-md px-2.5 py-1.5">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="w-full px-2 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-text focus:outline-none focus:border-primary"
            >
              <option value="">Chọn khu vực</option>
              {zones.filter((z) => z.isActive).map((z) => (
                <option key={z.id} value={z.id}>{z.zoneName} (Tầng {z.floor})</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-text focus:outline-none focus:border-primary"
                placeholder="Vĩ độ (lat)"
              />
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-text focus:outline-none focus:border-primary"
                placeholder="Kinh độ (lng)"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min={10}
                max={10000}
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-text focus:outline-none focus:border-primary"
                placeholder="Bán kính (m)"
              />
              <button
                onClick={handleSet}
                disabled={saving}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-bg bg-primary hover:bg-primary-dark transition disabled:opacity-50"
              >
                {saving ? "..." : "Lưu"}
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-[11px] text-text-3 font-medium uppercase tracking-wide">Đã cấu hình</p>
            {loading && <p className="text-xs text-text-3 italic">Đang tải...</p>}
            {!loading && configs.length === 0 && (
              <p className="text-xs text-text-3 italic">Chưa có geofence nào</p>
            )}
            {configs.map((cfg) => (
              <div key={cfg.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-surface-2 border border-border">
                <div>
                  <div className="text-xs font-medium text-text">{cfg.zone?.zoneName || "Khu vực"}</div>
                  <div className="text-[10px] text-text-3">
                    {cfg.latitude}, {cfg.longitude} &middot; {cfg.radiusMeters}m
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(cfg.zoneId)}
                  className="text-error/60 hover:text-error transition text-xs"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
