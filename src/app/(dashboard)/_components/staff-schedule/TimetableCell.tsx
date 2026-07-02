"use client";

import { useState, useCallback } from "react";
import { Box, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonIcon from "@mui/icons-material/PersonOutlined";
import type { StaffScheduleAssignment, StaffShift } from "@/lib/types";
import AssignmentCard from "./AssignmentCard";

interface TimetableCellProps {
  assignments: StaffScheduleAssignment[];
  date?: string;
  shiftId?: string;
  isAdmin?: boolean;
  onCellClick?: (date: string, shiftId: string) => void;
  onDeleteAssignment?: (id: string) => void;
  onViewStaff?: (staffId: string) => void;
  shift?: StaffShift | null;
}

function isUnderstaffed(assignments: StaffScheduleAssignment[], shift?: StaffShift | null): boolean {
  if (!shift?.minStaff) return false;
  const activeCount = assignments.filter(a => a.status !== "cancelled" && a.status !== "completed").length;
  return activeCount < shift.minStaff;
}

export default function TimetableCell({
  assignments, date, shiftId, isAdmin, onCellClick, onDeleteAssignment, onViewStaff, shift,
}: TimetableCellProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuAssignment, setMenuAssignment] = useState<StaffScheduleAssignment | null>(null);
  const under = isUnderstaffed(assignments, shift);
  const canAdmin = isAdmin && date && shiftId && onCellClick;

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLElement>, assignment: StaffScheduleAssignment) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuAssignment(assignment);
    setMenuAnchor(e.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setMenuAnchor(null);
    setMenuAssignment(null);
  }, []);

  if (assignments.length === 0) {
    if (!canAdmin) return null;
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Tooltip title="Thêm nhân viên">
          <IconButton
            size="small"
            onClick={() => onCellClick(date!, shiftId!)}
            sx={{
              width: "100%",
              py: 0.25,
              borderRadius: 1,
              border: "1px dashed",
              borderColor: "divider",
              "&:hover": { borderColor: "primary.main", bgcolor: "rgba(99,102,241,0.05)", color: "primary.main" },
              color: "text.disabled",
            }}
          >
            <AddIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      {assignments.map((a) => (
        <Box
          key={a.id}
          onContextMenu={(e) => isAdmin ? handleContextMenu(e, a) : undefined}
        >
          <AssignmentCard assignment={a} onDelete={onDeleteAssignment} understaffed={under} />
        </Box>
      ))}
      {canAdmin ? (
        <Tooltip title="Thêm nhân viên">
          <IconButton
            size="small"
            onClick={() => onCellClick(date!, shiftId!)}
            sx={{
              width: "100%",
              py: 0.25,
              borderRadius: 1,
              border: "1px dashed",
              borderColor: "divider",
              "&:hover": { borderColor: "primary.main", bgcolor: "rgba(99,102,241,0.05)", color: "primary.main" },
              color: "text.disabled",
            }}
          >
            <AddIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      ) : null}

      {isAdmin && menuAssignment ? (
        <Menu
          open={Boolean(menuAnchor)}
          anchorEl={menuAnchor}
          onClose={handleClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          slotProps={{ paper: { sx: { minWidth: 180 } } }}
        >
          {onViewStaff && menuAssignment.staffId ? (
            <MenuItem onClick={() => { onViewStaff(menuAssignment.staffId); handleClose(); }}>
              <ListItemIcon><PersonIcon sx={{ fontSize: 18, color: "primary.main" }} /></ListItemIcon>
              <ListItemText>Xem nhân viên</ListItemText>
            </MenuItem>
          ) : null}
          {onDeleteAssignment ? (
            <MenuItem onClick={() => { onDeleteAssignment(menuAssignment.id); handleClose(); }} sx={{ color: "error.main" }}>
              <ListItemIcon><DeleteIcon sx={{ fontSize: 18, color: "error.main" }} /></ListItemIcon>
              <ListItemText>Xóa ca trực</ListItemText>
            </MenuItem>
          ) : null}
        </Menu>
      ) : null}
    </Box>
  );
}
