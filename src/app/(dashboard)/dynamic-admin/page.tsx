"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import { useToast } from "@/lib/toast-context";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import RuleOutlinedIcon from "@mui/icons-material/RuleOutlined";
import KeyOutlinedIcon from "@mui/icons-material/KeyOutlined";
import CodeOutlinedIcon from "@mui/icons-material/CodeOutlined";

import { useAuth } from "@/lib/auth-context";
import { usePermission } from "@/lib/permission-context";
import api, { getErrorMessage } from "@/lib/api-client";
import {
  ALL_RESOURCES,
  ALL_ACTIONS,
  ALL_ROUTES,
  type SystemResource,
  type CrudAction,
  type RolePermissionConfig,
  type UserPermissionOverride,
  type EffectivePermissions,
  type ScheduleStaff,
} from "@/lib/types";

import {
  RolePermissionsTab,
  UserOverridesTab,
  EffectiveInspectorTab,
  NewRoleDialog,
} from "../_components/dynamic-admin";

// Default fallback role matrix if backend is offline or booting
const DEFAULT_FALLBACK_ROLES: Record<string, RolePermissionConfig> = {
  admin: {
    role: "admin",
    label: "Quản trị viên (Admin)",
    description: "Toàn quyền truy cập mọi trang và thực hiện mọi thao tác",
    allowedPages: ALL_ROUTES.map((r) => r.path),
    crud: {
      books: { create: true, read: true, update: true, delete: true, approve: true, print: true },
      patrons: { create: true, read: true, update: true, delete: true, approve: true, print: true },
      borrows: { create: true, read: true, update: true, delete: true, approve: true, print: true },
      schedules: { create: true, read: true, update: true, delete: true, approve: true, print: true },
      ai_tools: { create: true, read: true, update: true, delete: true, approve: true, print: true },
      settings: { create: true, read: true, update: true, delete: true, approve: true, print: true },
      stats: { create: true, read: true, update: true, delete: true, approve: true, print: true },
    },
  },
  staff: {
    role: "staff",
    label: "Thủ thư / Nhân viên",
    description: "Quản lý mượn trả, độc giả, kho sách; không được xóa tài nguyên/cài đặt",
    allowedPages: [
      "/dashboard",
      "/books",
      "/patrons",
      "/borrow",
      "/return",
      "/gate",
      "/history",
      "/active",
      "/staff-schedules",
      "/ai-assistant",
      "/enroll",
      "/verify",
      "/identify",
      "/liveness",
      "/library/vr-tour",
      "/profile",
      "/notifications",
      "/stats",
    ],
    crud: {
      books: { create: true, read: true, update: true, delete: false, approve: false, print: true },
      patrons: { create: true, read: true, update: true, delete: false, approve: true, print: true },
      borrows: { create: true, read: true, update: true, delete: false, approve: true, print: true },
      schedules: { create: false, read: true, update: false, delete: false, approve: false, print: true },
      ai_tools: { create: true, read: true, update: true, delete: false, approve: false, print: false },
      settings: { create: false, read: false, update: false, delete: false, approve: false, print: false },
      stats: { create: false, read: true, update: false, delete: false, approve: false, print: true },
    },
  },
  viewer: {
    role: "viewer",
    label: "Người quan sát (Viewer)",
    description: "Chỉ xem dữ liệu thống kê và lịch sử ra vào",
    allowedPages: ["/dashboard", "/history", "/stats"],
    crud: {
      books: { create: false, read: true, update: false, delete: false, approve: false, print: false },
      patrons: { create: false, read: true, update: false, delete: false, approve: false, print: false },
      borrows: { create: false, read: true, update: false, delete: false, approve: false, print: false },
      schedules: { create: false, read: true, update: false, delete: false, approve: false, print: false },
      ai_tools: { create: false, read: false, update: false, delete: false, approve: false, print: false },
      settings: { create: false, read: false, update: false, delete: false, approve: false, print: false },
      stats: { create: false, read: true, update: false, delete: false, approve: false, print: false },
    },
  },
};

export default function DynamicAdminPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;
  const { user } = useAuth();
  const { refreshPermissions } = usePermission();

  const [activeTab, setActiveTab] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [routeSearch, setRouteSearch] = useState<string>("");
  const [routeFilter, setRouteFilter] = useState<"all" | "allowed" | "blocked">("all");

  const { toast } = useToast();
  const setToast = useCallback(
    (opt: { open?: boolean; message: string; severity?: "success" | "error" | "info" | "warning" }) => {
      if (opt.open !== false) {
        toast(opt.message, opt.severity || "info");
      }
    },
    [toast]
  );

  // Role Matrix State
  const [roles, setRoles] = useState<Record<string, RolePermissionConfig>>(DEFAULT_FALLBACK_ROLES);
  const [selectedRole, setSelectedRole] = useState<string>("staff");

  // Custom Role Modal State
  const [openNewRoleModal, setOpenNewRoleModal] = useState<boolean>(false);
  const [newRoleName, setNewRoleName] = useState<string>("");
  const [newRoleLabel, setNewRoleLabel] = useState<string>("");

  // User Overrides State
  const [staffList, setStaffList] = useState<ScheduleStaff[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userOverride, setUserOverride] = useState<UserPermissionOverride>({
    enabled: false,
    grantedPages: [],
    revokedPages: [],
    grantedCrud: {},
    revokedCrud: {},
  });

  // Load initial data: Role matrix & Staff list
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      try {
        const matrixRes = await api.getPermissionMatrix();
        if (matrixRes && matrixRes.roles) {
          setRoles(matrixRes.roles);
        }
      } catch (err: any) {
        console.warn("[DynamicAdmin] Could not load permission matrix from API, using defaults:", err?.message);
      }

      try {
        const staffRes = await api.getScheduleStaffOptions();
        if (Array.isArray(staffRes) && staffRes.length > 0) {
          setStaffList(staffRes);
          setSelectedUserId(staffRes[0].id);
        }
      } catch (err: any) {
        console.warn("[DynamicAdmin] Could not load staff list:", err?.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load user override when selectedUserId changes
  useEffect(() => {
    if (!selectedUserId) return;
    let isCancelled = false;

    const fetchOverride = async () => {
      try {
        const res = await api.getUserPermissionOverride(selectedUserId);
        if (!isCancelled) {
          setUserOverride(
            res || {
              enabled: false,
              grantedPages: [],
              revokedPages: [],
              grantedCrud: {},
              revokedCrud: {},
            }
          );
        }
      } catch {
        if (!isCancelled) {
          setUserOverride({
            enabled: false,
            grantedPages: [],
            revokedPages: [],
            grantedCrud: {},
            revokedCrud: {},
          });
        }
      }
    };

    fetchOverride();
    return () => {
      isCancelled = true;
    };
  }, [selectedUserId]);

  const activeRoleConfig = useMemo(() => {
    return (
      roles[selectedRole] || {
        role: selectedRole,
        label: selectedRole,
        allowedPages: [],
        crud: {
          books: { create: false, read: true, update: false, delete: false },
          patrons: { create: false, read: false, update: false, delete: false },
          borrows: { create: false, read: false, update: false, delete: false },
          schedules: { create: false, read: false, update: false, delete: false },
          ai_tools: { create: false, read: false, update: false, delete: false },
          settings: { create: false, read: false, update: false, delete: false },
          stats: { create: false, read: false, update: false, delete: false },
        },
      }
    );
  }, [roles, selectedRole]);

  // ROLE CONFIG HANDLERS
  const handleToggleRouteForRole = (path: string) => {
    if (selectedRole === "admin") return;

    setRoles((prev) => {
      const current = prev[selectedRole] || activeRoleConfig;
      const pages = new Set(current.allowedPages);
      if (pages.has(path)) {
        pages.delete(path);
      } else {
        pages.add(path);
      }
      return {
        ...prev,
        [selectedRole]: {
          ...current,
          allowedPages: Array.from(pages),
        },
      };
    });
  };

  const handleToggleAllRoutesForRole = (enableAll: boolean) => {
    if (selectedRole === "admin") return;

    setRoles((prev) => {
      const current = prev[selectedRole] || activeRoleConfig;
      return {
        ...prev,
        [selectedRole]: {
          ...current,
          allowedPages: enableAll ? ALL_ROUTES.map((r) => r.path) : ["/dashboard"],
        },
      };
    });
  };

  const handleToggleCategoryRoutesForRole = (category: string, enableAll: boolean) => {
    if (selectedRole === "admin") return;

    const categoryPaths = ALL_ROUTES.filter((r) => r.category === category).map((r) => r.path);
    setRoles((prev) => {
      const current = prev[selectedRole] || activeRoleConfig;
      const currentPages = new Set(current.allowedPages || []);
      categoryPaths.forEach((p) => {
        if (p === "/dashboard") return;
        if (enableAll) currentPages.add(p);
        else currentPages.delete(p);
      });
      return {
        ...prev,
        [selectedRole]: {
          ...current,
          allowedPages: Array.from(currentPages),
        },
      };
    });
  };

  const handleToggleCrudForRole = (resource: SystemResource, action: CrudAction) => {
    if (selectedRole === "admin") return;

    setRoles((prev) => {
      const current = prev[selectedRole] || activeRoleConfig;
      const currentVal = Boolean(current.crud?.[resource]?.[action]);
      return {
        ...prev,
        [selectedRole]: {
          ...current,
          crud: {
            ...current.crud,
            [resource]: {
              ...current.crud[resource],
              [action]: !currentVal,
            },
          },
        },
      };
    });
  };

  const handleSetResourcePresetForRole = (resource: SystemResource, preset: "full" | "readonly") => {
    if (selectedRole === "admin") return;

    setRoles((prev) => {
      const current = prev[selectedRole] || activeRoleConfig;
      const newPerms =
        preset === "full"
          ? { create: true, read: true, update: true, delete: true, approve: true, print: true }
          : { create: false, read: true, update: false, delete: false, approve: false, print: false };
      return {
        ...prev,
        [selectedRole]: {
          ...current,
          crud: {
            ...current.crud,
            [resource]: newPerms,
          },
        },
      };
    });
  };

  const handleApplyRoleTemplate = (template: "circulation" | "cataloging" | "assistant") => {
    if (selectedRole === "admin") return;

    setRoles((prev) => {
      const current = prev[selectedRole] || activeRoleConfig;
      let allowedPages: string[] = [];
      const crud: Record<SystemResource, any> = {
        books: { create: false, read: true, update: false, delete: false, approve: false, print: false },
        patrons: { create: false, read: true, update: false, delete: false, approve: false, print: false },
        borrows: { create: false, read: true, update: false, delete: false, approve: false, print: false },
        schedules: { create: false, read: true, update: false, delete: false, approve: false, print: false },
        ai_tools: { create: false, read: true, update: false, delete: false, approve: false, print: false },
        settings: { create: false, read: false, update: false, delete: false, approve: false, print: false },
        stats: { create: false, read: false, update: false, delete: false, approve: false, print: false },
      };

      if (template === "circulation") {
        allowedPages = [
          "/dashboard",
          "/patrons",
          "/active",
          "/gate",
          "/history",
          "/borrow",
          "/return",
          "/books",
          "/staff-schedules",
          "/profile",
          "/notifications",
        ];
        crud.borrows = { create: true, read: true, update: true, delete: false, approve: true, print: true };
        crud.patrons = { create: true, read: true, update: true, delete: false, approve: true, print: true };
        crud.books = { create: false, read: true, update: false, delete: false, approve: false, print: true };
        crud.schedules = { create: false, read: true, update: false, delete: false, approve: false, print: false };
      } else if (template === "cataloging") {
        allowedPages = [
          "/dashboard",
          "/books",
          "/patrons",
          "/stats",
          "/profile",
          "/notifications",
        ];
        crud.books = { create: true, read: true, update: true, delete: true, approve: true, print: true };
        crud.patrons = { create: false, read: true, update: false, delete: false, approve: false, print: false };
        crud.borrows = { create: false, read: true, update: false, delete: false, approve: false, print: false };
        crud.stats = { create: false, read: true, update: false, delete: false, approve: false, print: true };
      } else if (template === "assistant") {
        allowedPages = [
          "/dashboard",
          "/borrow",
          "/return",
          "/gate",
          "/history",
          "/active",
          "/profile",
        ];
        crud.borrows = { create: true, read: true, update: false, delete: false, approve: false, print: false };
        crud.books = { create: false, read: true, update: false, delete: false, approve: false, print: false };
        crud.patrons = { create: false, read: true, update: false, delete: false, approve: false, print: false };
      }

      return {
        ...prev,
        [selectedRole]: {
          ...current,
          allowedPages,
          crud,
        },
      };
    });

    const labelMap = {
      circulation: "Thủ thư Quầy Lưu hành",
      cataloging: "Thủ thư Kho & Biên mục",
      assistant: "Cộng tác viên Sinh viên",
    };

    setToast({
      open: true,
      message: `Đã áp dụng mẫu [${labelMap[template]}]! Nhấn nút 'Lưu quyền chức vụ' để lưu vĩnh viễn.`,
      severity: "info",
    });
  };

  const handleSaveRoleConfig = async () => {
    if (selectedRole === "admin") return;
    setSaving(true);
    try {
      const configToSave = roles[selectedRole];
      await api.updateRolePermissions(selectedRole, configToSave);
      await refreshPermissions();
      setToast({
        open: true,
        message: `Đã lưu thành công cấu hình phân quyền vai trò [${configToSave.label || selectedRole}]!`,
        severity: "success",
      });
    } catch (err: any) {
      setToast({
        open: true,
        message: getErrorMessage(err) || "Không thể lưu cấu hình vai trò",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCustomRole = async () => {
    if (!newRoleName.trim() || !newRoleLabel.trim()) {
      setToast({
        open: true,
        message: "Vui lòng nhập mã vai trò và tên hiển thị",
        severity: "error",
      });
      return;
    }

    const cleanRoleKey = newRoleName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (roles[cleanRoleKey]) {
      setToast({
        open: true,
        message: `Mã vai trò "${cleanRoleKey}" đã tồn tại!`,
        severity: "error",
      });
      return;
    }

    const baseCrud: Record<SystemResource, any> = {} as any;
    ALL_RESOURCES.forEach((r) => {
      baseCrud[r] = { create: false, read: true, update: false, delete: false };
    });

    const newRoleObj: RolePermissionConfig = {
      role: cleanRoleKey,
      label: newRoleLabel.trim(),
      description: "Vai trò tùy biến người dùng tạo",
      allowedPages: ["/dashboard"],
      crud: baseCrud,
    };

    setRoles((prev) => ({
      ...prev,
      [cleanRoleKey]: newRoleObj,
    }));
    setSelectedRole(cleanRoleKey);
    setOpenNewRoleModal(false);
    setNewRoleName("");
    setNewRoleLabel("");

    setToast({
      open: true,
      message: `Đã tạo vai trò [${newRoleObj.label}]. Hãy cấu hình quyền và bấm Lưu!`,
      severity: "success",
    });
  };

  // USER OVERRIDE HANDLERS
  const selectedStaffMember = useMemo(() => {
    return staffList.find((s) => s.id === selectedUserId) || null;
  }, [staffList, selectedUserId]);

  const handleToggleUserOverrideEnabled = (enabled: boolean) => {
    setUserOverride((prev) => ({
      ...prev,
      enabled,
    }));
  };

  const handleSetUserRouteState = (path: string, state: "inherit" | "grant" | "revoke") => {
    setUserOverride((prev) => {
      const granted = new Set(prev.grantedPages || []);
      const revoked = new Set(prev.revokedPages || []);

      if (state === "inherit") {
        granted.delete(path);
        revoked.delete(path);
      } else if (state === "grant") {
        granted.add(path);
        revoked.delete(path);
      } else if (state === "revoke") {
        granted.delete(path);
        revoked.add(path);
      }

      return {
        ...prev,
        grantedPages: Array.from(granted),
        revokedPages: Array.from(revoked),
      };
    });
  };

  const handleSetUserCrudState = (
    resource: SystemResource,
    action: CrudAction,
    state: "inherit" | "grant" | "revoke"
  ) => {
    setUserOverride((prev) => {
      const grantedCrud = { ...(prev.grantedCrud || {}) };
      const revokedCrud = { ...(prev.revokedCrud || {}) };

      const resGranted = { ...(grantedCrud[resource] || {}) };
      const resRevoked = { ...(revokedCrud[resource] || {}) };

      if (state === "inherit") {
        delete resGranted[action];
        delete resRevoked[action];
      } else if (state === "grant") {
        resGranted[action] = true;
        delete resRevoked[action];
      } else if (state === "revoke") {
        delete resGranted[action];
        resRevoked[action] = true;
      }

      grantedCrud[resource] = resGranted;
      revokedCrud[resource] = resRevoked;

      return {
        ...prev,
        grantedCrud,
        revokedCrud,
      };
    });
  };

  const handleSaveUserOverride = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      await api.updateUserPermissionOverride(selectedUserId, userOverride);
      await refreshPermissions();
      setToast({
        open: true,
        message: `Đã lưu thành công cấu hình quyền cho tài khoản [${selectedStaffMember?.fullName || selectedUserId}]!`,
        severity: "success",
      });
    } catch (err: any) {
      setToast({
        open: true,
        message: getErrorMessage(err) || "Lỗi lưu cấu hình cá nhân",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetUserOverride = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      const emptyOverride: UserPermissionOverride = {
        enabled: false,
        grantedPages: [],
        revokedPages: [],
        grantedCrud: {},
        revokedCrud: {},
      };
      await api.updateUserPermissionOverride(selectedUserId, emptyOverride);
      setUserOverride(emptyOverride);
      await refreshPermissions();
      setToast({
        open: true,
        message: "Đã hủy bỏ phân quyền riêng, tài khoản trở về quyền mặc định theo vai trò!",
        severity: "info",
      });
    } catch (err: any) {
      setToast({
        open: true,
        message: getErrorMessage(err) || "Lỗi khôi phục quyền",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // LIVE EFFECTIVE PERMISSIONS CALCULATION (FOR INSPECTOR TAB)
  const effectivePermissionsPreview: EffectivePermissions = useMemo(() => {
    const baseRole = selectedStaffMember?.role || selectedRole;
    const baseConfig = roles[baseRole] || roles["staff"] || DEFAULT_FALLBACK_ROLES.staff;

    if (baseRole === "admin") {
      return {
        role: "admin",
        isCustom: false,
        allowedPages: ALL_ROUTES.map((r) => r.path),
        crud: DEFAULT_FALLBACK_ROLES.admin.crud,
      };
    }

    if (!userOverride || !userOverride.enabled) {
      return {
        role: baseRole,
        isCustom: false,
        allowedPages: [...baseConfig.allowedPages],
        crud: JSON.parse(JSON.stringify(baseConfig.crud)),
      };
    }

    const pages = new Set(baseConfig.allowedPages);
    (userOverride.grantedPages || []).forEach((p) => pages.add(p));
    (userOverride.revokedPages || []).forEach((p) => pages.delete(p));

    const finalCrud: Record<SystemResource, any> = JSON.parse(JSON.stringify(baseConfig.crud));

    ALL_RESOURCES.forEach((res) => {
      ALL_ACTIONS.forEach((act) => {
        if (userOverride.grantedCrud?.[res]?.[act] === true) {
          finalCrud[res][act] = true;
        }
        if (userOverride.revokedCrud?.[res]?.[act] === true) {
          finalCrud[res][act] = false;
        }
      });
    });

    return {
      role: baseRole,
      isCustom: true,
      allowedPages: Array.from(pages),
      crud: finalCrud,
    };
  }, [selectedStaffMember, selectedRole, roles, userOverride]);

  // Filtered routes list for quick table review
  const filteredRoutes = useMemo(() => {
    return ALL_ROUTES.filter((r) => {
      const matchSearch =
        r.label.toLowerCase().includes(routeSearch.toLowerCase()) ||
        r.path.toLowerCase().includes(routeSearch.toLowerCase());
      if (!matchSearch) return false;

      const isAllowed =
        selectedRole === "admin" || (activeRoleConfig.allowedPages || []).includes(r.path);

      if (routeFilter === "allowed") return isAllowed;
      if (routeFilter === "blocked") return !isAllowed;
      return true;
    });
  }, [routeSearch, routeFilter, selectedRole, activeRoleConfig]);

  return (
    <Box sx={{ width: "100%", maxWidth: 1440, mx: "auto", pb: 5 }}>
      {/* ── TOP OPERATIONAL ACTION HEADER ─────────────────────────────────── */}
      <PageHeader
        icon={ShieldOutlinedIcon}
        title="Phân Quyền & Quản Lý Vai Trò"
        subtitle="Cấu hình ma trận phân quyền theo chức vụ (Role-based) và cấp đặc quyền cá nhân (User Overrides)"
        onRefresh={loadData}
        actions={
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            {activeTab === 0 ? (
              <Button
                size="medium"
                variant="contained"
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
                onClick={handleSaveRoleConfig}
                disabled={saving || selectedRole === "admin"}
                sx={{
                  borderRadius: 1.5,
                  textTransform: "none",
                  fontWeight: 700,
                  px: 2.5,
                }}
              >
                {saving ? "Đang lưu..." : `Lưu quyền [${activeRoleConfig.label}]`}
              </Button>
            ) : activeTab === 1 ? (
              <Button
                size="medium"
                variant="contained"
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
                onClick={handleSaveUserOverride}
                disabled={saving || !userOverride.enabled}
                sx={{
                  borderRadius: 1.5,
                  textTransform: "none",
                  fontWeight: 700,
                  px: 2.5,
                }}
              >
                {saving ? "Đang lưu..." : "Lưu quyền riêng nhân viên"}
              </Button>
            ) : null}
          </Stack>
        }
      />

      {/* ── WORKSPACE TABS SELECTOR (DATA-FIRST SEGMENTED PILLS) ───────── */}
      <Paper
        variant="outlined"
        sx={{
          p: 0.75,
          borderRadius: 2.5,
          borderColor: "divider",
          bgcolor: isDark ? "background.paper" : "#F8FAFC",
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 3,
          overflowX: "auto",
        }}
      >
        {[
          {
            label: "Phân quyền theo Chức vụ",
            icon: <RuleOutlinedIcon fontSize="small" />,
            badge: `${Object.keys(roles).length} vị trí`,
          },
          {
            label: "Đặc quyền riêng Nhân viên",
            icon: <KeyOutlinedIcon fontSize="small" />,
            badge: `${staffList.length} nhân sự`,
          },
          {
            label: "Kiểm tra Quyền Thực tế",
            icon: <CodeOutlinedIcon fontSize="small" />,
            badge: userOverride.enabled ? "Đặc quyền bật" : "Chuẩn chức vụ",
          },
        ].map((tab, idx) => {
          const isSelected = activeTab === idx;
          return (
            <Button
              key={idx}
              variant={isSelected ? "contained" : "text"}
              color={isSelected ? "primary" : "inherit"}
              startIcon={tab.icon}
              onClick={() => setActiveTab(idx)}
              sx={{
                flex: { xs: "none", sm: 1 },
                minWidth: { xs: 200, sm: 0 },
                py: 1.2,
                px: 2,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: isSelected ? 800 : 600,
                fontSize: "0.86rem",
                boxShadow: isSelected
                  ? isDark
                    ? "0 2px 8px rgba(0,0,0,0.4)"
                    : "0 2px 8px rgba(139,0,0,0.2)"
                  : "none",
                bgcolor: isSelected ? primaryColor : "transparent",
                color: isSelected ? "#FFFFFF" : "text.secondary",
                "&:hover": {
                  bgcolor: isSelected ? primaryColor : alpha(primaryColor, 0.08),
                  color: isSelected ? "#FFFFFF" : "text.primary",
                },
                transition: "all 0.2s ease",
                justifyContent: "center",
              }}
            >
              <span>{tab.label}</span>
              <Chip
                size="small"
                label={tab.badge}
                sx={{
                  ml: 1,
                  height: 20,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  bgcolor: isSelected
                    ? alpha("#FFFFFF", 0.22)
                    : isDark
                    ? alpha("#FFFFFF", 0.08)
                    : "#E2E8F0",
                  color: isSelected ? "#FFFFFF" : "text.secondary",
                  borderRadius: 1,
                  pointerEvents: "none",
                }}
              />
            </Button>
          );
        })}
      </Paper>

      {/* ── TAB CONTENT ───────────────────────────────────────────────────── */}
      {loading ? (
        <Stack spacing={2} sx={{ py: 2 }}>
          <Skeleton variant="rounded" height={60} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rounded" height={320} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rounded" height={320} sx={{ borderRadius: 2 }} />
        </Stack>
      ) : (
        <>
          {/* TAB 0: ROLE MATRIX (BY ROLE) */}
          {activeTab === 0 && (
            <RolePermissionsTab
              roles={roles}
              selectedRole={selectedRole}
              setSelectedRole={setSelectedRole}
              activeRoleConfig={activeRoleConfig}
              filteredRoutes={filteredRoutes}
              routeSearch={routeSearch}
              setRouteSearch={setRouteSearch}
              routeFilter={routeFilter}
              setRouteFilter={setRouteFilter}
              handleToggleRouteForRole={handleToggleRouteForRole}
              handleToggleAllRoutesForRole={handleToggleAllRoutesForRole}
              handleToggleCategoryRoutesForRole={handleToggleCategoryRoutesForRole}
              handleToggleCrudForRole={handleToggleCrudForRole}
              handleSetResourcePresetForRole={handleSetResourcePresetForRole}
              handleSaveRoleConfig={handleSaveRoleConfig}
              handleApplyRoleTemplate={handleApplyRoleTemplate}
              saving={saving}
              setOpenNewRoleModal={setOpenNewRoleModal}
            />
          )}

          {/* TAB 1: USER OVERRIDES */}
          {activeTab === 1 && (
            <UserOverridesTab
              staffList={staffList}
              selectedUserId={selectedUserId}
              setSelectedUserId={setSelectedUserId}
              selectedStaffMember={selectedStaffMember}
              userOverride={userOverride}
              roles={roles}
              handleToggleUserOverrideEnabled={handleToggleUserOverrideEnabled}
              handleSetUserRouteState={handleSetUserRouteState}
              handleSetUserCrudState={handleSetUserCrudState}
              handleSaveUserOverride={handleSaveUserOverride}
              handleResetUserOverride={handleResetUserOverride}
              saving={saving}
            />
          )}

          {/* TAB 2: LIVE EFFECTIVE INSPECTOR */}
          {activeTab === 2 && (
            <EffectiveInspectorTab
              effectivePermissionsPreview={effectivePermissionsPreview}
              setToast={setToast}
            />
          )}
        </>
      )}

      {/* ── CREATE CUSTOM ROLE MODAL ──────────────────────────────────────── */}
      <NewRoleDialog
        open={openNewRoleModal}
        onClose={() => setOpenNewRoleModal(false)}
        newRoleName={newRoleName}
        setNewRoleName={setNewRoleName}
        newRoleLabel={newRoleLabel}
        setNewRoleLabel={setNewRoleLabel}
        onCreate={handleCreateCustomRole}
      />

    </Box>
  );
}
