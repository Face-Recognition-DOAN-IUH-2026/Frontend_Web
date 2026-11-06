"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useToast } from "@/lib/toast-context";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import ErrorIcon from "@mui/icons-material/ReportOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScannerOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type { BookWithStats, QuickSearchCopy } from "@/lib/types";
import { getAlertSeverity } from "@/lib/alert-utils";
import { slideInRight, successPop } from "@/lib/animations";
import IPCameraStream from "./IPCameraStream";
import type { BorrowCartItem } from "./borrow/types";
import type { SlipReceiptItem } from "./borrow/BorrowSlipReceipt";
import { toSlipReceiptItems } from "./borrow/BorrowSlipReceipt";
import SelectBookCopyModal from "./borrow/SelectBookCopyModal";

interface ScannedBorrowItem {
  barcode: string;
  isbn: string;
  loading: boolean;
  can_borrow: boolean;
  reason: string | null;
  book: BookWithStats | null;
  copy_id: string | null;
  book_id: string | null;
  copy_barcode: string | null;
}

function toScannedItem(item: BorrowCartItem): ScannedBorrowItem {
  return {
    barcode: item.barcode,
    isbn: item.isbn,
    loading: false,
    can_borrow: item.can_borrow,
    reason: item.reason ?? null,
    // Cart books come from lookupBorrowSlip (serializeBookWithStats) at runtime,
    // even though BorrowCartItem declares the base BookInfo type.
    book: (item.book as BookWithStats | null) ?? null,
    copy_id: item.copy_id ?? null,
    book_id: item.book_id ?? null,
    copy_barcode: item.copy_barcode ?? null,
  };
}

interface Props {
  open: boolean;
  patronId: string;
  patronName: string;
  maxItems?: number;
  cameraUrl: string;
  initialItems?: BorrowCartItem[];
  onClose: () => void;
  onSuccess: (result: { message: string; count: number; items: SlipReceiptItem[] }) => void;
}

export default function BorrowIPCameraDialog({
  open,
  patronId,
  patronName,
  maxItems,
  cameraUrl,
  initialItems,
  onClose,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const initialItemsRef = useRef<BorrowCartItem[]>([]);
  initialItemsRef.current = initialItems ?? [];
  const [scanned, setScanned] = useState<ScannedBorrowItem[]>([]);
  const scannedRef = useRef<ScannedBorrowItem[]>([]);
  scannedRef.current = scanned;
  const [lookingUp, setLookingUp] = useState(false);
  const [createError, setCreateError] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [manualIsbn, setManualIsbn] = useState("");
  const [inputVal, setInputVal] = useState("");
  const [pendingIsbn, setPendingIsbn] = useState<string | null>(null);
  const [duplicateFlash, setDuplicateFlash] = useState<string | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Quick search suggestions (fuzzy title/author/ISBN/barcode) for the manual input field
  const [suggestions, setSuggestions] = useState<QuickSearchCopy[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((val: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (val.trim().length === 0) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await api.quickSearchCopies(val, 10);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const lookupItem = useCallback(async (barcode: string, isbn: string) => {
    setScanned((prev) => prev.map((item) =>
      item.barcode === barcode ? { ...item, loading: true } : item
    ));
    try {
      // Detect copy barcode (LIB prefix) → omit isbn so backend routes via findCopyByBarcode
      const isCopy = /^LIB/i.test(barcode.replace(/[-\s]/g, ""));
      const result = await api.lookupBorrowSlip({
        patron_id: patronId,
        items: [{ barcode, isbn: isCopy ? undefined : isbn }],
      });
      const normBarcode = barcode.replace(/[-\s]/g, "").toLowerCase();
      const item = result.items.find((i) => {
        const iBarcode = (i.barcode || "").replace(/[-\s]/g, "").toLowerCase();
        const iCopyBarcode = (i.copy?.barcode || "").replace(/[-\s]/g, "").toLowerCase();
        const iIsbn = (i.isbn || "").replace(/[-\s]/g, "").toLowerCase();
        return iBarcode === normBarcode || iCopyBarcode === normBarcode || iIsbn === normBarcode;
      }) || result.items[0];

      if (!item) {
        setScanned((prev) => prev.filter((i) => i.barcode !== barcode));
        setLookupError(`Mã sách "${barcode}" không tồn tại trong thư viện`);
        return;
      }
      if (!item.can_borrow) {
        setScanned((prev) => prev.filter((i) => i.barcode !== barcode));
        const msg = item.reason || "Sách không thể mượn";
        const title = item.book?.title || "";
        setLookupError(title ? `"${title}": ${msg}` : `${msg} (Mã: ${barcode})`);
        return;
      }
      setScanned((prev) => prev.map((i) =>
        i.barcode === barcode ? {
          ...i,
          loading: false,
          can_borrow: item.can_borrow,
          reason: item.reason,
          book: item.book,
          copy_id: item.copy?.id || null,
          book_id: item.book?.id || null,
          copy_barcode: item.copy?.barcode || null,
        } : i
      ));
    } catch (err: unknown) {
      setScanned((prev) => prev.filter((item) => item.barcode !== barcode));
      setLookupError(`Lỗi tra cứu: ${barcode} — ${getErrorMessage(err)}`);
    }
  }, [patronId]);

  const addScanned = useCallback((rawCode: string) => {
    const trimmed = rawCode.trim();
    if (trimmed.length < 4) return;
    // Use stripped form only for dedup key; keep original structure for lookup
    const normKey = trimmed.replace(/[-\s]/g, "").toLowerCase();
    lastScannedRef.current = normKey;

    // Duplicate check using ref (synchronous, no stale closure)
    const existing = scannedRef.current.find((item) => {
      const iBarcode = item.barcode.replace(/[-\s]/g, "").toLowerCase();
      const iCopyBarcode = (item.copy_barcode || "").replace(/[-\s]/g, "").toLowerCase();
      const iIsbn = (item.isbn || "").replace(/[-\s]/g, "").toLowerCase();
      return iBarcode === normKey || iCopyBarcode === normKey || iIsbn === normKey;
    });
    if (existing) {
      setDuplicateFlash(existing.barcode);
      setTimeout(() => setDuplicateFlash(null), 1500);
      toast.warning(`Sách ${existing.book?.title || trimmed} đã quét rồi`);
      return;
    }
    if (maxItems !== undefined && scannedRef.current.length >= maxItems) {
      toast.warning(`Chỉ được mượn tối đa ${maxItems} cuốn`);
      return;
    }

    toast.success(`Đã quét: ${trimmed}`);
    setScanned((prev) => [...prev, {
      barcode: trimmed,
      isbn: trimmed,
      loading: true,
      can_borrow: false,
      reason: null,
      book: null,
      copy_id: null,
      book_id: null,
      copy_barcode: null,
    }]);
    // Pass original trimmed value; lookupItem detects LIB prefix and routes correctly
    lookupItem(trimmed, trimmed);
  }, [lookupItem, maxItems, toast]);

  const handleDetectedBarcode = useCallback((rawCode: string) => {
    const trimmed = rawCode.trim();
    if (trimmed.length < 4) return;
    const isCopy = /^LIB/i.test(trimmed.replace(/[-\s]/g, ""));
    if (isCopy) {
      addScanned(trimmed);
    } else if (/^\d{10,13}$/.test(trimmed.replace(/[-\s]/g, ""))) {
      setPendingIsbn(trimmed);
    } else {
      addScanned(trimmed);
    }
  }, [addScanned]);

  const handleSelectSuggestion = useCallback((item: QuickSearchCopy) => {
    setSuggestions([]);
    setManualIsbn(item.barcode);
    addScanned(item.barcode);
  }, [addScanned]);

  useEffect(() => {
    if (!open) {
      setScanned([]);
      setCreateError("");
      setNote("");
      setDuplicateFlash(null);
      lastScannedRef.current = null;
      setInputVal("");
      setManualIsbn("");
      setSuggestions([]);
      return;
    }
    setInputVal("");
    setManualIsbn("");
    setSuggestions([]);
    // Prefill with books already added on the manual step so one session creates one slip.
    setScanned(initialItemsRef.current.map(toScannedItem));
  }, [open]);

  const removeItem = (barcode: string) => {
    setScanned((prev) => prev.filter((item) => item.barcode !== barcode));
  };

  const handleCreateSlip = async () => {
    const validItems = scanned.filter((item) => item.can_borrow && item.book_id && item.copy_id);
    if (!validItems.length || !patronId) return;
    setCreateError("");
    try {
      const confirmResult = await api.confirmBorrowSlip({
        patron_id: patronId,
        items: validItems.map((item) => ({
          barcode: item.copy_barcode || item.barcode,
          isbn: item.isbn,
          book_id: item.book_id!,
          copy_id: item.copy_id!,
        })),
        note: note.trim() || null,
      });
      if (confirmResult.status === "success") {
        setScanned([]);
        onSuccess({ message: confirmResult.message, count: validItems.length, items: toSlipReceiptItems(validItems) });
        onClose();
      }
    } catch (err) {
      const detail = getErrorMessage(err);
      setCreateError(detail);
      toast.error(detail);
    }
  };

  const validCount = scanned.filter((item) => item.can_borrow).length;
  const totalScanned = scanned.length;

  return (
    <>
      <Dialog open={open} onClose={lookingUp ? undefined : onClose} fullWidth maxWidth="xl">
        <DialogTitle>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <QrCodeScannerIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Quét mã vạch sách (IP Camera)
              </Typography>
            </Stack>
            {!lookingUp && (
              <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
            )}
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", md: "row" }, flex: 1, overflow: "hidden" }}>
            <Box sx={{ width: { md: "50%" }, flexShrink: 0 }}>
              <IPCameraStream
                cameraUrl={cameraUrl}
                onBarcodeDetected={handleDetectedBarcode}
              />
            </Box>

            <Stack spacing={1.5} sx={{ flex: 1, overflow: "auto" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <QrCodeScannerIcon color="primary" sx={{ fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                  {totalScanned > 0 ? `Đã quét (${totalScanned} cuốn)` : "Sách đã quét"}
                </Typography>
              </Stack>

              {createError ? <Alert severity={getAlertSeverity(createError)} onClose={() => setCreateError("")}>{createError}</Alert> : null}

              {lookupError ? (
                <Paper variant="outlined" sx={{ p: 1.5, borderColor: "error.main", bgcolor: (t) => t.palette.mode === "dark" ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.06)" }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <ErrorIcon color="error" sx={{ fontSize: 20 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "error.main", flex: 1 }}>
                        {lookupError}
                      </Typography>
                      <IconButton size="small" onClick={() => setLookupError(null)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setManualIsbn("");
                        setLookupError(null);
                      }}
                      sx={{ textTransform: "none", fontWeight: 600, alignSelf: "flex-start" }}
                    >
                      Nhập ISBN thủ công
                    </Button>
                  </Stack>
                </Paper>
              ) : null}

              <Autocomplete<QuickSearchCopy, false, false, true>
                freeSolo
                forcePopupIcon={false}
                options={suggestions}
                loading={isSearching}
                filterOptions={(options) => options}
                getOptionLabel={(option) => (typeof option === "string" ? option : option.barcode)}
                isOptionEqualToValue={(option, value) =>
                  typeof value === "string" ? option.barcode === value : option.id === value.id
                }
                value={null}
                inputValue={inputVal}
                onInputChange={(_, value, reason) => {
                  if (reason === "input") {
                    setInputVal(value);
                    handleSearchChange(value);
                  } else if (reason === "reset" || reason === "clear") {
                    setInputVal("");
                    setSuggestions([]);
                  }
                }}
                onChange={(_, value) => {
                  if (value && typeof value !== "string") {
                    if (!value.is_available) return;
                    setManualIsbn(value.barcode);
                    addScanned(value.barcode);
                    setInputVal("");
                    setSuggestions([]);
                    setTimeout(() => inputRef.current?.focus(), 50);
                  } else if (typeof value === "string") {
                    const code = value.trim();
                    if (!code) return;
                    setManualIsbn(code);
                    setInputVal("");
                    setSuggestions([]);
                    const isCopy = /^LIB/i.test(code.replace(/[-\s]/g, ""));
                    if (isCopy) {
                      addScanned(code);
                    } else if (/^\d{10,13}$/.test(code.replace(/[-\s]/g, ""))) {
                      setPendingIsbn(code);
                    } else {
                      addScanned(code);
                    }
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }
                }}
                getOptionDisabled={(option) => typeof option !== "string" && !option.is_available}
                disabled={lookingUp}
                loadingText="Đang tìm..."
                noOptionsText="Không tìm thấy sách phù hợp"
                slotProps={{
                  popper: {
                    placement: "bottom-start",
                    sx: { zIndex: 1400 },
                  },
                  paper: {
                    sx: { mt: 0.5, borderRadius: 2, border: 1, borderColor: "divider", boxShadow: 3, maxHeight: 260 },
                  },
                }}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;
                  return (
                    <Box
                      component="li"
                      key={key}
                      {...optionProps}
                      sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.2 }}
                    >
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0, flex: 1 }}>
                        <Typography component="span" variant="body2" sx={{ fontWeight: 700, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {option.book?.title || option.barcode}
                        </Typography>
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {option.barcode} | {option.book?.author || "—"} | {option.book?.isbn || "—"}
                        </Typography>
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          Kệ: {option.shelf_location || "Chưa xếp"}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={option.is_available ? "Sẵn sàng" : "Đã mượn / Bảo trì"}
                        color={option.is_available ? "success" : "default"}
                        sx={{ fontSize: "0.68rem", height: 20, fontWeight: 600, minWidth: 70 }}
                      />
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="Nhập ISBN thủ công..."
                    inputRef={inputRef}
                    slotProps={{
                      ...params.slotProps,
                      input: {
                        ...params.slotProps?.input,
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                )}
              />

              {scanned.length === 0 ? (
                <Alert severity="info" sx={{ flex: 1, display: "flex", alignItems: "center" }}>
                  Đưa mã vạch vào camera. Sách sẽ xuất hiện tại đây.
                </Alert>
              ) : (
                scanned.map((item) => {
                  const isLastScanned = item.barcode === lastScannedRef.current;
                  const isDupeFlash = item.barcode === duplicateFlash;
                  const hasError = !item.loading && !item.can_borrow;
                  const isSuccess = !item.loading && item.can_borrow;
                  return (
                    <Paper
                      key={item.barcode}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderColor: isDupeFlash ? "warning.main" : isLastScanned ? "primary.main" : hasError ? "error.main" : undefined,
                        borderWidth: isDupeFlash ? 2 : undefined,
                        bgcolor: isDupeFlash ? (t) => t.palette.mode === "dark" ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.08)" : isLastScanned ? "action.hover" : hasError ? (t) => t.palette.mode === "dark" ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.06)" : undefined,
                        animation: isSuccess
                          ? `${successPop} 0.4s ease-out`
                          : isDupeFlash
                          ? `${slideInRight} 0.3s ease-out`
                          : isLastScanned
                          ? `${slideInRight} 0.3s ease-out`
                          : undefined,
                      }}
                    >
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                        {item.loading ? (
                          <Avatar variant="rounded" sx={{ width: 40, height: 56, bgcolor: "background.default", flexShrink: 0 }}>
                            <CircularProgress size={20} />
                          </Avatar>
                        ) : item.book?.cover_url ? (
                          <Box
                            component="img"
                            src={item.book.cover_url}
                            alt={item.book.title}
                            sx={{ width: 40, height: 56, objectFit: "cover", borderRadius: 0.5, flexShrink: 0 }}
                          />
                        ) : (
                          <Avatar variant="rounded" sx={{ width: 40, height: 56, bgcolor: hasError ? "error.main" : "background.default", flexShrink: 0 }}>
                            {hasError ? <ErrorIcon fontSize="small" /> : <BookIcon />}
                          </Avatar>
                        )}
                        <Stack spacing={0.3} sx={{ flex: 1, minWidth: 0 }}>
                          {item.loading ? (
                            <Typography variant="body2" color="text.secondary">Đang tra cứu...</Typography>
                          ) : item.can_borrow && item.book ? (
                            <>
                              <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap>
                                {item.book.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {item.book.author || "-"}
                              </Typography>
                              <Typography variant="caption" sx={{ fontFamily: "monospace", color: "primary.main" }}>
                                {item.barcode}
                              </Typography>
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexWrap: "wrap", mt: 0.5 }}>
                                <Chip size="small" variant="outlined" label={`Kho: ${item.book.total_copies}`} sx={{ height: 20, fontSize: 11 }} />
                                <Chip size="small" variant="outlined" color="success" label={`Sẵn: ${item.book.available_copies}`} sx={{ height: 20, fontSize: 11 }} />
                              </Stack>
                            </>
                          ) : (
                            <>
                              <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap color="error">
                                {item.book?.title || item.barcode}
                              </Typography>
                              {item.reason && (
                                <Typography variant="caption" color="error">
                                  {item.reason}
                                </Typography>
                              )}
                            </>
                          )}
                        </Stack>
                        <IconButton size="small" color="error" onClick={() => removeItem(item.barcode)} sx={{ mt: 0.5 }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Paper>
                  );
                })
              )}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ flexDirection: "column", alignItems: "stretch", px: 3, pb: 2, gap: 1.5 }}>
          <TextField
            size="small"
            placeholder="Ghi chú phiếu mượn (tùy chọn)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            multiline
            maxRows={3}
            sx={{ "& .MuiInputBase-root": { fontSize: 13 } }}
          />
          <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
            <Button onClick={onClose} disabled={lookingUp}>Hủy</Button>
            <Button
              variant="contained"
              disabled={lookingUp || validCount === 0}
              onClick={handleCreateSlip}
            >
              {lookingUp ? "Đang xử lý..." : `Tạo phiếu mượn (${validCount} cuốn)`}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <SelectBookCopyModal
        open={Boolean(pendingIsbn)}
        isbn={pendingIsbn}
        onSelectCopy={(barcode) => {
          addScanned(barcode);
          setPendingIsbn(null);
        }}
        onClose={() => setPendingIsbn(null)}
      />
    </>
  );
}