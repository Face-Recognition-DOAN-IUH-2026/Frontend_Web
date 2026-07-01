"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Chip, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import BeachAccessIcon from "@mui/icons-material/BeachAccessOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { StaffAvailabilityRequest } from "@/lib/types";

interface MyAvailabilityPanelProps {
  onError?: (msg: string) => void;
}

const STATUS_MAP: Record<string, { label: string; color: "default" | "primary" | "success" | "error" | "warning" }> = {
  pending: { label: "Chờ duyệt", color: "warning" },
  approved: { label: "Đã duyệt", color: "success" },
  rejected: { label: "Từ chối", color: "error" },
};

export default function MyAvailabilityPanel({ onError }: MyAvailabilityPanelProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<StaffAvailabilityRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const result = await api.getScheduleAvailability({ staffId: user.id });
      setRequests(result);
    } catch (err) {
      onError?.(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [user?.id, onError]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Đang tải xin nghỉ...</Typography>
      </Box>
    );
  }

  if (!requests.length) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <BeachAccessIcon sx={{ fontSize: 40, color: "action.disabled", mb: 1 }} />
        <Typography variant="body2" color="text.secondary">Bạn chưa có yêu cầu xin nghỉ nào</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      {requests.map((req) => {
        const st = STATUS_MAP[req.status] || { label: req.status, color: "default" as const };
        return (
          <Paper key={req.id} variant="outlined" sx={{ p: 2, borderRadius: 2, "&:hover": { bgcolor: "action.hover" } }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {req.type === "leave" ? "Nghỉ phép" : req.type === "unavailable" ? "Không khả dụng" : req.type}
              </Typography>
              <Chip label={st.label} size="small" color={st.color} sx={{ fontWeight: 700, fontSize: "0.65rem", height: 20 }} />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {new Date(req.dateFrom + "T00:00:00").toLocaleDateString("vi-VN")} — {new Date(req.dateTo + "T00:00:00").toLocaleDateString("vi-VN")}
            </Typography>
            {req.reason ? (
              <Typography variant="caption" sx={{ display: "block" }} color="text.secondary">Lý do: {req.reason}</Typography>
            ) : null}
          </Paper>
        );
      })}
    </Stack>
  );
}
