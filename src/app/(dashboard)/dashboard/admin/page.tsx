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
  Drawer,
  Card,
  CardActionArea,
  Divider,
  Grid,
  IconButton,
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
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import SearchField from "@/app/(dashboard)/_components/ui/SearchField";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import MuiStatCard from "@/app/(dashboard)/_components/ui/MuiStatCard";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import notification from "antd/es/notification";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import api from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { fadeInUp, shimmer } from "@/lib/animations";
import { initials, roleLabel, statusLabel, statusColor } from "@/lib/utils";
import type { UserPublic } from "@/lib/types";

function roleChipColor(role: string): "warning" | "primary" | "default" | "success" {
  if (role === "admin") return "warning";
  if (role === "staff") return "primary";
  return "default";
}

const STAT_GRADIENT: Record<string, string> = {
  total:  "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
  admin:  "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  staff:  "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
  patron: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
  face:   "linear-gradient(135deg, #10b981 0%, #059669 100%)",
};

export default function AdminPage() {
  const [apiAnt, contextHolder] = notification.useNotification();
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", password: "", role: "staff" });
  const [createError, setCreateError] = useState("");
  const [notice, setNotice] = useState("");

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
      await api.register({ ...createForm, skip_verification: true } as any);
      setShowCreate(false);
      setCreateForm({ email: "", password: "", role: "staff" });
      setNotice("Tạo người dùng thành công. Tài khoản đã active.");
      apiAnt.success({ message: "Tạo người dùng thành công. Tài khoản đã active.", placement: "topRight" });
      load();
    } catch (err: any) {
      setCreateError(err?.response?.data?.detail || "Tạo người dùng thất bại.");
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

  const STATS: { key: string; label: string; value: number; icon: any; gradient: string; pct: number }[] = [
    { key: "total",  label: "Tổng người dùng",  value: total,       icon: GroupsOutlinedIcon,                    gradient: STAT_GRADIENT.total,  pct: 100 },
    { key: "admin",  label: "Quản trị viên",    value: adminCount,  icon: AdminPanelSettingsOutlinedIcon,         gradient: STAT_GRADIENT.admin,  pct: total ? (adminCount / total) * 100 : 0 },
    { key: "staff",  label: "Nhân viên",         value: staffCount,  icon: PersonOutlineOutlinedIcon,              gradient: STAT_GRADIENT.staff,  pct: total ? (staffCount / total) * 100 : 0 },
    { key: "patron", label: "Độc giả",           value: patronCount, icon: AccountBoxOutlinedIcon,                 gradient: STAT_GRADIENT.patron, pct: total ? (patronCount / total) * 100 : 0 },
    { key: "face",   label: "Đã có khuôn mặt",  value: faceCount,   icon: FaceRetouchingNaturalOutlinedIcon,     gradient: STAT_GRADIENT.face,   pct: total ? (faceCount / total) * 100 : 0 },
  ];

  const statBadges = `${total} người dùng · ${adminCount} admin · ${staffCount} nhân viên · ${patronCount} độc giả · ${faceCount} đã có khuôn mặt`;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Quản trị người dùng"
        subtitle="Tạo tài khoản admin/staff và theo dõi trạng thái sinh trắc học."
        icon={AdminPanelSettingsOutlinedIcon}
        gradient="linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)"
        statBadges={statBadges}
        onRefresh={load}
        actions={
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={() => setShowCreate(true)}
            sx={{ borderRadius: 2, fontWeight: 700, bgcolor: "#6366f1", "&:hover": { bgcolor: "#4f46e5" }, boxShadow: "0 4px 14px rgba(99,102,241,0.4)" }}
          >
            Thêm người dùng
          </Button>
        }
      />

      <Grid container spacing={2}>
        {STATS.map((s, idx) => (
          <Grid key={s.key} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 } as any}>
            <MuiStatCard
              label={s.label}
              value={s.value}
              icon={s.icon}
              gradient={s.gradient}
              pct={s.pct}
              index={idx}
            />
          </Grid>
        ))}
      </Grid>

      <DashboardCard title="" noPadding>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: "divider", alignItems: { sm: "center" } }}
        >
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo email, họ tên..."
            sx={{ flex: 1 }}
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

      <TableContainer sx={{ overflowX: "auto" }}>
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
                    <EmptyState
                      icon={<GroupsOutlinedIcon />}
                      title="Không tìm thấy người dùng nào"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item, idx) => (
                  <TableRow
                    key={item.id}
                    hover
                    onClick={() => router.push(`/dashboard/admin/${item.id}`)}
                    sx={{
                      cursor: "pointer",
                      transition: "background 0.15s",
                      "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
                      "&:last-child td": { border: 0 },
                      ...staggerSx(idx),
                    }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Avatar
                          src={item.avatar_url || undefined}
                          sx={{
                            width: 38, height: 38,
                            background: item.avatar_url ? "transparent" : (
                              item.role === "admin"
                                ? STAT_GRADIENT.admin
                                : item.role === "staff"
                                ? STAT_GRADIENT.staff
                                : STAT_GRADIENT.patron
                            ),
                            fontWeight: 800,
                            fontSize: 14,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                          }}
                        >
                          {!item.avatar_url ? initials(item.full_name || item.email) : null}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }} noWrap>
                            {item.email}
                          </Typography>
                          {item.full_name ? (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {item.full_name}
                            </Typography>
                          ) : null}
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
      </DashboardCard>

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
            {createError ? <Alert severity="error" sx={{ borderRadius: 2 }}>{createError}</Alert> : null}

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

      {contextHolder}
    </Stack>
  );
}
