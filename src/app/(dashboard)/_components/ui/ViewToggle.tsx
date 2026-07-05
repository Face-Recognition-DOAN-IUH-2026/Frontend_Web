"use client";

import { ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import ViewModuleIcon from "@mui/icons-material/ViewModuleOutlined";
import ViewListIcon from "@mui/icons-material/ViewListOutlined";

export interface ViewToggleProps {
  value: "grid" | "list";
  onChange: (v: "grid" | "list") => void;
}

export default function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_, v) => { if (v) onChange(v); }}
      size="small"
      sx={{
        "& .MuiToggleButton-root": {
          px: 1.2,
          py: 0.5,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "20px !important",
          textTransform: "none",
          color: "text.secondary",
          "&.Mui-selected": {
            bgcolor: "primary.main",
            color: "#fff",
            "&:hover": { bgcolor: "primary.dark" },
          },
        },
      }}
    >
      <Tooltip title="Dạng lưới">
        <ToggleButton value="grid"><ViewModuleIcon fontSize="small" /></ToggleButton>
      </Tooltip>
      <Tooltip title="Danh sách">
        <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );
}
