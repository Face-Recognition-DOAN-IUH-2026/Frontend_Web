"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import BellIcon from "@mui/icons-material/NotificationsOutlined";
import Brightness6Icon from "@mui/icons-material/Brightness6Outlined";
import DarkModeIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeIcon from "@mui/icons-material/LightModeOutlined";
import UserIcon from "@mui/icons-material/PersonOutlined";
import { useAuth } from "@/lib/auth-context";
import { useColorMode } from "@/lib/mui-theme";
import api from "@/lib/api-client";
import Sidebar from "@/app/(dashboard)/_components/Sidebar";
import NotificationDropdown from "@/app/(dashboard)/_components/ui/NotificationDropdown";
import AvatarUser from "@/app/(dashboard)/_components/ui/AvatarUser";
import BreadcrumbsNav from "@/app/(dashboard)/_components/ui/BreadcrumbsNav";

function Topbar({ user }: { user: any }) {
  const theme = useTheme();
  const { mode, effectiveMode, preference, reducedMotion, toggleMode } = useColorMode();
  const [bellAnchorEl, setBellAnchorEl] = useState<HTMLElement | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const bellOpen = Boolean(bellAnchorEl);

  const modeIcon = useMemo(() => {
    if (preference === "auto") return <Brightness6Icon fontSize="small" />;
    return preference === "dark" ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />;
  }, [preference]);

  const modeTooltip = useMemo(() => {
    if (reducedMotion === "reduce") return "Chế độ hiển thị (Đã bật giảm chuyển động)";
    if (preference === "auto") return `Chế độ tự động (${effectiveMode === "dark" ? "Tối" : "Sáng"}) - Nhấn để thay đổi`;
    if (preference === "dark") return "Chế độ tối - Nhấn để chuyển";
    return "Chế độ sáng - Nhấn để chuyển";
  }, [preference, effectiveMode, reducedMotion]);

  useEffect(() => {
    let mounted = true;

    const fetchCount = async () => {
      try {
        const { count } = await api.getUnreadCount();
        if (mounted) setUnreadCount(count);
      } catch {
        // silently fail
      }
    };

    fetchCount();

    // Poll every 30 seconds as fallback
    const interval = setInterval(fetchCount, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleBellClick = (event: React.MouseEvent<HTMLElement>) => {
    if (bellAnchorEl) {
      setBellAnchorEl(null);
    } else {
      setBellAnchorEl(event.currentTarget);
    }
  };

  const handleBellClose = () => {
    setBellAnchorEl(null);
    // Refresh count after closing
    api.getUnreadCount().then(({ count }) => setUnreadCount(count)).catch(() => {});
  };

  return (
    <>
      <AppBar
        position="sticky"
        color="default"
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          borderTop: `3px solid ${theme.palette.primary.main}`, // IUH Red Brand Accent Stripe
          bgcolor: "background.paper",
          color: "text.primary",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", gap: 1.5, minHeight: 64, pl: { xs: 6.5, md: 3 }, pr: { xs: 2, md: 3 } }}>
          {/* IUH Academic Branding Title */}
          <Stack direction="row" spacing={1.5} sx={{ display: { xs: "none", md: "flex" }, alignItems: "center" }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: theme.palette.primary.main,
              }}
            />
            <Typography
              variant="subtitle2"
              sx={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                letterSpacing: "0.02em",
                color: "text.primary",
                fontSize: "0.88rem",
              }}
            >
              TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP TP.HCM • TRẠM THỦ THƯ
            </Typography>
            <Chip
              label="HỌC THUẬT & KỸ THUẬT"
              size="small"
              sx={{
                height: 20,
                fontSize: "0.65rem",
                fontWeight: 700,
                borderRadius: "2px",
                bgcolor: alpha(theme.palette.secondary.main, 0.12),
                color: theme.palette.mode === "dark" ? theme.palette.secondary.light : theme.palette.secondary.dark,
                border: `1px solid ${alpha(theme.palette.secondary.main, 0.35)}`,
              }}
            />
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box sx={{ position: "relative" }}>
            <Tooltip title="Thông báo">
              <IconButton color="inherit" onClick={handleBellClick}>
                <Badge badgeContent={unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : 0} color="error" invisible={unreadCount === 0}>
                  <BellIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>
            <NotificationDropdown anchorEl={bellAnchorEl} open={bellOpen} onClose={handleBellClose} />
          </Box>
          <Tooltip title={modeTooltip} arrow>
            <IconButton color="inherit" onClick={toggleMode}>
              {modeIcon}
            </IconButton>
          </Tooltip>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", pl: 1.5, borderLeft: `1px solid ${theme.palette.divider}` }}>
            <AvatarUser user={user} size={34} />
            <Box sx={{ display: { xs: "none", sm: "block" }, minWidth: 0, maxWidth: 160 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.full_name || "Admin"}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.role || "staff"}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Toolbar>
    </AppBar>
    </>
  );
}

import { PermissionProvider, usePermission } from "@/lib/permission-context";
import { usePathname } from "next/navigation";
import { Button } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { canAccessPage, loading, permissions } = usePermission();
  const pathname = usePathname();
  const router = useRouter();

  const isAllowed = canAccessPage(pathname);

  if (loading && !permissions) {
    return (
      <Box sx={{ flex: 1, display: "grid", placeItems: "center", minHeight: 300 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!isAllowed) {
    return (
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 4,
          textAlign: "center",
          bgcolor: "background.paper",
          borderRadius: 3,
          border: 1,
          borderColor: "divider",
          my: "auto",
        }}
      >
        <Avatar
          sx={{
            width: 56,
            height: 56,
            bgcolor: "error.light",
            color: "error.main",
            mb: 2,
          }}
        >
          <LockOutlinedIcon fontSize="large" />
        </Avatar>
        <Typography variant="h5" color="error.main" gutterBottom sx={{ fontWeight: 700 }}>
          Truy cập bị từ chối (403 Forbidden)
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500 }}>
          Tài khoản của bạn chưa được cấp quyền truy cập trang này (<code>{pathname}</code>). Vui lòng liên hệ Quản trị viên để được cấp quyền.
        </Typography>
        <Button
          variant="contained"
          onClick={() => router.push("/dashboard")}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          Quay lại Bảng điều khiển
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "grid", placeItems: "center" }}>
        <Stack spacing={2} sx={{ alignItems: "center" }}>
          <CircularProgress color="primary" />
          <Typography variant="body2" color="text.secondary">Đang tải...</Typography>
        </Stack>
      </Box>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <PermissionProvider>
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
        <Sidebar />
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <Topbar user={user} />
          <Box component="main" sx={{ flex: 1, display: "flex", flexDirection: "column", p: { xs: 2, md: 3 } }}>
            <BreadcrumbsNav />
            <DashboardGuard>{children}</DashboardGuard>
          </Box>
        </Box>
      </Box>
    </PermissionProvider>
  );
}
