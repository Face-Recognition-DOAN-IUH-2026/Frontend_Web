"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AppBar,
  Avatar,
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material";
import BellIcon from "@mui/icons-material/NotificationsOutlined";
import DarkModeIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeIcon from "@mui/icons-material/LightModeOutlined";
import UserIcon from "@mui/icons-material/PersonOutlined";
import { useAuth } from "@/lib/auth-context";
import { useColorMode } from "@/lib/mui-theme";
import Sidebar from "@/components/sidebar";

function Topbar({ user }: { user: any }) {
  const theme = useTheme();
  const { mode, toggleMode } = useColorMode();

  return (
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
        <IconButton color="inherit" title="Thông báo">
          <BellIcon fontSize="small" />
        </IconButton>
        <IconButton color="inherit" onClick={toggleMode} title={mode === "dark" ? "Chế độ sáng" : "Chế độ tối"}>
          {mode === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
        </IconButton>
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
