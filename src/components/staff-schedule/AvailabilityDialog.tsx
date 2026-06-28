"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
} from "@mui/material";
import api, { getErrorMessage } from "@/lib/api-client";

interface AvailabilityDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function AvailabilityDialog({ open, onClose, onSubmitted }: AvailabilityDialogProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!dateFrom || !dateTo) {
      setError("Vui lòng chọn ngày bắt đầu và kết thúc");
      return;
    }
    if (dateTo < dateFrom) {
      setError("Ngày kết thúc phải sau ngày bắt đầu");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.createMyAvailability({ dateFrom, dateTo, reason: reason || undefined });
      onSubmitted();
      onClose();
      setDateFrom("");
      setDateTo("");
      setReason("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Xin nghỉ / Không khả dụng</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && (
            <Typography variant="body2" color="error">{error}</Typography>
          )}
          <TextField
            label="Từ ngày"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <TextField
            label="Đến ngày"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <TextField
            label="Lý do (không bắt buộc)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            rows={3}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Hủy</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? "Đang gửi..." : "Gửi yêu cầu"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
