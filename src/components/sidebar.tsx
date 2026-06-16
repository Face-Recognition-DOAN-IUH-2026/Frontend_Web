"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Avatar,
  Box,
  ButtonBase,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChartOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import BookReturnIcon from "@mui/icons-material/AssignmentReturnOutlined";
import CalendarIcon from "@mui/icons-material/CalendarMonthOutlined";
import DashboardIcon from "@mui/icons-material/DashboardOutlined";
import DoorIcon from "@mui/icons-material/DoorFrontOutlined";
import FaceIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import HistoryIcon from "@mui/icons-material/HistoryOutlined";
import LibraryIcon from "@mui/icons-material/LocalLibraryOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import ShieldIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import UserCheckIcon from "@mui/icons-material/HowToRegOutlined";
import UsersIcon from "@mui/icons-material/GroupsOutlined";
import VisibilityIcon from "@mui/icons-material/VisibilityOutlined";
import { useAuth } from "@/lib/auth-context";

const drawerWidth = 268;

const libraryItems = [
  { href: "/dashboard", label: "Tổng quan", icon: DashboardIcon },
  { href: "/patrons", label: "Độc giả", icon: UsersIcon },
  { href: "/active", label: "Đang hiện diện", icon: BookIcon },
  { href: "/gate", label: "Cổng ra vào", icon: DoorIcon },
  { href: "/history", label: "Lịch sử ra vào", icon: HistoryIcon },
];

const circulationItems = [
  { href: "/return", label: "Trả sách", icon: BookReturnIcon },
  { href: "/books", label: "Kho sách", icon: LibraryIcon },
];

const staffItems = [
  { href: "/staff-schedules", label: "Lịch trực", icon: CalendarIcon },
];

const aiItems = [
  { href: "/enroll", label: "Đăng ký khuôn mặt", icon: FaceIcon },
  { href: "/verify", label: "Xác thực khuôn mặt", icon: UserCheckIcon },
  { href: "/identify", label: "Nhận diện", icon: SearchIcon },
  { href: "/liveness", label: "Kiểm tra sống", icon: VisibilityIcon },
];

const adminItems = [
  { href: "/ai-command-center", label: "AI Command Center", icon: AutoAwesomeIcon },
  { href: "/dashboard/admin", label: "Quản trị", icon: ShieldIcon },
  { href: "/stats", label: "Thống kê", icon: BarChartIcon },
];

function NavSection({ title, items }: { title: string; items: Array<{ href: string; label: string; icon: any }> }) {
  const pathname = usePathname();

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, fontWeight: 800, letterSpacing: 0.5 }}>
        {title}
      </Typography>
      <List dense disablePadding sx={{ mt: 0.75 }}>
        {items.map((item) => {
          const Icon = item.icon;
          const selected = pathname === item.href;
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={selected}
              sx={{
                mb: 0.5,
                borderRadius: 1,
                color: selected ? "primary.main" : "text.secondary",
                "&.Mui-selected": {
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  "& .MuiListItemIcon-root": { color: "primary.contrastText" },
                },
                "&.Mui-selected:hover": { bgcolor: "primary.dark" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: selected ? "primary.contrastText" : "text.secondary" }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" sx={{ fontWeight: selected ? 800 : 600 }}>
                    {item.label}
                  </Typography>
                }
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const role = user?.role || "staff";
  const isAdminOrStaff = role === "admin" || role === "staff";
  const isAdmin = role === "admin";

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          bgcolor: "background.paper",
          borderRight: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      <Stack sx={{ minHeight: "100%" }}>
        <Box sx={{ p: 2.25 }}>
          <ButtonBase component={Link} href="/dashboard" sx={{ width: "100%", justifyContent: "flex-start", borderRadius: 1 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Avatar sx={{ width: 42, height: 42, bgcolor: "primary.main", color: "primary.contrastText", borderRadius: 2 }}>
                <LibraryIcon />
              </Avatar>
              <Box sx={{ minWidth: 0, textAlign: "left" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900 }} noWrap>THƯ VIỆN IUH</Typography>
                <Typography variant="caption" color="text.secondary">Hệ thống quản lý</Typography>
              </Box>
            </Stack>
          </ButtonBase>
        </Box>
        <Divider />
        <Stack spacing={2.25} sx={{ flex: 1, p: 1.5, overflowY: "auto" }}>
          <NavSection title="Thư viện" items={libraryItems} />
          {isAdminOrStaff ? <NavSection title="Mượn / Trả" items={circulationItems} /> : null}
          {isAdminOrStaff ? <NavSection title="Nhân sự" items={staffItems} /> : null}
          {isAdmin ? <NavSection title="Chẩn đoán AI" items={aiItems} /> : null}
          {isAdmin ? <NavSection title="Quản trị" items={adminItems} /> : null}
        </Stack>
        <Divider />
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", p: 1.5 }}>
          <Avatar sx={{ width: 38, height: 38, bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 900 }}>
            {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>{user?.full_name || user?.email?.split("@")[0] || "Người dùng"}</Typography>
            <Typography variant="caption" color="text.secondary">{role === "admin" ? "Quản trị viên" : "Nhân viên"}</Typography>
          </Box>
          <IconButton onClick={logout} title="Đăng xuất" color="error" size="small">
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
    </Drawer>
  );
}
