"use client";

import React, { useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
  CircularProgress,
} from "@mui/material";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import LocalLibraryOutlinedIcon from "@mui/icons-material/LocalLibraryOutlined";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import FaceRetouchingNaturalOutlinedIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";

import {
  ALL_RESOURCES,
  RESOURCE_LABELS,
  CATEGORY_LABELS,
  type SystemResource,
  type CrudAction,
  type RolePermissionConfig,
  type RouteCategory,
  type ALL_ROUTES,
} from "@/lib/types";

export interface RolePermissionsTabProps {
  roles: Record<string, RolePermissionConfig>;
  selectedRole: string;
  setSelectedRole: (role: string) => void;
  activeRoleConfig: RolePermissionConfig;
  filteredRoutes: typeof ALL_ROUTES;
  routeSearch: string;
  setRouteSearch: (val: string) => void;
  routeFilter: "all" | "allowed" | "blocked";
  setRouteFilter: (val: "all" | "allowed" | "blocked") => void;
  handleToggleRouteForRole: (path: string) => void;
  handleToggleAllRoutesForRole: (enableAll: boolean) => void;
  handleToggleCategoryRoutesForRole?: (category: string, enableAll: boolean) => void;
  handleToggleCrudForRole: (resource: SystemResource, action: CrudAction) => void;
  handleSetResourcePresetForRole: (resource: SystemResource, preset: "full" | "readonly") => void;
  handleSaveRoleConfig: () => void;
  handleApplyRoleTemplate?: (template: "circulation" | "cataloging" | "assistant") => void;
  saving: boolean;
  setOpenNewRoleModal: (open: boolean) => void;
}

const CATEGORY_ORDER: RouteCategory[] = [
  "library",
  "circulation",
  "personnel",
  "ai_vision",
  "admin",
];

const CATEGORY_ICONS: Record<RouteCategory, React.ReactNode> = {
  library: <LocalLibraryOutlinedIcon sx={{ fontSize: 18 }} />,
  circulation: <AssignmentReturnOutlinedIcon sx={{ fontSize: 18 }} />,
  personnel: <CalendarMonthOutlinedIcon sx={{ fontSize: 18 }} />,
  ai_vision: <FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: 18 }} />,
  admin: <ShieldOutlinedIcon sx={{ fontSize: 18 }} />,
};

export const RESOURCE_RELATED_ROUTES: Record<SystemResource, { label: string; path: string }[]> = {
  borrows: [
    { label: "Quầy mượn", path: "/borrow" },
    { label: "Quầy trả", path: "/return" },
    { label: "Nhật ký vào ra", path: "/history" },
    { label: "Đang có mặt", path: "/active" },
  ],
  patrons: [
    { label: "Quản lý bạn đọc", path: "/patrons" },
    { label: "Cổng Kiosk", path: "/gate" },
  ],
  books: [
    { label: "Kho sách", path: "/books" },
    { label: "3D Tour", path: "/library/vr-tour" },
  ],
  schedules: [
    { label: "Lịch trực thủ thư", path: "/staff-schedules" },
    { label: "Hồ sơ cá nhân", path: "/profile" },
    { label: "Thông báo", path: "/notifications" },
  ],
  ai_tools: [
    { label: "Trợ lý AI", path: "/ai-assistant" },
    { label: "Đăng ký mặt", path: "/enroll" },
    { label: "Xác thực 1:1", path: "/verify" },
    { label: "Nhận diện 1:N", path: "/identify" },
    { label: "Liveness", path: "/liveness" },
  ],
  settings: [
    { label: "Quản trị người dùng", path: "/dashboard/admin" },
    { label: "Phân quyền động", path: "/dynamic-admin" },
    { label: "Cài đặt tham số", path: "/settings" },
  ],
  stats: [
    { label: "Tổng quan KPI", path: "/dashboard" },
    { label: "Báo cáo số liệu", path: "/stats" },
  ],
};

export function RolePermissionsTab({
  roles,
  selectedRole,
  setSelectedRole,
  activeRoleConfig,
  filteredRoutes,
  routeSearch,
  setRouteSearch,
  routeFilter,
  setRouteFilter,
  handleToggleRouteForRole,
  handleToggleAllRoutesForRole,
  handleToggleCategoryRoutesForRole,
  handleToggleCrudForRole,
  handleSetResourcePresetForRole,
  handleSaveRoleConfig,
  handleApplyRoleTemplate,
  saving,
  setOpenNewRoleModal,
}: RolePermissionsTabProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;
  const isAdmin = selectedRole === "admin";

  const roleKeys = useMemo(() => Object.keys(roles), [roles]);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "280px 1fr" },
        gap: 2.5,
        alignItems: "start",
      }}
    >
      {/* ── LEFT PANEL: Role Master Selector ──────────────────────────────── */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          borderColor: "divider",
          bgcolor: "background.paper",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: isDark ? "background.default" : "#F8FAFC",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "0.85rem" }}>
            Danh sách chức vụ ({roleKeys.length})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Chọn chức vụ để thiết lập cấu hình quyền mẫu
          </Typography>
        </Box>

        <Stack spacing={0.5} sx={{ p: 1.5 }}>
          {roleKeys.map((rKey) => {
            const rConfig = roles[rKey];
            const isSelected = selectedRole === rKey;
            const isSystemRole = rKey === "admin" || rKey === "staff" || rKey === "patron";

            return (
              <Box
                key={rKey}
                onClick={() => setSelectedRole(rKey)}
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  bgcolor: isSelected
                    ? alpha(primaryColor, isDark ? 0.15 : 0.08)
                    : "transparent",
                  border: "1px solid",
                  borderColor: isSelected
                    ? primaryColor
                    : "transparent",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    bgcolor: isSelected
                      ? alpha(primaryColor, isDark ? 0.2 : 0.12)
                      : "action.hover",
                  },
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1,
                      bgcolor: isSelected
                        ? primaryColor
                        : alpha(theme.palette.text.secondary, 0.1),
                      color: isSelected ? "#FFFFFF" : "text.secondary",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {rKey === "admin" ? (
                      <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 18 }} />
                    ) : (
                      <PersonOutlineOutlinedIcon sx={{ fontSize: 18 }} />
                    )}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isSelected ? 800 : 600,
                        fontSize: "0.84rem",
                        color: isSelected ? "primary.main" : "text.primary",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {rConfig?.label || rKey}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontSize: "0.7rem",
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Mã hệ thống: {rKey}
                    </Typography>
                  </Box>
                </Stack>

                <Chip
                  size="small"
                  label={isSystemRole ? "Hệ thống" : "Tùy biến"}
                  variant={isSystemRole ? "filled" : "outlined"}
                  sx={{
                    height: 18,
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    borderRadius: 1,
                    bgcolor: isSystemRole
                      ? alpha(primaryColor, 0.1)
                      : "transparent",
                    color: isSystemRole ? "primary.main" : "text.secondary",
                    borderColor: "divider",
                  }}
                />
              </Box>
            );
          })}
        </Stack>

        <Box sx={{ p: 1.5, pt: 0 }}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineOutlinedIcon />}
            onClick={() => setOpenNewRoleModal(true)}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.8rem",
              borderRadius: 1.5,
              borderColor: "divider",
              color: "text.primary",
              "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
            }}
          >
            Thêm chức vụ mới
          </Button>
        </Box>
      </Paper>

      {/* ── RIGHT PANEL: Permissions Matrix Detail ────────────────────────── */}
      <Stack spacing={2.5}>
        {/* Active Role Notice / Description */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2,
            borderColor: "divider",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 1.5,
          }}
        >
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, fontFamily: "Space Grotesk, sans-serif" }}>
                {activeRoleConfig.label}
              </Typography>
              <Chip
                size="small"
                label={isAdmin ? "CHỨC VỤ HỆ THỐNG" : "NHÓM THỦ THƯ"}
                color={isAdmin ? "primary" : "default"}
                sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700, borderRadius: 1 }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.82rem", mt: 0.25 }}>
              {activeRoleConfig.description || "Quyền hạn chuẩn áp dụng cho nhóm nhân sự này khi làm việc tại thư viện."}
            </Typography>
          </Box>

          {isAdmin ? (
            <Chip
              icon={<CheckCircleOutlineOutlinedIcon />}
              label="Toàn quyền quản trị viên"
              color="success"
              variant="outlined"
              size="small"
              sx={{ fontWeight: 700, height: 26 }}
            />
          ) : (
            <Typography variant="caption" color="text.secondary">
              {(activeRoleConfig.allowedPages || []).length} màn hình thao tác • 7 phân hệ dữ liệu
            </Typography>
          )}
        </Paper>

        {/* ── 1-CLICK ROLE PRESETS FOR IUH LIBRARY STAFF ──────────────────── */}
        {!isAdmin && handleApplyRoleTemplate && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              borderColor: alpha(primaryColor, 0.3),
              bgcolor: isDark ? alpha(primaryColor, 0.05) : "#F0FDF4",
              borderWidth: "1.5px",
            }}
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ alignItems: { xs: "flex-start", md: "center" }, justifyContent: "space-between", mb: 1.5 }}>
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <AutoAwesomeOutlinedIcon sx={{ color: "#059669", fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? "text.primary" : "#065F46", fontSize: "0.9rem" }}>
                    Thiết lập nhanh theo vị trí thực tế (1-Click Presets)
                  </Typography>
                  <Chip label="Khuyên dùng cho Thư viện IUH" size="small" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700, bgcolor: alpha("#059669", 0.15), color: "#059669" }} />
                </Stack>
                <Typography variant="caption" sx={{ color: isDark ? "text.secondary" : "#047857", fontSize: "0.78rem" }}>
                  Tự động thiết lập màn hình và 6 hành động nghiệp vụ theo quy chuẩn thực tế, không cần bấm từng ô thủ công.
                </Typography>
              </Box>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                gap: 1.5,
              }}
            >
              {/* Preset 1: Quầy lưu hành */}
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: isDark ? "divider" : alpha("#059669", 0.25),
                  bgcolor: isDark ? "background.paper" : "#FFFFFF",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease",
                  "&:hover": { borderColor: "#059669", boxShadow: 1 },
                }}
              >
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.75 }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha("#059669", 0.12), color: "#059669", display: "grid", placeItems: "center" }}>
                      <AssignmentReturnOutlinedIcon sx={{ fontSize: 16 }} />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.82rem" }}>
                      Quầy Lưu hành
                    </Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.74rem", display: "block", mb: 1.5 }}>
                    Mượn/trả sách, quản lý độc giả, lập & in biên nhận mượn sách. Khóa quản trị & xóa sách.
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleApplyRoleTemplate("circulation")}
                  sx={{
                    borderRadius: 1,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    borderColor: "#059669",
                    color: "#059669",
                    "&:hover": { bgcolor: alpha("#059669", 0.08), borderColor: "#047857" },
                  }}
                >
                  Áp dụng mẫu này
                </Button>
              </Paper>

              {/* Preset 2: Kho & Biên mục */}
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: isDark ? "divider" : alpha("#0284C7", 0.25),
                  bgcolor: isDark ? "background.paper" : "#FFFFFF",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease",
                  "&:hover": { borderColor: "#0284C7", boxShadow: 1 },
                }}
              >
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.75 }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha("#0284C7", 0.12), color: "#0284C7", display: "grid", placeItems: "center" }}>
                      <MenuBookOutlinedIcon sx={{ fontSize: 16 }} />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.82rem" }}>
                      Kho & Biên mục
                    </Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.74rem", display: "block", mb: 1.5 }}>
                    Biên mục sách mới, in nhãn gáy barcode, kiểm kê kho & thống kê. Khóa phê duyệt mượn trả.
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleApplyRoleTemplate("cataloging")}
                  sx={{
                    borderRadius: 1,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    borderColor: "#0284C7",
                    color: "#0284C7",
                    "&:hover": { bgcolor: alpha("#0284C7", 0.08), borderColor: "#0369A1" },
                  }}
                >
                  Áp dụng mẫu này
                </Button>
              </Paper>

              {/* Preset 3: CTV Sinh viên */}
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: isDark ? "divider" : alpha("#D97706", 0.25),
                  bgcolor: isDark ? "background.paper" : "#FFFFFF",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease",
                  "&:hover": { borderColor: "#D97706", boxShadow: 1 },
                }}
              >
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.75 }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: alpha("#D97706", 0.12), color: "#D97706", display: "grid", placeItems: "center" }}>
                      <SchoolOutlinedIcon sx={{ fontSize: 16 }} />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.82rem" }}>
                      CTV Sinh viên
                    </Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.74rem", display: "block", mb: 1.5 }}>
                    Hỗ trợ kiểm đếm kho, chỉ xem và tra cứu dữ liệu sách. Không sửa xóa dữ liệu thư viện.
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleApplyRoleTemplate("assistant")}
                  sx={{
                    borderRadius: 1,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    borderColor: "#D97706",
                    color: "#D97706",
                    "&:hover": { bgcolor: alpha("#D97706", 0.08), borderColor: "#B45309" },
                  }}
                >
                  Áp dụng mẫu này
                </Button>
              </Paper>
            </Box>
          </Paper>
        )}

        {/* 1. Quyền thao tác nghiệp vụ thư viện (Extended 6 actions) */}
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            borderColor: "divider",
            bgcolor: "background.paper",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: 2.5,
              py: 1.75,
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: isDark ? "background.default" : "#F8FAFC",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "0.88rem" }}>
                1. Quyền thao tác nghiệp vụ theo 7 Phân hệ Dữ liệu (Chi tiết 6 hành động)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Điều khiển 6 hành động (Xem, Thêm, Sửa, Duyệt, In, Xóa) cho 7 phân hệ dữ liệu lõi — chi phối toàn bộ 21 màn hình của thư viện.
              </Typography>
            </Box>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: isDark ? alpha("#FFFFFF", 0.02) : "#F1F5F9" }}>
                  <TableCell sx={{ fontWeight: 700, width: "30%", py: 1.25 }}>Phân hệ nghiệp vụ & Các màn hình liên quan</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, width: "8.5%", py: 1.25 }}>Xem</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, width: "8.5%", py: 1.25 }}>Thêm</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, width: "8.5%", py: 1.25 }}>Sửa</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, width: "10%", py: 1.25, color: "#7C3AED" }}>
                    Duyệt ✦
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, width: "10%", py: 1.25, color: "#0284C7" }}>
                    In ấn 🖨️
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, width: "8.5%", py: 1.25 }}>Xóa</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, width: "16%", py: 1.25 }}>Cài đặt nhanh</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ALL_RESOURCES.map((res) => {
                  const crudPerms = activeRoleConfig.crud?.[res] || {
                    create: false,
                    read: false,
                    update: false,
                    delete: false,
                    approve: false,
                    print: false,
                  };

                  const relatedRoutes = RESOURCE_RELATED_ROUTES[res] || [];

                  return (
                    <TableRow
                      key={res}
                      hover
                      sx={{
                        "&:last-child td, &:last-child th": { border: 0 },
                      }}
                    >
                      <TableCell sx={{ py: 1.25 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.85rem", color: "text.primary" }}>
                          {RESOURCE_LABELS[res] || res}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary", fontSize: "0.72rem", display: "block" }}
                        >
                          {res === "books" && "Kho sách, tài liệu, in tem nhãn gáy & mã vạch barcode"}
                          {res === "patrons" && "Hồ sơ độc giả sinh viên, in thẻ thư viện & xét duyệt"}
                          {res === "borrows" && "Mượn/trả tài liệu, duyệt đơn online, in phiếu mượn trả"}
                          {res === "schedules" && "Bảng phân ca, lịch trực & công tác thủ thư"}
                          {res === "ai_tools" && "Trợ lý AI, đăng ký khuôn mặt, nhận diện 1:1 và 1:N"}
                          {res === "settings" && "Cấu hình số ngày mượn, hạn ngạch, phân quyền"}
                          {res === "stats" && "Báo cáo thống kê số liệu, in ấn lưu lượng & ấn phẩm"}
                        </Typography>

                        {/* Badges showing which screens are covered by this data resource */}
                        <Stack direction="row" spacing={0.5} useFlexGap sx={{ mt: 0.75, flexWrap: "wrap" }}>
                          {relatedRoutes.map((r) => (
                            <Chip
                              key={r.path}
                              label={r.label}
                              size="small"
                              variant="outlined"
                              sx={{
                                height: 18,
                                fontSize: "0.62rem",
                                fontWeight: 600,
                                borderRadius: 0.75,
                                bgcolor: isDark ? alpha("#FFFFFF", 0.04) : "#F1F5F9",
                                borderColor: "divider",
                                color: "text.secondary",
                              }}
                            />
                          ))}
                        </Stack>
                      </TableCell>

                      {/* Read */}
                      <TableCell align="center" sx={{ py: 1 }}>
                        <Checkbox
                          size="small"
                          checked={isAdmin ? true : Boolean(crudPerms.read)}
                          disabled={isAdmin}
                          onChange={() => handleToggleCrudForRole(res, "read")}
                          color="primary"
                        />
                      </TableCell>

                      {/* Create */}
                      <TableCell align="center" sx={{ py: 1 }}>
                        <Checkbox
                          size="small"
                          checked={isAdmin ? true : Boolean(crudPerms.create)}
                          disabled={isAdmin}
                          onChange={() => handleToggleCrudForRole(res, "create")}
                          color="success"
                        />
                      </TableCell>

                      {/* Update */}
                      <TableCell align="center" sx={{ py: 1 }}>
                        <Checkbox
                          size="small"
                          checked={isAdmin ? true : Boolean(crudPerms.update)}
                          disabled={isAdmin}
                          onChange={() => handleToggleCrudForRole(res, "update")}
                          color="warning"
                        />
                      </TableCell>

                      {/* Approve (Duyệt) */}
                      <TableCell align="center" sx={{ py: 1 }}>
                        <Checkbox
                          size="small"
                          checked={isAdmin ? true : Boolean(crudPerms.approve)}
                          disabled={isAdmin}
                          onChange={() => handleToggleCrudForRole(res, "approve")}
                          sx={{
                            color: alpha("#7C3AED", 0.4),
                            "&.Mui-checked": { color: "#7C3AED" },
                          }}
                        />
                      </TableCell>

                      {/* Print (In ấn) */}
                      <TableCell align="center" sx={{ py: 1 }}>
                        <Checkbox
                          size="small"
                          checked={isAdmin ? true : Boolean(crudPerms.print)}
                          disabled={isAdmin}
                          onChange={() => handleToggleCrudForRole(res, "print")}
                          sx={{
                            color: alpha("#0284C7", 0.4),
                            "&.Mui-checked": { color: "#0284C7" },
                          }}
                        />
                      </TableCell>

                      {/* Delete */}
                      <TableCell align="center" sx={{ py: 1 }}>
                        <Checkbox
                          size="small"
                          checked={isAdmin ? true : Boolean(crudPerms.delete)}
                          disabled={isAdmin}
                          onChange={() => handleToggleCrudForRole(res, "delete")}
                          color="error"
                        />
                      </TableCell>

                      {/* Quick Presets */}
                      <TableCell align="right" sx={{ py: 1 }}>
                        {isAdmin ? (
                          <Chip size="small" label="Toàn quyền" color="primary" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                        ) : (
                          <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => handleSetResourcePresetForRole(res, "full")}
                              sx={{ fontSize: "0.72rem", py: 0.2, px: 0.75, minWidth: 0, textTransform: "none", fontWeight: 600 }}
                            >
                              Đầy đủ
                            </Button>
                            <Button
                              size="small"
                              variant="text"
                              color="inherit"
                              onClick={() => handleSetResourcePresetForRole(res, "readonly")}
                              sx={{ fontSize: "0.72rem", py: 0.2, px: 0.75, minWidth: 0, textTransform: "none", color: "text.secondary" }}
                            >
                              Chỉ xem
                            </Button>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* 2. Page Access Table: Hierarchical Category Grouping & Bulk Actions */}
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            borderColor: "divider",
            bgcolor: "background.paper",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              p: 2,
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: isDark ? "background.default" : "#F8FAFC",
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 1.5,
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "0.88rem" }}>
                2. Quyền mở màn hình chức năng (Phân nhóm theo 5 Phân hệ)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Gom nhóm theo menu hệ thống • Hỗ trợ mở/khóa nhanh theo cả nhóm chức năng
              </Typography>
            </Box>

            {/* Filters & Actions */}
            <Stack direction="row" spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
              <TextField
                size="small"
                placeholder="Tìm màn hình..."
                value={routeSearch}
                onChange={(e) => setRouteSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                    sx: {
                      height: 32,
                      fontSize: "0.8rem",
                      bgcolor: "background.paper",
                      borderRadius: 1.5,
                    },
                  },
                }}
              />

              <Select
                size="small"
                value={routeFilter}
                onChange={(e: any) => setRouteFilter(e.target.value)}
                sx={{
                  height: 32,
                  fontSize: "0.78rem",
                  bgcolor: "background.paper",
                  borderRadius: 1.5,
                }}
              >
                <MenuItem value="all">Tất cả màn hình</MenuItem>
                <MenuItem value="allowed">Được phép mở</MenuItem>
                <MenuItem value="blocked">Đang khóa</MenuItem>
              </Select>

              {!isAdmin && (
                <>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleToggleAllRoutesForRole(true)}
                    sx={{ fontSize: "0.72rem", textTransform: "none", borderRadius: 1.5, px: 1.25, height: 32, flexShrink: 0 }}
                  >
                    Mở tất cả
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    onClick={() => handleToggleAllRoutesForRole(false)}
                    sx={{ fontSize: "0.72rem", textTransform: "none", borderRadius: 1.5, px: 1.25, height: 32, flexShrink: 0 }}
                  >
                    Chỉ Tổng quan
                  </Button>
                </>
              )}
            </Stack>
          </Box>

          <TableContainer sx={{ maxHeight: 520 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: isDark ? alpha("#FFFFFF", 0.02) : "#F1F5F9" }}>
                  <TableCell sx={{ fontWeight: 700, width: "42%", py: 1.25 }}>Màn hình chức năng</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: "36%", py: 1.25 }}>Khu vực & Nhiệm vụ nghiệp vụ</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, width: "22%", py: 1.25 }}>Trạng thái mở</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {CATEGORY_ORDER.map((category) => {
                  const routesInCat = filteredRoutes.filter((r) => r.category === category);
                  if (routesInCat.length === 0) return null;

                  const allowedInCat = routesInCat.filter(
                    (r) => isAdmin || (activeRoleConfig.allowedPages || []).includes(r.path)
                  ).length;

                  return (
                    <React.Fragment key={category}>
                      {/* Category Header Row (Bulk Toggle Support) */}
                      <TableRow
                        sx={{
                          bgcolor: isDark ? alpha("#FFFFFF", 0.04) : "#F1F5F9",
                          borderTop: 2,
                          borderColor: "divider",
                        }}
                      >
                        <TableCell colSpan={2} sx={{ py: 1 }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                            <Box sx={{ color: "primary.main", display: "flex", alignItems: "center" }}>
                              {CATEGORY_ICONS[category]}
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "0.82rem" }}>
                              {CATEGORY_LABELS[category]}
                            </Typography>
                            <Chip
                              size="small"
                              label={`${allowedInCat}/${routesInCat.length} màn hình`}
                              sx={{
                                height: 18,
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                bgcolor: allowedInCat > 0 ? alpha("#059669", 0.12) : alpha("#64748B", 0.12),
                                color: allowedInCat > 0 ? "#059669" : "text.secondary",
                              }}
                            />
                          </Stack>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1 }}>
                          {!isAdmin && handleToggleCategoryRoutesForRole && (
                            <Stack direction="row" spacing={0.5} sx={{ justifyContent: "center" }}>
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => handleToggleCategoryRoutesForRole(category, true)}
                                sx={{ fontSize: "0.68rem", py: 0.1, px: 0.75, minWidth: 0, textTransform: "none", fontWeight: 700 }}
                              >
                                Mở cả nhóm
                              </Button>
                              <Button
                                size="small"
                                variant="text"
                                color="inherit"
                                onClick={() => handleToggleCategoryRoutesForRole(category, false)}
                                sx={{ fontSize: "0.68rem", py: 0.1, px: 0.75, minWidth: 0, textTransform: "none", color: "text.secondary" }}
                              >
                                Khóa nhóm
                              </Button>
                            </Stack>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Routes inside Category */}
                      {routesInCat.map((route) => {
                        const isAllowed =
                          isAdmin || (activeRoleConfig.allowedPages || []).includes(route.path);
                        const isDashboard = route.path === "/dashboard";

                        return (
                          <TableRow
                            key={route.path}
                            hover
                            sx={{
                              "&:last-child td, &:last-child th": { border: 0 },
                            }}
                          >
                            <TableCell sx={{ py: 1.1, pl: 3.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.84rem", color: "text.primary" }}>
                                {route.label}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
                                {route.path}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1.1 }}>
                              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.78rem" }}>
                                {route.area}
                              </Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1.1 }}>
                              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "center" }}>
                                <Chip
                                  size="small"
                                  label={isAllowed ? "Đang mở" : "Đã khóa"}
                                  sx={{
                                    height: 20,
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    borderRadius: 1,
                                    bgcolor: isAllowed ? alpha("#059669", 0.12) : alpha("#64748B", 0.1),
                                    color: isAllowed ? "#059669" : "#64748B",
                                  }}
                                />
                                <Switch
                                  size="small"
                                  checked={isAllowed}
                                  disabled={isAdmin || isDashboard}
                                  onChange={() => handleToggleRouteForRole(route.path)}
                                  color="primary"
                                />
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* ── BOTTOM SAVE BAR FOR ROLE CONFIG ────────────────────────────── */}
        {!isAdmin && handleSaveRoleConfig && (
          <Paper
            elevation={2}
            sx={{
              p: 2,
              borderRadius: 2,
              borderColor: "divider",
              bgcolor: isDark ? "background.paper" : "#FFFFFF",
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Lưu cấu hình phân quyền cho chức vụ [{activeRoleConfig.label}]
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Lưu ý: Quyền hạn được lưu ở đây sẽ áp dụng cho TẤT CẢ nhân viên mang chức vụ &quot;{activeRoleConfig.label}&quot; (trừ những cá nhân được cấp quyền riêng ở Tab 2).
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              size="medium"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
              onClick={handleSaveRoleConfig}
              disabled={saving}
              sx={{
                borderRadius: 1.5,
                textTransform: "none",
                fontWeight: 700,
                px: 3,
                whiteSpace: "nowrap",
              }}
            >
              {saving ? "Đang lưu..." : `Lưu quyền [${activeRoleConfig.label}]`}
            </Button>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}

export default RolePermissionsTab;
