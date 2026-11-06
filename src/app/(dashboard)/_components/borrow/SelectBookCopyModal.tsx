"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import BookmarkIcon from "@mui/icons-material/BookmarkBorderOutlined";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type { BookWithStats, BookCopyData } from "@/lib/types";

export interface SelectBookCopyModalProps {
  open: boolean;
  isbn: string | null;
  onSelectCopy: (copyBarcode: string) => void;
  onClose: () => void;
}

export default function SelectBookCopyModal({
  open,
  isbn,
  onSelectCopy,
  onClose,
}: SelectBookCopyModalProps) {
  const [loading, setLoading] = useState(false);
  const [book, setBook] = useState<BookWithStats | null>(null);
  const [copies, setCopies] = useState<BookCopyData[]>([]);
  const [suffixInput, setSuffixInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open || !isbn) {
      setBook(null);
      setCopies([]);
      setSuffixInput("");
      setErrorMsg(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setErrorMsg(null);
    setSuffixInput("");

    (async () => {
      try {
        const bookData = await api.lookupBookByIsbn(isbn);
        if (!active) return;
        setBook(bookData);

        if (bookData?.id) {
          const copiesData = await api.getBookCopies(bookData.id);
          if (!active) return;
          setCopies(copiesData);
        }
      } catch (err) {
        if (!active) return;
        console.error("Failed to load book copies:", err);
        setErrorMsg(getErrorMessage(err) || `Không tìm thấy sách với ISBN: ${isbn}`);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [open, isbn]);

  // Focus ô nhập khi modal mở và tải xong
  useEffect(() => {
    if (open && !loading && book) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, loading, book]);

  // Trích xuất số thứ tự (suffix) từ barcode bản sao.
  // Hỗ trợ cả 2 định dạng:
  //   - Có dấu gạch: "LIB-9780140328721-009" → "009"
  //   - Liền không dấu: "LIB9780140328721009"  → "009"
  const getCopySuffix = (barcode: string): string => {
    if (!barcode) return "";
    // Định dạng có dấu gạch ngang
    if (barcode.includes("-")) {
      const parts = barcode.split("-");
      return parts[parts.length - 1];
    }
    // Nếu có ISBN sách, trích xuất phần sau ISBN
    const targetIsbn = (book?.isbn || isbn || "").replace(/[-\s]/g, "");
    if (targetIsbn) {
      const cleanBc = barcode.replace(/[-\s]/g, "");
      const idx = cleanBc.indexOf(targetIsbn);
      if (idx !== -1) {
        const rest = cleanBc.slice(idx + targetIsbn.length);
        if (rest) return rest;
      }
    }
    // Định dạng liền: LIB + ISBN(10-13 chữ số) + suffix(1-4 chữ số)
    const withoutLib = barcode.replace(/^LIB/i, "");
    const isbnMatch = withoutLib.match(/^(\d{10,13})(\d{1,4})$/);
    if (isbnMatch) return isbnMatch[2];
    // Fallback: lấy 1-4 chữ số cuối
    const fallback = barcode.match(/(\d{1,4})$/);
    return fallback ? fallback[1] : barcode;
  };

  // Phần tiền tố hiển thị trong ô nhập (VD: "LIB9780140328721" hoặc "LIB-9780140328721-")
  const copyPrefix = useMemo(() => {
    if (!copies.length) return "LIB-…-";
    const sample = copies[0].barcode;
    const suffix = getCopySuffix(sample);
    if (!suffix || suffix === sample) return "LIB-…-";
    return sample.endsWith(suffix) ? sample.slice(0, -suffix.length) : "LIB-…-";
  }, [copies]);

  // Lọc danh sách bản sao sẵn sàng và bản sao không khả dụng
  const { availableCopies, unavailableCopies } = useMemo(() => {
    const avail: BookCopyData[] = [];
    const unavail: BookCopyData[] = [];
    for (const c of copies) {
      if (c.is_available) avail.push(c);
      else unavail.push(c);
    }
    // Sắp xếp theo hậu tố tăng dần
    const sortFn = (a: BookCopyData, b: BookCopyData) =>
      getCopySuffix(a.barcode).localeCompare(getCopySuffix(b.barcode), undefined, { numeric: true });
    avail.sort(sortFn);
    unavail.sort(sortFn);
    return { availableCopies: avail, unavailableCopies: unavail };
  }, [copies]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    const trimmed = suffixInput.trim();
    if (!trimmed) {
      setErrorMsg("Vui lòng nhập số thứ tự bản sao (VD: 001 hoặc 1).");
      return;
    }

    const normTrimmed = trimmed.toLowerCase();
    const cleanInput = normTrimmed.replace(/[-\s]/g, "");
    const padded = /^\d+$/.test(trimmed) ? trimmed.padStart(3, "0") : trimmed;
    const numVal = parseInt(trimmed, 10);

    // Tìm bản sao khớp (hỗ trợ cả "9", "09", "009", dán cả mã đầy đủ, hoặc có/không dấu gạch)
    const matched = copies.find((c) => {
      const bc = c.barcode.toLowerCase();
      const cleanBc = bc.replace(/[-\s]/g, "");
      const suffix = getCopySuffix(c.barcode).toLowerCase();
      const suffixNum = parseInt(suffix, 10);
      return (
        bc === normTrimmed ||
        cleanBc === cleanInput ||
        suffix === normTrimmed ||
        suffix === padded ||
        (!isNaN(numVal) && !isNaN(suffixNum) && numVal === suffixNum) ||
        bc.endsWith(`-${normTrimmed}`) ||
        bc.endsWith(`-${padded}`) ||
        (cleanInput.length >= 6 && cleanBc.endsWith(cleanInput))
      );
    });

    if (!matched) {
      setErrorMsg(
        `Không tìm thấy bản sao số "${trimmed}" của cuốn sách này. Vui lòng kiểm tra lại tem dán trên sách.`,
      );
      return;
    }

    if (!matched.is_available) {
      setErrorMsg(
        `Bản sao "${matched.barcode}" hiện ${
          matched.status === "borrowed" ? "đã được mượn" : "không khả dụng"
        }. Vui lòng chọn bản sao khác.`,
      );
      return;
    }

    onSelectCopy(matched.barcode);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <BookmarkIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.1rem" }}>
              Xác định bản sao sách
            </Typography>
          </Stack>
          <IconButton size="small" onClick={onClose} disabled={loading}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        {loading ? (
          <Stack sx={{ alignItems: "center", py: 5 }} spacing={2}>
            <CircularProgress size={36} />
            <Typography variant="body2" color="text.secondary">
              Đang tra cứu thông tin sách & bản sao...
            </Typography>
          </Stack>
        ) : book ? (
          <Stack spacing={2.5}>
            {/* Thông tin đầu sách */}
            <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
              {book.cover_url ? (
                <Box
                  component="img"
                  src={book.cover_url}
                  alt={book.title}
                  sx={{
                    width: 64,
                    height: 90,
                    objectFit: "cover",
                    borderRadius: 1,
                    border: 1,
                    borderColor: "divider",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <Avatar
                  variant="rounded"
                  sx={{ width: 64, height: 90, bgcolor: "primary.50", color: "primary.main", flexShrink: 0 }}
                >
                  <BookIcon sx={{ fontSize: 32 }} />
                </Avatar>
              )}

              <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.3 }}>
                  {book.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tác giả: <b>{book.author || "Chưa rõ"}</b>
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: "monospace", color: "primary.main" }}>
                  ISBN: {book.isbn}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  <Chip
                    size="small"
                    label={`Kho: ${book.total_copies}`}
                    variant="outlined"
                    sx={{ height: 20, fontSize: 11 }}
                  />
                  <Chip
                    size="small"
                    color={book.available_copies > 0 ? "success" : "default"}
                    label={`Sẵn sàng: ${book.available_copies}`}
                    sx={{ height: 20, fontSize: 11, fontWeight: 700 }}
                  />
                </Stack>
              </Stack>
            </Stack>

            <Divider />

            {errorMsg && (
              <Alert severity="error" sx={{ py: 0.5, fontSize: "0.85rem" }}>
                {errorMsg}
              </Alert>
            )}

            {/* Ô nhập hậu tố bản sao */}
            <Box component="form" onSubmit={handleSubmit}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Nhập số thứ tự / hậu tố bản sao (trên tem dán):
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  inputRef={inputRef}
                  size="small"
                  fullWidth
                  value={suffixInput}
                  onChange={(e) => {
                    setSuffixInput(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="VD: 001 hoặc 1..."
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                            {copyPrefix}
                          </Typography>
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
                <Button
                  variant="contained"
                  type="submit"
                  disabled={!suffixInput.trim()}
                  sx={{ textTransform: "none", fontWeight: 700, px: 2.5, borderRadius: 2, flexShrink: 0 }}
                >
                  Chọn
                </Button>
              </Stack>
            </Box>

            {/* Danh sách bản sao có sẵn để chọn nhanh 1-chạm */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", mb: 1, display: "block" }}>
                Hoặc chọn nhanh bản sao đang có sẵn trên kệ:
              </Typography>

              {availableCopies.length > 0 ? (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {availableCopies.map((c) => {
                    const suffix = getCopySuffix(c.barcode);
                    return (
                      <Chip
                        key={c.id}
                        clickable
                        onClick={() => {
                          onSelectCopy(c.barcode);
                          onClose();
                        }}
                        icon={<CheckCircleIcon sx={{ fontSize: "16px !important" }} />}
                        color="success"
                        variant="outlined"
                        label={
                          <Typography component="span" variant="caption" sx={{ fontWeight: 700 }}>
                            Bản {suffix} {c.shelf_location ? `(Kệ ${c.shelf_location})` : ""}
                          </Typography>
                        }
                        sx={{
                          py: 1.5,
                          px: 0.5,
                          borderRadius: 2,
                          "&:hover": { bgcolor: "success.light", color: "white" },
                        }}
                      />
                    );
                  })}
                </Box>
              ) : (
                <Alert severity="warning" icon={<ErrorOutlineIcon fontSize="small" />} sx={{ py: 0.5, fontSize: "0.85rem" }}>
                  Tất cả các bản sao của cuốn sách này hiện đã được mượn hoặc không khả dụng.
                </Alert>
              )}

              {/* Bản sao không khả dụng (để thông tin) */}
              {unavailableCopies.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                    Bản sao không khả dụng:
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
                    {unavailableCopies.map((c) => (
                      <Chip
                        key={c.id}
                        size="small"
                        disabled
                        label={`Bản ${getCopySuffix(c.barcode)} (${c.status === "borrowed" ? "Đã mượn" : "Không khả dụng"})`}
                        sx={{ fontSize: "0.75rem", height: 22 }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Stack>
        ) : (
          <Alert severity="error">
            {errorMsg || `Không tìm thấy sách với ISBN: ${isbn}`}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: "none", fontWeight: 600 }}>
          Hủy
        </Button>
      </DialogActions>
    </Dialog>
  );
}

