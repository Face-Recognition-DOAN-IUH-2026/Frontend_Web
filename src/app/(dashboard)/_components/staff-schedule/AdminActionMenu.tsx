"use client";

import { useState } from "react";
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
import EditNoteIcon from "@mui/icons-material/EditNoteOutlined";

interface AdminActionMenuProps {
  pendingBidCount: number;
  pendingSwapCount: number;
  pendingManualCount: number;
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
