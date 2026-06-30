"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fade,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AlertIcon from "@mui/icons-material/WarningAmberOutlined";
import AssignmentIcon from "@mui/icons-material/AssignmentOutlined";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import CheckIcon from "@mui/icons-material/CheckCircleOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DescriptionIcon from "@mui/icons-material/DescriptionOutlined";
import TableChartIcon from "@mui/icons-material/TableChartOutlined";
import EyeIcon from "@mui/icons-material/VisibilityOutlined";
import FileIcon from "@mui/icons-material/InsertDriveFileOutlined";
import InventoryIcon from "@mui/icons-material/Inventory2Outlined";
import LibraryIcon from "@mui/icons-material/LocalLibraryOutlined";
import LockIcon from "@mui/icons-material/LockOutlined";
import PrintIcon from "@mui/icons-material/PrintOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScannerOutlined";
import UploadIcon from "@mui/icons-material/UploadFileOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import { shimmer, slideInRight } from "@/lib/animations";
import PageHeader from "@/components/ui/PageHeader";
import DashboardCard from "@/components/ui/DashboardCard";
import MuiStatCard from "@/components/ui/MuiStatCard";
import EmptyState from "@/components/ui/EmptyState";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import NoticeSnackbar from "@/components/ui/NoticeSnackbar";
import SearchField from "@/components/ui/SearchField";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import IsbnScannerDialog from "@/components/IsbnScannerDialog";
import type { BookImportPreviewRow, BookImportResultRow, BookWithStats } from "@/lib/types";

type Notice = { severity: "success" | "error" | "warning" | "info"; message: string } | null;

const STAT_GRADIENT = {
  books: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
  copies: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
  available: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  borrowed: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
};

function statusColor(status: string): "success" | "info" | "warning" | "error" | "default" {
  if (["new", "imported"].includes(status)) return "success";
  if (["updated"].includes(status)) return "info";
  if (["exists", "skipped"].includes(status)) return "default";
  if (["warning"].includes(status)) return "warning";
  return "error";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    exists: "Đã có",
    new: "Mới",
    warning: "Cảnh báo",
    invalid: "Lỗi",
    imported: "Thành công",
    updated: "Cập nhật",
    skipped: "Bỏ qua",
    error: "Lỗi",
  };
  return labels[status] || status;
}

export default function BooksPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [books, setBooks] = useState<BookWithStats[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookWithStats[]>([]);
  const [searching, setSearching] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<BookImportPreviewRow[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedPreviewIndices, setSelectedPreviewIndices] = useState<Set<number>>(new Set());
  const [deletePreviewOpen, setDeletePreviewOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<BookImportResultRow[] | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [recentlyPrinted, setRecentlyPrinted] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const limit = 30;
  const [selectedBook, setSelectedBook] = useState<BookWithStats | null>(null);
  const [editQuantity, setEditQuantity] = useState(0);
  const [savingQuantity, setSavingQuantity] = useState(false);
  const [quantityError, setQuantityError] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [isbnScannerOpen, setIsbnScannerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const deleteConfirmed = deleteInput.trim().normalize('NFC').toUpperCase() === 'XÓA';

  const showNotice = (severity: NonNullable<Notice>["severity"], message: string) => setNotice({ severity, message });

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listBooks({ skip: page * limit, limit });
      setBooks(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      showNotice("error", getErrorMessage(err) || "Lỗi tải dữ liệu sách");
      setBooks([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        setSearchResults(await api.searchBooks(searchQuery));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreviewFile(file);
    setPreviewData(null);
    setShowResults(false);
    setPreviewLoading(true);
    try {
      const data = await api.getBarcodePreview(file);
      setPreviewData(data.rows);
      showNotice("info", `Đã đọc ${data.total_rows} dòng từ file Excel`);
    } catch (err) {
      showNotice("error", getErrorMessage(err) || "Lỗi đọc file");
    } finally {
      setPreviewLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (!previewFile) return;
    setImporting(true);
    setShowResults(false);
    try {
      let result;
      if (previewData && previewData.length > 0) {
        result = await api.importBooksFiltered(previewData.map((row) => ({
          isbn: row.isbn,
          quantity: row.quantity,
          title: row.title,
          subtitle: row.subtitle ?? null,
          author: row.author ?? null,
          publisher: row.publisher ?? null,
          published_date: row.published_date ?? null,
          page_count: row.page_count ?? null,
          categories: row.categories ?? null,
          cover_url: row.cover_url ?? null,
          description: (row as any).description ?? null,
          average_rating: (row as any).average_rating ?? null,
          language: (row as any).language ?? null,
          isbn10: (row as any).isbn10 ?? null,
          isbn13: (row as any).isbn13 ?? null,
        })));
      } else {
        result = await api.importBooks(previewFile);
      }
      setImportResults(result.results);
      setShowResults(true);
      setPreviewData(null);
      setPreviewFile(null);
      setSearchQuery("");
      setPage(0);
      await loadBooks();
      showNotice(result.errors === 0 ? "success" : "warning", result.errors === 0
        ? `Đã nhập ${result.imported} đầu sách`
        : `${result.imported} nhập thành công, ${result.errors} lỗi`);
    } catch (err) {
      showNotice("error", getErrorMessage(err) || "Lỗi nhập kho");
    } finally {
      setImporting(false);
    }
  };

  const handleQuantitySave = async () => {
    if (!selectedBook) return;
    const borrowed = selectedBook.total_copies - selectedBook.available_copies;
    if (editQuantity < borrowed) {
      setQuantityError(`Tối thiểu ${borrowed} bản vì đang có ${borrowed} bản được mượn`);
      return;
    }
    if (editQuantity < 1) {
      setQuantityError("Số lượng phải lớn hơn 0");
      return;
    }
    setSavingQuantity(true);
    try {
      const updated = await api.updateBookQuantity(selectedBook.id, editQuantity);
      setBooks((prev) => prev.map((book) => book.id === updated.id ? updated : book));
      setSearchResults((prev) => prev.map((book) => book.id === updated.id ? updated : book));
      showNotice("success", `Đã cập nhật số lượng: ${updated.total_copies} bản`);
      setSelectedBook(null);
    } catch (err) {
      showNotice("error", getErrorMessage(err) || "Cập nhật thất bại");
    } finally {
      setSavingQuantity(false);
    }
  };

  const handlePrintBarcodes = async (bookId?: string) => {
    try {
      const barcodes = await api.getBarcodes(bookId);
      if (barcodes.length === 0) {
        showNotice("info", "Không tìm thấy mã vạch để in");
        return;
      }
      setRecentlyPrinted(barcodes.map((item) => item.barcode));
      showNotice("success", `${barcodes.length} mã vạch sẵn sàng in`);
    } catch (err) {
      showNotice("error", getErrorMessage(err) || "Không thể lấy mã vạch");
    }
  };

  const handleIsbnImportComplete = (results: BookImportResultRow[]) => {
    setIsbnScannerOpen(false);
    setSearchQuery("");
    setPage(0);
    loadBooks();
    const importedCount = results.filter((r) => r.status === "imported" || r.status === "updated").length;
    const errorCount = results.filter((r) => r.status === "error").length;
    if (errorCount === 0) {
      showNotice("success", `Đã nhập ${importedCount} đầu sách từ ISBN`);
    } else {
      showNotice("warning", `${importedCount} thành công, ${errorCount} lỗi`);
    }
  };

  const openQuantityDialog = (book: BookWithStats) => {
    setSelectedBook(book);
    setEditQuantity(book.total_copies);
    setQuantityError("");
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === displayBooks.length) return new Set();
      return new Set(displayBooks.map((b) => b.id));
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const result = await api.bulkDeleteBooks(Array.from(selectedIds));
      setSelectedIds(new Set());
      setDeleteConfirmOpen(false);
      setDeleteInput("");
      setPage(0);
      await loadBooks();
      if (result.errors.length === 0) {
        showNotice("success", `Đã xóa ${result.deleted} cuốn sách`);
      } else {
        showNotice("warning", `Xóa ${result.deleted} thành công, ${result.errors.length} lỗi: ${result.errors.join("; ")}`);
      }
    } catch (err) {
      showNotice("error", getErrorMessage(err) || "Xóa thất bại");
    } finally {
      setDeleting(false);
    }
  };

  const stats = {
    totalBooks: total,
    totalCopies: books.reduce((sum, book) => sum + book.total_copies, 0),
    availableCopies: books.reduce((sum, book) => sum + book.available_copies, 0),
    borrowedCopies: books.reduce((sum, book) => sum + (book.total_copies - book.available_copies), 0),
  };
  const displayBooks = searchQuery.trim() ? searchResults : books;

  const statItems = [
    { label: "TỔNG ĐẦU SÁCH", value: stats.totalBooks, gradient: STAT_GRADIENT.books, icon: BookIcon, pct: total > 0 ? 100 : 0 },
    { label: "TỔNG BẢN SAO", value: stats.totalCopies, gradient: STAT_GRADIENT.copies, icon: InventoryIcon, pct: stats.totalCopies > 0 ? Math.round((stats.totalCopies / (stats.totalCopies || 1)) * 100) : 0 },
    { label: "SẴN SÀNG", value: stats.availableCopies, gradient: STAT_GRADIENT.available, icon: CheckIcon, pct: stats.totalCopies > 0 ? Math.round((stats.availableCopies / stats.totalCopies) * 100) : 0 },
    { label: "ĐANG MƯỢN", value: stats.borrowedCopies, gradient: STAT_GRADIENT.borrowed, icon: AssignmentIcon, pct: stats.totalCopies > 0 ? Math.round((stats.borrowedCopies / stats.totalCopies) * 100) : 0 },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Quản lý sách"
        icon={LibraryIcon}
        gradient="linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)"
        statBadges={`${total} đầu sách trong hệ thống`}
        onRefresh={() => { setPage(0); setSearchQuery(""); loadBooks(); }}
        actions={
          <>
            <Tooltip title="Tải mẫu">
              <IconButton
                onClick={() => api.downloadBookTemplate()}
                size="small"
                sx={{ color: "#a5b4fc", border: "1px solid rgba(165,180,252,0.3)", "&:hover": { bgcolor: "rgba(165,180,252,0.1)" } }}
              >
                <DescriptionIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Xuất Excel">
              <IconButton
                onClick={() => api.exportBooks()}
                size="small"
                sx={{ color: "#a5b4fc", border: "1px solid rgba(165,180,252,0.3)", "&:hover": { bgcolor: "rgba(165,180,252,0.1)" } }}
              >
                <TableChartIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        }
      />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2 }}>
        {statItems.map((item, idx) => (
          <MuiStatCard
            key={item.label}
            label={item.label}
            value={item.value}
            icon={item.icon}
            gradient={item.gradient}
            pct={item.pct}
            index={idx}
          />
        ))}
      </Box>

      <DashboardCard>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} sx={{ alignItems: { lg: "center" } }}>
          <SearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Tìm kiếm sách theo ISBN, tên, tác giả..."
            sx={{ flexGrow: 1, minWidth: 240, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "background.paper", "&:hover": { "& fieldset": { borderColor: "primary.main" } } } }}
          />
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleFileChange} />
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              sx={{ background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", borderRadius: 2, fontWeight: 700, textTransform: "none", "&:hover": { background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)" } }}
            >
              Nhập Excel
            </Button>
            <Button
              variant="contained"
              startIcon={<QrCodeScannerIcon />}
              onClick={() => setIsbnScannerOpen(true)}
              sx={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)", borderRadius: 2, fontWeight: 700, textTransform: "none", "&:hover": { background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)" } }}
            >
              Quét ISBN
            </Button>
          </Stack>
        </Stack>
      </DashboardCard>

      {searchQuery.trim() ? (
        <DashboardCard>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Kết quả tìm kiếm: <strong>{searchResults.length}</strong> cuốn sách
              </Typography>
            </Stack>
            {searchResults.length > 0 ? (
              <Button color="primary" size="small" startIcon={<PrintIcon />} onClick={() => handlePrintBarcodes()} sx={{ textTransform: "none", fontWeight: 600 }}>
                In mã vạch
              </Button>
            ) : null}
          </Stack>
        </DashboardCard>
      ) : null}

      {previewFile ? (
        <DashboardCard
          title={`Xem trước: ${previewFile.name}`}
          subtitle="Kiểm tra dữ liệu trước khi nhập kho"
          actions={<Button variant="text" color="inherit" onClick={() => { setPreviewFile(null); setPreviewData(null); setSelectedPreviewIndices(new Set()); }}>Hủy</Button>}
        >
          {previewLoading ? (
            <LoadingOverlay loading message="Đang đọc file..." />
          ) : previewData?.length ? (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center" }}>
                <Chip color="success" label={`${previewData.filter((row) => row.status !== "invalid").length} hàng hợp lệ`} />
                <Chip color="error" label={`${previewData.filter((row) => row.status === "invalid").length} hàng lỗi`} />
                {selectedPreviewIndices.size > 0 ? (
                  <Chip
                    color="warning"
                    label={`${selectedPreviewIndices.size} đã chọn`}
                    onDelete={() => setSelectedPreviewIndices(new Set())}
                    deleteIcon={<CloseIcon />}
                    sx={{ ml: 1 }}
                  />
                ) : null}
                {selectedPreviewIndices.size > 0 ? (
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    startIcon={<DeleteIcon />}
                    onClick={() => setDeletePreviewOpen(true)}
                    sx={{ ml: 1 }}
                  >
                    Xóa {selectedPreviewIndices.size} dòng
                  </Button>
                ) : null}
              </Stack>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320, borderRadius: 2 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" sx={{ fontWeight: 700, borderBottom: "2px solid", borderColor: "divider" }}>
                        <Checkbox
                          size="small"
                          indeterminate={selectedPreviewIndices.size > 0 && selectedPreviewIndices.size < (previewData?.filter(r => r.status !== "invalid").length ?? 0)}
                          checked={!!previewData?.length && selectedPreviewIndices.size === previewData.filter(r => r.status !== "invalid").length}
                          onChange={(_, checked) => {
                            if (checked) {
                              setSelectedPreviewIndices(new Set(previewData!.map((_, i) => i).filter(i => previewData![i].status !== "invalid")));
                            } else {
                              setSelectedPreviewIndices(new Set());
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, borderBottom: "2px solid", borderColor: "divider" }}>ISBN</TableCell>
                      <TableCell sx={{ fontWeight: 700, borderBottom: "2px solid", borderColor: "divider" }}>Tên sách</TableCell>
                      <TableCell sx={{ fontWeight: 700, borderBottom: "2px solid", borderColor: "divider" }}>Tác giả</TableCell>
                      <TableCell sx={{ fontWeight: 700, borderBottom: "2px solid", borderColor: "divider" }}>NXB</TableCell>
                      <TableCell sx={{ fontWeight: 700, borderBottom: "2px solid", borderColor: "divider" }}>Số lượng</TableCell>
                      <TableCell sx={{ fontWeight: 700, borderBottom: "2px solid", borderColor: "divider" }}>Mã vạch mẫu</TableCell>
                      <TableCell sx={{ fontWeight: 700, borderBottom: "2px solid", borderColor: "divider" }}>Trạng thái</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, borderBottom: "2px solid", borderColor: "divider" }}>Xóa</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewData!.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} align="center" sx={{ py: 3, color: "text.secondary" }}>
                          Không có dòng nào
                        </TableCell>
                      </TableRow>
                    ) : previewData!.slice(0, 50).map((row, index) => {
                      const isSelected = selectedPreviewIndices.has(index);
                      const isInvalid = row.status === "invalid";
                      return (
                        <TableRow
                          key={`${row.isbn}-${index}`}
                          selected={isInvalid || isSelected}
                          sx={{
                            "&:hover .preview-delete-btn": { opacity: 1 },
                            "& > td": { py: 0.5 },
                            cursor: isInvalid ? "default" : "pointer",
                            ...staggerSx(index, 0.03),
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              size="small"
                              checked={isSelected}
                              disabled={isInvalid}
                              onChange={(_, checked) => {
                                const newSet = new Set(selectedPreviewIndices);
                                if (checked) newSet.add(index);
                                else newSet.delete(index);
                                setSelectedPreviewIndices(newSet);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                          <TableCell sx={{ fontFamily: "monospace", py: 0.5 }}>{row.isbn || "-"}</TableCell>
                          <TableCell sx={{ py: 0.5 }}>{row.title || "-"}</TableCell>
                          <TableCell sx={{ py: 0.5 }}>{row.author || "-"}</TableCell>
                          <TableCell sx={{ py: 0.5 }}>{row.publisher || "-"}</TableCell>
                          <TableCell sx={{ py: 0.5 }}>{row.quantity}</TableCell>
                          <TableCell sx={{ fontFamily: "monospace", py: 0.5 }}>{row.barcodes[0] || "-"}</TableCell>
                          <TableCell sx={{ py: 0.5 }}><Chip size="small" color={statusColor(row.status)} label={statusLabel(row.status)} /></TableCell>
                          <TableCell align="center" sx={{ py: 0.5 }}>
                            <IconButton
                              className="preview-delete-btn"
                              size="small"
                              sx={{ opacity: 0, transition: "opacity 0.15s" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewData(previewData!.filter((_, i) => i !== index));
                                setSelectedPreviewIndices(prev => {
                                  const next = new Set<number>();
                                  prev.forEach(v => { if (v < index) next.add(v); else if (v > index) next.add(v - 1); });
                                  return next;
                                });
                                showNotice("info", "Đã xóa dòng");
                              }}
                            >
                              <DeleteIcon fontSize="small" color="error" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                <Button variant="outlined" onClick={() => { setPreviewFile(null); setPreviewData(null); setSelectedPreviewIndices(new Set()); }}>Hủy</Button>
                <Button variant="contained" startIcon={<CheckIcon />} onClick={handleImport} disabled={importing}>
                  {importing ? "Đang nhập..." : "Xác nhận nhập kho"}
                </Button>
              </Stack>
            </Stack>
          ) : null}
        </DashboardCard>
      ) : null}

      {showResults && importResults ? (
        <DashboardCard title="Kết quả nhập kho">
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>ISBN</TableCell>
                  <TableCell>Tên sách</TableCell>
                  <TableCell>Số lượng</TableCell>
                  <TableCell>Barcode mẫu</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Thông báo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {importResults.map((row, index) => (
                  <TableRow key={`${row.isbn}-${index}`} selected={row.status === "error" || row.status === "warning"}>
                    <TableCell sx={{ fontFamily: "monospace" }}>{row.isbn || "-"}</TableCell>
                    <TableCell>{row.title || "-"}</TableCell>
                    <TableCell>{row.quantity}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>{row.barcodes[0] || "-"}</TableCell>
                    <TableCell><Chip size="small" color={statusColor(row.status)} label={statusLabel(row.status)} /></TableCell>
                    <TableCell>{row.message || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {importResults.some((row) => row.status === "imported" || row.status === "warning") ? (
            <Button sx={{ mt: 2 }} variant="outlined" startIcon={<PrintIcon />} onClick={() => handlePrintBarcodes()}>
              In mã vạch vừa tạo
            </Button>
          ) : null}
        </DashboardCard>
      ) : null}

      {recentlyPrinted.length > 0 ? (
        <DashboardCard title={`Mã vạch sẵn sàng in (${recentlyPrinted.length})`}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            {recentlyPrinted.map((barcode) => <Chip key={barcode} label={barcode} sx={{ fontFamily: "monospace" }} />)}
          </Stack>
        </DashboardCard>
      ) : null}

      <DashboardCard noPadding>
        <LoadingOverlay loading={loading} message="Đang tải danh sách sách...">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ fontWeight: 700 }}>
                    <Checkbox
                      size="small"
                      checked={displayBooks.length > 0 && selectedIds.size === displayBooks.length}
                      indeterminate={selectedIds.size > 0 && selectedIds.size < displayBooks.length}
                      onChange={handleToggleSelectAll}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ISBN</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Tiêu đề</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Tác giả</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>NXB</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Tổng</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Sẵn sàng</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Mượn</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayBooks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <EmptyState
                        icon={<BookIcon fontSize="large" />}
                        title={searchQuery ? "Không tìm thấy sách phù hợp" : "Chưa có sách nào trong hệ thống"}
                      />
                    </TableCell>
                  </TableRow>
                ) : displayBooks.map((book, idx) => {
                  const isSelected = selectedIds.has(book.id);
                  return (
                  <TableRow
                    key={book.id}
                    hover
                    selected={isSelected}
                    sx={{
                      cursor: "pointer",
                      borderLeft: isSelected ? "3px solid" : "3px solid transparent",
                      borderColor: "warning.main",
                      bgcolor: isSelected ? "rgba(255, 183, 77, 0.08)" : undefined,
                      ...staggerSx(idx, 0.03),
                    }}
                    onClick={() => router.push(`/books/${book.id}`)}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        size="small"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(book.id)}
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: "monospace", color: "primary.main" }}>{book.isbn}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                        {book.cover_url ? (
                          <Box component="img" src={book.cover_url} alt={book.title} sx={{ width: 34, height: 44, objectFit: "cover", borderRadius: 1, border: 1, borderColor: "divider" }} />
                        ) : (
                          <Paper variant="outlined" sx={{ width: 34, height: 44, display: "grid", placeItems: "center", bgcolor: "background.default", borderRadius: 1 }}>
                            <BookIcon fontSize="small" />
                          </Paper>
                        )}
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{book.title}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{book.author || "-"}</TableCell>
                    <TableCell>{book.publisher || "-"}</TableCell>
                    <TableCell align="center">{book.total_copies}</TableCell>
                    <TableCell align="center"><Chip size="small" color={book.available_copies > 0 ? "success" : "error"} label={book.available_copies} /></TableCell>
                    <TableCell align="center">{book.total_copies - book.available_copies}</TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </LoadingOverlay>
        {!searchQuery && total > limit ? (
          <>
            <Divider />
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", p: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Hiển thị {page * limit + 1}-{Math.min((page + 1) * limit, total)} / {total} đầu sách
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Trước</Button>
                <Button size="small" variant="outlined" disabled={(page + 1) * limit >= total} onClick={() => setPage((value) => value + 1)}>Sau</Button>
              </Stack>
            </Stack>
          </>
        ) : null}
      </DashboardCard>

      <Dialog open={!!selectedBook} onClose={() => setSelectedBook(null)} fullWidth maxWidth="sm">
        <DialogTitle>Sửa số lượng sách</DialogTitle>
        <DialogContent>
          {selectedBook ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                {selectedBook.cover_url ? (
                  <Box component="img" src={selectedBook.cover_url} alt={selectedBook.title} sx={{ width: 48, height: 64, objectFit: "cover", borderRadius: 1 }} />
                ) : (
                  <Paper variant="outlined" sx={{ width: 48, height: 64, display: "grid", placeItems: "center", borderRadius: 1 }}>
                    <BookIcon />
                  </Paper>
                )}
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 900 }} noWrap>{selectedBook.title}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>ISBN: {selectedBook.isbn}</Typography>
                </Box>
              </Stack>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
                <Alert severity="info">Tổng: {selectedBook.total_copies}</Alert>
                <Alert severity="success">Sẵn sàng: {selectedBook.available_copies}</Alert>
                <Alert severity="warning">Đang mượn: {selectedBook.total_copies - selectedBook.available_copies}</Alert>
              </Box>
              {selectedBook.publisher ? (
                <Typography variant="body2"><strong>NXB:</strong> {selectedBook.publisher}</Typography>
              ) : null}
              {selectedBook.published_date ? (
                <Typography variant="body2"><strong>Năm XB:</strong> {selectedBook.published_date}</Typography>
              ) : null}
              {selectedBook.categories ? (
                <Typography variant="body2"><strong>Thể loại:</strong> {selectedBook.categories}</Typography>
              ) : null}
              {selectedBook.page_count ? (
                <Typography variant="body2"><strong>Số trang:</strong> {selectedBook.page_count}</Typography>
              ) : null}
              {selectedBook.average_rating ? (
                <Typography variant="body2"><strong>Đánh giá:</strong> {selectedBook.average_rating}/5</Typography>
              ) : null}
              {selectedBook.language ? (
                <Typography variant="body2"><strong>Ngôn ngữ:</strong> {selectedBook.language}</Typography>
              ) : null}
              {selectedBook.description ? (
                <Typography variant="body2" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {selectedBook.description}
                </Typography>
              ) : null}
              <TextField
                label="Số lượng mới"
                type="number"
                value={editQuantity}
                onChange={(event) => { setEditQuantity(Number(event.target.value) || 0); setQuantityError(""); }}
                error={!!quantityError}
                helperText={quantityError || "Số lượng không được nhỏ hơn số bản đang mượn"}
                fullWidth
                slotProps={{ htmlInput: { min: 1 } }}
              />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedBook(null)}>Hủy</Button>
          <Button variant="contained" onClick={handleQuantitySave} disabled={savingQuantity}>{savingQuantity ? "Đang lưu..." : "Lưu thay đổi"}</Button>
        </DialogActions>
      </Dialog>

      <NoticeSnackbar open={!!notice} message={notice?.message || ""} severity={notice?.severity || "success"} onClose={() => setNotice(null)} />

      <IsbnScannerDialog
        open={isbnScannerOpen}
        onClose={() => setIsbnScannerOpen(false)}
        onImportComplete={handleIsbnImportComplete}
      />

      <Fade in={selectedIds.size > 0}>
        <Paper
          elevation={8}
          sx={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1300,
            display: "flex",
            alignItems: "center",
            gap: 2,
            px: 3,
            py: 1.5,
            borderRadius: 3,
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
            border: "1px solid",
            borderColor: "warning.main",
            boxShadow: "0 8px 32px rgba(255, 183, 77, 0.2)",
          }}
        >
          <Chip
            label={`${selectedIds.size} đã chọn`}
            color="warning"
            size="small"
            sx={{ fontWeight: 700 }}
          />
          <Button
            size="small"
            variant="text"
            color="inherit"
            onClick={() => setSelectedIds(new Set())}
          >
            Bỏ chọn
          </Button>
          <Button
            size="small"
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => {
              setDeleteInput("");
              setDeleteConfirmOpen(true);
            }}
          >
            Xóa
          </Button>
        </Paper>
      </Fade>

      <Dialog open={deleteConfirmOpen} onClose={() => { setDeleteConfirmOpen(false); setDeleteInput(""); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AlertIcon sx={{ color: "warning.main" }} />
          Xóa {selectedIds.size} cuốn sách?
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Sách sẽ bị xóa vĩnh viễn cùng tất cả bản sao:
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: "auto", p: 1, bgcolor: "grey.900", borderRadius: 1 }}>
              {displayBooks.filter((b) => selectedIds.has(b.id)).map((book) => (
                <Stack key={book.id} direction="row" spacing={1} sx={{ py: 0.5, alignItems: "center" }}>
                  {book.total_copies - book.available_copies > 0 ? <LockIcon fontSize="small" sx={{ color: "error.main" }} /> : null}
                  <Typography variant="body2" sx={{ fontFamily: "monospace", color: "text.secondary", minWidth: 120 }}>
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
            {displayBooks.filter((b) => selectedIds.has(b.id) && b.total_copies - b.available_copies > 0).length > 0 ? (
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
        <DialogActions>
          <Button onClick={() => { setDeleteConfirmOpen(false); setDeleteInput(""); }}>Hủy</Button>
          <Button
            variant="contained"
            color="error"
            disabled={!deleteConfirmed || deleting}
            onClick={handleBulkDelete}
            startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleting ? "Đang xóa..." : "Xóa vĩnh viễn"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deletePreviewOpen} onClose={() => setDeletePreviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AlertIcon sx={{ color: "warning.main" }} />
          Xóa {selectedPreviewIndices.size} dòng khỏi danh sách?
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Các dòng sau sẽ bị xóa khỏi danh sách trước khi nhập:
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: "auto", p: 1, bgcolor: "grey.900", borderRadius: 1 }}>
              {previewData?.filter((_, i) => selectedPreviewIndices.has(i)).slice(0, 10).map((row, idx) => (
                <Stack key={idx} direction="row" spacing={1} sx={{ py: 0.5, alignItems: "center" }}>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", color: "text.secondary", minWidth: 130 }}>
                    {row.isbn}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }} noWrap>
                    {row.title || "Không có tên"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    SL: {row.quantity}
                  </Typography>
                </Stack>
              ))}
              {selectedPreviewIndices.size > 10 ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, textAlign: "center" }}>
                  ... và {selectedPreviewIndices.size - 10} dòng khác
                </Typography>
              ) : null}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletePreviewOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => {
              setPreviewData(previewData!.filter((_, i) => !selectedPreviewIndices.has(i)));
              setSelectedPreviewIndices(new Set());
              setDeletePreviewOpen(false);
              showNotice("info", `Đã xóa ${selectedPreviewIndices.size} dòng`);
            }}
          >
            Xóa {selectedPreviewIndices.size} dòng
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
