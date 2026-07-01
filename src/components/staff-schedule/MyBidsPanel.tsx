"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import GavelIcon from "@mui/icons-material/GavelOutlined";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import api, { getErrorMessage } from "@/lib/api-client";
import type { ShiftBid } from "@/lib/types";

interface MyBidsPanelProps {
  onError?: (msg: string) => void;
}

const STATUS_MAP: Record<string, { label: string; color: "default" | "primary" | "success" | "error" | "warning" }> = {
  pending: { label: "Chờ duyệt", color: "warning" },
  approved: { label: "Đã duyệt", color: "success" },
  rejected: { label: "Từ chối", color: "error" },
const STATUS_MAP: Record<string, { label: string; color: "warning" | "success" | "error" | "default" }> = {
  pending: { label: "Chờ xử lý", color: "warning" },
  approved: { label: "Đã duyệt", color: "success" },
  rejected: { label: "Bị từ chối", color: "error" },
  cancelled: { label: "Đã hủy", color: "default" },
};

export default function MyBidsPanel({ onError }: MyBidsPanelProps) {
  const [bids, setBids] = useState<ShiftBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.listMyBids();
      setBids(result);
    } catch (err) {
      onError?.(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await api.cancelBid(id);
      await load();
    } catch (err) {
      onError?.(getErrorMessage(err));
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Đang tải đăng ký ca...</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Đang tải đăng ký ca...
        </Typography>
      </Box>
    );
  }

  if (!bids.length) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <GavelIcon sx={{ fontSize: 40, color: "action.disabled", mb: 1 }} />
        <Typography variant="body2" color="text.secondary">Bạn chưa đăng ký ca nào</Typography>
        <Typography color="text.secondary">Bạn chưa đăng ký ca nào</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      {bids.map((bid) => {
        const st = STATUS_MAP[bid.status] || { label: bid.status, color: "default" as const };
        const assignment = bid.assignment;
        return (
          <Paper key={bid.id} variant="outlined" sx={{ p: 2, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "space-between", "&:hover": { bgcolor: "action.hover" } }}>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {assignment?.shift?.name || "Ca"} — {assignment?.zone?.zoneName || "Khu vực"}
                </Typography>
                <Chip label={st.label} size="small" color={st.color} sx={{ fontWeight: 700, fontSize: "0.65rem", height: 20 }} />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {assignment?.workDate
                  ? new Date(assignment.workDate + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" })
                  : ""}
                {assignment?.shift?.startTime ? ` • ${assignment.shift.startTime.slice(0, 5)} — ${assignment.shift.endTime?.slice(0, 5)}` : ""}
              </Typography>
              {bid.note ? (
                <Typography variant="caption" sx={{ display: "block" }} color="text.secondary">Ghi chú: {bid.note}</Typography>
              ) : null}
            </Box>
            {bid.status === "pending" ? (
              <Button
                size="small" variant="outlined" color="error"
                startIcon={<CancelIcon sx={{ fontSize: 14 }} />}
                disabled={cancellingId === bid.id}
                onClick={() => handleCancel(bid.id)}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
              >
                Hủy
              </Button>
            ) : null}
          </Paper>
        const status = STATUS_MAP[bid.status] || { label: bid.status, color: "default" as const };
        return (
          <Box
            key={bid.id}
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
                {bid.assignment?.shift?.name || "Ca"} — {bid.assignment?.zone?.zoneName || "Khu vực"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {bid.assignment?.workDate
                  ? new Date(bid.assignment.workDate + "T00:00:00").toLocaleDateString("vi-VN", {
                      weekday: "long",
                      day: "2-digit",
                      month: "2-digit",
                    })
                  : "N/A"}
                {" • "}
                {bid.assignment?.shift?.startTime?.slice(0, 5)} — {bid.assignment?.shift?.endTime?.slice(0, 5)}
              </Typography>
              {bid.note && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  Ghi chú: {bid.note}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip label={status.label} color={status.color} size="small" sx={{ fontWeight: 600 }} />
              {bid.status === "pending" && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  disabled={cancellingId === bid.id}
                  onClick={() => handleCancel(bid.id)}
                  sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                >
                  {cancellingId === bid.id ? "Đang hủy..." : "Hủy"}
                </Button>
              )}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
