"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import LoginIcon from "@mui/icons-material/LoginOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import MyLocationIcon from "@mui/icons-material/MyLocationOutlined";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type { StaffScheduleAssignment } from "@/lib/types";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import { useToast } from "@/lib/toast-context";

/** BE mở cửa sổ check-in trước giờ bắt đầu ca 45 phút (ScheduleService.checkIn). */
const CHECK_IN_OPEN_MINUTES_BEFORE_SHIFT = 45;

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function toMinutes(time?: string | null): number | null {
  if (!time) return null;
  const [hour, minute] = time.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function hhmm(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(11, 16) || null;
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Đọc GPS từ trình duyệt; trả về null khi người dùng từ chối / thiết bị không hỗ trợ. */
function readBrowserLocation(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

interface MyShiftPanelProps {
  /** Gọi sau khi check-in/out thành công để trang cha tải lại dữ liệu. */
  onChanged?: () => void;
  /** Mở bản đồ xác nhận vị trí cho ca này. */
  onOpenMap?: (item: StaffScheduleAssignment) => void;
}

export default function MyShiftPanel({ onChanged, onOpenMap }: MyShiftPanelProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<StaffScheduleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = todayStr();
      const result = await api.getMySchedules({ from: today, to: today });
      setItems(result.items ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCheckIn = async (item: StaffScheduleAssignment) => {
    setActionId(`${item.id}:check-in`);
    try {
      const position = await readBrowserLocation();
      const result = await api.checkInScheduleAssignment(item.id, {
        method: "web",
        lat: position?.coords.latitude,
        lng: position?.coords.longitude,
      });

      const location = result?.location;
      if (location?.verified === false) {
        toast.warning(`Đã check-in nhưng vị trí chưa được xác thực: ${location?.reason ?? "ngoài vùng geofence"}`);
      } else if (location?.distanceMeters != null) {
        toast.success(
          `Check-in thành công · cách tâm ${location.distanceMeters}m (bán kính ${location.radiusMeters}m)`,
        );
      } else {
        toast.success("Check-in thành công");
      }

      await load();
      onChanged?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const handleCheckOut = async (item: StaffScheduleAssignment) => {
    setActionId(`${item.id}:check-out`);
    try {
      await api.checkOutScheduleAssignment(item.id);
      toast.success("Check-out thành công");
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const currentMinutes = nowMinutes();

  return (
    <DashboardCard
      title="Ca trực của tôi hôm nay"
      subtitle="Check-in bằng vị trí GPS, đối chiếu với geofence của khu vực được phân công"
      actions={
        <Tooltip title="Tải lại">
          <IconButton size="small" onClick={load} disabled={loading}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      }
    >
      {error ? (
        <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2, mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", py: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Đang tải ca trực...
          </Typography>
        </Stack>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          Hôm nay bạn không có ca trực nào.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {items.map((item) => {
            const startMin = toMinutes(item.shift?.startTime);
            const checkInOpenAt = startMin === null ? null : startMin - CHECK_IN_OPEN_MINUTES_BEFORE_SHIFT;
            const checkInOpened = checkInOpenAt === null ? true : currentMinutes >= checkInOpenAt;

            const isCancelled = item.status === "cancelled";
            const isPendingManual = item.attendance?.status === "pending_manual";
            const hasCheckedIn = !!item.attendance?.checkInAt;
            const hasCheckedOut = !!item.attendance?.checkOutAt;

            const canCheckIn = !isCancelled && !isPendingManual && !hasCheckedIn && !hasCheckedOut && item.status !== "completed" && checkInOpened;
            const canCheckOut = !isCancelled && hasCheckedIn && !hasCheckedOut;

            const checkInTime = hhmm(item.attendance?.checkInAt);
            const checkOutTime = hhmm(item.attendance?.checkOutAt);

            const statusChip = isCancelled
              ? { label: "Đã hủy", color: "error" as const }
              : hasCheckedOut
              ? { label: "Hoàn thành", color: "default" as const }
              : hasCheckedIn
              ? { label: "Đang trực", color: "success" as const }
              : isPendingManual
              ? { label: "Chờ duyệt thủ công", color: "warning" as const }
              : canCheckIn
              ? { label: "Đang mở check-in", color: "primary" as const }
              : { label: "Chưa đến giờ", color: "default" as const };

            return (
              <Box
                key={item.id}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  border: 1,
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 2,
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ minWidth: 200 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {item.shift?.name ?? "Ca trực"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.shift ? `${item.shift.startTime.slice(0, 5)} – ${item.shift.endTime.slice(0, 5)}` : ""}
                    </Typography>
                    <Chip size="small" label={statusChip.label} color={statusChip.color} sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                  </Stack>

                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    {item.zone?.zoneName ?? "Chưa gán khu vực"}
                    {" · "}Vào: {checkInTime ?? "--:--"} · Ra: {checkOutTime ?? "--:--"}
                  </Typography>

                  {!checkInOpened && !hasCheckedIn && !isCancelled ? (
                    <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "warning.main" }}>
                      Check-in mở từ {CHECK_IN_OPEN_MINUTES_BEFORE_SHIFT} phút trước giờ bắt đầu ca.
                    </Typography>
                  ) : null}
                </Box>

                <Stack direction="row" spacing={1}>
                  {canCheckIn ? (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<MyLocationIcon sx={{ fontSize: 16 }} />}
                      disabled={actionId === `${item.id}:check-in`}
                      onClick={() => (onOpenMap ? onOpenMap(item) : handleCheckIn(item))}
                      sx={{ borderRadius: 2, fontWeight: 700 }}
                    >
                      {actionId === `${item.id}:check-in` ? "Đang định vị..." : onOpenMap ? "Check-in bản đồ" : "Check-in"}
                    </Button>
                  ) : null}

                  {canCheckOut ? (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
                      disabled={actionId === `${item.id}:check-out`}
                      onClick={() => handleCheckOut(item)}
                      sx={{ borderRadius: 2, fontWeight: 700 }}
                    >
                      Check-out
                    </Button>
                  ) : null}

                  {!canCheckIn && !canCheckOut && !hasCheckedIn ? (
                    <Tooltip title={isPendingManual ? "Đang chờ duyệt check-in thủ công" : "Chưa thể check-in"}>
                      <span>
                        <Button size="small" variant="outlined" disabled startIcon={<LoginIcon sx={{ fontSize: 16 }} />} sx={{ borderRadius: 2 }}>
                          Check-in
                        </Button>
                      </span>
                    </Tooltip>
                  ) : null}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}
    </DashboardCard>
  );
}
