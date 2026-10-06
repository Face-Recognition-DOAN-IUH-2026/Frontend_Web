"use client";

import { Box, Button, Divider, Stack, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownloadOutlined";
import FileUploadIcon from "@mui/icons-material/FileUploadOutlined";
import FilterListIcon from "@mui/icons-material/FilterList";
import SearchField from "./SearchField";
import type { FilterValue } from "@/app/(dashboard)/patrons/page";
import { usePermission, getPermissionDeniedReason } from "@/lib/permission-context";

interface PatronToolbarProps {
  query: string;
  onQueryChange: (q: string) => void;
  filter: FilterValue;
  onFilterChange: (f: FilterValue) => void;
  onImportExcel?: () => void;
  onDownloadTemplate?: () => void;
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

export default function PatronToolbar({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  onImportExcel,
  onDownloadTemplate,
}: PatronToolbarProps) {
  const { can } = usePermission();
  const canCreate = can("patrons", "create");

  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        borderRadius: 3,
        border: 1,
        borderColor: "divider",
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1.75,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      {/* Tầng 1: Thanh tìm kiếm & Cụm nút Thao tác (Tải template, Import Excel) */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ flex: 1, minWidth: { xs: "100%", sm: 280, md: 360 } }}>
          <SearchField
            value={query}
            onChange={onQueryChange}
            placeholder="Tìm theo tên, MSSV, mã thẻ..."
          />
        </Box>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            justifyContent: { xs: "flex-end", sm: "flex-end" },
            flexShrink: 0,
          }}
        >
          {onDownloadTemplate && (
            <Tooltip
              title={
                !canCreate
                  ? getPermissionDeniedReason("patrons", "create")
                  : "Tải file Excel mẫu (.xlsx) để nhập danh sách độc giả"
              }
            >
              <span>
                <Button
                  variant="outlined"
                  color="inherit"
                  disabled={!canCreate}
                  startIcon={<FileDownloadIcon />}
                  onClick={onDownloadTemplate}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 600,
                    px: 1.75,
                    py: 0.85,
                    fontSize: "0.85rem",
                    textTransform: "none",
                    whiteSpace: "nowrap",
                    borderColor: "divider",
                    "&:hover": {
                      borderColor: "text.primary",
                      bgcolor: "action.hover",
                    },
                  }}
                >
                  Tải File Mẫu
                </Button>
              </span>
            </Tooltip>
          )}

          {onImportExcel && (
            <Tooltip
              title={
                !canCreate
                  ? getPermissionDeniedReason("patrons", "create")
                  : "Import độc giả hàng loạt từ bảng tính Excel"
              }
            >
              <span>
                <Button
                  variant="outlined"
                  color="primary"
                  disabled={!canCreate}
                  startIcon={<FileUploadIcon />}
                  onClick={onImportExcel}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 700,
                    px: 2,
                    py: 0.85,
                    fontSize: "0.85rem",
                    textTransform: "none",
                    whiteSpace: "nowrap",
                    borderWidth: 1.5,
                    "&:hover": {
                      borderWidth: 1.5,
                      bgcolor: "primary.lighter",
                    },
                  }}
                >
                  Import Excel
                </Button>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      <Divider sx={{ my: 0.25 }} />

      {/* Tầng 2: Bộ lọc trạng thái dạng Pills cuộn ngang chống đè/tràn */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            color: "text.secondary",
            fontSize: "0.78rem",
            fontWeight: 600,
            flexShrink: 0,
            mr: 0.5,
          }}
        >
          <FilterListIcon sx={{ fontSize: 18 }} />
          Lọc:
        </Box>

        <Box
          sx={{
            flex: 1,
            overflowX: "auto",
            whiteSpace: "nowrap",
            py: 0.25,
            pb: 0.5,
            scrollbarWidth: "thin",
            "&::-webkit-scrollbar": { height: 4 },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "divider",
              borderRadius: 2,
            },
          }}
        >
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_, v) => {
              if (v) onFilterChange(v);
            }}
            size="small"
            sx={{
              display: "inline-flex",
              flexWrap: "nowrap",
              gap: 0.75,
              "& .MuiToggleButton-root": {
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "20px !important",
                px: 1.75,
                py: 0.45,
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "none",
                color: "text.secondary",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
                "&:hover": {
                  bgcolor: "action.hover",
                  borderColor: "text.secondary",
                },
                "&.Mui-selected": {
                  bgcolor: "primary.main",
                  color: "#fff",
                  borderColor: "primary.main",
                  boxShadow: "0 2px 6px rgba(10, 37, 64, 0.2)",
                  "&:hover": { bgcolor: "primary.dark" },
                },
              },
            }}
          >
            {FILTERS.map((f) => (
              <ToggleButton key={f.value} value={f.value}>
                {f.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Stack>
    </Box>
  );
}
