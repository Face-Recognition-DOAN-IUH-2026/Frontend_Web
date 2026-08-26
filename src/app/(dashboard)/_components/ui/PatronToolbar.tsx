"use client";

import { Box, Button, ToggleButton, ToggleButtonGroup } from "@mui/material";
import AddIcon from "@mui/icons-material/AddOutlined";
import SearchField from "./SearchField";
import type { FilterValue } from "@/app/(dashboard)/patrons/page";

interface PatronToolbarProps {
  query: string;
  onQueryChange: (q: string) => void;
  filter: FilterValue;
  onFilterChange: (f: FilterValue) => void;
  onAddPatron: () => void;
}

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Hoạt động" },
  { value: "inactive", label: "Tạm khóa" },
  { value: "expired", label: "Hết hạn" },
  { value: "has_face", label: "Có khuôn mặt" },
  { value: "no_face", label: "Chưa có khuôn mặt" },
  { value: "deleted", label: "Đã xóa" },
];

export default function PatronToolbar({ query, onQueryChange, filter, onFilterChange, onAddPatron }: PatronToolbarProps) {
  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        bgcolor: "background.paper",
        borderRadius: 3,
        border: 1,
        borderColor: "divider",
        px: 2.5,
        py: 2,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { sm: "center" },
        gap: 1.5,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <SearchField value={query} onChange={onQueryChange} placeholder="Tìm theo tên, MSSV, mã thẻ..." />
      </Box>

      <ToggleButtonGroup
        value={filter}
        exclusive
        onChange={(_, v) => { if (v) onFilterChange(v); }}
        size="small"
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 0.75,
          "& .MuiToggleButton-root": {
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "20px !important",
            px: 1.5,
            py: 0.5,
            fontSize: "0.75rem",
            fontWeight: 600,
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
        {FILTERS.map((f) => (
          <ToggleButton key={f.value} value={f.value}>{f.label}</ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onAddPatron}
        sx={{
          borderRadius: 2,
          fontWeight: 700,
          px: 2.5,
          py: 1,
          boxShadow: "0 2px 8px rgba(30,96,145,0.25)",
        }}
      >
        Thêm độc giả
      </Button>
    </Box>
  );
}
