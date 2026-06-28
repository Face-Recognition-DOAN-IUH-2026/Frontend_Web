"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import api, { getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { StaffScheduleAssignment, ScheduleStaff } from "@/lib/types";

interface SwapRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  myAssignments: StaffScheduleAssignment[];
  allStaff: ScheduleStaff[];
}

export default function SwapRequestDialog({
  open,
  onClose,
  onSubmitted,
  myAssignments,
  allStaff,
}: SwapRequestDialogProps) {
  const { user } = useAuth();
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [targetStaffId, setTargetStaffId] = useState("");
  const [targetAssignments, setTargetAssignments] = useState<StaffScheduleAssignment[]>([]);
  const [targetAssignmentId, setTargetAssignmentId] = useState("");
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedAssignment("");
      setTargetStaffId("");
      setTargetAssignmentId("");
      setTargetAssignments([]);
      setReason("");
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!targetStaffId) {
      setTargetAssignments([]);
      setTargetAssignmentId("");
      return;
    }
    const fetchTargetAssignments = async () => {
      setLoadingAssignments(true);
      try {
        const result = await api.getScheduleAssignments({ staffId: targetStaffId });
        const selected = myAssignments.find((a) => a.id === selectedAssignment);
        const filtered = result.items.filter(
          (a) => (a.status === "scheduled" || a.status === "confirmed") && a.workDate === selected?.workDate
        );
        setTargetAssignments(filtered);
      } catch (err) {
        console.error("Failed to load target assignments", err);
      } finally {
        setLoadingAssignments(false);
      }
    };
    fetchTargetAssignments();
  }, [targetStaffId, selectedAssignment]);

  const handleSubmit = async () => {
    if (!selectedAssignment || !targetStaffId) {
      setError("Vui lòng chọn ca muốn đổi và nhân viên mục tiêu");
      return;
    }
    if (targetAssignmentId) {
      const targetAsg = targetAssignments.find((a) => a.id === targetAssignmentId);
      const myAsg = myAssignments.find((a) => a.id === selectedAssignment);
      if (targetAsg && myAsg && targetAsg.shiftId === myAsg.shiftId) {
        setError("Hai ca đổi phải khác nhau (cùng khung giờ)");
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      await api.createSwap({
        requesterAssignmentId: selectedAssignment,
        targetStaffId,
        targetAssignmentId: targetAssignmentId || undefined,
        reason: reason || undefined,
      });
      onSubmitted();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const myActiveAssignments = myAssignments.filter(
    (a) => a.status === "scheduled" || a.status === "confirmed"
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Đổi ca với nhân viên khác</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && (
            <Typography variant="body2" color="error">{error}</Typography>
          )}
          <FormControl fullWidth>
            <InputLabel>Ca của bạn muốn đổi</InputLabel>
            <Select
              value={selectedAssignment}
              label="Ca của bạn muốn đổi"
              onChange={(e) => setSelectedAssignment(e.target.value)}
            >
              {myActiveAssignments.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.shift?.name} — {a.zone?.zoneName} — {a.workDate}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Đổi với nhân viên</InputLabel>
            <Select
              value={targetStaffId}
              label="Đổi với nhân viên"
              onChange={(e) => setTargetStaffId(e.target.value)}
            >
              {allStaff
                .filter((s) => (s.role === "staff" || s.role === "admin") && s.id !== user?.id)
                .map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.fullName || s.email}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          {targetStaffId && (
            <FormControl fullWidth>
              <InputLabel>Ca đối ứng muốn đổi lấy (không bắt buộc)</InputLabel>
              <Select
                value={targetAssignmentId}
                label="Ca đối ứng muốn đổi lấy (không bắt buộc)"
                onChange={(e) => setTargetAssignmentId(e.target.value)}
                disabled={loadingAssignments}
              >
                <MenuItem value="">
                  <em>Không chọn (Đổi 1 chiều / Chờ đối phương chọn)</em>
                </MenuItem>
                {targetAssignments.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.shift?.name} — {a.zone?.zoneName} — {a.workDate}
                  </MenuItem>
                ))}
                {targetAssignments.length === 0 && !loadingAssignments && (
                  <MenuItem disabled>Nhân viên này không có ca trực nào khả dụng</MenuItem>
                )}
              </Select>
            </FormControl>
          )}
          <TextField
            label="Lý do (không bắt buộc)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            rows={2}
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
