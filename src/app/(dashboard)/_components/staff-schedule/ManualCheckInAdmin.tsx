"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Alert from "antd/es/alert";
import Modal from "antd/es/modal";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PendingIcon from "@mui/icons-material/Pending";
import InfoIcon from "@mui/icons-material/Info";
import api from "@/lib/api-client";
import type { ManualCheckInRequest, ScheduleStaff } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

function getApiError(err: any): string {
  const data = err?.response?.data;
  return data?.error || data?.message || err?.message || "Có lỗi xảy ra";
}

const STATUS_CONFIG: Record<string, { label: string; color: "warning" | "success" | "info" | "error"; icon: React.ReactNode }> = {
  pending_manual: { label: "Chờ duyệt", color: "warning", icon: <PendingIcon sx={{ fontSize: 14 }} /> },
  check_in: { label: "Đã check-in", color: "success", icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
  check_out: { label: "Đã check-out", color: "info", icon: <InfoIcon sx={{ fontSize: 14 }} /> },
  rejected: { label: "Từ chối", color: "error", icon: <CancelIcon sx={{ fontSize: 14 }} /> },
};

export default function ManualCheckInAdmin({ open, onClose, onUpdated }: Props) {
  const [requests, setRequests] = useState<ManualCheckInRequest[]>([]);
  const [staff, setStaff] = useState<ScheduleStaff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqs, staffList] = await Promise.all([
        api.listManualCheckInRequests(),
        api.getScheduleStaffOptions(),
      ]);
      setRequests(reqs);
      setStaff(staffList);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  const getStaffName = (id: string) => {
    const s = staff.find((x) => x.id === id);
    return s?.fullName || s?.email || "Nhân viên";
  };

  const handleApprove = async (id: string) => {
    setActioningId(id);
    try {
      await api.approveManualCheckIn(id);
      await loadData();
      onUpdated?.();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = rejectReason.trim() || "Từ chối bởi quản lý";
    setActioningId(id);
    try {
      await api.rejectManualCheckIn(id, reason);
      await loadData();
      setRejectingId(null);
      setRejectReason("");
      onUpdated?.();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setActioningId(null);
    }
  };

  const startReject = (id: string) => {
    setRejectingId(id);
    setRejectReason("");
  };

  const cancelReject = () => {
    setRejectingId(null);
    setRejectReason("");
  };

  const openConfirmDialog = (id: string) => {
    Modal.confirm({
      title: "Xác nhận",
      content: "Duyệt check-in thủ công này?",
      okText: "Duyệt",
      cancelText: "Hủy",
      okButtonProps: { style: { background: "#10b981", borderColor: "#10b981" } },
      onOk: () => handleApprove(id),
    });
  };

  const pending = requests.filter((r) => r.status === "pending_manual");
  const others = requests.filter((r) => r.status !== "pending_manual");

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose} sx={{ zIndex: 1300 }}>
        <Box sx={{ width: { xs: "100%", sm: 420 }, height: "100%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700 }}>
              Check-in thủ công
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
            {error && <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} />}

            {loading && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>Đang tải...</Typography>
              </Box>
            )}

            {!loading && pending.length === 0 && others.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", textAlign: "center", py: 4 }}>
                Không có yêu cầu nào
              </Typography>
            )}

            {pending.length > 0 && (
              <Box>
                <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Chờ duyệt ({pending.length})
                </Typography>
                <Stack spacing={1} sx={{ mt: 0.5 }}>
                  {pending.map((req) => {
                    const config = STATUS_CONFIG[req.status] || { label: req.status, color: "info" as const, icon: <InfoIcon sx={{ fontSize: 14 }} /> };
                    return (
                      <Box key={req.id} sx={{ border: 1, borderColor: "warning.light", borderRadius: 1, bgcolor: "warning.light", opacity: 0.9, p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{getStaffName(req.staffId)}</Typography>
                          <Chip icon={config.icon as React.ReactElement} label={config.label} color={config.color} size="small" sx={{ height: 22, fontSize: 10, fontWeight: 700 }} />
                        </Box>
                        {req.invalidatedReason && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                            Lý do: {req.invalidatedReason.replace("manual_checkin_request:", "")}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          Giờ check-in: {req.checkInAt ? new Date(req.checkInAt).toLocaleString("vi-VN") : "Chưa"}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => openConfirmDialog(req.id)}
                            disabled={actioningId === req.id}
                            fullWidth
                          >
                            {actioningId === req.id ? <CircularProgress size={14} color="inherit" /> : "Duyệt"}
                          </Button>
                          {rejectingId === req.id ? (
                            <Button size="small" variant="outlined" onClick={cancelReject} fullWidth>
                              Hủy
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              onClick={() => startReject(req.id)}
                              disabled={actioningId === req.id}
                              fullWidth
                            >
                              Từ chối
                            </Button>
                          )}
                        </Stack>
                        {rejectingId === req.id && (
                          <Stack spacing={1}>
                            <TextField
                              size="small"
                              placeholder="Lý do từ chối (không bắt buộc)"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              fullWidth
                            />
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              onClick={() => handleReject(req.id)}
                              disabled={actioningId === req.id}
                              fullWidth
                            >
                              {actioningId === req.id ? "Đang xử lý..." : "Xác nhận từ chối"}
                            </Button>
                          </Stack>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {others.length > 0 && (
              <Box>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Đã xử lý
                </Typography>
                <Stack spacing={1} sx={{ mt: 0.5 }}>
                  {others.map((req) => {
                    const config = STATUS_CONFIG[req.status] || { label: req.status, color: "info" as const, icon: <InfoIcon sx={{ fontSize: 14 }} /> };
                    return (
                      <Box key={req.id} sx={{ border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.paper", p: 1.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{getStaffName(req.staffId)}</Typography>
                          <Chip icon={config.icon as React.ReactElement} label={config.label} color={config.color} size="small" sx={{ height: 22, fontSize: 10, fontWeight: 700 }} />
                        </Box>
                        {req.invalidatedReason && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                            {req.invalidatedReason.replace("manual_checkin_rejected:", "Từ chối: ").replace("manual_checkin_request:", "")}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Box>
        </Box>
      </Drawer>

    </>
  );
}
