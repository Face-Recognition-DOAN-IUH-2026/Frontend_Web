"use client";

import React from "react";
import {
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import type { LibraryZone, StaffShift } from "@/lib/types";

export interface ScheduleFilterBarProps {
  filter: string;
  setFilter: (val: string) => void;
  zoneFilter: string;
  setZoneFilter: (val: string) => void;
  shiftFilter: string;
  setShiftFilter: (val: string) => void;
  zones: LibraryZone[];
  shiftList: StaffShift[];
  staffSearch?: string;
  setStaffSearch?: (val: string) => void;
  myShiftsOnly?: boolean;
  setMyShiftsOnly?: (val: boolean) => void;
}

const STATUS_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang trực" },
  { value: "future", label: "Sắp tới" },
  { value: "past", label: "Đã qua" },
] as const;

export default function ScheduleFilterBar({
  filter,
  setFilter,
  zoneFilter,
  setZoneFilter,
  shiftFilter,
  setShiftFilter,
  zones,
  shiftList,
  staffSearch = "",
  setStaffSearch,
  myShiftsOnly = false,
  setMyShiftsOnly,
}: ScheduleFilterBarProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const hasActiveFilter =
    filter !== "all" ||
    zoneFilter !== "" ||
    shiftFilter !== "" ||
    myShiftsOnly ||
    staffSearch.trim() !== "";

  const handleResetFilters = () => {
    setFilter("all");
    setZoneFilter("");
    setShiftFilter("");
    setStaffSearch?.("");
    setMyShiftsOnly?.(false);
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.5, sm: 1.75 },
        borderRadius: 2.5,
        bgcolor: isDark ? alpha(theme.palette.background.paper, 0.8) : "background.paper",
        backdropFilter: "blur(10px)",
        borderColor: isDark ? alpha(theme.palette.divider, 0.4) : alpha(theme.palette.divider, 0.8),
        boxShadow: isDark
          ? "0 4px 20px rgba(0, 0, 0, 0.25)"
          : "0 2px 12px rgba(0, 0, 0, 0.03)",
      }}
    >
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={2}
        sx={{
          alignItems: { xs: "stretch", lg: "center" },
          justifyContent: "space-between",
        }}
      >
        {/* Left Side: Label & Status Toggle Pills */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{
            alignItems: { xs: "flex-start", sm: "center" },
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: alpha(theme.palette.primary.main, isDark ? 0.2 : 0.1),
                color: theme.palette.primary.main,
              }}
            >
              <TuneRoundedIcon sx={{ fontSize: 18 }} />
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                color: "text.secondary",
                fontSize: "0.72rem",
              }}
            >
              BỘ LỌC
            </Typography>
          </Stack>

          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_, val) => {
              if (val) setFilter(val);
            }}
            size="small"
            sx={{
              p: 0.5,
              borderRadius: "99px",
              bgcolor: isDark ? alpha(theme.palette.action.hover, 0.5) : alpha(theme.palette.action.hover, 0.8),
              border: `1px solid ${theme.palette.divider}`,
              gap: 0.5,
              "& .MuiToggleButtonGroup-grouped": {
                border: "none!important",
                borderRadius: "99px!important",
                px: { xs: 1.5, sm: 2 },
                py: 0.5,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.78rem",
                color: "text.secondary",
                transition: "all 0.2s ease-in-out",
                "&.Mui-selected": {
                  bgcolor: `${theme.palette.primary.main}!important`,
                  color: "#fff!important",
                  boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.35)}`,
                  fontWeight: 700,
                },
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                },
              },
            }}
          >
            {STATUS_FILTERS.map((f) => (
              <ToggleButton key={f.value} value={f.value}>
                {f.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {setMyShiftsOnly && (
            <Tooltip title="Chỉ hiển thị các ca trực của tôi trong tuần">
              <Button
                size="small"
                variant={myShiftsOnly ? "contained" : "outlined"}
                onClick={() => setMyShiftsOnly(!myShiftsOnly)}
                startIcon={<PersonRoundedIcon sx={{ fontSize: 16 }} />}
                sx={{
                  borderRadius: "99px",
                  px: 1.75,
                  py: 0.5,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  whiteSpace: "nowrap",
                  ...(myShiftsOnly
                    ? {
                        bgcolor: "secondary.main",
                        color: "#fff",
                        boxShadow: `0 2px 8px ${alpha(theme.palette.secondary.main, 0.35)}`,
                        "&:hover": { bgcolor: "secondary.dark" },
                      }
                    : {
                        color: "text.secondary",
                        borderColor: "divider",
                        "&:hover": {
                          borderColor: "secondary.main",
                          color: "secondary.main",
                          bgcolor: alpha(theme.palette.secondary.main, 0.08),
                        },
                      }),
                }}
              >
                Ca của tôi
              </Button>
            </Tooltip>
          )}
        </Stack>

        {/* Divider for desktop view */}
        <Divider
          orientation="vertical"
          flexItem
          sx={{ display: { xs: "none", lg: "block" }, mx: 0.5 }}
        />

        {/* Right Side: Search, Select Dropdowns & Reset Button */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{
            alignItems: { xs: "stretch", sm: "center" },
            flexWrap: "wrap",
            gap: 1.25,
          }}
        >
          {/* Staff Search Input */}
          {setStaffSearch && (
            <TextField
              size="small"
              placeholder="Tìm thủ thư..."
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              sx={{
                width: { xs: "100%", sm: 190 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  fontSize: "0.82rem",
                  bgcolor: isDark ? alpha(theme.palette.background.default, 0.5) : "background.paper",
                  "&:hover fieldset": {
                    borderColor: "primary.main",
                  },
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                  endAdornment: staffSearch ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setStaffSearch("")} edge="end" sx={{ p: 0.25 }}>
                        <ClearRoundedIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                },
              }}
            />
          )}

          {/* Zone Select */}
          <TextField
            select
            size="small"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            sx={{
              width: { xs: "100%", sm: 210 },
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                fontSize: "0.82rem",
                bgcolor: isDark ? alpha(theme.palette.background.default, 0.5) : "background.paper",
                "&:hover fieldset": {
                  borderColor: "primary.main",
                },
              },
            }}
            slotProps={{
              select: {
                displayEmpty: true,
                renderValue: (selected: any) => {
                  if (!selected) {
                    return (
                      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500, fontSize: "0.82rem" }}>
                        Tất cả khu vực
                      </Typography>
                    );
                  }
                  const found = zones.find((z) => z.id === selected);
                  return (
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.82rem" }}>
                      {found ? found.zoneName : selected}
                    </Typography>
                  );
                },
              },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PlaceOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  </InputAdornment>
                ),
              },
            }}
          >
            <MenuItem value="">
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Tất cả khu vực
              </Typography>
            </MenuItem>
            {zones.map((z) => (
              <MenuItem key={z.id} value={z.id}>
                {z.zoneName}
              </MenuItem>
            ))}
          </TextField>

          {/* Shift Select */}
          <TextField
            select
            size="small"
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            sx={{
              width: { xs: "100%", sm: 190 },
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                fontSize: "0.82rem",
                bgcolor: isDark ? alpha(theme.palette.background.default, 0.5) : "background.paper",
                "&:hover fieldset": {
                  borderColor: "primary.main",
                },
              },
            }}
            slotProps={{
              select: {
                displayEmpty: true,
                renderValue: (selected: any) => {
                  if (!selected) {
                    return (
                      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500, fontSize: "0.82rem" }}>
                        Tất cả ca trực
                      </Typography>
                    );
                  }
                  const found = shiftList.find((s) => s.id === selected);
                  return (
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.82rem" }}>
                      {found ? found.name : selected}
                    </Typography>
                  );
                },
              },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <AccessTimeRoundedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  </InputAdornment>
                ),
              },
            }}
          >
            <MenuItem value="">
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Tất cả ca trực
              </Typography>
            </MenuItem>
            {shiftList.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>

          {/* Reset Filters Action */}
          {hasActiveFilter && (
            <Tooltip title="Đặt lại tất cả bộ lọc">
              <Button
                variant="outlined"
                size="small"
                onClick={handleResetFilters}
                startIcon={<RestartAltRoundedIcon sx={{ fontSize: 16 }} />}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  py: 0.8,
                  px: 1.5,
                  borderColor: "divider",
                  color: "text.secondary",
                  whiteSpace: "nowrap",
                  "&:hover": {
                    borderColor: "primary.main",
                    color: "primary.main",
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                  },
                }}
              >
                Đặt lại
              </Button>
            </Tooltip>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
