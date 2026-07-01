"use client";

import { useCallback, useEffect, useState } from "react";
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
    setLoading(true);
    try {
      const result = await api.getScheduleAvailability();
      setRequests(result);
    } catch (err) {
      onError?.(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Đang tải yêu cầu nghỉ phép...
        </Typography>
      </Box>
    );
  }

  if (!requests.length) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography color="text.secondary">Bạn chưa có yêu cầu nghỉ phép nào</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      {requests.map((req) => {
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
