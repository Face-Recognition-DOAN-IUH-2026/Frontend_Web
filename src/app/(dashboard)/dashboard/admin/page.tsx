"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  alpha,
  useTheme,
} from "@mui/material";
import DataTable, { type DataTableColumn } from "@/app/(dashboard)/_components/ui/DataTable";
import { useToast } from "@/lib/toast-context";
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
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";
import SearchField from "@/app/(dashboard)/_components/ui/SearchField";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import AvatarUser from "@/app/(dashboard)/_components/ui/AvatarUser";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import api, { getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { usePermission } from "@/lib/permission-context";
import { shimmer } from "@/lib/animations";
import { roleLabel } from "@/lib/utils";
import type { UserPublic } from "@/lib/types";

export default function AdminPage() {
  const theme = useTheme();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { canAccessPage, loading: permLoading } = usePermission();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserPublic[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Bộ lọc
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "staff" | "patron">("all");
  const [faceFilter, setFaceFilter] = useState<"all" | "has_face" | "no_face">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "deleted">("all");

  // Phân trang
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Drawer Thêm người dùng
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "staff",
  });
  const [createError, setCreateError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && !permLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (user?.role !== "admin" && !canAccessPage("/dashboard/admin")) {
        router.push("/dashboard");
      }
    }
  }, [isLoading, permLoading, isAuthenticated, user, canAccessPage, router]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.listUsers({ skip: 0, limit: 1000 });
      setUsers(data.users || []);
      setTotal(data.total || (data.users || []).length);
    } catch (err: any) {
      const msg = getErrorMessage(err) || "Không thể tải danh sách người dùng.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [search, roleFilter, faceFilter, statusFilter]);

  // Bộ lọc đa tiêu chí
  const filtered = useMemo(() => {
    let list = users;

    // 1. Vai trò
    if (roleFilter !== "all") {
      list = list.filter((u) => u.role === roleFilter);
    }

    // 2. Sinh trắc học Face-ID
    if (faceFilter === "has_face") {
      list = list.filter((u) => Boolean(u.has_face));
    } else if (faceFilter === "no_face") {
      list = list.filter((u) => !u.has_face);
    }

    // 3. Trạng thái hoạt động
    if (statusFilter !== "all") {
      list = list.filter((u) => (u.status || "active") === statusFilter);
    }

    // 4. Từ khóa tìm kiếm
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.full_name && u.full_name.toLowerCase().includes(q)) ||
          ((u as any).student_code && (u as any).student_code.toLowerCase().includes(q)) ||
          ((u as any).phone && (u as any).phone.includes(q))
      );
    }

    return list;
  }, [users, roleFilter, faceFilter, statusFilter, search]);

  const hasActiveFilters =
    search.trim() !== "" || roleFilter !== "all" || faceFilter !== "all" || statusFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setFaceFilter("all");
    setStatusFilter("all");
  };

  // Tạo mật khẩu ngẫu nhiên an toàn
  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreateForm((prev) => ({ ...prev, password: pass }));
    setShowPassword(true);
    toast.info("Đã tạo mật khẩu ngẫu nhiên.");
  };

  // Xử lý tạo người dùng mới qua api.adminCreateUser (không làm mất session admin!)
  const handleCreate = async () => {
    if (!createForm.email.trim() || !createForm.password.trim()) {
      setCreateError("Vui lòng nhập đầy đủ Email và Mật khẩu khởi tạo.");
      return;
    }

    if (createForm.password.length < 6) {
      setCreateError("Mật khẩu cần ít nhất 6 ký tự để đảm bảo an toàn.");
      return;
    }

    try {
      setCreating(true);
      setCreateError("");

      await api.adminCreateUser({
        email: createForm.email.trim(),
        password: createForm.password,
        full_name: createForm.full_name.trim() || undefined,
        role: createForm.role,
        phone: createForm.phone.trim() || undefined,
        skip_verification: true,
      } as any);

      setShowCreate(false);
      setCreateForm({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: "staff",
      });
      toast.success("Tạo tài khoản thành công! Người dùng có thể đăng nhập ngay.");
      load();
    } catch (err: any) {
      const errorMsg = getErrorMessage(err) || "Tạo người dùng thất bại. Vui lòng thử lại.";
      setCreateError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setCreating(false);
    }
  };

  // Xuất file CSV danh sách người dùng
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.warning("Không có dữ liệu để xuất.");
      return;
    }

    const headers = ["ID", "Họ và tên", "Email", "Số điện thoại", "Vai trò", "Sinh trắc Face-ID", "Trạng thái"];
    const rows = filtered.map((u) => [
      u.id,
      `"${(u.full_name || "").replace(/"/g, '""')}"`,
      `"${u.email}"`,
      `"${(u as any).phone || ""}"`,
      roleLabel(u.role),
      u.has_face ? "Đã đăng ký" : "Chưa đăng ký",
      u.status === "active" ? "Hoạt động" : u.status === "suspended" ? "Tạm khóa" : "Chưa kích hoạt",
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `danh_sach_thanh_vien_iuh_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Đã xuất danh sách thành viên thành công!");
  };

  // Cấu hình cột hiển thị DataTable
  const columns: DataTableColumn<UserPublic>[] = [
    {
      key: "email",
      label: "Thành viên",
      sortable: true,
      render: (_, item) => (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <AvatarUser user={item} size={40} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", color: "text.primary" }} noWrap>
              {item.full_name || item.email.split("@")[0]}
            </Typography>
            <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                <EmailOutlinedIcon sx={{ fontSize: 13 }} />
                {item.email}
              </Typography>
              {(item as any).student_code && (
                <Chip
                  size="small"
                  label={(item as any).student_code}
                  sx={{ height: 18, fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 700 }}
                />
              )}
            </Stack>
          </Box>
        </Stack>
      ),
    },
    {
      key: "role",
      label: "Vai trò",
      sortable: true,
      render: (_, item) => {
        const isAdmin = item.role === "admin";
        const isStaff = item.role === "staff";

        return (
          <Chip
            size="small"
            icon={
              isAdmin ? (
                <ShieldOutlinedIcon sx={{ fontSize: "14px !important", color: "#B8860B !important" }} />
              ) : isStaff ? (
                <BadgeOutlinedIcon sx={{ fontSize: "14px !important", color: "#0A2540 !important" }} />
              ) : (
                <SchoolOutlinedIcon sx={{ fontSize: "14px !important", color: "#1E6091 !important" }} />
              )
            }
            label={roleLabel(item.role)}
            sx={{
              fontWeight: 800,
              fontSize: "0.75rem",
              borderRadius: "8px",
              bgcolor: isAdmin
                ? alpha("#D4AF37", 0.15)
                : isStaff
                ? alpha("#0A2540", 0.1)
                : alpha("#1E6091", 0.1),
              color: isAdmin ? "#8B6F00" : isStaff ? "#0A2540" : "#1E6091",
              border: "1px solid",
              borderColor: isAdmin
                ? alpha("#D4AF37", 0.3)
                : isStaff
                ? alpha("#0A2540", 0.2)
                : alpha("#1E6091", 0.2),
            }}
          />
        );
      },
    },
    {
      key: "has_face",
      label: "Sinh trắc học AI",
      sortable: true,
      render: (_, item) => (
        <Chip
          size="small"
          icon={
            item.has_face ? (
              <FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: "15px !important", color: "#059669 !important" }} />
            ) : (
              <AccountBoxOutlinedIcon sx={{ fontSize: "15px !important", color: "#94A3B8 !important" }} />
            )
          }
          label={item.has_face ? "Face-ID Sẵn sàng" : "Chưa đăng ký"}
          sx={{
            fontWeight: 750,
            fontSize: "0.75rem",
            borderRadius: "8px",
            bgcolor: item.has_face ? alpha("#10B981", 0.12) : alpha("#94A3B8", 0.12),
            color: item.has_face ? "#059669" : "#64748B",
            border: "1px solid",
            borderColor: item.has_face ? alpha("#10B981", 0.3) : alpha("#94A3B8", 0.2),
          }}
        />
      ),
    },
    {
      key: "status",
      label: "Trạng thái",
      sortable: true,
      render: (_, item) => {
        const isActive = (item.status || "active") === "active";
        const isSuspended = item.status === "suspended";

        return (
          <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: isActive ? "#10B981" : isSuspended ? "#EF4444" : "#94A3B8",
                boxShadow: isActive ? "0 0 6px #10B981" : "none",
              }}
            />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                fontSize: "0.82rem",
                color: isActive ? "#059669" : isSuspended ? "#DC2626" : "text.secondary",
              }}
            >
              {isActive ? "Đang hoạt động" : isSuspended ? "Tạm khóa" : "Chưa kích hoạt"}
            </Typography>
          </Stack>
        );
      },
    },
    {
      key: "id",
      label: "Thao tác",
      align: "right",
      render: (_, item) => (
        <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
          <Button
            size="small"
            variant="outlined"
            endIcon={<ArrowForwardIcon sx={{ fontSize: "14px !important" }} />}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/admin/${item.id}`);
            }}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              fontSize: "0.78rem",
              py: 0.4,
              px: 1.2,
            }}
          >
            Chi tiết
          </Button>
        </Stack>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Stack sx={{ minHeight: 400, alignItems: "center", justifyContent: "center" }}>
        <CircularProgress sx={{ color: "#8B0000", animation: `${shimmer} 1.5s ease-in-out infinite` }} />
      </Stack>
    );
  }

  if (!isAuthenticated) return null;

  // Thống kê nhanh
  const adminCount = users.filter((u) => u.role === "admin").length;
  const staffCount = users.filter((u) => u.role === "staff").length;
  const patronCount = users.filter((u) => u.role === "patron").length;
  const faceCount = users.filter((u) => u.has_face).length;
  const noFaceCount = Math.max(0, total - faceCount);
  const faceRate = total > 0 ? Math.round((faceCount / total) * 100) : 0;

  return (
    <Stack spacing={3} sx={{ maxWidth: 1300, mx: "auto", pb: 8 }}>
      {/* 1. Header chuẩn IUH */}
      <Box sx={staggerSx(0)}>
        <PageHeader
          title="Quản trị người dùng & Thành viên"
          subtitle="Quản lý tài khoản quản trị, nhân viên thư viện và độc giả; kiểm soát độ phủ sinh trắc học Face-ID."
          icon={AdminPanelSettingsOutlinedIcon}
          actions={
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}>
              <Button
                variant="outlined"
                startIcon={<FileDownloadOutlinedIcon />}
                onClick={handleExportCSV}
                sx={{
                  borderRadius: 2,
                  fontWeight: 700,
                  borderColor: "divider",
                  color: "text.primary",
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                Xuất CSV
              </Button>

              <Button
                variant="contained"
                startIcon={<AddOutlinedIcon />}
                onClick={() => {
                  setCreateError("");
                  setShowCreate(true);
                }}
                sx={{
                  borderRadius: 2,
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #8B0000 0%, #A00000 100%)",
                  boxShadow: "0 4px 14px rgba(139, 0, 0, 0.3)",
                  "&:hover": { background: "linear-gradient(135deg, #7A0000 0%, #8B0000 100%)" },
                }}
              >
                Thêm thành viên
              </Button>

              <IconButton
                onClick={load}
                size="small"
                title="Làm mới danh sách"
                sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}
              >
                <RefreshOutlinedIcon fontSize="small" />
              </IconButton>
            </Stack>
          }
        />
      </Box>

      {/* 2. Thống kê 4 KPI cốt lõi */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
          gap: 2.5,
        }}
      >
        {/* KPI 1: Đã kích hoạt Face-ID */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 3.5,
            border: "1px solid",
            borderColor: alpha("#10B981", 0.3),
            background: `linear-gradient(135deg, ${alpha("#10B981", 0.05)} 0%, #FFFFFF 100%)`,
            boxShadow: "0 4px 18px rgba(16, 185, 129, 0.08)",
          }}
        >
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Đã có Face-ID (AI)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#065F46", my: 0.5 }}>
                {faceCount}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: alpha("#10B981", 0.15), color: "#059669", width: 44, height: 44 }}>
              <FaceRetouchingNaturalOutlinedIcon />
            </Avatar>
          </Stack>
          <Box sx={{ width: "100%", mb: 1 }}>
            <LinearProgress
              variant="determinate"
              value={faceRate}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: alpha("#10B981", 0.15),
                "& .MuiLinearProgress-bar": { bgcolor: "#10B981" },
              }}
            />
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "#059669" }}>
            ✓ Đạt {faceRate}% độ phủ sinh trắc học
          </Typography>
        </Paper>

        {/* KPI 2: Chưa có khuôn mặt */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 3.5,
            border: "1px solid",
            borderColor: noFaceCount > 0 ? alpha("#D97706", 0.3) : "divider",
            background: noFaceCount > 0 ? `linear-gradient(135deg, ${alpha("#D97706", 0.05)} 0%, #FFFFFF 100%)` : "background.paper",
            boxShadow: "0 4px 18px rgba(0,0,0,0.04)",
          }}
        >
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Chưa có khuôn mặt
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: noFaceCount > 0 ? "#B45309" : "#64748B", my: 0.5 }}>
                {noFaceCount}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: alpha("#D97706", 0.15), color: "#D97706", width: 44, height: 44 }}>
              <AccountBoxOutlinedIcon />
            </Avatar>
          </Stack>
          <Typography variant="caption" sx={{ fontWeight: 700, color: noFaceCount > 0 ? "#D97706" : "text.secondary", display: "block", mt: 1 }}>
            {noFaceCount > 0 ? `⚠ Cần bổ sung mẫu ảnh cho ${noFaceCount} người` : "✓ 100% đã đăng ký khuôn mặt"}
          </Typography>
        </Paper>

        {/* KPI 3: Cán bộ & Nhân viên */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 3.5,
            border: "1px solid",
            borderColor: alpha("#0A2540", 0.2),
            background: `linear-gradient(135deg, ${alpha("#0A2540", 0.04)} 0%, #FFFFFF 100%)`,
            boxShadow: "0 4px 18px rgba(10, 37, 64, 0.06)",
          }}
        >
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Đội ngũ Quản trị & Trực ca
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#0A2540", my: 0.5 }}>
                {adminCount + staffCount}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: alpha("#0A2540", 0.12), color: "#0A2540", width: 44, height: 44 }}>
              <SupervisorAccountOutlinedIcon />
            </Avatar>
          </Stack>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mt: 1 }}>
            {adminCount} Quản trị viên (Admin) · {staffCount} Nhân viên
          </Typography>
        </Paper>

        {/* KPI 4: Tổng số Độc giả */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 3.5,
            border: "1px solid",
            borderColor: alpha("#8B0000", 0.2),
            background: `linear-gradient(135deg, ${alpha("#8B0000", 0.04)} 0%, #FFFFFF 100%)`,
            boxShadow: "0 4px 18px rgba(139, 0, 0, 0.06)",
          }}
        >
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Tổng độc giả & bạn đọc
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#8B0000", my: 0.5 }}>
                {patronCount}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: alpha("#8B0000", 0.12), color: "#8B0000", width: 44, height: 44 }}>
              <SchoolOutlinedIcon />
            </Avatar>
          </Stack>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mt: 1 }}>
            Sinh viên & Giảng viên toàn trường
          </Typography>
        </Paper>
      </Box>

      {/* 3. Bảng dữ liệu người dùng & Bộ lọc Đa năng */}
      <DashboardCard title="" noPadding>
        <Stack spacing={2} sx={{ p: 2.5, borderBottom: 1, borderColor: "divider" }}>
          {/* Hàng 1: Search + Role Tabs */}
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}
          >
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Tìm theo họ tên, email, mã sinh viên/nhân viên..."
              sx={{ flex: 1, maxWidth: { md: 460 } }}
            />

            <ToggleButtonGroup
              value={roleFilter}
              exclusive
              onChange={(_, v) => v && setRoleFilter(v)}
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.background.default, 0.7),
                p: 0.5,
                borderRadius: 3,
                "& .MuiToggleButton-root": {
                  px: 2,
                  py: 0.6,
                  borderRadius: 2.5,
                  textTransform: "none",
                  fontWeight: 750,
                  fontSize: "0.82rem",
                  border: "none",
                  "&.Mui-selected": {
                    bgcolor: "background.paper",
                    color: "primary.main",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  },
                },
              }}
            >
              <ToggleButton value="all">Tất cả ({total})</ToggleButton>
              <ToggleButton value="admin">Admin ({adminCount})</ToggleButton>
              <ToggleButton value="staff">Nhân viên ({staffCount})</ToggleButton>
              <ToggleButton value="patron">Độc giả ({patronCount})</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {/* Hàng 2: Bộ lọc nhanh Face-ID & Trạng thái */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", mr: 0.5 }}>
                LỌC THEO:
              </Typography>

              {/* Lọc Face-ID */}
              <Chip
                size="small"
                label="Đã có Face-ID"
                onClick={() => setFaceFilter((prev) => (prev === "has_face" ? "all" : "has_face"))}
                color={faceFilter === "has_face" ? "success" : "default"}
                variant={faceFilter === "has_face" ? "filled" : "outlined"}
                icon={<CheckCircleOutlinedIcon sx={{ fontSize: "14px !important" }} />}
                sx={{ borderRadius: "8px", fontWeight: 700 }}
              />

              <Chip
                size="small"
                label="Chưa có Face-ID"
                onClick={() => setFaceFilter((prev) => (prev === "no_face" ? "all" : "no_face"))}
                color={faceFilter === "no_face" ? "warning" : "default"}
                variant={faceFilter === "no_face" ? "filled" : "outlined"}
                icon={<RadioButtonUncheckedIcon sx={{ fontSize: "14px !important" }} />}
                sx={{ borderRadius: "8px", fontWeight: 700 }}
              />

              <Divider orientation="vertical" flexItem sx={{ height: 20, my: "auto" }} />

              {/* Lọc Trạng thái */}
              <Chip
                size="small"
                label="Đang hoạt động"
                onClick={() => setStatusFilter((prev) => (prev === "active" ? "all" : "active"))}
                color={statusFilter === "active" ? "primary" : "default"}
                variant={statusFilter === "active" ? "filled" : "outlined"}
                sx={{ borderRadius: "8px", fontWeight: 700 }}
              />

              <Chip
                size="small"
                label="Tạm khóa"
                onClick={() => setStatusFilter((prev) => (prev === "suspended" ? "all" : "suspended"))}
                color={statusFilter === "suspended" ? "error" : "default"}
                variant={statusFilter === "suspended" ? "filled" : "outlined"}
                sx={{ borderRadius: "8px", fontWeight: 700 }}
              />

              {hasActiveFilters && (
                <Button
                  size="small"
                  variant="text"
                  color="inherit"
                  startIcon={<FilterAltOffOutlinedIcon />}
                  onClick={resetFilters}
                  sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.78rem" }}
                >
                  Đặt lại lọc
                </Button>
              )}
            </Stack>

            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
              Hiển thị <strong>{filtered.length}</strong> / <strong>{total}</strong> thành viên
            </Typography>
          </Stack>
        </Stack>

        <Box sx={{ p: 2 }}>
          <DataTable<UserPublic>
            columns={columns}
            rows={filtered}
            loading={loading}
            getRowId={(row) => row.id}
            onRowClick={(row) => router.push(`/dashboard/admin/${row.id}`)}
            emptyTitle="Không tìm thấy thành viên nào"
            emptyDescription="Thử tìm kiếm với từ khóa khác hoặc điều chỉnh các bộ lọc vai trò, trạng thái."
            page={page}
            rowsPerPage={rowsPerPage}
            totalCount={filtered.length}
            onPageChange={setPage}
            onRowsPerPageChange={(ps) => {
              setRowsPerPage(ps);
              setPage(0);
            }}
          />
        </Box>
      </DashboardCard>

      {/* 4. Drawer Thêm Thành Viên Mới */}
      <Drawer
        anchor="right"
        open={showCreate}
        onClose={() => setShowCreate(false)}
        sx={{
          "& .MuiDrawer-paper": {
            width: { xs: "100%", sm: 500 },
            bgcolor: "background.default",
          },
        }}
      >
        {/* Header Drawer */}
        <Box
          sx={{
            background: "linear-gradient(135deg, #8B0000 0%, #A00000 100%)",
            p: 3,
            color: "white",
          }}
        >
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Thêm thành viên mới
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9, mt: 0.5, display: "block" }}>
                Cấp tài khoản nhân sự thư viện hoặc quản trị viên hệ thống
              </Typography>
            </Box>
            <IconButton
              onClick={() => setShowCreate(false)}
              size="small"
              sx={{
                color: "white",
                bgcolor: "rgba(255,255,255,0.15)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

        {/* Nội dung Form */}
        <Box sx={{ p: 3, flex: 1, overflowY: "auto" }}>
          <Stack spacing={3.5}>
            {createError && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {createError}
              </Alert>
            )}

            {/* Mục 1: Thông tin cá nhân */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  mb: 2,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  display: "block",
                }}
              >
                1. Thông tin cá nhân & Danh tính
              </Typography>

              <Stack spacing={2}>
                <TextField
                  label="Họ và tên đầy đủ"
                  placeholder="vd: Nguyễn Văn An"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlineOutlinedIcon sx={{ color: "text.secondary" }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
                />

                <TextField
                  label="Số điện thoại liên hệ"
                  placeholder="vd: 0912345678"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneOutlinedIcon sx={{ color: "text.secondary" }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
                />
              </Stack>
            </Box>

            <Divider />

            {/* Mục 2: Thông tin đăng nhập */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  mb: 2,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  display: "block",
                }}
              >
                2. Thông tin đăng nhập hệ thống
              </Typography>

              <Stack spacing={2}>
                <TextField
                  label="Địa chỉ Email cơ quan"
                  type="email"
                  placeholder="nhanvien@thuvien.iuh.edu.vn"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  fullWidth
                  required
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlinedIcon sx={{ color: "text.secondary" }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
                />

                <TextField
                  label="Mật khẩu khởi tạo"
                  type={showPassword ? "text" : "password"}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  fullWidth
                  required
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon sx={{ color: "text.secondary" }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowPassword((p) => !p)} edge="end">
                            {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  helperText="Tối thiểu 6 ký tự. Người dùng có thể đổi lại sau khi đăng nhập."
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
                />

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AutoAwesomeOutlinedIcon />}
                  onClick={generateRandomPassword}
                  sx={{ alignSelf: "flex-start", borderRadius: 2, fontWeight: 700, fontSize: "0.8rem" }}
                >
                  Tự tạo mật khẩu an toàn
                </Button>
              </Stack>
            </Box>

            <Divider />

            {/* Mục 3: Vai trò & Phân quyền */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  mb: 2,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  display: "block",
                }}
              >
                3. Vai trò & Phạm vi phân quyền
              </Typography>

              <Stack spacing={2}>
                {[
                  {
                    role: "staff",
                    label: "Nhân viên thư viện (Staff)",
                    desc: "Xử lý thủ tục mượn/trả sách, thu phí phạt, cấp phát thẻ độc giả và điểm danh cổng kiểm soát.",
                    icon: <BadgeOutlinedIcon sx={{ fontSize: 24 }} />,
                    color: "#0A2540",
                  },
                  {
                    role: "admin",
                    label: "Quản trị viên hệ thống (Admin)",
                    desc: "Toàn quyền quản trị cơ sở dữ liệu, quản lý nhân sự, phân quyền vai trò và chỉnh sửa cấu hình hệ thống.",
                    icon: <SupervisorAccountOutlinedIcon sx={{ fontSize: 24 }} />,
                    color: "#8B0000",
                  },
                ].map((opt) => {
                  const selected = createForm.role === opt.role;

                  return (
                    <Card
                      key={opt.role}
                      variant="outlined"
                      sx={{
                        borderRadius: 3,
                        borderColor: selected ? opt.color : "divider",
                        borderWidth: selected ? 2 : 1,
                        bgcolor: selected ? alpha(opt.color, 0.04) : "background.paper",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <CardActionArea
                        onClick={() => setCreateForm({ ...createForm, role: opt.role })}
                        sx={{ p: 2, display: "flex", alignItems: "flex-start", gap: 2 }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: selected ? opt.color : "action.selected",
                            color: selected ? "#FFFFFF" : "text.secondary",
                            width: 44,
                            height: 44,
                          }}
                        >
                          {opt.icon}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: selected ? opt.color : "text.primary" }}>
                            {opt.label}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.4, display: "block", lineHeight: 1.4 }}>
                            {opt.desc}
                          </Typography>
                        </Box>
                      </CardActionArea>
                    </Card>
                  );
                })}
              </Stack>
            </Box>
          </Stack>
        </Box>

        {/* Footer Drawer */}
        <Box sx={{ p: 2.5, bgcolor: "background.paper", borderTop: 1, borderColor: "divider" }}>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => setShowCreate(false)}
              fullWidth
              sx={{ borderRadius: 2.5, fontWeight: 700 }}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="contained"
              disabled={creating}
              onClick={handleCreate}
              startIcon={creating ? <CircularProgress size={16} sx={{ color: "#FFF" }} /> : <AddOutlinedIcon />}
              fullWidth
              sx={{
                borderRadius: 2.5,
                fontWeight: 800,
                background: "linear-gradient(135deg, #8B0000 0%, #A00000 100%)",
                boxShadow: "0 4px 14px rgba(139, 0, 0, 0.3)",
                "&:hover": { background: "linear-gradient(135deg, #7A0000 0%, #8B0000 100%)" },
              }}
            >
              {creating ? "Đang xử lý..." : "Cấp tài khoản"}
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </Stack>
  );
}
