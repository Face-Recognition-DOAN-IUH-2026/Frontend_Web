"use client";

import React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AlertIcon from "@mui/icons-material/WarningAmberOutlined";
import LockIcon from "@mui/icons-material/LockOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlineOutlined";
import type { BookWithStats } from "@/lib/types";

export interface BookBulkDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  selectedIds: Set<string>;
  displayBooks: BookWithStats[];
  deleteInput: string;
  setDeleteInput: (val: string) => void;
  deleteConfirmed: boolean;
  deleting: boolean;
  onDelete: () => void;
}

export function BookBulkDeleteDialog({
  open,
  onClose,
  selectedIds,
  displayBooks,
  deleteInput,
  setDeleteInput,
  deleteConfirmed,
  deleting,
  onDelete,
}: BookBulkDeleteDialogProps) {
  const selectedBooks = displayBooks.filter((b) => selectedIds.has(b.id));
  const hasBorrowed = selectedBooks.some((b) => b.total_copies - b.available_copies > 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontFamily: "'Space Grotesk', sans-serif" }}>
        <AlertIcon sx={{ color: "warning.main" }} />
        Xóa {selectedIds.size} cuốn sách?
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Sách sẽ bị xóa vĩnh viễn cùng tất cả bản sao:
          </Typography>
          <Box sx={{ maxHeight: 200, overflow: "auto", p: 1, bgcolor: "grey.900", borderRadius: 1 }}>
            {selectedBooks.map((book) => (
              <Stack key={book.id} direction="row" spacing={1} sx={{ py: 0.5, alignItems: "center" }}>
                {book.total_copies - book.available_copies > 0 ? (
                  <LockIcon fontSize="small" sx={{ color: "error.main" }} />
                ) : null}
                <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", color: "text.secondary", minWidth: 120 }}>
                  {book.isbn}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }} noWrap>
                  {book.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {book.total_copies} bản
                </Typography>
              </Stack>
            ))}
          </Box>
          {hasBorrowed ? (
            <Alert severity="error">
              Một số sách đang được mượn và sẽ không thể xóa. Hệ thống sẽ bỏ qua chúng.
            </Alert>
          ) : null}
          <TextField
            label='Nhập "XÓA" để xác nhận'
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
            fullWidth
            size="small"
            autoFocus
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Hủy
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={!deleteConfirmed || deleting}
          onClick={onDelete}
          startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {deleting ? "Đang xóa..." : "Xóa vĩnh viễn"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
