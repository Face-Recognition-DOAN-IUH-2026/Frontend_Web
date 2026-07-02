"use client";

import { useMemo } from "react";
import { Box, Button, ButtonGroup, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import TodayIcon from "@mui/icons-material/Today";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SettingsIcon from "@mui/icons-material/Settings";
import PrintIcon from "@mui/icons-material/Print";

interface TimetableHeaderProps {
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  isAdmin?: boolean;
  onOpenManagement?: () => void;
  onAutoSchedule?: () => void;
}

function getWeekDays(anchor: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + i);
    return d;
  });
}

function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function TimetableHeader({
  weekStart, onPrevWeek, onNextWeek, onToday, isAdmin, onOpenManagement, onAutoSchedule,
}: TimetableHeaderProps) {
  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const dateRange = `${toDateInput(days[0])} ~ ${toDateInput(days[6])}`;

  const isCurrentWeek = useMemo(() => {
    const monday = getWeekDays(weekStart);
    return toDateInput(monday[0]) === toDateInput(getWeekDays(new Date())[0]);
  }, [weekStart]);

  return (
    <Box sx={{ pb: 2, borderBottom: 1, borderColor: "divider", display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Lịch trực theo tuần
          <Box component="span" sx={{ display: { xs: "none", print: "inline" }, ml: 2, fontSize: "0.875rem", fontFamily: "monospace", fontWeight: 400, color: "text.secondary" }}>
            {dateRange}
          </Box>
        </Typography>
        <Box sx={{ display: { xs: "flex", print: "none" }, alignItems: "center", gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
            {dateRange}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <ButtonGroup size="small" variant="outlined">
          <Button onClick={onPrevWeek} startIcon={<ArrowBackIosNewIcon sx={{ fontSize: 12 }} />}>
            Tuần trước
          </Button>
          <Button
            onClick={onToday}
            variant={isCurrentWeek ? "contained" : "outlined"}
            color={isCurrentWeek ? "primary" : "inherit"}
            startIcon={<TodayIcon sx={{ fontSize: 14 }} />}
          >
            Hôm nay
          </Button>
          <Button onClick={onNextWeek} endIcon={<ArrowForwardIosIcon sx={{ fontSize: 12 }} />}>
            Tuần sau
          </Button>
        </ButtonGroup>

        <Stack direction="row" spacing={1} sx={{ display: { print: "none" } }}>
          {isAdmin && (
            <>
              {onAutoSchedule && (
                <Tooltip title="Gợi ý lịch tự động">
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
                    onClick={onAutoSchedule}
                  >
                    Gợi ý lịch
                  </Button>
                </Tooltip>
              )}
              {onOpenManagement && (
                <Tooltip title="Quản lý ca trực và khu vực">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<SettingsIcon sx={{ fontSize: 14 }} />}
                    onClick={onOpenManagement}
                  >
                    Quản lý
                  </Button>
                </Tooltip>
              )}
            </>
          )}
          <Tooltip title="In lịch">
            <IconButton size="small" onClick={() => window.print()}>
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Box>
  );
}
