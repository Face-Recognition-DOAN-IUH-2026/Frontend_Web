"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/EditOutlined";
import MailIcon from "@mui/icons-material/MailOutlined";
import FaceIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import ShieldIcon from "@mui/icons-material/ShieldOutlined";
import FingerprintIcon from "@mui/icons-material/FingerprintOutlined";
import BadgeIcon from "@mui/icons-material/BadgeOutlined";
import ErrorIcon from "@mui/icons-material/ErrorOutlineOutlined";
import api from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { initials, roleLabel, statusLabel, statusColor } from "@/lib/utils";
import type { UserPublic } from "@/lib/types";

const ROLE_OPTIONS = [
  { value: "patron", label: "Độc giả (Patron)" },
  { value: "staff", label: "Nhân viên (Staff)" },
  { value: "admin", label: "Quản trị (Admin)" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Hoạt động" },
  { value: "suspended", label: "Tạm khóa" },
  { value: "inactive", label: "Không hoạt động" },
];

export default function UserDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    student_code: "",
    class_name: "",
    course: "",
    identity_number: "",
    permanent_address: "",
    card_number: "",
    issue_date: "",
    membership_expiry: "",
    role: "",
    status: "active",
  });
  const [editError, setEditError] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        try {
          const userData = await api.getUser(id);
          setUser(userData);
        } catch {
          const list = await api.listUsers();
          const found = list.users.find((u) => u.id === id);
          if (found) {
            setUser(found);
          } else {
            setError("Không tìm thấy hồ sơ người dùng.");
          }
        }
      } catch {
        setError("Lỗi khi tải dữ liệu người dùng.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const openEdit = () => {
    if (!user) return;
    setEditForm({
      full_name: user.full_name || "",
      phone: user.phone || "",
      student_code: user.student_code || "",
      class_name: user.class_name || "",
      course: user.course || "",
      identity_number: user.identity_number || "",
      permanent_address: user.permanentAddress || "",
      card_number: user.card_number || "",
      issue_date: user.issue_date || "",
      membership_expiry: user.membership_expiry || "",
      role: user.role,
      status: user.status || "active",
    });
    setEditError("");
    setEditOpen(true);
  };

  const handleSave = async () => {
    setEditError("");
    setSaving(true);
    try {
      const data: Record<string, string> = {};
      if (editForm.full_name) data.full_name = editForm.full_name;
      if (editForm.phone) data.phone = editForm.phone;
      if (editForm.student_code) data.student_code = editForm.student_code;
      if (editForm.class_name) data.class_name = editForm.class_name;
      if (editForm.course) data.course = editForm.course;
      if (editForm.identity_number) data.identity_number = editForm.identity_number;
      if (editForm.permanent_address) data.permanent_address = editForm.permanent_address;
      if (editForm.card_number) data.card_number = editForm.card_number;
      if (editForm.issue_date) data.issue_date = editForm.issue_date;
      if (editForm.membership_expiry) data.membership_expiry = editForm.membership_expiry;
      data.role = editForm.role;
      data.status = editForm.status;

      const updated = await api.updateUser(id, data);
      setUser(updated);
      setEditOpen(false);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message || "Lưu thất bại";
      setEditError(
        status === 409
          ? `${msg} — Số thẻ hoặc mã sinh viên đã tồn tại.`
          : msg
      );
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 384 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !user) {
    return (
      <Box sx={{ p: 3, space: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push("/dashboard/admin")}
          sx={{ mb: 2 }}
        >
          Quay lại danh sách
        </Button>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

if (!user) return null;

const userInitials = initials(user.full_name || user.email);
const avatarBg = user.status === "suspended" ? "warning.main" : user.role === "admin" ? "primary.main" : "secondary.main";
const dateFmt = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString("vi-VN") : "—");
const dtFmt = (v: string | null | undefined) => (v ? new Date(v).toLocaleString("vi-VN") : "—");

return (
    <Stack spacing={3}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push("/dashboard/admin")}
        sx={{ alignSelf: "flex-start", textTransform: "none" }}
      >
        Quay lại danh sách
      </Button>

      {error && (
        <Alert severity="error" icon={<ErrorIcon />} sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Chi tiết người dùng
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Email: <Box component="span" sx={{ fontFamily: "monospace" }}>{user.email}</Box>
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={openEdit}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          Sửa thông tin
        </Button>
      </Box>

    <Grid container spacing={3}>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Stack spacing={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: "center" }}>
              <Avatar
                sx={{
                  width: 88,
                  height: 88,
                  bgcolor: avatarBg,
                  color: "primary.contrastText",
                  fontSize: 32,
                  fontWeight: 900,
                  mx: "auto",
                  mb: 1.5,
                }}
                src={user.avatar_url || undefined}
              >
                {userInitials}
              </Avatar>
              <Typography variant="h5" sx={{ fontWeight: 700, wordBreak: "break-word" }}>
                {user.full_name || "Chưa cập nhật"}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, fontFamily: "monospace", fontSize: "0.8rem" }}
              >
                {user.email}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ justifyContent: "center", flexWrap: "wrap", mt: 1.5 }}>
                <Chip
                  label={roleLabel(user.role)}
                  color={user.role === "admin" ? "warning" : user.role === "staff" ? "primary" : "default"}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={statusLabel(user.status || "active")}
                  color={statusColor(user.status || "active")}
                  size="small"
                />
              </Stack>
              {user.has_face && (
                <Chip
                  icon={<FaceIcon sx={{ fontSize: 16 }} />}
                  label="Face ID đã đăng ký"
                  color="success"
                  size="small"
                  variant="outlined"
                  sx={{ mt: 1.5 }}
                />
              )}
              {user.suspended_reason && (
                <Alert severity="warning" sx={{ mt: 2, textAlign: "left", borderRadius: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Lý do khóa: {user.suspended_reason}
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}
              >
                Định danh hệ thống
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.75, fontFamily: "monospace", wordBreak: "break-all" }}>
                {user.id}
              </Typography>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <MailIcon fontSize="small" color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Giới hạn tài khoản
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {user.current_status || "—"}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <Stack spacing={3}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                <BadgeIcon fontSize="small" color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Thông tin liên hệ
                </Typography>
              </Stack>
              <Grid container spacing={2}>
                {[
                  ["Số điện thoại", user.phone || "Chưa cập nhật"],
                  ["Địa chỉ thường trú", user.permanent_address || "Chưa cập nhật"],
                  ["Số CCCD/CMND", user.identity_number || "Chưa cập nhật"],
                  ["Lớp", user.class_name || "Chưa cập nhật"],
                ].map(([label, value]) => (
                  <Grid key={label} size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {label}
                    </Typography>
                    <Typography sx={{ mt: 0.25, fontWeight: 500, wordBreak: "break-word" }}>{value}</Typography>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                <ShieldIcon fontSize="small" color="action" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Thư viện
                </Typography>
              </Stack>
              <Grid container spacing={2}>
                {[
                  ["Mã sinh viên", user.student_code || "Chưa cập nhật"],
                  ["Số thẻ thư viện", user.card_number || "Chưa cập nhật"],
                  ["Ngày cấp thẻ", dateFmt(user.issue_date)],
                  ["Hạn membership", dateFmt(user.membership_expiry)],
                ].map(([label, value]) => (
                  <Grid key={label} size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {label}
                    </Typography>
                    <Typography sx={{ mt: 0.25, fontWeight: 500 }}>{value}</Typography>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                <FingerprintIcon fontSize="small" color="action" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Hệ thống
                </Typography>
              </Stack>
              <Grid container spacing={2}>
                {[
                  ["Ngày tạo", dtFmt(user.created_at)],
                  ["Lần vào gần nhất", dtFmt(user.last_entry_at)],
                  ["Cổng ghi nhận", user.last_entry_camera || "—"],
                  ["Vai trò", roleLabel(user.role)],
                ].map(([label, value]) => (
                  <Grid key={label} size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {label}
                    </Typography>
                    <Typography sx={{ mt: 0.25, fontWeight: 500 }}>{value}</Typography>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
      </Grid>

      {/* EditDialog */}
      <Dialog open={editOpen} onClose={() => !saving && setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Sửa thông tin người dùng</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            {editError && <Alert severity="error">{editError}</Alert>}

            <TextField
              label="Họ và tên"
              value={editForm.full_name}
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              size="small"
              fullWidth
            />
            <Typography variant="caption" color="text.secondary">
              Email không thể chỉnh sửa từ đây (yêu cầu luồng OTP).
            </Typography>

            <TextField
              label="Số điện thoại"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              label="Mã sinh viên"
              value={editForm.student_code}
              onChange={(e) => setEditForm({ ...editForm, student_code: e.target.value })}
              size="small"
              fullWidth
              helperText="Phải là duy nhất nếu điền"
            />
            <TextField
              label="Lớp"
              value={editForm.class_name}
              onChange={(e) => setEditForm({ ...editForm, class_name: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              label="Khóa học"
              value={editForm.course}
              onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              label="Số CCCD/CMND"
              value={editForm.identity_number}
              onChange={(e) => setEditForm({ ...editForm, identity_number: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              label="Địa chỉ thường trú"
              value={editForm.permanent_address}
              onChange={(e) => setEditForm({ ...editForm, permanent_address: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              label="Số thẻ thư viện"
              value={editForm.card_number}
              onChange={(e) => setEditForm({ ...editForm, card_number: e.target.value })}
              size="small"
              fullWidth
              helperText="Phải là duy nhất nếu điền"
            />
            <TextField
              label="Ngày cấp thẻ"
              type="date"
              value={editForm.issue_date}
              onChange={(e) => setEditForm({ ...editForm, issue_date: e.target.value })}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Hạn membership"
              type="date"
              value={editForm.membership_expiry}
              onChange={(e) => setEditForm({ ...editForm, membership_expiry: e.target.value })}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              helperText={editForm.membership_expiry && new Date(editForm.membership_expiry) < new Date() ? "Đã hết hạn" : ""}
            />

            <TextField
              select
              label="Vai trò"
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              size="small"
              fullWidth
            >
              {ROLE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Trạng thái"
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              size="small"
              fullWidth
            >
              {STATUS_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditOpen(false)} disabled={saving} sx={{ textTransform: "none" }}>
            Hủy
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving} sx={{ textTransform: "none", borderRadius: 2 }}>
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

