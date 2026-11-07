"use client";

import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import { useToast } from "@/lib/toast-context";
import type { PatronCreate } from "@/lib/types";

interface CreatePatronDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function getDefaultExpiry(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export default function CreatePatronDialog({ open, onClose, onSuccess }: CreatePatronDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PatronCreate>({
    full_name: "",
    student_code: "",
    class_name: "",
    course: "",
    email: "",
    phone: "",
    identity_number: "",
    permanent_address: "",
    membership_expiry: getDefaultExpiry(),
    issue_date: getToday(),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!form.full_name?.trim()) nextErrors.full_name = "Vui lòng nhập họ và tên độc giả";
    if (!form.student_code?.trim()) nextErrors.student_code = "Vui lòng nhập MSSV / Mã thẻ";
    if (!form.membership_expiry) nextErrors.membership_expiry = "Vui lòng chọn ngày hết hạn";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Email không đúng định dạng";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload: PatronCreate = {
        full_name: form.full_name.trim(),
        student_code: form.student_code.trim().toUpperCase(),
        class_name: form.class_name?.trim() || undefined,
        course: form.course?.trim() || undefined,
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        identity_number: form.identity_number?.trim() || undefined,
        permanent_address: form.permanent_address?.trim() || undefined,
        membership_expiry: form.membership_expiry,
        issue_date: form.issue_date || getToday(),
      };
      await api.createPatron(payload);
      toast.success(`Đã thêm mới độc giả ${payload.full_name} (${payload.student_code})`);
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Không thể tạo độc giả mới");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setForm({
      full_name: "",
      student_code: "",
      class_name: "",
      course: "",
      email: "",
      phone: "",
      identity_number: "",
      permanent_address: "",
      membership_expiry: getDefaultExpiry(),
      issue_date: getToday(),
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: { borderRadius: 3 },
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ m: 0, p: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: "rgba(139, 0, 0, 0.08)",
                color: "#8B0000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PersonAddOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Thêm độc giả mới
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Đăng ký tài khoản thẻ thư viện cho sinh viên / giảng viên
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={handleClose} disabled={saving} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Họ và tên *"
                placeholder="Nguyễn Văn A"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                error={!!errors.full_name}
                helperText={errors.full_name}
                fullWidth
                autoFocus
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Mã số sinh viên (MSSV) *"
                placeholder="21012345"
                value={form.student_code}
                onChange={(e) => setForm({ ...form, student_code: e.target.value })}
                error={!!errors.student_code}
                helperText={errors.student_code}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Lớp"
                placeholder="DHKTPM17A"
                value={form.class_name}
                onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Khóa học"
                placeholder="K17 (2021 - 2025)"
                value={form.course}
                onChange={(e) => setForm({ ...form, course: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Email"
                type="email"
                placeholder="student@iuh.edu.vn"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                error={!!errors.email}
                helperText={errors.email}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Số điện thoại"
                placeholder="0987654321"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="CMND / CCCD"
                placeholder="079..."
                value={form.identity_number}
                onChange={(e) => setForm({ ...form, identity_number: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Hạn thẻ thư viện *"
                type="date"
                value={form.membership_expiry}
                onChange={(e) => setForm({ ...form, membership_expiry: e.target.value })}
                error={!!errors.membership_expiry}
                helperText={errors.membership_expiry}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Hộ khẩu thường trú / Địa chỉ"
                placeholder="Số nhà, đường, phường/xã, quận/huyện..."
                value={form.permanent_address}
                onChange={(e) => setForm({ ...form, permanent_address: e.target.value })}
                multiline
                rows={2}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={saving} variant="outlined" sx={{ textTransform: "none", borderRadius: 2 }}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={18} /> : <PersonAddOutlinedIcon />}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              fontWeight: 700,
              bgcolor: "#8B0000",
              "&:hover": { bgcolor: "#700000" },
            }}
          >
            {saving ? "Đang lưu..." : "Thêm độc giả"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
