"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Chip, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import BeachAccessIcon from "@mui/icons-material/BeachAccessOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import {
  Box,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import api, { getErrorMessage } from "@/lib/api-client";
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
const STATUS_MAP: Record<string, { label: string; color: "warning" | "success" | "error" | "default" }> = {
  pending: { label: "Chờ duyệt", color: "warning" },
  approved: { label: "Đã duyệt", color: "success" },
  rejected: { label: "Bị từ chối", color: "error" },
};

const TYPE_MAP: Record<string, string> = {
  leave: "Nghỉ phép",
  sick: "Ốm",
  personal: "Lý do cá nhân",
  other: "Khác",
};

export default function MyAvailabilityPanel({ onError }: MyAvailabilityPanelProps) {
  const [requests, setRequests] = useState<StaffAvailabilityRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const result = await api.getScheduleAvailability({ staffId: user.id });
    setLoading(true);
    try {
      const result = await api.getScheduleAvailability();
      setRequests(result);
    } catch (err) {
      onError?.(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [user?.id, onError]);
  }, [onError]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Đang tải xin nghỉ...</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Đang tải yêu cầu nghỉ phép...
        </Typography>
      </Box>
    );
  }

  if (!requests.length) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <BeachAccessIcon sx={{ fontSize: 40, color: "action.disabled", mb: 1 }} />
        <Typography variant="body2" color="text.secondary">Bạn chưa có yêu cầu xin nghỉ nào</Typography>
        <Typography color="text.secondary">Bạn chưa có yêu cầu nghỉ phép nào</Typography>
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
        const status = STATUS_MAP[req.status] || { label: req.status, color: "default" as const };
        return (
          <Box
            key={req.id}
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {TYPE_MAP[req.type] || req.type}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(req.dateFrom + "T00:00:00").toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} —{" "}
                {new Date(req.dateTo + "T00:00:00").toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </Typography>
              {req.reason && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  Lý do: {req.reason}
                </Typography>
              )}
              {req.reviewedAt && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  Xử lý lúc: {new Date(req.reviewedAt).toLocaleDateString("vi-VN")}
                </Typography>
              )}
            </Box>
            <Chip label={status.label} color={status.color} size="small" sx={{ fontWeight: 600 }} />
          </Box>
        );
      })}
    </Stack>
  );
}
