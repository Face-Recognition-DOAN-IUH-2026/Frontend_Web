"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Avatar,
  Box,
  ButtonBase,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useAuth } from "@/lib/auth-context";
import { usePermission } from "@/lib/permission-context";
import AvatarUser from "@/app/(dashboard)/_components/ui/AvatarUser";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import BarChartIcon from "@mui/icons-material/BarChartOutlined";
import AssistantIcon from "@mui/icons-material/SupportAgentOutlined";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import BookPlusIcon from "@mui/icons-material/BookmarkAddOutlined";
import BookReturnIcon from "@mui/icons-material/AssignmentReturnOutlined";
import CalendarIcon from "@mui/icons-material/CalendarMonthOutlined";
import DashboardIcon from "@mui/icons-material/DashboardOutlined";
import DoorIcon from "@mui/icons-material/DoorFrontOutlined";
import FaceIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import HistoryIcon from "@mui/icons-material/HistoryOutlined";
import LibraryIcon from "@mui/icons-material/LocalLibraryOutlined";
import MapIcon from "@mui/icons-material/MapOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import ShieldIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import UserCheckIcon from "@mui/icons-material/HowToRegOutlined";
import UsersIcon from "@mui/icons-material/GroupsOutlined";
import SettingsIcon from "@mui/icons-material/SettingsOutlined";
import DynamicFormOutlinedIcon from "@mui/icons-material/DynamicFormOutlined";
import VisibilityIcon from "@mui/icons-material/VisibilityOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const drawerWidth = 264;

const libraryItems = [
  { href: "/dashboard", label: "Tổng quan", icon: DashboardIcon },
  { href: "/patrons", label: "Độc giả", icon: UsersIcon },
  { href: "/active", label: "Đang hiện diện", icon: BookIcon },
  { href: "/gate", label: "Cổng ra vào", icon: DoorIcon },
  { href: "/history", label: "Lịch sử ra vào", icon: HistoryIcon },
  { href: "/library/vr-tour", label: "Tham quan 3D", icon: MapIcon },
];

const circulationItems = [
  { href: "/borrow", label: "Mượn sách", icon: BookPlusIcon },
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

const staffAiItems = [
  { href: "/ai-assistant", label: "Trợ lý AI", icon: AssistantIcon },
];

interface SidebarNavItem {
  href: string;
  label: string;
  icon: any;
  permission?: string;
}

const adminItems: SidebarNavItem[] = [
  { href: "/dashboard/admin", label: "Quản trị người dùng", icon: ShieldIcon, permission: "admin:users" },
  { href: "/dynamic-admin", label: "Phân quyền động (RBAC)", icon: DynamicFormOutlinedIcon, permission: "admin:settings" },
  { href: "/settings", label: "Cài đặt hệ thống", icon: SettingsIcon, permission: "admin:settings" },
  { href: "/stats", label: "Thống kê", icon: BarChartIcon, permission: "admin:stats" },
];

function NavSection({
  title,
  items,
  onClose,
}: {
  title: string;
  items: Array<{ href: string; label: string; icon: any }>;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <Box>
      {/* Section label */}
      <Typography
        variant="overline"
        sx={{
          px: 1.5,
          fontSize: "0.68rem",
          fontWeight: 700,
          letterSpacing: "0.09em",
          color: "#D4AF37", // IUH Gold
          fontFamily: "'Space Grotesk', sans-serif",
          display: "block",
          mb: 0.5,
        }}
      >
        {title}
      </Typography>
      <List dense disablePadding>
        {items.map((item) => {
          const Icon = item.icon;
          const selected =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={selected}
              onClick={onClose}
              sx={{
                mb: 0.25,
                borderRadius: "2px",
                py: 0.8,
                px: 1.25,
                color: selected ? "#FFFFFF" : "#CBD5E1",
                transition: "all 0.15s ease",
                "&.Mui-selected": {
                  bgcolor: "rgba(212, 175, 55, 0.16)",
                  color: "#FFFFFF",
                  "& .MuiListItemIcon-root": { color: "#D4AF37" },
                  "&:hover": { bgcolor: "rgba(212, 175, 55, 0.22)" },
                  // Left accent bar
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    top: "15%",
                    bottom: "15%",
                    width: 3,
                    borderRadius: "0 2px 2px 0",
                    bgcolor: "#D4AF37", // IUH Gold
                  },
                },
                "&:hover": { bgcolor: "rgba(255, 255, 255, 0.08)", color: "#FFFFFF", "& .MuiListItemIcon-root": { color: "#FFFFFF" } },
                position: "relative",
              }}
            >
              <ListItemIcon
                sx={{ minWidth: 34, color: selected ? "#D4AF37" : "#94A3B8" }}
              >
                <Icon sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: selected ? 700 : 500, fontSize: "0.875rem" }}
                  >
                    {item.label}
                  </Typography>
                }
              />
              {selected && (
                <ChevronRightIcon sx={{ fontSize: 14, color: "#D4AF37", opacity: 0.8 }} />
              )}
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
  const router = useRouter();
  const role = user?.role || "staff";
  const isAdminOrStaff = role === "admin" || role === "staff";
  const isAdmin = role === "admin";

  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleClose = () => setMobileOpen(false);

  const isDark = theme.palette.mode === "dark";

  const { canAccessPage } = usePermission();

  const visibleLibraryItems = libraryItems.filter((item) => canAccessPage(item.href));
  const visibleCirculationItems = circulationItems.filter((item) => canAccessPage(item.href));
  const visibleStaffItems = staffItems.filter((item) => canAccessPage(item.href));
  const visibleStaffAiItems = staffAiItems.filter((item) => canAccessPage(item.href));
  const visibleAiItems = aiItems.filter((item) => canAccessPage(item.href));
  const visibleAdminItems = adminItems.filter((item) => canAccessPage(item.href));

  const drawerContent = (
    <Stack sx={{ height: "100%" }}>
      {/* ── Logo / Brand ─────────────────────────────────── */}
      <Box sx={{ px: 2, py: 2 }}>
        <ButtonBase
          component={Link}
          href="/dashboard"
          onClick={handleClose}
          sx={{ width: "100%", justifyContent: "flex-start", borderRadius: 2 }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", py: 0.5 }}>
            <Box
              component="img"
              src={isDark ? "/logo-white.png" : "/logo.png"}
              alt="IUH Logo"
              sx={{
                height: 38,
                width: "auto",
                maxWidth: 190,
                objectFit: "contain",
              }}
            />
          </Stack>
        </ButtonBase>
      </Box>

      <Divider sx={{ mx: 1.5 }} />

      {/* ── Navigation ───────────────────────────────────── */}
      <Stack
        spacing={2}
        sx={{ flex: 1, px: 1, py: 1.5, overflowY: "auto" }}
      >
        {visibleLibraryItems.length > 0 && (
          <NavSection title="Thư viện" items={visibleLibraryItems} onClose={handleClose} />
        )}
        {visibleCirculationItems.length > 0 && (
          <NavSection title="Mượn / Trả" items={visibleCirculationItems} onClose={handleClose} />
        )}
        {visibleStaffItems.length > 0 && (
          <NavSection title="Nhân sự" items={visibleStaffItems} onClose={handleClose} />
        )}
        {visibleStaffAiItems.length > 0 && (
          <NavSection title="AI" items={visibleStaffAiItems} onClose={handleClose} />
        )}
        {visibleAiItems.length > 0 && (
          <NavSection title="Chẩn đoán AI" items={visibleAiItems} onClose={handleClose} />
        )}
        {visibleAdminItems.length > 0 && (
          <NavSection title="Quản trị" items={visibleAdminItems} onClose={handleClose} />
        )}
      </Stack>

      <Divider sx={{ mx: 1.5 }} />

      {/* ── User footer ──────────────────────────────────── */}
      <Box sx={{ p: 1.25 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            px: 1,
            py: 0.75,
            borderRadius: 2,
            cursor: "pointer",
            transition: "background-color 0.15s ease",
            "&:hover": { bgcolor: "action.hover" },
          }}
          onClick={() => router.push("/profile")}
        >
          <AvatarUser user={user} size={34} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                fontSize: "0.82rem",
                color: "#FFFFFF",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.full_name || user?.email?.split("@")[0] || "Thủ thư"}
            </Typography>
            <Chip
              label={role === "admin" ? "QUẢN TRỊ VIÊN" : "THỦ THƯ TRỰC"}
              size="small"
              sx={{
                height: 18,
                fontSize: "0.62rem",
                fontWeight: 700,
                bgcolor: role === "admin" ? "#8B0000" : "rgba(212, 175, 55, 0.2)",
                color: role === "admin" ? "#FFFFFF" : "#D4AF37",
                border: "1px solid rgba(212, 175, 55, 0.4)",
                borderRadius: "2px",
                "& .MuiChip-label": { px: 0.75 },
              }}
            />
          </Box>
          <Tooltip title="Đăng xuất">
            <IconButton
              onClick={(e) => { e.stopPropagation(); logout(); }}
              size="small"
              color="error"
              sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}
            >
              <LogoutIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Stack>
  );

  if (isMobile) {
    return (
      <>
        <IconButton
          onClick={() => setMobileOpen(true)}
          sx={{
            position: "fixed",
            top: 12,
            left: 12,
            zIndex: 1400,
            bgcolor: "background.paper",
            boxShadow: "0 2px 8px rgba(30,96,145,0.12)",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <MenuIcon />
        </IconButton>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              bgcolor: "#0A2540",
              color: "#FFFFFF",
              borderRight: "1px solid rgba(255, 255, 255, 0.12)",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          bgcolor: "#0A2540",
          color: "#FFFFFF",
          borderRight: "1px solid rgba(255, 255, 255, 0.12)",
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
