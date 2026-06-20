"use client";

import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";

interface FloorSelectorProps {
  currentFloor: string;
  onFloorSelect: (floor: string) => void;
}

const floors = [
  { value: "all", label: "Tất cả" },
  { value: "A", label: "Tầng A" },
  { value: "B", label: "Tầng B" },
  { value: "C", label: "Tầng C" },
];

export default function FloorSelector({
  currentFloor,
  onFloorSelect,
}: FloorSelectorProps) {
  return (
    <Box className="absolute bottom-4 left-4 z-10">
      <Box className="bg-surface/90 backdrop-blur-xl rounded-xl p-2 shadow-lg border">
        <Typography variant="caption" className="text-text-3 mb-1 block text-center">
          Chọn tầng:
        </Typography>
        <ToggleButtonGroup
          value={currentFloor}
          exclusive
          onChange={(_, value) => {
            if (value) onFloorSelect(value);
          }}
          size="small"
        >
          {floors.map((floor) => (
            <ToggleButton
              key={floor.value}
              value={floor.value}
              className="text-xs"
            >
              {floor.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
    </Box>
  );
}
