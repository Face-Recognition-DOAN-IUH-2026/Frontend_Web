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
} from "@mui/material";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";

import {
  ALL_RESOURCES,
  RESOURCE_LABELS,
  type SystemResource,
  type CrudAction,
  type RolePermissionConfig,
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
  handleToggleCrudForRole: (resource: SystemResource, action: CrudAction) => void;
  handleSetResourcePresetForRole: (resource: SystemResource, preset: "full" | "readonly") => void;
  handleSaveRoleConfig: () => void;
  saving: boolean;
  setOpenNewRoleModal: (open: boolean) => void;
}

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
  handleToggleCrudForRole,
  handleSetResourcePresetForRole,
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
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              fontFamily: "Space Grotesk, sans-serif",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              fontSize: "0.8rem",
              color: "text.primary",
            }}
          >
            Danh sách vai trò
          </Typography>
          <IconButton
            size="small"
            onClick={() => setOpenNewRoleModal(true)}
            sx={{
              color: "primary.main",
              "&:hover": { bgcolor: alpha(primaryColor, 0.08) },
            }}
            title="Thêm vai trò mới"
          >
            <AddCircleOutlineOutlinedIcon fontSize="small" />
          </IconButton>
        </Box>

        <Stack spacing={0.5} sx={{ p: 1.5 }}>
          {roleKeys.map((rKey) => {
            const rConfig = roles[rKey];
            const isSelected = selectedRole === rKey;
            const isRoleAdmin = rKey === "admin";
            const allowedCount = isRoleAdmin
              ? "Toàn quyền"
              : `${(rConfig?.allowedPages || []).length} trang`;

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
                  transition: "all 0.15s ease",
                  bgcolor: isSelected
                    ? isDark
                      ? alpha(primaryColor, 0.15)
                      : alpha(primaryColor, 0.08)
                    : "transparent",
                  borderLeft: isSelected ? `3px solid ${primaryColor}` : "3px solid transparent",
                  "&:hover": {
                    bgcolor: isSelected
                      ? isDark
                        ? alpha(primaryColor, 0.2)
                        : alpha(primaryColor, 0.12)
                      : "action.hover",
                  },
                }}
              >
                <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: 1,
                      bgcolor: isRoleAdmin
                        ? alpha(primaryColor, 0.12)
                        : "action.hover",
                      color: isRoleAdmin ? primaryColor : "text.secondary",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isRoleAdmin ? (
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
                        color: isSelected ? "primary.main" : "text.primary",
                        fontSize: "0.85rem",
                      }}
                      noWrap
                    >
                      {rConfig?.label || rKey}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.72rem" }}>
                      code: {rKey}
                    </Typography>
                  </Box>
                </Stack>

                <Chip
                  size="small"
                  label={allowedCount}
                  sx={{
                    height: 20,
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    borderRadius: 1,
                    fontFamily: "JetBrains Mono, monospace",
                    bgcolor: isRoleAdmin
                      ? alpha(primaryColor, 0.12)
                      : isSelected
                      ? alpha(primaryColor, 0.15)
                      : "action.hover",
                    color: isRoleAdmin || isSelected ? primaryColor : "text.secondary",
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
            Thêm vai trò mới
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
                label={isAdmin ? "HỆ THỐNG MẶC ĐỊNH" : "VAI TRÒ TÙY BIẾN"}
                color={isAdmin ? "primary" : "default"}
                sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700, borderRadius: 1 }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.82rem", mt: 0.25 }}>
              {activeRoleConfig.description || "Quyền hạn phân bổ mặc định cho vai trò người dùng này."}
            </Typography>
          </Box>

          {isAdmin ? (
            <Chip
              icon={<CheckCircleOutlineOutlinedIcon />}
              label="Toàn quyền bảo mật (Locked)"
              color="success"
              variant="outlined"
              size="small"
              sx={{ fontWeight: 700, height: 26 }}
            />
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "JetBrains Mono, monospace" }}>
              {(activeRoleConfig.allowedPages || []).length} màn hình • 7 phân hệ CRUD
            </Typography>
          )}
        </Paper>

        {/* 1. CRUD Matrix (Data-First) */}
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
                1. Ma trận thao tác dữ liệu (CRUD Matrix)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Quyền thực hiện các tác vụ dữ liệu trên từng phân hệ thư viện
              </Typography>
            </Box>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: isDark ? alpha("#FFFFFF", 0.02) : "#F1F5F9" }}>
                  <TableCell sx={{ fontWeight: 700, width: "30%", py: 1.25 }}>Phân hệ tài nguyên</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, width: "14%", py: 1.25 }}>Đọc (Read)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, width: "14%", py: 1.25 }}>Tạo mới (Create)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, width: "14%", py: 1.25 }}>Cập nhật (Update)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, width: "14%", py: 1.25 }}>Xóa (Delete)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, width: "14%", py: 1.25 }}>Gán nhanh</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ALL_RESOURCES.map((res) => {
                  const crudPerms = activeRoleConfig.crud?.[res] || {
                    create: false,
                    read: false,
                    update: false,
                    delete: false,
                  };

                  return (
                    <TableRow
                      key={res}
                      hover
                      sx={{
                        "&:last-child td, &:last-child th": { border: 0 },
                      }}
                    >
                      <TableCell sx={{ py: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                          {RESOURCE_LABELS[res] || res}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ fontFamily: "JetBrains Mono, monospace", color: "text.secondary", fontSize: "0.7rem" }}
                        >
                          {res}
                        </Typography>
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
                              Tất cả
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

        {/* 2. Page Access Table */}
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
                2. Quyền truy cập màn hình & URL (Page Access)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Xác định các màn hình hiển thị trên thanh Menu và cho phép người dùng truy cập
              </Typography>
            </Box>

            {/* Filters & Actions */}
            <Stack direction="row" spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
              <TextField
                size="small"
                placeholder="Tìm trang hoặc URL..."
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
                      fontFamily: "JetBrains Mono, monospace",
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
                <MenuItem value="all">Tất cả trang</MenuItem>
                <MenuItem value="allowed">Được phép</MenuItem>
                <MenuItem value="blocked">Bị chặn</MenuItem>
              </Select>

              {!isAdmin && (
                <>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleToggleAllRoutesForRole(true)}
                    sx={{ fontSize: "0.72rem", textTransform: "none", borderRadius: 1.5, px: 1.25, height: 32, flexShrink: 0 }}
                  >
                    Cấp tất cả
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    onClick={() => handleToggleAllRoutesForRole(false)}
                    sx={{ fontSize: "0.72rem", textTransform: "none", borderRadius: 1.5, px: 1.25, height: 32, flexShrink: 0 }}
                  >
                    Chỉ Dashboard
                  </Button>
                </>
              )}
            </Stack>
          </Box>

          <TableContainer sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: isDark ? alpha("#FFFFFF", 0.02) : "#F1F5F9" }}>
                  <TableCell sx={{ fontWeight: 700, width: "42%", py: 1.25 }}>Tên màn hình chức năng</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: "38%", py: 1.25 }}>Đường dẫn (URL Route)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, width: "20%", py: 1.25 }}>Cho phép truy cập</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRoutes.map((route) => {
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
                      <TableCell sx={{ py: 0.9 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.84rem" }}>
                          {route.label}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.9 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: "JetBrains Mono, monospace",
                            color: "text.secondary",
                            bgcolor: "action.hover",
                            px: 1,
                            py: 0.25,
                            borderRadius: 0.5,
                            fontSize: "0.75rem",
                          }}
                        >
                          {route.path}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.9 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "center" }}>
                          <Chip
                            size="small"
                            label={isAllowed ? "ĐƯỢC PHÉP" : "CHẶN"}
                            sx={{
                              height: 18,
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              fontFamily: "JetBrains Mono, monospace",
                              borderRadius: 0.5,
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
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Stack>
    </Box>
  );
}
export default RolePermissionsTab;
