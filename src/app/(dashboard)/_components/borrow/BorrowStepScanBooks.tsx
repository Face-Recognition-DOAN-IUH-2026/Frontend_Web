"use client";

import React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import CameraAltIcon from "@mui/icons-material/CameraAltOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScannerOutlined";
import VideocamIcon from "@mui/icons-material/VideocamOutlined";

import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import BookRecommendations from "@/app/(dashboard)/_components/BookRecommendations";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import { CONDITION_LABELS, getConditionColor, type CopyCondition } from "@/lib/constants/copy";
import type { BorrowCartItem } from "./types";

export interface BorrowStepScanBooksProps {
  manualIsbn: string;
  setManualIsbn: (val: string) => void;
  isLookingUpBook: boolean;
  cartItems: BorrowCartItem[];
  remaining: number;
  handleAddBookToCart: (code: string) => void;
  handleRemoveFromCart: (barcode: string) => void;
  setWebcamScannerOpen: (open: boolean) => void;
  setIpScannerOpen: (open: boolean) => void;
  borrowCamUrl: string | null;
  setCurrentStep: (step: number) => void;
  patronCode: string;
}

export function BorrowStepScanBooks({
  manualIsbn,
  setManualIsbn,
  isLookingUpBook,
  cartItems,
  remaining,
  handleAddBookToCart,
  handleRemoveFromCart,
  setWebcamScannerOpen,
  setIpScannerOpen,
  borrowCamUrl,
  setCurrentStep,
  patronCode,
}: BorrowStepScanBooksProps) {
  return (
    <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      {/* Left Column: Scanner Tools & Manual Input */}
      <Grid size={{ xs: 12, md: 5 }} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <DashboardCard
          title="Phương thức quét sách"
          actions={<QrCodeScannerIcon color="primary" />}
        >
          <Stack spacing={2.5}>
            {/* Manual Barcode / ISBN Entry */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Nhập mã vạch bản sao (Barcode) hoặc mã ISBN:
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  fullWidth
                  label="Mã sách (Barcode / ISBN)"
                  placeholder="Quét hoặc nhập mã bản sao (VD: LIB-9780140328721-001) hoặc ISBN..."
                  value={manualIsbn}
                  onChange={(e) => setManualIsbn(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddBookToCart(manualIsbn);
                  }}
                  disabled={isLookingUpBook || cartItems.length >= remaining}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "4px" } }}
                />
                <Button
                  variant="contained"
                  onClick={() => handleAddBookToCart(manualIsbn)}
                  disabled={isLookingUpBook || !manualIsbn.trim() || cartItems.length >= remaining}
                  sx={{ textTransform: "none", fontWeight: 700, whiteSpace: "nowrap", borderRadius: "4px" }}
                >
                  {isLookingUpBook ? <CircularProgress size={20} color="inherit" /> : "Thêm sách"}
                </Button>
              </Stack>
            </Box>

            <Divider />

            {/* Hardware Scanner Trigger Buttons */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                Sử dụng Camera quét mã vạch:
              </Typography>
              <Stack spacing={1.5}>
                <Button
                  variant="outlined"
                  fullWidth
                  size="large"
                  startIcon={<CameraAltIcon />}
                  onClick={() => setWebcamScannerOpen(true)}
                  disabled={cartItems.length >= remaining}
                  sx={{
                    py: 1.2,
                    borderRadius: "4px",
                    textTransform: "none",
                    fontWeight: 700,
                    justifyContent: "flex-start",
                    px: 2,
                  }}
                >
                  Quét bằng Webcam máy tính
                </Button>

                {borrowCamUrl ? (
                  <Button
                    variant="outlined"
                    fullWidth
                    size="large"
                    color="secondary"
                    startIcon={<VideocamIcon />}
                    onClick={() => setIpScannerOpen(true)}
                    disabled={cartItems.length >= remaining}
                    sx={{
                      py: 1.2,
                      borderRadius: "4px",
                      textTransform: "none",
                      fontWeight: 700,
                      justifyContent: "flex-start",
                      px: 2,
                    }}
                  >
                    Quét qua Camera IP quầy
                  </Button>
                ) : null}
              </Stack>
            </Box>

            {cartItems.length >= remaining && (
              <Alert severity="warning" sx={{ borderRadius: "4px" }}>
                Đã đạt giới hạn tối đa ({remaining} cuốn) được phép mượn thêm cho độc giả này.
              </Alert>
            )}
          </Stack>
        </DashboardCard>

        {/* Back and Continue Buttons */}
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => setCurrentStep(0)}
            sx={{ flex: 1, py: 1.2, textTransform: "none", fontWeight: 700, borderRadius: "4px" }}
          >
            Quay lại
          </Button>
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            disabled={cartItems.length === 0}
            onClick={() => setCurrentStep(2)}
            sx={{ flex: 2, py: 1.2, textTransform: "none", fontWeight: 700, borderRadius: "4px" }}
          >
            Xem phiếu mượn ({cartItems.length})
          </Button>
        </Stack>
      </Grid>

      {/* Right Column: Scanned Books Cart */}
      <Grid size={{ xs: 12, md: 7 }} sx={{ display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", minHeight: 0 }}>
        <DashboardCard
          title={`Danh sách sách đã quét (${cartItems.length}/${remaining} cuốn)`}
          actions={
            cartItems.length > 0 ? (
              <Chip size="small" color="primary" label={`${cartItems.length} cuốn`} sx={{ fontWeight: 700 }} />
            ) : undefined
          }
        >
          {cartItems.length === 0 ? (
            <Stack spacing={2} sx={{ alignItems: "center", justifyContent: "center", py: 8, color: "text.secondary" }}>
              <BookIcon sx={{ fontSize: 64, opacity: 0.2 }} />
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Chưa có sách nào trong danh sách
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300, textAlign: "center" }}>
                Nhập mã ISBN hoặc dùng camera quét mã vạch trên bìa sau của sách để thêm vào phiếu mượn
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              {cartItems.map((item, idx) => (
                <Paper
                  key={item.barcode || idx}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    ...staggerSx(idx),
                  }}
                >
                  {item.book?.cover_url ? (
                    <Box
                      component="img"
                      src={item.book.cover_url}
                      alt={item.book.title}
                      sx={{ width: 44, height: 60, objectFit: "cover", borderRadius: "2px", border: 1, borderColor: "divider" }}
                    />
                  ) : (
                    <Paper
                      variant="outlined"
                      sx={{ width: 44, height: 60, display: "grid", placeItems: "center", borderRadius: "2px", bgcolor: "background.default" }}
                    >
                      <BookIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    </Paper>
                  )}

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                      {item.book?.title || item.barcode}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      Tác giả: {item.book?.author || "—"}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.5 }}>
                      <Chip
                        size="small"
                        label={`Barcode: ${item.copy_barcode || item.barcode}`}
                        sx={{ fontSize: "0.68rem", fontFamily: "'JetBrains Mono', monospace", height: 20 }}
                      />
                      {item.condition ? (
                        <Chip
                          size="small"
                          label={CONDITION_LABELS[item.condition as CopyCondition] || item.condition}
                          color={getConditionColor(item.condition)}
                          variant="outlined"
                          sx={{ fontSize: "0.68rem", height: 20 }}
                        />
                      ) : null}
                      {item.shelf_location ? (
                        <Chip
                          size="small"
                          label={`Kệ: ${item.shelf_location}`}
                          sx={{ fontSize: "0.68rem", height: 20 }}
                        />
                      ) : null}
                      <Chip
                        size="small"
                        color="success"
                        label="Sẵn sàng"
                        icon={<CheckCircleIcon sx={{ fontSize: "14px !important" }} />}
                        sx={{ fontSize: "0.68rem", height: 20, fontWeight: 600 }}
                      />
                    </Stack>
                  </Box>

                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemoveFromCart(item.barcode)}
                    title="Xóa khỏi danh sách"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Paper>
              ))}
            </Stack>
          )}
        </DashboardCard>

        {/* AI Recommendations based on patron */}
        {patronCode.trim() ? (
          <BookRecommendations studentCode={patronCode.trim()} />
        ) : null}
      </Grid>
    </Grid>
  );
}
