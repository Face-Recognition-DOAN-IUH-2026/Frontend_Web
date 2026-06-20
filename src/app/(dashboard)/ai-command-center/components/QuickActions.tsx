"use client";

import { Box, Chip, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EventIcon from "@mui/icons-material/Event";
import PersonIcon from "@mui/icons-material/Person";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import FloorIcon from "@mui/icons-material/ViewAgenda";

interface QuickActionsProps {
  onAction: (action: string) => void;
  onFloorSelect?: (floor: string) => void;
}

const quickActions = [
  { label: "Tìm sách", icon: SearchIcon, action: "tìm kiếm sách" },
  { label: "Lịch trực", icon: EventIcon, action: "xem lịch trực hôm nay" },
  { label: "Thông tin thẻ", icon: PersonIcon, action: "tra cứu thông tin thẻ" },
  { label: "Giờ mở cửa", icon: AccessTimeIcon, action: "giờ mở cửa thư viện" },
];

const floors = [
  { label: "Tầng A", value: "A", color: "primary" as const },
  { label: "Tầng B", value: "B", color: "secondary" as const },
  { label: "Tầng C", value: "C", color: "success" as const },
];

export default function QuickActions({ onAction, onFloorSelect }: QuickActionsProps) {
  return (
    <Box className="px-4 py-2 border-t">
      <Typography variant="caption" className="text-text-3 mb-2 block">
        Thao tác nhanh:
      </Typography>
      <Box className="flex flex-wrap gap-2">
        {quickActions.map((item) => (
          <Chip
            key={item.label}
            icon={<item.icon className="text-xs" />}
            label={item.label}
            onClick={() => onAction(item.action)}
            size="small"
            className="cursor-pointer hover:bg-primary/10"
          />
        ))}
      </Box>
      {onFloorSelect && (
        <Box className="flex gap-2 mt-2">
          <FloorIcon className="text-text-3 text-sm" />
          {floors.map((floor) => (
            <Chip
              key={floor.value}
              label={floor.label}
              onClick={() => onFloorSelect(floor.value)}
              size="small"
              color={floor.color}
              variant="outlined"
              className="cursor-pointer"
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
