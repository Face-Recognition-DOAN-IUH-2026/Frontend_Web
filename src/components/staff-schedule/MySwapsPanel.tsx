"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import SwapHorizIcon from "@mui/icons-material/SwapHorizOutlined";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import api, { getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { ShiftSwap } from "@/lib/types";

interface MySwapsPanelProps {
  onError?: (msg: string) => void;
  refreshKey?: number;
}

export default function MySwapsPanel({ onError, refreshKey }: MySwapsPanelProps) {
  const { user } = useAuth();
  const [swaps, setSwaps] = useState<ShiftSwap[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.listMySwaps({});
      setSwaps(result.filter((s: ShiftSwap) => s.status === "pending"));
    } catch (err) {
      onError?.(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleRespond = async (id: string, action: "accepted" | "rejected") => {
    setRespondingId(id);
    try {
      await api.respondSwap(id, { action });
      await load();
    } catch (err) {
      onError?.(getErrorMessage(err));
    } finally {
      setRespondingId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!swaps.length) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <SwapHorizIcon sx={{ fontSize: 40, color: "action.disabled", mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          Không có yêu cầu đổi ca nào
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      {swaps.map((swap) => (
        <Paper
          key={swap.id}
          variant="outlined"
          sx={{ p: 2, borderRadius: 2 }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <SwapHorizIcon sx={{ color: "primary.main" }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {swap.requester?.fullName || swap.requester?.email || "Nhân viên"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {swap.requesterAssignment?.shift?.name} — {swap.requesterAssignment?.zone?.zoneName}
                {" • "}
                {swap.requesterAssignment?.workDate}
              </Typography>
              {swap.reason && (
                <Typography variant="caption" sx={{ display: "block" }} color="text.secondary">
                  Lý do: {swap.reason}
                </Typography>
              )}
            </Box>
            {swap.targetStaffId === user?.id ? (
              <Stack direction="row" spacing={0.5}>
                <Button
                  size="small"
                  color="success"
                  variant="outlined"
                  disabled={respondingId === swap.id}
                  onClick={() => handleRespond(swap.id, "accepted")}
                  sx={{ minWidth: 36, p: 0.5 }}
                >
                  <CheckIcon fontSize="small" />
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  disabled={respondingId === swap.id}
                  onClick={() => handleRespond(swap.id, "rejected")}
                  sx={{ minWidth: 36, p: 0.5 }}
                >
                  <CloseIcon fontSize="small" />
                </Button>
              </Stack>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic", pr: 1 }}>
                Đang chờ phản hồi
              </Typography>
            )}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
