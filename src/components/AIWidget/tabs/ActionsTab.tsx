"use client";

import { Box, Typography } from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarTodayOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmberOutlined";
import GroupsIcon from "@mui/icons-material/GroupsOutlined";
import AIActionCard from "../cards/AIActionCard";

const ACTIONS = [
  {
    icon: <CalendarTodayIcon sx={{ fontSize: 20 }} />,
    title: "Xem lịch trực",
    description: "Kiểm tra lịch trực nhân viên hôm nay",
    path: "/staff-schedules",
    color: "#4A8C5C",
  },
  {
    icon: <WarningAmberIcon sx={{ fontSize: 20 }} />,
    title: "Sách quá hạn",
    description: "Danh sách sách quá hạn chưa trả",
    path: "/history?filter=overdue",
    color: "#B85C4A",
  },
  {
    icon: <GroupsIcon sx={{ fontSize: 20 }} />,
    title: "Độc giả trong thư viện",
    description: "Xem ai đang ở trong thư viện",
    path: "/active",
    color: "#3B82F6",
  },
];

export default function ActionsTab() {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
        Hành động nhanh
      </Typography>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
        {ACTIONS.map((action) => (
          <AIActionCard
            key={action.path}
            icon={action.icon}
            title={action.title}
            description={action.description}
            path={action.path}
            color={action.color}
          />
        ))}
      </Box>
    </Box>
  );
}