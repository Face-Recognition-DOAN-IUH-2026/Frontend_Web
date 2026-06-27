"use client";

import { useEffect, useState, useMemo } from "react";
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
  Drawer,
  Card,
  CardActionArea,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
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
  ToggleButton,
  ToggleButtonGroup,
  alpha,
  LinearProgress,
} from "@mui/material";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import FaceRetouchingNaturalOutlinedIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import AccountBoxOutlinedIcon from "@mui/icons-material/AccountBoxOutlined";
import CloseIcon from "@mui/icons-material/Close";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import SupervisorAccountOutlinedIcon from "@mui/icons-material/SupervisorAccountOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

import api from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { fadeInUp, shimmer } from "@/lib/animations";
import type { UserPublic } from "@/lib/types";

function roleLabel(role: string) {
  if (role === "admin") return "Quản trị";
  if (role === "staff") return "Nhân viên";
  if (role === "patron") return "Độc giả";
  return role;
}

function roleChipColor(role: string): "warning" | "primary" | "default" | "success" {
  if (role === "admin") return "warning";
  if (role === "staff") return "primary";
  return "default";
}

function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const STAT_GRADIENT: Record<string, string> = {
  total:  "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
  admin:  "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  staff:  "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
  patron: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
  face:   "linear-gradient(135deg, #10b981 0%, #059669 100%)",
};

export default function AdminPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", password: "", role: "staff" });
  const [createError, setCreateError] = useState("");
  const [notice, setNotice] = useState("");

  const [showOtp, setShowOtp] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpSubmitting, setOtpSubmitting] = useState(false);

  // Search & filter
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "staff" | "patron">("all");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isLoading, isAuthenticated, router]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.listUsers();
      setUsers(data.users);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = users;
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.full_name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, roleFilter, search]);

  const handleCreate = async () => {
    if (!createForm.email || !createForm.password) {
      setCreateError("Vui lòng nhập email và mật khẩu.");
      return;
    }
    try {
      setCreateError("");
      await api.register(createForm);
      setOtpEmail(createForm.email);
      setOtpCode("");
      setOtpError("");
      setShowCreate(false);
      setShowOtp(true);
    } catch (err: any) {
      setCreateError(err?.response?.data?.detail || "Tạo người dùng thất bại.");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) return;
    setOtpSubmitting(true);
    setOtpError("");
    try {
      await api.verifyEmail({ email: otpEmail, code: otpCode });
      setShowOtp(false);
      setCreateForm({ email: "", password: "", role: "staff" });
      setNotice("Xác thực email và kích hoạt tài khoản thành công!");
      load();
    } catch (err: any) {
      setOtpError(err?.response?.data?.detail || "Mã OTP không hợp lệ hoặc đã hết hạn.");
    } finally {
      setOtpSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Stack sx={{ minHeight: 400, alignItems: "center", justifyContent: "center" }}>
        <CircularProgress sx={{ animation: `${shimmer} 1.5s ease-in-out infinite` }} />
      </Stack>
    );
  }
  if (!isAuthenticated) return null;

  const adminCount  = users.filter((u) => u.role === "admin").length;
  const staffCount  = users.filter((u) => u.role === "staff").length;
  const patronCount = users.filter((u) => u.role === "patron").length;
  const faceCount   = users.filter((u) => u.has_face).length;

  const stats = [
    { key: "total",  label: "Tổng người dùng",  value: total,       icon: <GroupsOutlinedIcon sx={{ fontSize: 28 }} />,                          pct: 100 },
    { key: "admin",  label: "Quản trị viên",     value: adminCount,  icon: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 28 }} />,              pct: total ? (adminCount / total) * 100 : 0 },
    { key: "staff",  label: "Nhân viên",          value: staffCount,  icon: <PersonOutlineOutlinedIcon sx={{ fontSize: 28 }} />,                   pct: total ? (staffCount / total) * 100 : 0 },
    { key: "patron", label: "Độc giả",            value: patronCount, icon: <AccountBoxOutlinedIcon sx={{ fontSize: 28 }} />,                      pct: total ? (patronCount / total) * 100 : 0 },
    { key: "face",   label: "Đã có khuôn mặt",   value: faceCount,   icon: <FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: 28 }} />,           pct: total ? (faceCount / total) * 100 : 0 },
  ];

  return (
    <Stack spacing={3}>
      {/* ── Header ── */}
      <Box
        sx={{
          p: 3,
          borderRadius: 3,
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
          border: "1px solid",
          borderColor: "rgba(99,102,241,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <Box sx={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", bgcolor: "rgba(99,102,241,0.08)", pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -60, left: 200, width: 220, height: 220, borderRadius: "50%", bgcolor: "rgba(99,102,241,0.05)", pointerEvents: "none" }} />

        <Stack direction="row" spacing={2} sx={{ zIndex: 1, alignItems: "center" }}>
          <Avatar sx={{ bgcolor: "rgba(99,102,241,0.3)", width: 52, height: 52, border: "1px solid rgba(99,102,241,0.5)" }}>
            <AdminPanelSettingsOutlinedIcon sx={{ color: "#a5b4fc", fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#e0e7ff" }}>
              Quản trị người dùng
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(199,210,254,0.7)", mt: 0.3 }}>
              Tạo tài khoản admin/staff và theo dõi trạng thái sinh trắc học.
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ zIndex: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshOutlinedIcon />}
            onClick={load}
            size="small"
            sx={{ color: "#a5b4fc", borderColor: "rgba(165,180,252,0.4)", "&:hover": { borderColor: "#a5b4fc", bgcolor: "rgba(165,180,252,0.08)" }, borderRadius: 2 }}
          >
            Tải lại
          </Button>
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={() => setShowCreate(true)}
            sx={{ borderRadius: 2, fontWeight: 700, bgcolor: "#6366f1", "&:hover": { bgcolor: "#4f46e5" }, boxShadow: "0 4px 14px rgba(99,102,241,0.4)" }}
          >
            Thêm người dùng
          </Button>
        </Stack>
      </Box>

      {/* ── Stat Cards ── */}
      <Grid container spacing={2}>
        {stats.map((s, idx) => (
          <Grid key={s.key} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 } as any}
            sx={{ animation: `${fadeInUp} 0.4s ease-out`, animationDelay: `${idx * 0.07}s`, animationFillMode: "both" }}
          >
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 3,
                position: "relative",
                overflow: "hidden",
                borderColor: "divider",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": { transform: "translateY(-2px)", boxShadow: 4 },
              }}
            >
              <Box
                sx={{
                  position: "absolute", top: 0, right: 0,
                  width: 80, height: 80,
                  background: STAT_GRADIENT[s.key],
                  opacity: 0.12,
                  borderRadius: "0 12px 0 80px",
                }}
              />
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                <Avatar sx={{ background: STAT_GRADIENT[s.key], width: 44, height: 44, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                  {s.icon}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {s.label}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                    {s.value}
                  </Typography>
                </Box>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={s.pct}
                sx={{
                  mt: 1.5, height: 3, borderRadius: 2,
                  bgcolor: "action.hover",
                  "& .MuiLinearProgress-bar": { background: STAT_GRADIENT[s.key], borderRadius: 2 },
                }}
              />
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── Table card ── */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        {/* Table toolbar */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: "divider", alignItems: { sm: "center" } }}
        >
          <TextField
            size="small"
            placeholder="Tìm theo email, họ tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlinedIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <ToggleButtonGroup
            value={roleFilter}
            exclusive
            onChange={(_, v) => v && setRoleFilter(v)}
            size="small"
            sx={{
              "& .MuiToggleButton-root": {
                px: 2, py: 0.6,
                borderRadius: "20px!important",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.8rem",
                border: "1px solid",
                borderColor: "divider",
              },
              gap: 0.5,
            }}
          >
            <ToggleButton value="all">Tất cả</ToggleButton>
            <ToggleButton value="admin">Admin</ToggleButton>
            <ToggleButton value="staff">Nhân viên</ToggleButton>
            <ToggleButton value="patron">Độc giả</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
            {filtered.length} / {total} người
          </Typography>
        </Stack>

        <TableContainer>
          <Table sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow sx={{ "& .MuiTableCell-head": { fontWeight: 700, bgcolor: "action.hover", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" } }}>
                <TableCell>Người dùng</TableCell>
                <TableCell>Vai trò</TableCell>
                <TableCell>Sinh trắc học</TableCell>
                <TableCell>Trạng thái</TableCell>
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
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Stack sx={{ py: 6, alignItems: "center", gap: 1 }}>
                      <GroupsOutlinedIcon sx={{ fontSize: 48, color: "text.disabled" }} />
                      <Typography color="text.secondary">Không tìm thấy người dùng nào</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow
                    key={item.id}
                    hover
                    onClick={() => router.push(`/dashboard/admin/${item.id}`)}
                    sx={{
                      cursor: "pointer",
                      transition: "background 0.15s",
                      "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
                      "&:last-child td": { border: 0 },
                    }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Avatar
                          sx={{
                            width: 38, height: 38,
                            background: item.role === "admin"
                              ? STAT_GRADIENT.admin
                              : item.role === "staff"
                              ? STAT_GRADIENT.staff
                              : STAT_GRADIENT.patron,
                            fontWeight: 800,
                            fontSize: 14,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                          }}
                        >
                          {initials(item.full_name || item.email)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }} noWrap>
                            {item.email}
                          </Typography>
                          {item.full_name && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {item.full_name}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        color={roleChipColor(item.role)}
                        label={roleLabel(item.role)}
                        sx={{ fontWeight: 700, fontSize: "0.75rem", borderRadius: 1.5 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                        {item.has_face ? (
                          <CheckCircleOutlinedIcon sx={{ fontSize: 18, color: "success.main" }} />
                        ) : (
                          <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: "text.disabled" }} />
                        )}
                        <Typography variant="body2" color={item.has_face ? "success.main" : "text.disabled"} sx={{ fontWeight: 600 }}>
                          {item.has_face ? "Đã đăng ký" : "Chưa đăng ký"}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        color={item.status === "active" ? "success" : item.status === "deleted" ? "error" : "default"}
                        label={item.status === "active" ? "Hoạt động" : item.status === "deleted" ? "Đã xóa" : item.status ?? "—"}
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: "0.72rem", borderRadius: 1.5 }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ── Create Drawer ── */}
      <Drawer
        anchor="right"
        open={showCreate}
        onClose={() => setShowCreate(false)}
        sx={{ "& .MuiDrawer-paper": { width: { xs: "100%", sm: 480 }, bgcolor: "background.default" } }}
      >
        <Box sx={{ background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", p: 3, color: "white" }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>Thêm Thành Viên</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                Cấp tài khoản cho nhân viên hoặc quản trị viên mới
              </Typography>
            </Box>
            <IconButton onClick={() => setShowCreate(false)} size="small" sx={{ color: "white", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

        <Box sx={{ p: 3, flex: 1, overflowY: "auto" }}>
          <Stack spacing={4}>
            {createError && <Alert severity="error" sx={{ borderRadius: 2 }}>{createError}</Alert>}

            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                1. Thông tin đăng nhập
              </Typography>
              <Stack spacing={2.5}>
                <TextField
                  label="Địa chỉ Email"
                  type="email"
                  placeholder="nhanvien@thuvien.iuh.edu.vn"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  fullWidth
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
                <TextField
                  label="Mật khẩu khởi tạo"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  fullWidth
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  helperText="Mật khẩu cần ít nhất 6 ký tự"
                />
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                2. Vai trò hệ thống
              </Typography>
              <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
                {[
                  { role: "staff",  label: "Nhân viên",     desc: "Có quyền xử lý mượn/trả và cấp phát thẻ.", icon: <BadgeOutlinedIcon />,            gradient: STAT_GRADIENT.staff,  border: "primary.main" },
                  { role: "admin",  label: "Quản trị viên", desc: "Toàn quyền hệ thống, quản lý nhân sự.",   icon: <SupervisorAccountOutlinedIcon />, gradient: STAT_GRADIENT.admin,  border: "warning.main" },
                ].map((opt) => (
                  <Box key={opt.role} sx={{ flex: 1 }}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        borderColor: createForm.role === opt.role ? opt.border : "divider",
                        borderWidth: createForm.role === opt.role ? 2 : 1,
                        transition: "all 0.2s",
                        boxShadow: createForm.role === opt.role ? 2 : 0,
                      }}
                    >
                      <CardActionArea
                        onClick={() => setCreateForm({ ...createForm, role: opt.role })}
                        sx={{ p: 2.5, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1.5 }}
                      >
                        <Avatar sx={{ background: createForm.role === opt.role ? opt.gradient : "action.selected", width: 44, height: 44 }}>
                          {opt.icon}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{opt.label}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.4 }}>{opt.desc}</Typography>
                        </Box>
                      </CardActionArea>
                    </Card>
                  </Box>
                ))}
              </Box>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ p: 3, bgcolor: "background.paper", borderTop: 1, borderColor: "divider" }}>
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" color="inherit" onClick={() => setShowCreate(false)} fullWidth sx={{ borderRadius: 2 }}>
              Hủy
            </Button>
            <Button variant="contained" onClick={handleCreate} fullWidth sx={{ borderRadius: 2, fontWeight: 700, background: STAT_GRADIENT.total, "&:hover": { background: "linear-gradient(135deg,#4f46e5,#3730a3)" } }}>
              Cấp tài khoản
            </Button>
          </Stack>
        </Box>
      </Drawer>

      <Snackbar open={Boolean(notice)} autoHideDuration={3000} onClose={() => setNotice("")} message={notice} />

      {/* OTP Dialog */}
      <Dialog open={showOtp} onClose={() => {}} sx={{ "& .MuiPaper-root": { borderRadius: 3, minWidth: 380 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Xác thực Email</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Mã OTP đã được gửi đến <b>{otpEmail}</b>. Vui lòng nhập mã để kích hoạt tài khoản.
            </Alert>
            <TextField
              label="Mã OTP"
              value={otpCode}
              onChange={(e) => { setOtpCode(e.target.value); setOtpError(""); }}
              fullWidth
              slotProps={{
                htmlInput: {
                  maxLength: 6,
                  style: { textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.4em", fontFamily: "monospace" }
                }
              }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
            {otpError && <Alert severity="error" sx={{ borderRadius: 2 }}>{otpError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => { setShowOtp(false); setCreateForm({ email: "", password: "", role: "staff" }); setNotice("Đã tạo người dùng mới (chưa xác thực)."); load(); }} color="inherit">
            Để sau
          </Button>
          <Button variant="contained" onClick={handleVerifyOtp} disabled={otpSubmitting || !otpCode} sx={{ borderRadius: 2, minWidth: 100 }}>
            {otpSubmitting ? <CircularProgress size={18} color="inherit" /> : "Xác nhận"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
