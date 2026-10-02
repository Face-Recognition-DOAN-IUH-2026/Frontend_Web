"use client";

import React from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import type { BookWithStats } from "@/lib/types";

export interface BookQuantityDialogProps {
  selectedBook: BookWithStats | null;
  onClose: () => void;
  editQuantity: number;
  setEditQuantity: (q: number) => void;
  quantityError: string;
  setQuantityError: (err: string) => void;
  onSave: () => void;
  savingQuantity: boolean;
}

export function BookQuantityDialog({
  selectedBook,
  onClose,
  editQuantity,
  setEditQuantity,
  quantityError,
  setQuantityError,
  onSave,
  savingQuantity,
}: BookQuantityDialogProps) {
  if (!selectedBook) return null;

  return (
    <Dialog open={!!selectedBook} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
        Sửa số lượng sách
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            {selectedBook.cover_url ? (
              <Box
                component="img"
                src={selectedBook.cover_url}
                alt={selectedBook.title}
                sx={{ width: 48, height: 64, objectFit: "cover", borderRadius: 1 }}
              />
            ) : (
              <Paper
                variant="outlined"
                sx={{ width: 48, height: 64, display: "grid", placeItems: "center", borderRadius: 1 }}
              >
                <BookIcon />
              </Paper>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800 }} noWrap>
                {selectedBook.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>
                ISBN: {selectedBook.isbn}
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1 }}>
            <Alert severity="info">Tổng: {selectedBook.total_copies}</Alert>
            <Alert severity="success">Sẵn sàng: {selectedBook.available_copies}</Alert>
            <Alert severity="warning">Đang mượn: {selectedBook.total_copies - selectedBook.available_copies}</Alert>
          </Box>
          {selectedBook.publisher ? (
            <Typography variant="body2">
              <strong>NXB:</strong> {selectedBook.publisher}
            </Typography>
          ) : null}
          {selectedBook.published_date ? (
            <Typography variant="body2">
              <strong>Năm XB:</strong> {selectedBook.published_date}
            </Typography>
          ) : null}
          {selectedBook.categories ? (
            <Typography variant="body2">
              <strong>Thể loại:</strong> {selectedBook.categories}
            </Typography>
          ) : null}
          {selectedBook.page_count ? (
            <Typography variant="body2">
              <strong>Số trang:</strong> {selectedBook.page_count}
            </Typography>
          ) : null}
          {selectedBook.average_rating ? (
            <Typography variant="body2">
              <strong>Đánh giá:</strong> {selectedBook.average_rating}/5
            </Typography>
          ) : null}
          {selectedBook.language ? (
            <Typography variant="body2">
              <strong>Ngôn ngữ:</strong> {selectedBook.language}
            </Typography>
          ) : null}
          {selectedBook.description ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
            >
              {selectedBook.description}
            </Typography>
          ) : null}
          <TextField
            label="Số lượng mới"
            type="number"
            value={editQuantity}
            onChange={(event) => {
              setEditQuantity(Number(event.target.value) || 0);
              setQuantityError("");
            }}
            error={!!quantityError}
            helperText={quantityError || "Số lượng không được nhỏ hơn số bản đang mượn"}
            fullWidth
            slotProps={{ htmlInput: { min: 1 } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={savingQuantity}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {savingQuantity ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
