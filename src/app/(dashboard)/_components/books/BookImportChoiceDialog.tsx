"use client";

import React, { useRef } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CloudDownloadRoundedIcon from "@mui/icons-material/CloudDownloadRounded";
import FileUploadRoundedIcon from "@mui/icons-material/FileUploadRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import api from "@/lib/api-client";

export interface BookImportChoiceDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectFile: (file: File, mode: "isbn" | "internal") => void;
}

export function BookImportChoiceDialog({
  open,
  onClose,
  onSelectFile,
}: BookImportChoiceDialogProps) {
  const theme = useTheme();
  const isbnInputRef = useRef<HTMLInputElement | null>(null);
  const internalInputRef = useRef<HTMLInputElement | null>(null);

  const handleDownloadTemplate = async (type: "basic" | "full") => {
    try {
      await api.downloadBookTemplate(type);
    } catch (err) {
      console.error("Lỗi tải template:", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, mode: "isbn" | "internal") => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectFile(file, mode);
      e.target.value = "";
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            p: 1,
          },
        },
      }}
    >
      {/* Hidden file inputs */}
      <input
        ref={isbnInputRef}
        type="file"
        accept=".xlsx, .xls"
        style={{ display: "none" }}
        onChange={(e) => handleFileChange(e, "isbn")}
      />
      <input
        ref={internalInputRef}
        type="file"
        accept=".xlsx, .xls"
        style={{ display: "none" }}
        onChange={(e) => handleFileChange(e, "internal")}
      />

      <DialogTitle
        component="div"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
            Chọn phương thức nhập dữ liệu Excel
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hệ thống hỗ trợ 2 cơ chế nhập sách phù hợp với từng nhu cầu quản lý thư viện
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Đóng">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2, pb: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2.5}
          sx={{ mt: 1 }}
        >
          {/* Option 1: Nhập nhanh theo ISBN (Google Books) */}
          <Card
            variant="outlined"
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              borderRadius: 2.5,
              borderColor: alpha(theme.palette.primary.main, 0.25),
              background: alpha(theme.palette.primary.main, 0.02),
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                borderColor: theme.palette.primary.main,
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.12)}`,
              },
            }}
          >
            <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    color: theme.palette.primary.main,
                  }}
                >
                  <AutoAwesomeRoundedIcon />
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                    Nhập nhanh theo ISBN
                  </Typography>
                  <Chip
                    label="Tự động tra cứu Google Books"
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600, mt: 0.5 }}
                  />
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                Chỉ cần điền mã <b>ISBN</b>, số lượng và đơn giá. Hệ thống sẽ tự động tìm kiếm tiêu đề, tác giả, ảnh bìa từ Google Books.
              </Typography>

              <Stack spacing={0.8} sx={{ mb: 2.5, flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16, color: "success.main" }} />
                  <Typography variant="caption" color="text.secondary">
                    3 cột cơ bản: ISBN, Số lượng, Đơn giá
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16, color: "success.main" }} />
                  <Typography variant="caption" color="text.secondary">
                    Tối ưu cho sách có mã ISBN quốc tế chuẩn
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16, color: "success.main" }} />
                  <Typography variant="caption" color="text.secondary">
                    Tương thích mẫu Excel cũ
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CloudDownloadRoundedIcon />}
                  onClick={() => handleDownloadTemplate("basic")}
                  sx={{ flex: 1, textTransform: "none", fontWeight: 600 }}
                >
                  Tải mẫu ISBN
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<FileUploadRoundedIcon />}
                  onClick={() => isbnInputRef.current?.click()}
                  sx={{ flex: 1, textTransform: "none", fontWeight: 600 }}
                >
                  Chọn file tải lên
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Option 2: Nhập đầy đủ thông tin nội bộ (Không cần Google Books) */}
          <Card
            variant="outlined"
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              borderRadius: 2.5,
              borderColor: alpha(theme.palette.secondary.main, 0.3),
              background: alpha(theme.palette.secondary.main, 0.02),
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                borderColor: theme.palette.secondary.main,
                boxShadow: `0 4px 20px ${alpha(theme.palette.secondary.main, 0.12)}`,
              },
            }}
          >
            <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: alpha(theme.palette.secondary.main, 0.12),
                    color: theme.palette.secondary.main,
                  }}
                >
                  <StorageRoundedIcon />
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                    Nhập đầy đủ thông tin nội bộ
                  </Typography>
                  <Chip
                    label="Không cần Google Books API"
                    size="small"
                    color="secondary"
                    variant="outlined"
                    sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600, mt: 0.5 }}
                  />
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                Nhập đầy đủ thông tin sách: Tên sách, tác giả, nhà xuất bản, năm XB, thể loại, vị trí kệ, số trang, mô tả. <b>Xử lý tức thì, không bị timeout.</b>
              </Typography>

              <Stack spacing={0.8} sx={{ mb: 2.5, flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16, color: "success.main" }} />
                  <Typography variant="caption" color="text.secondary">
                    11 cột đầy đủ thông tin sách & kho
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16, color: "success.main" }} />
                  <Typography variant="caption" color="text.secondary">
                    Thích hợp giáo trình IUH, sách Việt Nam, luận văn
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16, color: "success.main" }} />
                  <Typography variant="caption" color="text.secondary">
                    Không phụ thuộc mạng ngoài / Không lo timeout
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  color="secondary"
                  size="small"
                  startIcon={<CloudDownloadRoundedIcon />}
                  onClick={() => handleDownloadTemplate("full")}
                  sx={{ flex: 1, textTransform: "none", fontWeight: 600 }}
                >
                  Tải mẫu Đầy đủ
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  size="small"
                  startIcon={<FileUploadRoundedIcon />}
                  onClick={() => internalInputRef.current?.click()}
                  sx={{ flex: 1, textTransform: "none", fontWeight: 600 }}
                >
                  Chọn file tải lên
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: "none" }}>
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
}
