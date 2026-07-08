"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import CalendarTodayIcon from "@mui/icons-material/CalendarTodayOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import FaceRetouchingNaturalOutlinedIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import FingerprintOutlinedIcon from "@mui/icons-material/FingerprintOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import MailIcon from "@mui/icons-material/MailOutlined";
import PersonIcon from "@mui/icons-material/PersonOutlined";
import PhoneIcon from "@mui/icons-material/PhoneOutlined";
import LocationOnIcon from "@mui/icons-material/LocationOnOutlined";
import SchoolIcon from "@mui/icons-material/SchoolOutlined";
import ShieldIcon from "@mui/icons-material/ShieldOutlined";
import VerifiedIcon from "@mui/icons-material/VerifiedOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import notification from "antd/es/notification";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import { initials, formatDate, formatDateTime, roleLabel, statusLabel, statusColor } from "@/lib/utils";
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

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", py: 1 }}>
      <Box sx={{ color: "text.secondary", mt: 0.3, minWidth: 20 }}>{icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: "break-word" }}>
          {value || "-"}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function UserDetailPage() {
  const [apiAnt, contextHolder] = notification.useNotification();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

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
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const loadUser = useCallback(async () => {
    try {
      const data = await api.getUser(id);
      setUser(data);
    } catch {
      try {
        const list = await api.listUsers();
        const found = list.users.find((u) => u.id === id);
        if (found) setUser(found);
        else setUser(null);
      } catch {
        setUser(null);
      }
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadUser();
      setLoading(false);
    })();
  }, [loadUser]);

  const openEdit = () => {
    if (!user) return;
    setEditForm({
      full_name: user.full_name || "",
      phone: user.phone || "",
      student_code: user.student_code || "",
      class_name: user.class_name || "",
      course: user.course || "",
      identity_number: user.identity_number || "",
      permanent_address: user.permanentAddress || user.permanent_address || "",
      card_number: user.card_number || "",
      issue_date: user.issue_date || "",
      membership_expiry: user.membership_expiry || "",
      role: user.role,
      status: user.status || "active",
    });
    setEditError("");
    setShowEdit(true);
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
      setShowEdit(false);
      apiAnt.success({ message: "Đã cập nhật thông tin người dùng.", placement: "topRight" });
      await loadUser();
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = getErrorMessage(err) || "Lưu thất bại";
      setEditError(
        status === 409
          ? `${msg} — Số thẻ hoặc mã sinh viên đã tồn tại.`
          : msg
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || deleteConfirmText !== "XÓA") return;
    try {
      await api.deleteUser(user.id);
      apiAnt.success({ message: "Đã xóa người dùng.", placement: "topRight" });
      router.push("/dashboard/admin");
    } catch (err: any) {
      apiAnt.error({ message: `Xóa thất bại: ${getErrorMessage(err) || "Lỗi không xác định"}`, placement: "topRight" });
    }
  };

  const expired = !user ? false : user.membership_expiry != null && new Date(user.membership_expiry) < new Date();
  const isSuspended = user?.status === "suspended";

  const headerActions = user ? (
    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
      <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={openEdit}>
        Sửa
      </Button>
      <Button color="error" variant="outlined" startIcon={<DeleteOutlineOutlinedIcon />} onClick={() => setShowDelete(true)}>
        Xóa
      </Button>
    </Stack>
  ) : null;

  return (
    <LoadingOverlay loading={loading} message="Đang tải hồ sơ người dùng...">
      {!user ? (
        <EmptyState
          icon={<PersonIcon sx={{ fontSize: 56 }} />}
          title="Không tìm thấy người dùng"
          description="Hồ sơ có thể đã bị xóa hoặc ID không hợp lệ."
          action={
            <Button variant="contained" startIcon={<PersonIcon />} onClick={() => router.push("/dashboard/admin")}>
              Quay lại danh sách
            </Button>
          }
        />
      ) : (
        <Stack spacing={3}>
          <PageHeader
            backHref="/dashboard/admin"
            title={user.full_name || "Chưa cập nhật"}
            subtitle={`Email: ${user.email}`}
            icon={AdminPanelSettingsOutlinedIcon}
            actions={headerActions}
          />

          {isSuspended && user.suspended_reason && (
            <Alert severity="error" sx={{ fontWeight: 600 }}>
              Lý do khóa: {user.suspended_reason}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Left column — Profile card */}
            <Grid size={{ xs: 12, md: 4 }} sx={staggerSx(0)}>
              <DashboardCard noPadding>
                <Box
                  sx={{
                    height: 100,
                    background: user.role === "admin"
                      ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                      : user.role === "staff"
                        ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                        : "linear-gradient(135deg, #64748b 0%, #475569 100%)",
                  }}
                />
                <Box sx={{ px: 2.5, pb: 2.5, mt: -5, textAlign: "center" }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      mx: "auto",
                      bgcolor: user.role === "admin" ? "rgba(245,158,11,0.15)" : user.role === "staff" ? "rgba(59,130,246,0.15)" : "rgba(100,116,139,0.15)",
                      color: user.role === "admin" ? "warning.main" : user.role === "staff" ? "primary.main" : "text.secondary",
                      fontWeight: 700,
                      fontSize: 28,
                      border: "4px solid",
                      borderColor: "background.paper",
                      boxShadow: 2,
                    }}
                    src={user.avatar_url || undefined}
                  >
                    {initials(user.full_name || user.email)}
                  </Avatar>

                  <Typography variant="h6" sx={{ fontWeight: 800, mt: 1.5 }}>{user.full_name || "Chưa cập nhật"}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>{user.email}</Typography>

                  <Stack direction="row" spacing={0.75} sx={{ justifyContent: "center", mt: 1.5, flexWrap: "wrap", gap: 0.5 }}>
                    <Chip
                      label={roleLabel(user.role)}
                      color={user.role === "admin" ? "warning" : user.role === "staff" ? "primary" : "default"}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip
                      label={statusLabel(user.status || "active")}
                      color={statusColor(user.status || "active")}
                      size="small"
                    />
                    {user.has_face && (
                      <Chip
                        icon={<FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: "16px !important" }} />}
                        label="Face ID"
                        color="success"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Stack spacing={0}>
                    <MetaRow icon={<PhoneIcon fontSize="small" />} label="Điện thoại" value={user.phone} />
                    <MetaRow icon={<SchoolIcon fontSize="small" />} label="Lớp" value={user.class_name} />
                    <MetaRow icon={<SchoolIcon fontSize="small" />} label="Khóa học" value={user.course} />
                    <MetaRow icon={<CalendarTodayIcon fontSize="small" />} label="Hạn thẻ" value={
                      <span style={{ color: expired ? "#d32f2f" : undefined, fontWeight: 700 }}>
                        {formatDate(user.membership_expiry)}{expired ? " (Hết hạn)" : ""}
                      </span>
                    } />
                  </Stack>
                </Box>
              </DashboardCard>
            </Grid>

            {/* Right column — Tabs */}
            <Grid size={{ xs: 12, md: 8 }} sx={staggerSx(1)}>
              <Stack spacing={3}>
                {/* Stats row */}
                <Stack direction="row" spacing={1.5}>
                  {[
                    { label: "Vai trò", value: roleLabel(user.role), color: user.role === "admin" ? "warning" as const : user.role === "staff" ? "info" as const : "default" as const, icon: <ShieldIcon fontSize="small" /> },
                    { label: "Trạng thái", value: statusLabel(user.status || "active"), color: statusColor(user.status || "active"), icon: <VerifiedIcon fontSize="small" /> },
                    { label: "Thẻ", value: user.card_number || "-", color: "success" as const, icon: <BadgeOutlinedIcon fontSize="small" /> },
                  ].map((item, idx) => (
                    <Paper key={item.label} variant="outlined" sx={{
                      flex: 1,
                      p: 1.5,
                      textAlign: "center",
                      borderColor: `${item.color}.main`,
                      borderRadius: 2,
                      background: item.color === "warning" ? "rgba(245,158,11,0.08)" : item.color === "info" ? "rgba(2,136,209,0.08)" : item.color === "success" ? "rgba(46,125,50,0.08)" : "rgba(100,116,139,0.08)",
                      ...staggerSx(idx),
                    }}>
                      <Box sx={{ color: `${item.color}.main`, mb: 0.5 }}>{item.icon}</Box>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: `${item.color}.main`, fontSize: "1rem" }}>{item.value}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</Typography>
                    </Paper>
                  ))}
                </Stack>

                {/* Tabs */}
                <DashboardCard noPadding>
                  <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2.5 }}>
                    <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                      <Tab label="Thông tin chi tiết" />
                      <Tab label="Hệ thống" />
                    </Tabs>
                  </Box>

                  {/* Tab 0: Info detail */}
                  {tab === 0 && (
                    <Box sx={{ p: 2.5 }}>
                      <Grid container spacing={0.5}>
                        {[
                          { label: "Họ tên", value: user.full_name, icon: <PersonIcon fontSize="small" /> },
                          { label: "Email", value: user.email, icon: <MailIcon fontSize="small" /> },
                          { label: "Số điện thoại", value: user.phone, icon: <PhoneIcon fontSize="small" /> },
                          { label: "Địa chỉ thường trú", value: user.permanent_address || user.permanentAddress, icon: <LocationOnIcon fontSize="small" /> },
                          { label: "Số CCCD/CMND", value: user.identity_number, icon: <BadgeOutlinedIcon fontSize="small" /> },
                          { label: "Mã sinh viên", value: user.student_code, icon: <BadgeOutlinedIcon fontSize="small" /> },
                          { label: "Lớp", value: user.class_name, icon: <SchoolIcon fontSize="small" /> },
                          { label: "Khóa học", value: user.course, icon: <SchoolIcon fontSize="small" /> },
                          { label: "Số thẻ thư viện", value: user.card_number, icon: <BadgeOutlinedIcon fontSize="small" /> },
                          { label: "Ngày cấp thẻ", value: formatDate(user.issue_date), icon: <CalendarTodayIcon fontSize="small" /> },
                          { label: "Hạn membership", value: formatDate(user.membership_expiry), icon: <CalendarTodayIcon fontSize="small" /> },
                          { label: "Vai trò", value: roleLabel(user.role), icon: <ShieldIcon fontSize="small" /> },
                        ].map((item) => (
                          <Grid key={item.label} size={{ xs: 12, sm: 6 }}>
                            <MetaRow icon={item.icon} label={item.label} value={item.value} />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {/* Tab 1: System */}
                  {tab === 1 && (
                    <Box sx={{ p: 2.5 }}>
                      <Grid container spacing={0.5}>
                        {[
                          { label: "ID người dùng", value: user.id, icon: <FingerprintOutlinedIcon fontSize="small" /> },
                          { label: "Ngày tạo", value: formatDateTime(user.created_at), icon: <CalendarTodayIcon fontSize="small" /> },
                          { label: "Lần vào gần nhất", value: formatDateTime(user.last_entry_at), icon: <HistoryOutlinedIcon fontSize="small" /> },
                          { label: "Cổng ghi nhận", value: user.last_entry_camera || "-", icon: <HistoryOutlinedIcon fontSize="small" /> },
                          { label: "Trạng thái hiện tại", value: user.current_status || "-", icon: <VerifiedIcon fontSize="small" /> },
                        ].map((item) => (
                          <Grid key={item.label} size={{ xs: 12, sm: 6 }}>
                            <MetaRow icon={item.icon} label={item.label} value={
                              item.label === "ID người dùng"
                                ? <span style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{item.value}</span>
                                : item.value
                            } />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                </DashboardCard>
              </Stack>
            </Grid>
          </Grid>

          {/* Edit dialog */}
          <Dialog open={showEdit} onClose={() => !saving && setShowEdit(false)} fullWidth maxWidth="sm">
            <DialogTitle>Sửa thông tin người dùng</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 1 }}>
                {editError && <Alert severity="error">{editError}</Alert>}

                <TextField label="Họ và tên" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} fullWidth />
                <Typography variant="caption" color="text.secondary">Email không thể chỉnh sửa từ đây (yêu cầu luồng OTP).</Typography>

                <TextField label="Số điện thoại" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} fullWidth />
                <TextField label="Mã sinh viên" value={editForm.student_code} onChange={(e) => setEditForm({ ...editForm, student_code: e.target.value })} fullWidth helperText="Phải là duy nhất nếu điền" />
                <TextField label="Lớp" value={editForm.class_name} onChange={(e) => setEditForm({ ...editForm, class_name: e.target.value })} fullWidth />
                <TextField label="Khóa học" value={editForm.course} onChange={(e) => setEditForm({ ...editForm, course: e.target.value })} fullWidth />
                <TextField label="Số CCCD/CMND" value={editForm.identity_number} onChange={(e) => setEditForm({ ...editForm, identity_number: e.target.value })} fullWidth />
                <TextField label="Địa chỉ thường trú" value={editForm.permanent_address} onChange={(e) => setEditForm({ ...editForm, permanent_address: e.target.value })} fullWidth />
                <TextField label="Số thẻ thư viện" value={editForm.card_number} onChange={(e) => setEditForm({ ...editForm, card_number: e.target.value })} fullWidth helperText="Phải là duy nhất nếu điền" />
                <TextField label="Ngày cấp thẻ" type="date" value={editForm.issue_date} onChange={(e) => setEditForm({ ...editForm, issue_date: e.target.value })} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
                <TextField label="Hạn membership" type="date" value={editForm.membership_expiry} onChange={(e) => setEditForm({ ...editForm, membership_expiry: e.target.value })} fullWidth slotProps={{ inputLabel: { shrink: true } }} helperText={editForm.membership_expiry && new Date(editForm.membership_expiry) < new Date() ? "Đã hết hạn" : ""} />

                <TextField select label="Vai trò" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} fullWidth>
                  {ROLE_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </TextField>

                <TextField select label="Trạng thái" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} fullWidth>
                  {STATUS_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </TextField>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowEdit(false)} disabled={saving}>Hủy</Button>
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete dialog */}
          <Dialog open={showDelete} onClose={() => { setShowDelete(false); setDeleteConfirmText(""); }} fullWidth maxWidth="xs">
            <DialogTitle>Xóa người dùng?</DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Typography color="text.secondary">
                  Hồ sơ <strong>{user.full_name || user.email}</strong> sẽ bị xóa khỏi hệ thống.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Nhập <strong>XÓA</strong> để xác nhận:
                </Typography>
                <TextField value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="Nhập XÓA" size="small" autoFocus fullWidth />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setShowDelete(false); setDeleteConfirmText(""); }}>Hủy</Button>
              <Button color="error" variant="contained" onClick={handleDelete} disabled={deleteConfirmText !== "XÓA"}>Xóa vĩnh viễn</Button>
            </DialogActions>
          </Dialog>

          {contextHolder}
        </Stack>
      )}
    </LoadingOverlay>
  );
}
