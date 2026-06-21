"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import BellIcon from "@mui/icons-material/NotificationsOutlined";
import Brightness6Icon from "@mui/icons-material/Brightness6Outlined";
import DarkModeIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeIcon from "@mui/icons-material/LightModeOutlined";
import UserIcon from "@mui/icons-material/PersonOutlined";
import { useAuth } from "@/lib/auth-context";
import { useColorMode } from "@/lib/mui-theme";
import api from "@/lib/api-client";
import Sidebar from "@/components/sidebar";
import NotificationDropdown from "@/components/ui/NotificationDropdown";

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
        const count = await api.getUnreadCount();
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
    api.getUnreadCount().then((count) => setUnreadCount(count)).catch(() => {});
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
          bgcolor: "background.paper",
        }}
      >
        <Toolbar sx={{ justifyContent: "flex-end", gap: 1.5, minHeight: 64 }}>
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
            <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.main", color: "primary.contrastText" }}>
              <UserIcon fontSize="small" />
            </Avatar>
            <Box sx={{ display: { xs: "none", sm: "block" }, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                {user?.full_name || "Admin"}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize" }}>
                {user?.role || "staff"}
              </Typography>
            </Box>
          </Stack>
        </Toolbar>
      </AppBar>
    </>
  );
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
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Sidebar />
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Topbar user={user} />
        <Box component="main" sx={{ p: { xs: 2, md: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
