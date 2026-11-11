"use client";

import { Box, Button, Chip, CircularProgress, IconButton, Paper, Stack, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InfoIcon from "@mui/icons-material/InfoOutlined";
import MyLocationIcon from "@mui/icons-material/MyLocationOutlined";
import { useState, useEffect } from "react";
import CheckInMapInner from "./CheckInMapInner";
import { evaluateGeofence } from "@/lib/geofence";
import api, { getErrorMessage } from "@/lib/api-client";
import { useToast } from "@/lib/toast-context";

interface CheckInMapModalProps {
  open: boolean;
  onClose: () => void;
  assignmentId: string;
  zoneName: string;
  onSuccess: () => void;
}

export default function CheckInMapModal({ open, onClose, assignmentId, zoneName, onSuccess }: CheckInMapModalProps) {
  const { toast } = useToast();
  const [geofence, setGeofence] = useState<{ zoneId: string | null; configured: boolean; latitude: number | null; longitude: number | null; radiusMeters: number | null; toleranceMeters: number } | null>(null);
  const [user, setUser] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  // Tách riêng trạng thái định vị GPS: nếu dùng chung loadingGeo thì bản đồ
  // sẽ bị thay bằng chữ "Đang tải" mỗi lần bấm nút lấy vị trí.
  const [locating, setLocating] = useState(false);
  const [loadingCheckIn, setLoadingCheckIn] = useState(false);
  const [evaluation, setEvaluation] = useState<{ allowed: boolean; distanceMeters: number | null; radiusMeters: number | null } | null>(null);

  useEffect(() => {
    if (open) {
      loadGeofence();
      setLocating(true);
      requestLocation().then((loc) => {
        setLocating(false);
        if (loc) setUser(loc);
      });
    }
  }, [open]);

  useEffect(() => {
    if (user && geofence) {
      evaluate(user);
    }
  }, [user, geofence]);

  const loadGeofence = async () => {
    setLoadingGeo(true);
    setEvaluation(null);
    try {
      const g = await api.getAssignmentGeofence(assignmentId);
      setGeofence(g);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingGeo(false);
    }
  };

  const requestLocation = (): Promise<{ lat: number; lng: number } | null> =>
    new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });

  const evaluate = (position: { lat: number; lng: number } | null = user) => {
    if (!geofence || geofence.latitude == null || geofence.longitude == null || geofence.radiusMeters == null || !position) {
      setEvaluation(null);
      return;
    }
    const ev = evaluateGeofence(position.lat, position.lng, { latitude: geofence.latitude, longitude: geofence.longitude, radiusMeters: geofence.radiusMeters }, geofence.toleranceMeters);
    setEvaluation({ allowed: ev.allowed, distanceMeters: Math.round(ev.distanceMeters), radiusMeters: geofence.radiusMeters });
  };

  const checkIn = async () => {
    if (!evaluation?.allowed) return;
    setLoadingCheckIn(true);
    try {
      await api.checkInScheduleAssignment(assignmentId, { method: "web", lat: user?.lat, lng: user?.lng });
      toast.success("Đã check-in thành công");
      await onSuccess();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingCheckIn(false);
    }
  };

  if (!open) return null;

  const center = geofence?.latitude != null && geofence?.longitude != null ? { lat: geofence.latitude, lng: geofence.longitude } : null;
  const radius = geofence?.radiusMeters ?? null;
  const canCheckInMap = evaluation?.allowed === true;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, width: { xs: "90vw", sm: 460 }, maxWidth: { xs: "90vw", sm: 460 }, maxHeight: { xs: "85vh", sm: "85vh" }, display: "flex", flexDirection: "column", position: "fixed", top: { xs: 40, sm: "20vh" }, left: { xs: "5vw", sm: 500 }, transform: { xs: "none", sm: "translate(-50%, 0)" }, zIndex: 1300 }}>
      <Stack direction="row" spacing={1} sx={{ px: 2.5, pt: 2.5, pb: 1, alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Xác nhận vị trí điểm danh</Typography>
          <Typography variant="caption" color="text.secondary">{`Khu vực: ${zoneName}`}{geofence?.configured ? ` · bán kính ${geofence.radiusMeters}m` : " · chưa cấu hình geofence"}</Typography>
        </Box>
        <IconButton color="inherit" onClick={onClose} size="small"><CloseIcon /></IconButton>
      </Stack>

      {/* PHẢI dùng height tường minh (không phải minHeight): height:100% của Leaflet
          chỉ resolve khi containing block có height definite. Nếu chỉ có min-height/flex,
          browser coi là indefinite => 100% rơi về auto => bản đồ cao 0px. */}
      <Box sx={{ overflow: "hidden", position: "relative", height: { xs: 280, sm: 340 } }}>
        {loadingGeo ? (
          <Stack direction="row" spacing={1} sx={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", bgcolor: "background.paper" }}><CircularProgress size={24} /><Typography variant="body2">Đang tải khu vực...</Typography></Stack>
        ) : center ? (
          <CheckInMapInner center={center} radiusMeters={radius} user={user} allowed={canCheckInMap} style={{ flex: 1 }} />
        ) : null}
      </Box>

      <Box sx={{ p: 2.5, borderTop: 1, borderColor: "divider" }}>
        {loadingGeo ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>Đang tải khu vực kiểm tra...</Typography>
        ) : !center ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>Khu vực chưa có toạ độ, không hiển thị bản đồ.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {user ? (
              <Chip size="small" label={canCheckInMap ? `✅ Trong khu vực thi (${evaluation?.distanceMeters}m / ${evaluation?.radiusMeters}m)` : `❌ Ngoài khu vực thi (${evaluation?.distanceMeters}m / ${evaluation?.radiusMeters}m)`} color={canCheckInMap ? "success" : "error"} sx={{ fontWeight: 700, fontSize: "0.8rem", height: 24 }} />
            ) : null}
            {/* Luôn hiển thị nút lấy GPS để người dùng lấy lại vị trí bất cứ lúc nào. */}
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}>
              <Button size="small" variant="outlined" startIcon={<MyLocationIcon sx={{ fontSize: 16 }} />} disabled={loadingGeo || locating} onClick={async () => { setLocating(true); const loc = await requestLocation(); setLocating(false); if (loc) { setUser(loc); evaluate(loc); } else { toast.error("Trình duyệt không xác định được vị trí của bạn. Vui lòng bật định vị."); } }}>{locating ? "Đang định vị..." : user ? "Lấy lại vị trí GPS" : "Lấy vị trí GPS"}</Button>
              {center && (
                <Button size="small" variant="text" color="info" onClick={() => { setUser(center); evaluate(center); }} sx={{ fontSize: "0.75rem", textTransform: "none" }}>
                  📍 Đặt vị trí tại trường IUH (Test)
                </Button>
              )}
              <InfoIcon sx={{ fontSize: 18 }} titleAccess="Vị trí chỉ dùng để hiển thị trên bản đồ; server sẽ tính lại khi xác nhận điểm danh" />
            </Stack>
            <Typography variant="caption" color="text.secondary">Vị trí chỉ được hiển thị trên bản đồ. Nút xác nhận bật khi bạn nằm trong bán kính cho phép.</Typography>
            <Button size="medium" variant="contained" disabled={loadingCheckIn || !user || !canCheckInMap} fullWidth onClick={checkIn} sx={{ mt: 1, borderRadius: 2, fontWeight: 700 }}>{loadingCheckIn ? "Đang ghi nhận..." : user ? (canCheckInMap ? "Xác nhận điểm danh" : "Vui lòng di chuyển vào khu vực thi") : "Vui lòng xác định vị trí"}</Button>
          </Stack>
        )}
      </Box>
    </Paper>
  );
}
