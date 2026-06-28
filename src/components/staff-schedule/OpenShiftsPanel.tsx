"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import GavelIcon from "@mui/icons-material/GavelOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type { OpenShift } from "@/lib/types";

interface OpenShiftsPanelProps {
  onError?: (msg: string) => void;
}

export default function OpenShiftsPanel({ onError }: OpenShiftsPanelProps) {
  const [shifts, setShifts] = useState<OpenShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [biddingId, setBiddingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getOpenShifts();
      setShifts(result.slice(0, 30));
    } catch (err) {
      onError?.(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => { load(); }, [load]);

  const handleBid = async (assignmentId: string) => {
    setBiddingId(assignmentId);
    try {
      await api.createBid({ assignmentId });
      await load();
    } catch (err) {
      onError?.(getErrorMessage(err));
    } finally {
      setBiddingId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Đang tải ca trống...
        </Typography>
      </Box>
    );
  }

  if (!shifts.length) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography color="text.secondary">Không có ca trống trong 2 tuần tới</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      {shifts.map((s, idx) => (
        <Paper
          key={`${s.shift?.id}-${s.zone?.id}-${s.workDate}-${idx}`}
          variant="outlined"
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: 2,
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {s.shift?.name || "Ca"} — {s.zone?.zoneName || "Khu vực"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(s.workDate + "T00:00:00").toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
              })}
              {" • "}
              {s.shift?.startTime?.slice(0, 5)} — {s.shift?.endTime?.slice(0, 5)}
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<GavelIcon sx={{ fontSize: 16 }} />}
            disabled
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, opacity: 0.6 }}
          >
            Liên hệ admin
          </Button>
        </Paper>
      ))}
    </Stack>
  );
}
