"use client";

import React, { useMemo } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import RemoveOutlinedIcon from "@mui/icons-material/RemoveOutlined";
import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import TouchAppOutlinedIcon from "@mui/icons-material/TouchAppOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import { RESOURCE_RELATED_ROUTES } from "./RolePermissionsTab";

import {
  ALL_RESOURCES,
  ALL_ACTIONS,
  ALL_ROUTES,
  RESOURCE_LABELS,
  ACTION_LABELS,
  CATEGORY_LABELS,
  type SystemResource,
  type CrudAction,
  type RouteCategory,
  type SystemRoute,
  type RolePermissionConfig,
  type UserPermissionOverride,
  type ScheduleStaff,
} from "@/lib/types";

export interface UserOverridesTabProps {
  staffList: ScheduleStaff[];
  selectedUserId: string;
  setSelectedUserId: (val: string) => void;
  selectedStaffMember: ScheduleStaff | null;
  userOverride: UserPermissionOverride;
  roles: Record<string, RolePermissionConfig>;
  handleToggleUserOverrideEnabled: (enabled: boolean) => void;
  handleSetUserRouteState: (path: string, state: "inherit" | "grant" | "revoke") => void;
  handleSetUserCrudState: (
    resource: SystemResource,
    action: CrudAction,
    state: "inherit" | "grant" | "revoke"
  ) => void;
  handleSaveUserOverride: () => void;
  handleResetUserOverride: () => void;
  saving: boolean;
}

export function UserOverridesTab({
  staffList,
  selectedUserId,
  setSelectedUserId,
  selectedStaffMember,
  userOverride,
  roles,
  handleToggleUserOverrideEnabled,
  handleSetUserRouteState,
  handleSetUserCrudState,
  handleSaveUserOverride,
  handleResetUserOverride,
  saving,
}: UserOverridesTabProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;

  const baseRole = selectedStaffMember?.role || "staff";
  const baseConfig = roles[baseRole] || roles["staff"];

  // Group routes by category
  const routesByCategory = useMemo(() => {
    const map: Record<RouteCategory, SystemRoute[]> = {
      library: [],
      circulation: [],
      personnel: [],
      ai_vision: [],
      admin: [],
    };
    ALL_ROUTES.forEach((r) => {
      const cat = r.category || "library";
      if (!map[cat]) map[cat] = [];
      map[cat].push(r);
    });
    return map;
  }, []);

  const handleSetCategoryRouteState = (cat: RouteCategory, state: "inherit" | "grant" | "revoke") => {
    const catRoutes = routesByCategory[cat] || [];
    catRoutes.forEach((r) => handleSetUserRouteState(r.path, state));
  };

  const [collapsedCategories, setCollapsedCategories] = React.useState<Record<string, boolean>>({});

  const toggleCategoryCollapse = (cat: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const areAllCollapsed = useMemo(() => {
    return (Object.keys(routesByCategory) as RouteCategory[]).every((c) => Boolean(collapsedCategories[c]));
  }, [collapsedCategories, routesByCategory]);

  const handleToggleAllCollapse = () => {
    const nextVal = !areAllCollapsed;
    const next: Record<string, boolean> = {};
    (Object.keys(routesByCategory) as RouteCategory[]).forEach((c) => {
      next[c] = nextVal;
    });
    setCollapsedCategories(next);
  };

  return (
    <Stack spacing={2.5}>
      {/* ── TOP USER SELECTION & MASTER OVERRIDE TOGGLE ────────────────────── */}
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          borderRadius: 2,
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 1.5,
              bgcolor: alpha(primaryColor, 0.1),
              color: primaryColor,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <PersonOutlineOutlinedIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box sx={{ flex: 1, maxWidth: 360 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="staff-select-label">Chọn nhân viên thư viện</InputLabel>
              <Select
                labelId="staff-select-label"
                value={selectedUserId}
                label="Chọn nhân viên thư viện"
                onChange={(e) => setSelectedUserId(e.target.value)}
                sx={{ borderRadius: 1.5 }}
              >
                {staffList.map((st) => (
                  <MenuItem key={st.id} value={st.id}>
                    {st.fullName || st.email} ({st.role === "admin" ? "Quản trị viên" : "Thủ thư"})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {selectedStaffMember && (
            <Chip
              size="small"
              label={`Chức vụ: ${selectedStaffMember.role === "admin" ? "Quản trị viên" : "Thủ thư"}`}
              sx={{
                fontWeight: 700,
                borderRadius: 1,
                bgcolor: "action.hover",
              }}
            />
          )}
        </Stack>

        {/* Master Override Toggle */}
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
              Cấp quyền riêng cho nhân viên này
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {userOverride.enabled ? "Đang áp dụng đặc quyền riêng" : "Đang áp dụng theo chức vụ"}
            </Typography>
          </Box>
          <Switch
            checked={Boolean(userOverride.enabled)}
            onChange={(e) => handleToggleUserOverrideEnabled(e.target.checked)}
            color="primary"
          />
          {userOverride.enabled && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<RestartAltOutlinedIcon />}
              onClick={handleResetUserOverride}
              disabled={saving}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 1.5 }}
            >
              Khôi phục quyền mặc định
            </Button>
          )}
        </Stack>
      </Paper>

      {!userOverride.enabled ? (
        <Paper
          variant="outlined"
          sx={{
            p: 4,
            borderRadius: 2,
            textAlign: "center",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 700, mb: 0.5 }}>
            Nhân viên này đang dùng bộ quyền chuẩn của nhóm [{baseConfig?.label || baseRole}]
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600, mx: "auto", mb: 2 }}>
            Nếu bạn muốn cấp thêm quyền đặc biệt (ví dụ: giao thêm việc kiểm kê, sửa sách, duyệt phiếu, in thẻ) hoặc tạm khóa một số tính năng riêng cho nhân viên này, hãy nhấn nút bên dưới.
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={() => handleToggleUserOverrideEnabled(true)}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 1.5 }}
          >
            Bật thiết lập quyền riêng cho nhân viên
          </Button>
        </Paper>
      ) : (
        <Stack spacing={2.5}>
          {/* CRUD Overrides Table (6 Actions) */}
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
                py: 2,
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: isDark ? "background.default" : "#F8FAFC",
              }}
            >
              <Stack direction={{ xs: "column", md: "row" }} sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 1.5 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    1. Tùy chỉnh thao tác dữ liệu riêng biệt theo 7 Phân hệ (6 Hành động CRUD)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Nhân viên mặc định dùng quyền theo vai trò. Nhấp chuột vào bất kỳ ô nào để cấp thêm (+) hoặc thu hồi (-) quyền riêng.
                  </Typography>
                </Box>
                {/* Visual Legend / Guide */}
                <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
                  <Stack direction="row" spacing={0.6} sx={{ alignItems: "center" }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#059669" }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#059669", fontSize: "0.72rem" }}>
                      + Cấp riêng
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.6} sx={{ alignItems: "center" }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#DC2626" }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#DC2626", fontSize: "0.72rem" }}>
                      - Thu hồi
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.6} sx={{ alignItems: "center" }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: isDark ? "#64748B" : "#94A3B8" }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.72rem" }}>
                      Theo vai trò
                    </Typography>
                  </Stack>
                  <Chip
                    size="small"
                    icon={<TouchAppOutlinedIcon sx={{ fontSize: 13 }} />}
                    label="Bấm 1 chạm để đổi trạng thái"
                    variant="outlined"
                    sx={{ height: 22, fontSize: "0.68rem", fontWeight: 600 }}
                  />
                </Stack>
              </Stack>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: isDark ? alpha("#FFFFFF", 0.02) : "#F1F5F9" }}>
                    <TableCell sx={{ fontWeight: 700, width: "26%" }}>Phân hệ nghiệp vụ & Các màn hình</TableCell>
                    {ALL_ACTIONS.map((act) => (
                      <TableCell
                        key={act}
                        align="center"
                        sx={{
                          fontWeight: 700,
                          width: "12.3%",
                          color:
                            act === "approve"
                              ? "#7C3AED"
                              : act === "print"
                              ? "#0284C7"
                              : act === "create"
                              ? "#16A34A"
                              : act === "update"
                              ? "#D97706"
                              : act === "delete"
                              ? "#DC2626"
                              : "text.primary",
                        }}
                      >
                        {ACTION_LABELS[act] || act}
                        {act === "approve" && " ✦"}
                        {act === "print" && " 🖨️"}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ALL_RESOURCES.map((res) => {
                    const relatedRoutes = RESOURCE_RELATED_ROUTES[res] || [];

                    return (
                      <TableRow key={res} hover>
                        <TableCell sx={{ py: 1.25 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                            {RESOURCE_LABELS[res] || res}
                          </Typography>
                          <Stack direction="row" spacing={0.5} useFlexGap sx={{ mt: 0.5, flexWrap: "wrap" }}>
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
                          {/* Quick row actions */}
                          <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }}>
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => {
                                ALL_ACTIONS.forEach((a) => handleSetUserCrudState(res, a, "grant"));
                              }}
                              sx={{
                                fontSize: "0.65rem",
                                py: 0.1,
                                px: 0.5,
                                minWidth: 0,
                                textTransform: "none",
                                color: "#059669",
                                fontWeight: 700,
                                bgcolor: alpha("#059669", 0.08),
                                borderRadius: 1,
                                "&:hover": { bgcolor: alpha("#059669", 0.16) },
                              }}
                            >
                              + Cấp đủ 6 quyền
                            </Button>
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => {
                                ALL_ACTIONS.forEach((a) => handleSetUserCrudState(res, a, "inherit"));
                              }}
                              sx={{
                                fontSize: "0.65rem",
                                py: 0.1,
                                px: 0.5,
                                minWidth: 0,
                                textTransform: "none",
                                color: "text.secondary",
                                bgcolor: isDark ? alpha("#FFFFFF", 0.05) : "#F1F5F9",
                                borderRadius: 1,
                                "&:hover": { bgcolor: "action.hover" },
                              }}
                            >
                              Về mặc định
                            </Button>
                          </Stack>
                        </TableCell>
                      {ALL_ACTIONS.map((act) => {
                        const isGranted = userOverride.grantedCrud?.[res]?.[act] === true;
                        const isRevoked = userOverride.revokedCrud?.[res]?.[act] === true;
                        const currentVal: "inherit" | "grant" | "revoke" = isGranted
                          ? "grant"
                          : isRevoked
                          ? "revoke"
                          : "inherit";

                        const baseVal = Boolean(baseConfig?.crud?.[res]?.[act]);

                        const handleCycle = () => {
                          const nextState =
                            currentVal === "inherit"
                              ? "grant"
                              : currentVal === "grant"
                              ? "revoke"
                              : "inherit";
                          handleSetUserCrudState(res, act, nextState);
                        };

                        let chipLabel = "";
                        let chipIcon = null;
                        let tooltipText = "";
                        let chipSx = {};

                        if (currentVal === "grant") {
                          chipLabel = "+ Cấp quyền";
                          chipIcon = <CheckCircleOutlineIcon sx={{ fontSize: "14px !important" }} />;
                          tooltipText = `[Đặc quyền riêng]: Đã cấp thêm quyền "${ACTION_LABELS[act]}" cho phân hệ này. Bấm để chuyển sang Thu hồi (-)`;
                          chipSx = {
                            bgcolor: isDark ? alpha("#059669", 0.3) : alpha("#059669", 0.16),
                            border: `1.5px solid #059669`,
                            color: isDark ? "#6EE7B7" : "#047857",
                            fontWeight: 800,
                            boxShadow: `0 1px 3px ${alpha("#059669", 0.25)}`,
                            "&:hover": {
                              bgcolor: isDark ? alpha("#059669", 0.45) : alpha("#059669", 0.26),
                              transform: "translateY(-1px)",
                            },
                          };
                        } else if (currentVal === "revoke") {
                          chipLabel = "- Thu hồi";
                          chipIcon = <BlockOutlinedIcon sx={{ fontSize: "14px !important" }} />;
                          tooltipText = `[Chặn quyền]: Đã thu hồi quyền "${ACTION_LABELS[act]}" của nhân viên này. Bấm để trở về Mặc định`;
                          chipSx = {
                            bgcolor: isDark ? alpha("#DC2626", 0.3) : alpha("#DC2626", 0.16),
                            border: `1.5px solid #DC2626`,
                            color: isDark ? "#FCA5A5" : "#B91C1C",
                            fontWeight: 800,
                            boxShadow: `0 1px 3px ${alpha("#DC2626", 0.25)}`,
                            "&:hover": {
                              bgcolor: isDark ? alpha("#DC2626", 0.45) : alpha("#DC2626", 0.26),
                              transform: "translateY(-1px)",
                            },
                          };
                        } else {
                          // Inherit from role baseline
                          if (baseVal) {
                            chipLabel = "Mặc định (Có)";
                            chipIcon = <CheckOutlinedIcon sx={{ fontSize: "13px !important" }} />;
                            tooltipText = `Mặc định theo chức vụ [${baseConfig?.label || baseRole}]: ĐƯỢC PHÉP. Bấm để Cấp riêng (+)`;
                            chipSx = {
                              bgcolor: isDark ? alpha("#10B981", 0.08) : alpha("#10B981", 0.06),
                              border: `1px solid ${isDark ? alpha("#10B981", 0.25) : alpha("#10B981", 0.35)}`,
                              color: isDark ? "#34D399" : "#059669",
                              fontWeight: 600,
                              opacity: 0.85,
                              "&:hover": {
                                opacity: 1,
                                bgcolor: isDark ? alpha("#10B981", 0.16) : alpha("#10B981", 0.12),
                                transform: "translateY(-1px)",
                              },
                            };
                          } else {
                            chipLabel = "Mặc định (—)";
                            chipIcon = <RemoveOutlinedIcon sx={{ fontSize: "13px !important" }} />;
                            tooltipText = `Mặc định theo chức vụ [${baseConfig?.label || baseRole}]: CHƯA CÓ. Bấm để Cấp riêng (+)`;
                            chipSx = {
                              bgcolor: isDark ? alpha("#64748B", 0.08) : alpha("#64748B", 0.06),
                              border: `1px solid ${isDark ? alpha("#64748B", 0.2) : alpha("#64748B", 0.25)}`,
                              color: "text.secondary",
                              fontWeight: 500,
                              opacity: 0.75,
                              "&:hover": {
                                opacity: 1,
                                bgcolor: isDark ? alpha("#64748B", 0.16) : alpha("#64748B", 0.12),
                                transform: "translateY(-1px)",
                              },
                            };
                          }
                        }

                        return (
                          <TableCell key={act} align="center" sx={{ py: 1 }}>
                            <Tooltip title={tooltipText} arrow placement="top">
                              <Chip
                                icon={chipIcon}
                                label={chipLabel}
                                size="small"
                                onClick={handleCycle}
                                sx={{
                                  cursor: "pointer",
                                  height: 28,
                                  px: 0.75,
                                  fontSize: "0.72rem",
                                  borderRadius: 1.5,
                                  transition: "all 0.15s ease-in-out",
                                  userSelect: "none",
                                  ...chipSx,
                                }}
                              />
                            </Tooltip>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Route Overrides Table (Categorized with Batch Actions) */}
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
                flexDirection: { xs: "column", sm: "row" },
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", sm: "center" },
                gap: 1.5,
              }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  2. Tùy chỉnh quyền mở màn hình chức năng (Theo 5 nhóm hệ thống)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Mở thêm hoặc tạm ẩn các mục trên menu làm việc riêng của nhân viên này
                </Typography>
              </Box>

              <Button
                size="small"
                variant="outlined"
                color="inherit"
                startIcon={areAllCollapsed ? <UnfoldMoreIcon sx={{ fontSize: 14 }} /> : <UnfoldLessIcon sx={{ fontSize: 14 }} />}
                onClick={handleToggleAllCollapse}
                sx={{ fontSize: "0.72rem", textTransform: "none", borderRadius: 1.5, px: 1.25, height: 32, flexShrink: 0 }}
              >
                {areAllCollapsed ? "Mở rộng tất cả" : "Thu gọn tất cả"}
              </Button>
            </Box>

            <TableContainer sx={{ maxHeight: 520 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: isDark ? alpha("#FFFFFF", 0.02) : "#F1F5F9" }}>
                    <TableCell sx={{ fontWeight: 700, width: "42%" }}>Màn hình chức năng</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: "26%" }}>Mặc định theo chức vụ</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, width: "32%" }}>Thiết lập riêng cho nhân viên</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(Object.keys(routesByCategory) as RouteCategory[]).map((categoryKey) => {
                    const categoryRoutes = routesByCategory[categoryKey] || [];
                    if (categoryRoutes.length === 0) return null;
                    const isCollapsed = Boolean(collapsedCategories[categoryKey]);

                    return (
                      <React.Fragment key={categoryKey}>
                        {/* Category Group Header */}
                        <TableRow
                          sx={{
                            bgcolor: isDark ? alpha("#38BDF8", 0.08) : alpha("#0284C7", 0.05),
                            userSelect: "none",
                          }}
                        >
                          <TableCell
                            colSpan={3}
                            sx={{
                              py: 1,
                              px: 2.5,
                              cursor: "pointer",
                              "&:hover": {
                                bgcolor: isDark ? alpha("#38BDF8", 0.12) : alpha("#0284C7", 0.09),
                              },
                            }}
                            onClick={() => toggleCategoryCollapse(categoryKey)}
                          >
                            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                <Box sx={{ color: "text.secondary", display: "flex", alignItems: "center" }}>
                                  {isCollapsed ? (
                                    <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
                                  ) : (
                                    <KeyboardArrowUpIcon sx={{ fontSize: 18 }} />
                                  )}
                                </Box>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", textTransform: "uppercase", letterSpacing: 0.6 }}>
                                  {CATEGORY_LABELS[categoryKey]}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={`${categoryRoutes.length} màn hình`}
                                  sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }}
                                />
                                {isCollapsed && (
                                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem", fontStyle: "italic", ml: 1 }}>
                                    (Bấm để xem chi tiết)
                                  </Typography>
                                )}
                              </Stack>

                              {/* Batch Actions for Category */}
                              <Stack
                                direction="row"
                                spacing={0.75}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleSetCategoryRouteState(categoryKey, "inherit")}
                                  sx={{ fontSize: "0.68rem", py: 0.25, px: 0.75, minWidth: 0, textTransform: "none", borderRadius: 1 }}
                                >
                                  Theo vai trò cả nhóm
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="success"
                                  onClick={() => handleSetCategoryRouteState(categoryKey, "grant")}
                                  sx={{ fontSize: "0.68rem", py: 0.25, px: 0.75, minWidth: 0, textTransform: "none", borderRadius: 1 }}
                                >
                                  Cấp quyền cả nhóm (+)
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() => handleSetCategoryRouteState(categoryKey, "revoke")}
                                  sx={{ fontSize: "0.68rem", py: 0.25, px: 0.75, minWidth: 0, textTransform: "none", borderRadius: 1 }}
                                >
                                  Thu hồi cả nhóm (-)
                                </Button>
                              </Stack>
                            </Stack>
                          </TableCell>
                        </TableRow>

                        {/* Individual Route Rows */}
                        {!isCollapsed &&
                          categoryRoutes.map((route) => {
                          const isGranted = (userOverride.grantedPages || []).includes(route.path);
                          const isRevoked = (userOverride.revokedPages || []).includes(route.path);
                          const currentVal: "inherit" | "grant" | "revoke" = isGranted
                            ? "grant"
                            : isRevoked
                            ? "revoke"
                            : "inherit";

                          const isBaseAllowed = (baseConfig?.allowedPages || []).includes(route.path);

                          return (
                            <TableRow key={route.path} hover>
                              <TableCell sx={{ py: 1.1, pl: 3.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.85rem", color: "text.primary" }}>
                                  {route.label}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "monospace", fontSize: "0.72rem" }}>
                                  {route.path}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 1.1 }}>
                                <Chip
                                  size="small"
                                  label={isBaseAllowed ? "Được mở" : "Không được mở"}
                                  sx={{
                                    height: 20,
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    borderRadius: 1,
                                    bgcolor: isBaseAllowed ? alpha("#059669", 0.1) : alpha("#64748B", 0.1),
                                    color: isBaseAllowed ? "#059669" : "#64748B",
                                  }}
                                />
                              </TableCell>
                              <TableCell align="center" sx={{ py: 1.1 }}>
                                <ToggleButtonGroup
                                  size="small"
                                  exclusive
                                  value={currentVal}
                                  onChange={(_, val) => val && handleSetUserRouteState(route.path, val)}
                                  sx={{
                                    height: 26,
                                    "& .MuiToggleButton-root": {
                                      px: 1.25,
                                      py: 0,
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      textTransform: "none",
                                    },
                                  }}
                                >
                                  <ToggleButton value="inherit">
                                    Theo chức vụ
                                  </ToggleButton>
                                  <ToggleButton
                                    value="grant"
                                    sx={{
                                      "&.Mui-selected": {
                                        bgcolor: alpha("#059669", 0.15),
                                        color: "#059669",
                                      },
                                    }}
                                  >
                                    Cho phép (+)
                                  </ToggleButton>
                                  <ToggleButton
                                    value="revoke"
                                    sx={{
                                      "&.Mui-selected": {
                                        bgcolor: alpha("#DC2626", 0.15),
                                        color: "#DC2626",
                                      },
                                    }}
                                  >
                                    Tạm khóa (-)
                                  </ToggleButton>
                                </ToggleButtonGroup>
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

          {/* Guide & Sticky Floating Save Bar */}
          <Paper
            elevation={4}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: "1px solid",
              borderColor: alpha(primaryColor, 0.25),
              bgcolor: isDark ? alpha("#1E293B", 0.95) : alpha("#FFFFFF", 0.95),
              backdropFilter: "blur(12px)",
              position: "sticky",
              bottom: 16,
              zIndex: 10,
              boxShadow: isDark
                ? "0 8px 32px rgba(0,0,0,0.6)"
                : "0 8px 30px rgba(139,0,0,0.12)",
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 2,
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
              <InfoOutlinedIcon sx={{ color: "primary.main", mt: 0.2 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                  Phân biệt Quyền Chức vụ (Tab 1) và Quyền Riêng Nhân viên (Tab 2):
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5, lineHeight: 1.6 }}>
                  • <strong>Tab 1 (Chức vụ):</strong> Thay đổi ở Tab 1 sẽ áp dụng cho <strong>tất cả nhân viên</strong> thuộc chức vụ đó (cả Staff A, Staff B,...).<br />
                  • <strong>Tab 2 (Nhân viên):</strong> Chỉ áp dụng đặc quyền riêng cho <strong>{selectedStaffMember?.fullName || "nhân viên này"}</strong>. Các nhân viên khác vẫn áp dụng theo chức vụ gốc.
                </Typography>
              </Box>
            </Stack>

            <Button
              size="medium"
              variant="contained"
              color="primary"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
              onClick={handleSaveUserOverride}
              disabled={saving}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 1.5,
                px: 3,
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(139,0,0,0.3)",
                whiteSpace: "nowrap",
              }}
            >
              {saving ? "Đang lưu..." : `Lưu quyền riêng [${selectedStaffMember?.fullName || "nhân viên"}]`}
            </Button>
          </Paper>
        </Stack>
      )}
    </Stack>
  );
}

export default UserOverridesTab;
