"use client";

import React, { useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
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
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";

import {
  ALL_RESOURCES,
  ALL_ACTIONS,
  ALL_ROUTES,
  RESOURCE_LABELS,
  type SystemResource,
  type CrudAction,
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
  handleResetUserOverride,
  saving,
}: UserOverridesTabProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;

  const baseRole = selectedStaffMember?.role || "staff";
  const baseConfig = roles[baseRole] || roles["staff"];

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
              <InputLabel id="staff-select-label">Chọn tài khoản nhân viên</InputLabel>
              <Select
                labelId="staff-select-label"
                value={selectedUserId}
                label="Chọn tài khoản nhân viên"
                onChange={(e) => setSelectedUserId(e.target.value)}
                sx={{ borderRadius: 1.5 }}
              >
                {staffList.map((st) => (
                  <MenuItem key={st.id} value={st.id}>
                    {st.fullName || st.email} ({st.role})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {selectedStaffMember && (
            <Chip
              size="small"
              label={`Vai trò gốc: ${baseRole.toUpperCase()}`}
              sx={{
                fontWeight: 700,
                borderRadius: 1,
                fontFamily: "JetBrains Mono, monospace",
                bgcolor: "action.hover",
              }}
            />
          )}
        </Stack>

        {/* Master Override Toggle */}
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
              Kích hoạt ghi đè cá nhân
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {userOverride.enabled ? "Đang áp dụng quyền riêng biệt" : "Đang kế thừa từ vai trò"}
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
              Hủy ghi đè
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
            Tài khoản này đang sử dụng quyền mặc định của vai trò [{baseRole.toUpperCase()}]
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600, mx: "auto", mb: 2 }}>
            Để cấp thêm quyền hoặc thu hồi riêng cho tài khoản này mà không làm ảnh hưởng đến người dùng khác, hãy bật công tắc &quot;Kích hoạt ghi đè cá nhân&quot; ở trên.
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={() => handleToggleUserOverrideEnabled(true)}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 1.5 }}
          >
            Bật ghi đè cá nhân
          </Button>
        </Paper>
      ) : (
        <Stack spacing={2.5}>
          {/* CRUD Overrides Table */}
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
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Ghi đè ma trận thao tác CRUD
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Chọn trạng thái: Kế thừa (Mặc định) • Cấp thêm (+) • Thu hồi (-)
              </Typography>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: isDark ? alpha("#FFFFFF", 0.02) : "#F1F5F9" }}>
                    <TableCell sx={{ fontWeight: 700, width: "28%" }}>Phân hệ</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, width: "18%" }}>Đọc (Read)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, width: "18%" }}>Tạo mới (Create)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, width: "18%" }}>Cập nhật (Update)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, width: "18%" }}>Xóa (Delete)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ALL_RESOURCES.map((res) => (
                    <TableRow key={res} hover>
                      <TableCell sx={{ py: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                          {RESOURCE_LABELS[res] || res}
                        </Typography>
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

                        return (
                          <TableCell key={act} align="center" sx={{ py: 1 }}>
                            <ToggleButtonGroup
                              size="small"
                              exclusive
                              value={currentVal}
                              onChange={(_, val) => val && handleSetUserCrudState(res, act, val)}
                              sx={{
                                height: 26,
                                "& .MuiToggleButton-root": {
                                  px: 1,
                                  py: 0,
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  textTransform: "none",
                                },
                              }}
                            >
                              <ToggleButton
                                value="inherit"
                                title={`Kế thừa vai trò (${baseVal ? "Có" : "Không"})`}
                              >
                                Mặc định
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
                                Cấp (+)
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
                                Chặn (-)
                              </ToggleButton>
                            </ToggleButtonGroup>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Route Overrides Table */}
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
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Ghi đè quyền truy cập màn hình & URL
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tùy chỉnh quyền truy cập URL riêng biệt cho tài khoản
              </Typography>
            </Box>

            <TableContainer sx={{ maxHeight: 380 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: isDark ? alpha("#FFFFFF", 0.02) : "#F1F5F9" }}>
                    <TableCell sx={{ fontWeight: 700, width: "38%" }}>Tên màn hình</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: "32%" }}>Đường dẫn</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, width: "30%" }}>Thiết lập ghi đè</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ALL_ROUTES.map((route) => {
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
                        <TableCell sx={{ py: 0.8 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.84rem" }}>
                            {route.label}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 0.8 }}>
                          <Typography
                            variant="caption"
                            sx={{ fontFamily: "JetBrains Mono, monospace", color: "text.secondary", fontSize: "0.75rem" }}
                          >
                            {route.path}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 0.8 }}>
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
                              Mặc định ({isBaseAllowed ? "Được" : "Chặn"})
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
                              Cấp (+)
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
                              Chặn (-)
                            </ToggleButton>
                          </ToggleButtonGroup>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Stack>
      )}
    </Stack>
  );
}
export default UserOverridesTab;
