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
import {
  Badge,
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import SettingsIcon from "@mui/icons-material/SettingsOutlined";
import LeaveIcon from "@mui/icons-material/BeachAccessOutlined";
import ActiveIcon from "@mui/icons-material/CheckCircleOutlined";
import GroupIcon from "@mui/icons-material/GroupsOutlined";
import HistoryIcon from "@mui/icons-material/HistoryOutlined";
import MapIcon from "@mui/icons-material/PinDropOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import ScheduleIcon from "@mui/icons-material/ScheduleOutlined";
import ChecklistIcon from "@mui/icons-material/ChecklistOutlined";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import SwipeIcon from "@mui/icons-material/SwapHorizOutlined";
import EditNoteIcon from "@mui/icons-material/EditNoteOutlined";

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
  onAction: (action: string) => void;
}

export default function AdminActionMenu({
  pendingBidCount,
  pendingSwapCount,
  pendingManualCount,
  onAction,
}: AdminActionMenuProps) {
  const [scheduleAnchor, setScheduleAnchor] = useState<null | HTMLElement>(null);
  const [approveAnchor, setApproveAnchor] = useState<null | HTMLElement>(null);
  const [configAnchor, setConfigAnchor] = useState<null | HTMLElement>(null);

  const totalPending = pendingBidCount + pendingSwapCount + pendingManualCount;

  const menuStyle = {
    "& .MuiMenuItem-root": { py: 1, px: 2, fontSize: "0.85rem" },
  };

  return (
    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
      {/* Xếp lịch menu */}
      <Tooltip title="Xếp lịch">
        <IconButton
          size="small"
          onClick={(e) => setScheduleAnchor(e.currentTarget)}
          sx={{ color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)", "&:hover": { bgcolor: "rgba(245,158,11,0.1)" } }}
        >
          <AutoAwesomeIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={scheduleAnchor} open={Boolean(scheduleAnchor)} onClose={() => setScheduleAnchor(null)} sx={menuStyle}>
        <MenuItem onClick={() => { setScheduleAnchor(null); onAction("auto-schedule"); }}>
          <ListItemIcon><AutoAwesomeIcon sx={{ fontSize: 18, color: "#f59e0b" }} /></ListItemIcon>
          <ListItemText>Gợi ý lịch tự động</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setScheduleAnchor(null); onAction("templates"); }}>
          <ListItemIcon><ScheduleIcon sx={{ fontSize: 18, color: "#a5b4fc" }} /></ListItemIcon>
          <ListItemText>Mẫu lịch</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setScheduleAnchor(null); onAction("delete-week"); }}>
          <ListItemIcon><DeleteIcon sx={{ fontSize: 18, color: "#ef4444" }} /></ListItemIcon>
          <ListItemText sx={{ color: "#ef4444" }}>Xóa lịch tuần</ListItemText>
        </MenuItem>
      </Menu>

      {/* Duyệt menu */}
      <Tooltip title="Duyệt">
        <IconButton
          size="small"
          onClick={(e) => setApproveAnchor(e.currentTarget)}
          sx={{ color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", "&:hover": { bgcolor: "rgba(16,185,129,0.1)" } }}
        >
          <Badge badgeContent={totalPending || undefined} color="error" max={9}>
            <ChecklistIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu anchorEl={approveAnchor} open={Boolean(approveAnchor)} onClose={() => setApproveAnchor(null)} sx={menuStyle}>
        <MenuItem onClick={() => { setApproveAnchor(null); onAction("leave-approval"); }}>
          <ListItemIcon><LeaveIcon sx={{ fontSize: 18, color: "#f59e0b" }} /></ListItemIcon>
          <ListItemText>Đơn nghỉ</ListItemText>
          {pendingBidCount > 0 && <Typography variant="caption" sx={{ ml: 1, color: "text.secondary" }}>({pendingBidCount})</Typography>}
        </MenuItem>
        <MenuItem onClick={() => { setApproveAnchor(null); onAction("bids-review"); }}>
          <ListItemIcon><ActiveIcon sx={{ fontSize: 18, color: "#10b981" }} /></ListItemIcon>
          <ListItemText>Đăng ký ca</ListItemText>
          {pendingBidCount > 0 && <Typography variant="caption" sx={{ ml: 1, color: "text.secondary" }}>({pendingBidCount})</Typography>}
        </MenuItem>
        <MenuItem onClick={() => { setApproveAnchor(null); onAction("swaps-view"); }}>
          <ListItemIcon><GroupIcon sx={{ fontSize: 18, color: "#3b82f6" }} /></ListItemIcon>
          <ListItemText>Đổi ca</ListItemText>
          {pendingSwapCount > 0 && <Typography variant="caption" sx={{ ml: 1, color: "text.secondary" }}>({pendingSwapCount})</Typography>}
        </MenuItem>
        <MenuItem onClick={() => { setApproveAnchor(null); onAction("manual-checkin"); }}>
          <ListItemIcon><EditNoteIcon sx={{ fontSize: 18, color: "#8b5cf6" }} /></ListItemIcon>
          <ListItemText>Check-in thủ công</ListItemText>
          {pendingManualCount > 0 && <Typography variant="caption" sx={{ ml: 1, color: "text.secondary" }}>({pendingManualCount})</Typography>}
        </MenuItem>
      </Menu>

      {/* Cấu hình menu */}
      <Tooltip title="Cấu hình">
        <IconButton
          size="small"
          onClick={(e) => setConfigAnchor(e.currentTarget)}
          sx={{ color: "#a5b4fc", border: "1px solid rgba(165,180,252,0.3)", "&:hover": { bgcolor: "rgba(165,180,252,0.1)" } }}
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={configAnchor} open={Boolean(configAnchor)} onClose={() => setConfigAnchor(null)} sx={menuStyle}>
        <MenuItem onClick={() => { setConfigAnchor(null); onAction("management"); }}>
          <ListItemIcon><SettingsIcon sx={{ fontSize: 18, color: "#a5b4fc" }} /></ListItemIcon>
          <ListItemText>Quản lý ca/khu vực</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setConfigAnchor(null); onAction("templates-config"); }}>
          <ListItemIcon><AssignmentTurnedInIcon sx={{ fontSize: 18, color: "#a5b4fc" }} /></ListItemIcon>
          <ListItemText>Mẫu lịch</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setConfigAnchor(null); onAction("geofence"); }}>
          <ListItemIcon><MapIcon sx={{ fontSize: 18, color: "#f59e0b" }} /></ListItemIcon>
          <ListItemText>Geofence</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setConfigAnchor(null); onAction("audit-logs"); }}>
          <ListItemIcon><HistoryIcon sx={{ fontSize: 18, color: "#6b7280" }} /></ListItemIcon>
          <ListItemText>Nhật ký</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
