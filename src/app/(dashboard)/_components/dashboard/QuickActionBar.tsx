"use client";

import Link from "next/link";
import { Box, Paper, Stack, Typography, alpha, useTheme } from "@mui/material";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import SensorDoorOutlinedIcon from "@mui/icons-material/SensorDoorOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";

interface QuickActionItem {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

const QUICK_ACTIONS: QuickActionItem[] = [
  {
    title: "Quầy Mượn",
    subtitle: "Lập phiếu & RFID",
    href: "/borrow",
    icon: <MenuBookOutlinedIcon sx={{ fontSize: 22 }} />,
    color: "#059669",
  },
  {
    title: "Quầy Trả",
    subtitle: "Thu hồi & Nợ phạt",
    href: "/return",
    icon: <AssignmentReturnOutlinedIcon sx={{ fontSize: 22 }} />,
    color: "#8B0000",
  },
  {
    title: "Độc Giả",
    subtitle: "Cấp thẻ & Sinh trắc",
    href: "/patrons",
    icon: <BadgeOutlinedIcon sx={{ fontSize: 22 }} />,
    color: "#0284C7",
  },
  {
    title: "Cổng Kiosk",
    subtitle: "FaceID Vào / Ra",
    href: "/gate",
    icon: <SensorDoorOutlinedIcon sx={{ fontSize: 22 }} />,
    color: "#D97706",
  },
  {
    title: "Lịch Phân Ca",
    subtitle: "Ca trực thủ thư",
    href: "/staff-schedules",
    icon: <CalendarMonthOutlinedIcon sx={{ fontSize: 22 }} />,
    color: "#7C3AED",
  },
  {
    title: "Báo Cáo KPI",
    subtitle: "Số liệu & Lưu lượng",
    href: "/stats",
    icon: <BarChartOutlinedIcon sx={{ fontSize: 22 }} />,
    color: "#0A2540",
  },
];

export default function QuickActionBar() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            sm: "repeat(3, 1fr)",
            md: "repeat(6, 1fr)",
          },
          gap: 1.5,
        }}
      >
        {QUICK_ACTIONS.map((action) => {
          return (
            <Paper
              key={action.href}
              component={Link}
              href={action.href}
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 2,
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                bgcolor: isDark ? alpha(theme.palette.background.paper, 0.7) : "#FFFFFF",
                border: "1px solid",
                borderColor: isDark ? "divider" : alpha(action.color, 0.18),
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden",
                "&:hover": {
                  transform: "translateY(-3px)",
                  borderColor: action.color,
                  boxShadow: isDark
                    ? `0 8px 24px -4px rgba(0,0,0,0.5), 0 0 12px ${alpha(action.color, 0.2)}`
                    : `0 8px 20px -4px ${alpha(action.color, 0.2)}, 0 2px 6px ${alpha(action.color, 0.08)}`,
                  "& .action-icon-box": {
                    transform: "scale(1.08)",
                  },
                },
              }}
            >
              <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mb: 1 }}>
                <Box
                  className="action-icon-box"
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: alpha(action.color, isDark ? 0.2 : 0.1),
                    color: action.color,
                    transition: "transform 0.2s ease",
                    flexShrink: 0,
                  }}
                >
                  {action.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.84rem",
                      color: "text.primary",
                      lineHeight: 1.2,
                    }}
                    noWrap
                  >
                    {action.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontSize: "0.7rem",
                      display: "block",
                      lineHeight: 1.2,
                      mt: 0.25,
                    }}
                    noWrap
                  >
                    {action.subtitle}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}

