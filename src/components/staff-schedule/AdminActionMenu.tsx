"use client";

import { useState } from "react";
import { Box, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Typography } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import SettingsIcon from "@mui/icons-material/SettingsOutlined";
import GroupIcon from "@mui/icons-material/GroupsOutlined";
import LeaveIcon from "@mui/icons-material/BeachAccessOutlined";
import ActiveIcon from "@mui/icons-material/CheckCircleOutlined";
import MapIcon from "@mui/icons-material/PinDropOutlined";
import HistoryIcon from "@mui/icons-material/HistoryOutlined";
import TotalIcon from "@mui/icons-material/AssignmentOutlined";
import CheckInIcon from "@mui/icons-material/AssignmentIndOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

interface AdminActionMenuProps {
  pendingBidCount: number;
  pendingSwapCount: number;
  pendingManualCount: number;
  onAutoSchedule: () => void;
  onTemplates: () => void;
  onDeleteWeek: () => void;
  onLeaveApproval: () => void;
  onBidsReview: () => void;
  onSwapsView: () => void;
  onManualCheckIn: () => void;
  onManagement: () => void;
  onGeofence: () => void;
  onAuditLogs: () => void;
}

interface MenuGroup {
  id: string;
  label: string;
  color: string;
  borderColor: string;
  hoverBg: string;
  icon: React.ReactNode;
  badge?: number;
  items: Array<{ label: string; icon: React.ReactNode; onClick: () => void; badge?: number }>;
}

export default function AdminActionMenu({
  pendingBidCount, pendingSwapCount, pendingManualCount,
  onAutoSchedule, onTemplates, onDeleteWeek,
  onLeaveApproval, onBidsReview, onSwapsView, onManualCheckIn,
  onManagement, onGeofence, onAuditLogs,
}: AdminActionMenuProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const totalPending = pendingBidCount + pendingSwapCount + pendingManualCount;

  const menus: MenuGroup[] = [
    {
      id: "schedule",
      label: "Xếp lịch",
      color: "#f59e0b",
      borderColor: "rgba(245,158,11,0.3)",
      hoverBg: "rgba(245,158,11,0.1)",
      icon: <AutoAwesomeIcon fontSize="small" />,
      items: [
        { label: "Gợi ý lịch tự động", icon: <AutoAwesomeIcon fontSize="small" sx={{ color: "#f59e0b" }} />, onClick: onAutoSchedule },
        { label: "Tạo từ mẫu", icon: <TotalIcon fontSize="small" sx={{ color: "#a5b4fc" }} />, onClick: onTemplates },
        { label: "Xóa lịch tuần", icon: <DeleteIcon fontSize="small" sx={{ color: "#ef4444" }} />, onClick: onDeleteWeek },
      ],
    },
    {
      id: "review",
      label: "Duyệt",
      color: "#10b981",
      borderColor: "rgba(16,185,129,0.3)",
      hoverBg: "rgba(16,185,129,0.1)",
      icon: <ActiveIcon fontSize="small" />,
      badge: totalPending,
      items: [
        { label: `Đơn nghỉ${pendingManualCount > 0 ? ` (${pendingManualCount})` : ""}`, icon: <LeaveIcon fontSize="small" sx={{ color: "#f59e0b" }} />, onClick: onLeaveApproval, badge: 0 },
        { label: `Đăng ký ca${pendingBidCount > 0 ? ` (${pendingBidCount})` : ""}`, icon: <ActiveIcon fontSize="small" sx={{ color: "#10b981" }} />, onClick: onBidsReview, badge: pendingBidCount },
        { label: `Đổi ca${pendingSwapCount > 0 ? ` (${pendingSwapCount})` : ""}`, icon: <GroupIcon fontSize="small" sx={{ color: "#3b82f6" }} />, onClick: onSwapsView, badge: pendingSwapCount },
        { label: `Check-in thủ công${pendingManualCount > 0 ? ` (${pendingManualCount})` : ""}`, icon: <CheckInIcon fontSize="small" sx={{ color: "#8b5cf6" }} />, onClick: onManualCheckIn, badge: pendingManualCount },
      ],
    },
    {
      id: "config",
      label: "Cấu hình",
      color: "#a5b4fc",
      borderColor: "rgba(165,180,252,0.3)",
      hoverBg: "rgba(165,180,252,0.1)",
      icon: <SettingsIcon fontSize="small" />,
      items: [
        { label: "Quản lý ca/khu vực", icon: <SettingsIcon fontSize="small" sx={{ color: "#a5b4fc" }} />, onClick: onManagement },
        { label: "Mẫu lịch", icon: <TotalIcon fontSize="small" sx={{ color: "#a5b4fc" }} />, onClick: onTemplates },
        { label: "Geofence", icon: <MapIcon fontSize="small" sx={{ color: "#f59e0b" }} />, onClick: onGeofence },
        { label: "Nhật ký", icon: <HistoryIcon fontSize="small" sx={{ color: "#6b7280" }} />, onClick: onAuditLogs },
      ],
    },
  ];

  const handleOpen = (event: React.MouseEvent<HTMLElement>, menuId: string) => {
    setAnchorEl(event.currentTarget);
    setActiveMenu(menuId);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setActiveMenu(null);
  };

  const handleItemClick = (onClick: () => void) => {
    onClick();
    handleClose();
  };

  return (
    <>
      {menus.map((menu) => (
        <IconButton
          key={menu.id}
          onClick={(e) => handleOpen(e, menu.id)}
          size="small"
          sx={{ color: menu.color, border: `1px solid ${menu.borderColor}`, "&:hover": { bgcolor: menu.hoverBg }, position: "relative" }}
        >
          {menu.icon}
          {menu.badge ? (
            <Box sx={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: "50%", bgcolor: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography variant="caption" sx={{ color: "#fff", fontSize: "0.6rem", fontWeight: 800, lineHeight: 1 }}>{menu.badge > 9 ? "9+" : menu.badge}</Typography>
            </Box>
          ) : null}
        </IconButton>
      ))}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl) && activeMenu !== null}
        onClose={handleClose}
        slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 200 } } }}
      >
        {menus.filter((m) => m.id === activeMenu).map((menu) =>
          menu.items.map((item, idx) => (
            <MenuItem key={idx} onClick={() => handleItemClick(item.onClick)} sx={{ py: 1.2 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>{item.icon}</ListItemIcon>
              <ListItemText>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.label}</Typography>
              </ListItemText>
              {item.badge ? (
                <Typography variant="caption" sx={{ bgcolor: "error.main", color: "#fff", borderRadius: 1, px: 0.8, py: 0.2, fontWeight: 700, fontSize: "0.65rem" }}>{item.badge}</Typography>
              ) : null}
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
}
