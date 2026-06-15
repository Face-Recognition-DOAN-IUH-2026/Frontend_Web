"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import FaceRetouchingNaturalOutlinedIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import api from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { UserPublic } from "@/lib/types";

function roleLabel(role: string) {
  if (role === "admin") return "Quản trị";
  if (role === "staff") return "Nhân viên";
  if (role === "patron") return "Độc giả";
  return role;
}

function initials(email: string) {
  return email.slice(0, 1).toUpperCase();
}

export default function AdminPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserPublic | null>(null);
  const [createForm, setCreateForm] = useState({ email: "", password: "", role: "staff" });
  const [createError, setCreateError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isLoading, isAuthenticated, router]);

  const load = async () => {
    try {
      const data = await api.listUsers();
      setUsers(data.users);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!createForm.email || !createForm.password) {
      setCreateError("Vui lòng nhập email và mật khẩu.");
      return;
    }
    try {
      setCreateError("");
      await api.register(createForm);
      setShowCreate(false);
      setCreateForm({ email: "", password: "", role: "staff" });
      setNotice("Đã tạo người dùng mới.");
      load();
    } catch (err: any) {
      setCreateError(err?.response?.data?.detail || "Tạo người dùng thất bại.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const current = deleteTarget;
    setDeleteTarget(null);
    setUsers((prev) => prev.filter((u) => u.id !== current.id));
    try {
      await api.deleteUser(current.id);
      setNotice("Đã xóa người dùng.");
    } catch {
      setNotice("Xóa thất bại, dữ liệu đã được tải lại.");
      load();
    }
  };

  if (isLoading) {
    return (
      <Stack sx={{ minHeight: 400, alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (!isAuthenticated) return null;

  const adminCount = users.filter((item) => item.role === "admin").length;
  const staffCount = users.filter((item) => item.role === "staff").length;
  const faceCount = users.filter((item) => item.has_face).length;

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}>
          <Box>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
              <AdminPanelSettingsOutlinedIcon color="primary" />
              <Typography variant="h4" sx={{ fontWeight: 850 }}>
                Quản trị người dùng
              </Typography>
            </Stack>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Tạo tài khoản admin/staff và theo dõi trạng thái đăng ký khuôn mặt.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => setShowCreate(true)}>
            Thêm người dùng
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        {[
          { label: "Tổng người dùng", value: total, icon: <GroupsOutlinedIcon /> },
          { label: "Quản trị viên", value: adminCount, icon: <AdminPanelSettingsOutlinedIcon /> },
          { label: "Nhân viên", value: staffCount, icon: <PersonOutlineOutlinedIcon /> },
          { label: "Đã có khuôn mặt", value: faceCount, icon: <FaceRetouchingNaturalOutlinedIcon /> },
        ].map((item) => (
          <Grid key={item.label} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Paper variant="outlined" sx={{ p: 2.25 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Avatar sx={{ bgcolor: "action.hover", color: "primary.main" }}>{item.icon}</Avatar>
                <Box>
                  <Typography color="text.secondary" variant="body2">{item.label}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 850 }}>{item.value}</Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <TableContainer>
          <Table sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Vai trò</TableCell>
                <TableCell>Khuôn mặt</TableCell>
                <TableCell align="right">Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Stack sx={{ py: 6, alignItems: "center" }}>
                      <CircularProgress size={28} />
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Alert severity="info">Không có người dùng nào.</Alert>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 800 }}>
                          {initials(item.email)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 750 }} noWrap>{item.email}</Typography>
                          {item.full_name && <Typography variant="body2" color="text.secondary" noWrap>{item.full_name}</Typography>}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={item.role === "admin" ? "warning" : item.role === "staff" ? "primary" : "default"}
                        label={roleLabel(item.role)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={item.has_face ? "success" : "default"}
                        label={item.has_face ? "Đã xác thực" : "Chưa xác thực"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        color="error"
                        variant="outlined"
                        size="small"
                        startIcon={<DeleteOutlineOutlinedIcon />}
                        onClick={() => setDeleteTarget(item)}
                      >
                        Xóa
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} fullWidth maxWidth="sm">
        <DialogTitle>Thêm người dùng</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {createError && <Alert severity="error">{createError}</Alert>}
            <TextField
              label="Email"
              type="email"
              value={createForm.email}
              onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })}
              fullWidth
            />
            <TextField
              label="Mật khẩu"
              type="password"
              value={createForm.password}
              onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Vai trò</InputLabel>
              <Select
                label="Vai trò"
                value={createForm.role}
                onChange={(event) => setCreateForm({ ...createForm, role: event.target.value })}
              >
                <MenuItem value="staff">Nhân viên</MenuItem>
                <MenuItem value="admin">Quản trị</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreate(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleCreate}>Tạo</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Xóa người dùng?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Tài khoản {deleteTarget?.email} sẽ bị xóa khỏi hệ thống.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Hủy</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Xóa</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(notice)} autoHideDuration={3000} onClose={() => setNotice("")} message={notice} />
    </Stack>
  );
}
