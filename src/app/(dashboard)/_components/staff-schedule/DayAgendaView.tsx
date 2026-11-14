"use client";

import { useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import type { StaffScheduleAssignment, StaffShift } from "@/lib/types";

interface DayAgendaViewProps {
  days: Date[];
  shifts: StaffShift[];
  assignments: StaffScheduleAssignment[];
  filter: string;
  isAdmin?: boolean;
  onCellClick?: (date: string, shiftId: string) => void;
  onDeleteAssignment?: (id: string) => void;
}

const DAY_LABELS = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];

function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isToday(d: Date) {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatAttendanceTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function DayAgendaView({
  days,
  shifts,
  assignments,
  filter,
  isAdmin,
  onCellClick,
  onDeleteAssignment,
}: DayAgendaViewProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Group assignments by date
  const assignmentsByDate = useMemo(() => {
    const map = new Map<string, StaffScheduleAssignment[]>();
    for (const d of days) {
      map.set(toDateInput(d), []);
    }
    for (const a of assignments) {
      if (a.status === "cancelled") continue;
      const list = map.get(a.workDate) || [];
      list.push(a);
      map.set(a.workDate, list);
    }
    return map;
  }, [days, assignments]);

  // Selected day tab for mobile (optional filter to view single day or all days)
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  const displayedDays = useMemo(() => {
    if (selectedDayIndex !== null && days[selectedDayIndex]) {
      return [{ day: days[selectedDayIndex], index: selectedDayIndex }];
    }
    return days.map((day, index) => ({ day, index }));
  }, [days, selectedDayIndex]);

  return (
    <Stack spacing={2.5}>
      {/* Day quick switcher pills */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          overflowX: "auto",
          py: 0.5,
          pb: 1,
          "&::-webkit-scrollbar": { height: 4 },
          "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 2 },
        }}
      >
        <Button
          size="small"
          variant={selectedDayIndex === null ? "contained" : "outlined"}
          onClick={() => setSelectedDayIndex(null)}
          sx={{
            borderRadius: 99,
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.78rem",
            px: 2,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          Cả tuần ({assignments.filter((a) => a.status !== "cancelled").length})
        </Button>

        {days.map((d, idx) => {
          const dateStr = toDateInput(d);
          const dayAss = assignmentsByDate.get(dateStr) || [];
          const today = isToday(d);
          const isSelected = selectedDayIndex === idx;

          return (
            <Button
              key={dateStr}
              size="small"
              variant={isSelected ? "contained" : "outlined"}
              onClick={() => setSelectedDayIndex(isSelected ? null : idx)}
              sx={{
                borderRadius: 99,
                textTransform: "none",
                fontWeight: today ? 800 : 600,
                fontSize: "0.78rem",
                px: 1.75,
                whiteSpace: "nowrap",
                flexShrink: 0,
                ...(today && !isSelected
                  ? {
                      borderColor: "primary.main",
                      color: "primary.main",
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                    }
                  : {}),
              }}
            >
              {today ? "Hôm nay • " : ""}
              {DAY_LABELS[d.getDay()]} ({d.getDate()}/{d.getMonth() + 1})
              <Box
                component="span"
                sx={{
                  ml: 0.75,
                  px: 0.6,
                  py: 0.1,
                  borderRadius: 1,
                  bgcolor: isSelected ? "rgba(255,255,255,0.25)" : "action.hover",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                }}
              >
                {dayAss.length}
              </Box>
            </Button>
          );
        })}
      </Stack>

      {/* Days Agenda Flow */}
      <Stack spacing={2}>
        {displayedDays.map(({ day }) => {
          const dateStr = toDateInput(day);
          const dayAssignments = assignmentsByDate.get(dateStr) || [];
          const today = isToday(day);

          // Group by shift
          const byShift = new Map<string, StaffScheduleAssignment[]>();
          for (const a of dayAssignments) {
            const list = byShift.get(a.shiftId) || [];
            list.push(a);
            byShift.set(a.shiftId, list);
          }

          return (
            <Paper
              key={dateStr}
              variant="outlined"
              sx={{
                borderRadius: 2.5,
                overflow: "hidden",
                border: today ? "2px solid" : "1px solid",
                borderColor: today ? "primary.main" : "divider",
                bgcolor: isDark ? alpha(theme.palette.background.paper, 0.7) : "background.paper",
                boxShadow: today
                  ? `0 4px 18px ${alpha(theme.palette.primary.main, 0.15)}`
                  : "0 2px 8px rgba(0,0,0,0.02)",
              }}
            >
              {/* Day Header */}
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  bgcolor: today
                    ? alpha(theme.palette.primary.main, isDark ? 0.2 : 0.08)
                    : isDark
                    ? alpha(theme.palette.action.hover, 0.2)
                    : alpha(theme.palette.action.hover, 0.4),
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <CalendarTodayRoundedIcon
                    sx={{
                      fontSize: 18,
                      color: today ? "primary.main" : "text.secondary",
                    }}
                  />
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 800,
                      color: today ? "primary.main" : "text.primary",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    {DAY_LABELS[day.getDay()]}, ngày {day.getDate()}/{day.getMonth() + 1}/{day.getFullYear()}
                    {today && (
                      <Chip
                        label="HÔM NAY"
                        size="small"
                        color="primary"
                        sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }}
                      />
                    )}
                  </Typography>
                </Stack>

                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                  {dayAssignments.length} nhân sự trực
                </Typography>
              </Box>

              {/* Shifts inside Day */}
              <Box sx={{ p: 2 }}>
                {shifts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                    Chưa có cấu hình ca trực nào.
                  </Typography>
                ) : (
                  <Stack spacing={1.75}>
                    {shifts.map((shift) => {
                      const shiftAssignments = byShift.get(shift.id) || [];
                      const isUnderstaffed = shift.minStaff && shiftAssignments.length < shift.minStaff;

                      return (
                        <Paper
                          key={shift.id}
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            borderColor: isUnderstaffed ? "warning.main" : "divider",
                            bgcolor: isDark
                              ? alpha(theme.palette.background.default, 0.4)
                              : alpha(theme.palette.action.hover, 0.15),
                          }}
                        >
                          {/* Shift bar header */}
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            sx={{
                              alignItems: { xs: "flex-start", sm: "center" },
                              justifyContent: "space-between",
                              mb: 1.25,
                            }}
                          >
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                              <Box
                                sx={{
                                  px: 1,
                                  py: 0.25,
                                  borderRadius: 1,
                                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                                  color: "primary.main",
                                  fontWeight: 800,
                                  fontSize: "0.78rem",
                                }}
                              >
                                {shift.name}
                              </Box>
                              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                                {shift.startTime?.slice(0, 5)} — {shift.endTime?.slice(0, 5)}
                              </Typography>
                              {shift.minStaff ? (
                                <Typography variant="caption" color="text.disabled">
                                  (tối thiểu {shift.minStaff})
                                </Typography>
                              ) : null}
                            </Stack>

                            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                              {isUnderstaffed && (
                                <Chip
                                  icon={<WarningAmberRoundedIcon sx={{ fontSize: 13 }} />}
                                  label={`Thiếu người (${shiftAssignments.length}/${shift.minStaff})`}
                                  size="small"
                                  color="warning"
                                  sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
                                />
                              )}
                              {isAdmin && onCellClick && (
                                <Tooltip title="Thêm nhân viên vào ca này">
                                  <IconButton
                                    size="small"
                                    onClick={() => onCellClick(dateStr, shift.id)}
                                    sx={{
                                      border: "1px dashed",
                                      borderColor: "divider",
                                      borderRadius: 1,
                                      p: 0.5,
                                      color: "primary.main",
                                      "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.1) },
                                    }}
                                  >
                                    <AddIcon sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </Stack>

                          {/* Staff Cards inside Shift */}
                          {shiftAssignments.length === 0 ? (
                            <Box
                              sx={{
                                py: 1.5,
                                px: 2,
                                borderRadius: 1.5,
                                border: "1px dashed",
                                borderColor: "divider",
                                textAlign: "center",
                                color: "text.disabled",
                              }}
                            >
                              <Typography variant="caption">
                                Chưa có phân công nhân viên cho ca này.
                              </Typography>
                            </Box>
                          ) : (
                            <Box
                              sx={{
                                display: "grid",
                                gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fill, minmax(240px, 1fr))" },
                                gap: 1.25,
                              }}
                            >
                              {shiftAssignments.map((a) => {
                                const staffName = a.staff?.fullName || a.staff?.email || "Nhân viên";
                                const zoneName = a.zone?.zoneName || "Khu vực";
                                const hasCheckedIn = !!a.attendance?.checkInAt;
                                const hasCheckedOut = !!a.attendance?.checkOutAt;

                                return (
                                  <Paper
                                    key={a.id}
                                    variant="outlined"
                                    sx={{
                                      p: 1.25,
                                      borderRadius: 2,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      bgcolor: "background.paper",
                                      position: "relative",
                                      "&:hover": { borderColor: "primary.main" },
                                    }}
                                  >
                                    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
                                      <Avatar
                                        sx={{
                                          width: 34,
                                          height: 34,
                                          fontSize: "0.8rem",
                                          fontWeight: 800,
                                          bgcolor: hasCheckedIn
                                            ? "#10b981"
                                            : alpha(theme.palette.primary.main, 0.2),
                                          color: hasCheckedIn ? "#fff" : "primary.main",
                                        }}
                                      >
                                        {staffName.charAt(0).toUpperCase()}
                                      </Avatar>

                                      <Box sx={{ minWidth: 0 }}>
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontWeight: 700,
                                            fontSize: "0.82rem",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {staffName}
                                        </Typography>

                                        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, color: "text.secondary" }}>
                                            <PlaceOutlinedIcon sx={{ fontSize: 13 }} />
                                            <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
                                              {zoneName}
                                            </Typography>
                                          </Box>

                                          {/* Attendance Badge */}
                                          {hasCheckedIn ? (
                                            <Typography
                                              variant="caption"
                                              sx={{
                                                fontSize: "0.65rem",
                                                fontWeight: 700,
                                                color: hasCheckedOut ? "text.secondary" : "#059669",
                                              }}
                                            >
                                              • {hasCheckedOut ? `Ra ${formatAttendanceTime(a.attendance?.checkOutAt)}` : `Vào ${formatAttendanceTime(a.attendance?.checkInAt)}`}
                                            </Typography>
                                          ) : null}
                                        </Stack>
                                      </Box>
                                    </Stack>

                                    {isAdmin && onDeleteAssignment && (
                                      <Tooltip title="Xóa ca trực">
                                        <IconButton
                                          size="small"
                                          onClick={() => onDeleteAssignment(a.id)}
                                          sx={{
                                            color: "text.disabled",
                                            "&:hover": { color: "error.main", bgcolor: "rgba(239,68,68,0.1)" },
                                          }}
                                        >
                                          <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                  </Paper>
                                );
                              })}
                            </Box>
                          )}
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            </Paper>
          );
        })}
      </Stack>
    </Stack>
  );
}
