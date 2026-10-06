"use client";

import React, { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import SellOutlinedIcon from "@mui/icons-material/SellOutlined";
import type { BookWithStats } from "@/lib/types";
import api, { getErrorMessage } from "@/lib/api-client";

export interface BookBulkPriceDialogProps {
  open: boolean;
  onClose: () => void;
  selectedIds: Set<string>;
  displayBooks: BookWithStats[];
  onSuccess: () => void;
  showNotice: (severity: "success" | "error" | "warning" | "info", message: string) => void;
}

const PRESET_PRICES = [50000, 80000, 100000, 120000, 150000, 200000];

export function BookBulkPriceDialog({
  open,
  onClose,
  selectedIds,
  displayBooks,
  onSuccess,
  showNotice,
}: BookBulkPriceDialogProps) {
  const [priceInput, setPriceInput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBooks = displayBooks.filter((b) => selectedIds.has(b.id));

  // Reset form khi mở dialog
  useEffect(() => {
    if (open) {
      if (selectedBooks.length === 1 && selectedBooks[0].price != null) {
        setPriceInput(String(Math.round(Number(selectedBooks[0].price))));
      } else {
        setPriceInput("");
      }
      setError(null);
      setLoading(false);
    }
  }, [open, selectedBooks.length]);

  const numPrice = Number(priceInput.replace(/\D/g, ""));

  const handlePriceChange = (val: string) => {
    const raw = val.replace(/\D/g, "");
    setPriceInput(raw);
    if (error) setError(null);
  };

  const handleSave = async () => {
    if (!priceInput || isNaN(numPrice) || numPrice <= 0) {
      setError("Vui lòng nhập giá sách hợp lệ lớn hơn 0 đ");
      return;
    }
    if (selectedIds.size === 0) {
      setError("Chưa chọn cuốn sách nào");
      return;
    }

    setLoading(true);
    try {
      const bookIds = Array.from(selectedIds);
      const res = await api.bulkUpdateBookPrices(bookIds, numPrice);
      showNotice(
        "success",
        `Đã cập nhật đơn giá ${numPrice.toLocaleString("vi-VN")} đ cho ${res.updated || bookIds.length} cuốn sách`
      );
      onSuccess();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err) || "Không thể cập nhật giá sách");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontFamily: "'Space Grotesk', sans-serif" }}>
        <PaidOutlinedIcon sx={{ color: "primary.main" }} />
        {selectedIds.size === 1
          ? `Cập nhật đơn giá: ${selectedBooks[0]?.title || "1 cuốn sách"}`
          : `Sửa giá hàng loạt cho ${selectedIds.size} cuốn sách`}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Đơn giá này được dùng để quản lý giá trị tài sản thư viện và tự động tính phí bồi thường khi bạn đọc làm mất hoặc hư hỏng sách.
          </Typography>

          {/* Danh sách sách đang chọn */}
          <Box sx={{ maxHeight: 150, overflow: "auto", p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
            {selectedBooks.slice(0, 5).map((book) => (
              <Stack key={book.id} direction="row" spacing={1} sx={{ py: 0.5, alignItems: "center" }}>
                <SellOutlinedIcon fontSize="small" sx={{ color: "text.secondary", fontSize: 16 }} />
                <Typography
                  variant="body2"
                  sx={{ fontFamily: "'JetBrains Mono', monospace", color: "text.secondary", minWidth: 120 }}
                >
                  {book.isbn}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }} noWrap>
                  {book.title}
                </Typography>
                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                  {book.price != null && Number(book.price) > 0
                    ? `${Number(book.price).toLocaleString("vi-VN")} đ`
                    : "Chưa có giá"}
                </Typography>
              </Stack>
            ))}
            {selectedBooks.length > 5 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, textAlign: "center" }}>
                ... và {selectedBooks.length - 5} cuốn sách khác
              </Typography>
            )}
          </Box>

          {/* Ô nhập giá */}
          <TextField
            label="Đơn giá mới (VNĐ)"
            value={priceInput ? Number(priceInput).toLocaleString("vi-VN") : ""}
            onChange={(e) => handlePriceChange(e.target.value)}
            fullWidth
            size="small"
            autoFocus
            error={Boolean(error)}
            helperText={error || "Ví dụ: 120.000 đ"}
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">VNĐ</InputAdornment>,
              },
            }}
          />

          {/* Gợi ý mức giá phổ biến */}
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Gợi ý mức giá thông dụng:
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
              {PRESET_PRICES.map((p) => (
                <Chip
                  key={p}
                  label={`${p.toLocaleString("vi-VN")} đ`}
                  clickable
                  variant={numPrice === p ? "filled" : "outlined"}
                  color={numPrice === p ? "primary" : "default"}
                  size="small"
                  onClick={() => handlePriceChange(String(p))}
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Stack>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading} sx={{ textTransform: "none" }}>
          Hủy
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={loading || !numPrice || numPrice <= 0}
          onClick={handleSave}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PaidOutlinedIcon />}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {loading ? "Đang cập nhật..." : `Áp dụng ${numPrice > 0 ? `${numPrice.toLocaleString("vi-VN")} đ` : ""}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
