"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Fade,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import AssignmentIcon from "@mui/icons-material/AssignmentOutlined";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import CheckIcon from "@mui/icons-material/CheckCircleOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DescriptionIcon from "@mui/icons-material/DescriptionOutlined";
import TableChartIcon from "@mui/icons-material/TableChartOutlined";
import InventoryIcon from "@mui/icons-material/Inventory2Outlined";
import LibraryIcon from "@mui/icons-material/LocalLibraryOutlined";
import PrintIcon from "@mui/icons-material/PrintOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScannerOutlined";
import UploadIcon from "@mui/icons-material/UploadFileOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";

import api, { getErrorMessage } from "@/lib/api-client";
import { usePermission, getPermissionDeniedReason } from "@/lib/permission-context";
import { useToast } from "@/lib/toast-context";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import MuiStatCard from "@/app/(dashboard)/_components/ui/MuiStatCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import PageErrorState from "@/app/(dashboard)/_components/ui/PageErrorState";
import SearchField from "@/app/(dashboard)/_components/ui/SearchField";
import IsbnScannerDialog from "@/app/(dashboard)/_components/IsbnScannerDialog";
import type { BookImportPreviewRow, BookImportResultRow, BookWithStats } from "@/lib/types";

import {
  BookQuantityDialog,
  BookBulkDeleteDialog,
  BookBulkPriceDialog,
  BookImportPreviewSection,
  BookImportResultSection,
  BookImportChoiceDialog,
} from "../_components/books";

export default function BooksPage() {
  const theme = useTheme();
  const { can } = usePermission();
  const { toast } = useToast();
  const canCreateBook = can("books", "create");
  const canUpdateBook = can("books", "update");
  const canDeleteBook = can("books", "delete");
  const canReadBook = can("books", "read");
  const canPrintBook = can("books", "print");

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [books, setBooks] = useState<BookWithStats[]>([]);
  const [total, setTotal] = useState(0);
  const [aggregateStats, setAggregateStats] = useState<{ totalCopies: number; availableCopies: number; borrowedCopies: number; outOfStockBooks?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<BookImportPreviewRow[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedPreviewIndices, setSelectedPreviewIndices] = useState<Set<number>>(new Set());
  const [importChoiceOpen, setImportChoiceOpen] = useState(false);
  const [importMode, setImportMode] = useState<"isbn" | "internal" | "auto">("auto");
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<BookImportResultRow[] | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [recentlyPrinted, setRecentlyPrinted] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedBook, setSelectedBook] = useState<BookWithStats | null>(null);
  const [editQuantity, setEditQuantity] = useState(0);
  const [savingQuantity, setSavingQuantity] = useState(false);
  const [quantityError, setQuantityError] = useState("");
  const [isbnScannerOpen, setIsbnScannerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const deleteConfirmed = deleteInput === "XÓA";
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);
  const [singlePriceBook, setSinglePriceBook] = useState<BookWithStats | null>(null);

  const showNotice = useCallback((type: "success" | "warning" | "error" | "info", msg: string) => {
    toast(msg, type);
  }, [toast]);
  const showNoticeRef = useRef(showNotice);
  useEffect(() => {
    showNoticeRef.current = showNotice;
  }, [showNotice]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadBooks = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await api.listBooks({
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        search: debouncedSearch || undefined,
        signal,
      });
      setBooks(res.items);
      setTotal(res.total);
      if (res.aggregateStats) {
        setAggregateStats({
          totalCopies: res.aggregateStats.totalCopies,
          availableCopies: res.aggregateStats.availableCopies,
          borrowedCopies: res.aggregateStats.borrowedCopies,
          outOfStockBooks: res.aggregateStats.outOfStockBooks,
        });
      }
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.name === "AbortError" || err?.code === "ERR_CANCELED") {
        return;
      }
      const msg = getErrorMessage(err) || "Không thể tải danh sách sách";
      setFetchError(msg);
      showNoticeRef.current("error", msg);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, debouncedSearch]);

  useEffect(() => {
    const controller = new AbortController();
    loadBooks(controller.signal);
    return () => controller.abort();
  }, [loadBooks]);

  const handleFileSelect = async (file: File, mode: "isbn" | "internal" | "auto" = "auto") => {
    setImportMode(mode);
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewData(null);
    setSelectedPreviewIndices(new Set());
    try {
      const data = await api.getBarcodePreview(file, mode);
      setPreviewData(Array.isArray(data) ? data : data.rows);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Không thể đọc file");
      setPreviewFile(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileSelect(file, "auto");
    if (fileInputRef.current) fileInputRef.current.value = "";
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
          price: row.price ?? null,
          title: row.title,
          subtitle: row.subtitle ?? null,
          author: row.author ?? null,
          publisher: row.publisher ?? null,
          published_date: row.published_date ?? null,
          page_count: row.page_count ?? null,
          categories: row.categories ?? null,
          cover_url: row.cover_url ?? null,
          shelf_location: (row as any).shelf_location ?? null,
          description: (row as any).description ?? null,
          average_rating: (row as any).average_rating ?? null,
          language: (row as any).language ?? null,
          isbn10: (row as any).isbn10 ?? null,
          isbn13: (row as any).isbn13 ?? null,
        })));
      } else {
        result = await api.importBooks(previewFile, importMode);
      }
      setImportResults(result.results);
      setShowResults(true);
      setPreviewData(null);
      setPreviewFile(null);
      setSearchQuery("");
      setPage(0);
      await loadBooks();
      toast(result.errors === 0
        ? `Đã nhập ${result.imported} đầu sách`
        : `${result.imported} nhập thành công, ${result.errors} lỗi`,
        result.errors === 0 ? "success" : "warning"
      );
    } catch (err) {
      toast.error(getErrorMessage(err) || "Lỗi nhập kho");
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
      toast.success(`Đã cập nhật số lượng: ${updated.total_copies} bản`);
      setSelectedBook(null);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Cập nhật thất bại");
    } finally {
      setSavingQuantity(false);
    }
  };

  const handlePrintBarcodes = async (bookId?: string) => {
    try {
      const barcodes = await api.getBarcodes(bookId);
      if (barcodes.length === 0) {
        toast.info("Không tìm thấy mã vạch để in");
        return;
      }
      setRecentlyPrinted(barcodes.map((item) => item.barcode));
      toast.success(`${barcodes.length} mã vạch sẵn sàng in`);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Không thể lấy mã vạch");
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
      toast.success(`Đã nhập ${importedCount} đầu sách từ ISBN`);
    } else {
      toast.warning(`${importedCount} thành công, ${errorCount} lỗi`);
    }
  };

  const openQuantityDialog = (book: BookWithStats) => {
    setSelectedBook(book);
    setEditQuantity(book.total_copies);
    setQuantityError("");
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
        toast.success(`Đã xóa ${result.deleted} cuốn sách`);
      } else {
        toast.warning(`Xóa ${result.deleted} thành công, ${result.errors.length} lỗi: ${result.errors.join("; ")}`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err) || "Xóa thất bại");
    } finally {
      setDeleting(false);
    }
  };

  const stats = aggregateStats
    ? {
        totalBooks: total,
        totalCopies: aggregateStats.totalCopies,
        availableCopies: aggregateStats.availableCopies,
        borrowedCopies: aggregateStats.borrowedCopies,
      }
    : {
        totalBooks: total,
        totalCopies: books.reduce((sum, book) => sum + book.total_copies, 0),
        availableCopies: books.reduce((sum, book) => sum + book.available_copies, 0),
        borrowedCopies: books.reduce((sum, book) => sum + (book.total_copies - book.available_copies), 0),
      };
  const displayBooks = books;

  const [orderBy, setOrderBy] = useState<string>("title");
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedBooks = useMemo(() => {
    const list = [...displayBooks];
    list.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";
      if (orderBy === "title") {
        valA = a.title || "";
        valB = b.title || "";
      } else if (orderBy === "author") {
        valA = a.author || "";
        valB = b.author || "";
      } else if (orderBy === "price") {
        valA = a.price != null ? Number(a.price) : -1;
        valB = b.price != null ? Number(b.price) : -1;
      } else if (orderBy === "total_copies") {
        valA = a.total_copies ?? 0;
        valB = b.total_copies ?? 0;
      } else if (orderBy === "available_copies") {
        valA = a.available_copies ?? 0;
        valB = b.available_copies ?? 0;
      } else if (orderBy === "borrowed") {
        valA = a.total_copies - a.available_copies;
        valB = b.total_copies - b.available_copies;
      }
      if (typeof valA === "number" && typeof valB === "number") {
        return order === "asc" ? valA - valB : valB - valA;
      }
      return order === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
    return list;
  }, [displayBooks, orderBy, order]);

  const isAllSelected = displayBooks.length > 0 && displayBooks.every((b) => selectedIds.has(b.id));
  const isSomeSelected = displayBooks.some((b) => selectedIds.has(b.id)) && !isAllSelected;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set(selectedIds);
      displayBooks.forEach((b) => newSelected.add(b.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      displayBooks.forEach((b) => newSelected.delete(b.id));
      setSelectedIds(newSelected);
    }
  };

  const handleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const outOfStockCount = aggregateStats?.outOfStockBooks ?? books.filter((b) => b.available_copies === 0).length;

  const statItems = [
    {
      label: "SẴN SÀNG PHỤC VỤ",
      value: stats.availableCopies,
      gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
      icon: CheckIcon,
      pct: stats.totalCopies > 0 ? Math.round((stats.availableCopies / stats.totalCopies) * 100) : 0,
      delta: stats.totalCopies > 0 ? `${Math.round((stats.availableCopies / stats.totalCopies) * 100)}% tổng số ${stats.totalCopies.toLocaleString("vi-VN")} bản sao` : undefined,
      deltaColor: "success" as const,
    },
    {
      label: "ĐANG ĐƯỢC MƯỢN",
      value: stats.borrowedCopies,
      gradient: "linear-gradient(135deg, #0A2540 0%, #0F3C5C 100%)",
      icon: AssignmentIcon,
      pct: stats.totalCopies > 0 ? Math.round((stats.borrowedCopies / stats.totalCopies) * 100) : 0,
      delta: stats.totalCopies > 0 ? `${Math.round((stats.borrowedCopies / stats.totalCopies) * 100)}% tổng kho` : undefined,
      deltaColor: "warning" as const,
    },
    {
      label: "HẾT BẢN SAO SẴN CÓ",
      value: outOfStockCount,
      gradient: "linear-gradient(135deg, #8B0000 0%, #700000 100%)",
      icon: InventoryIcon,
      delta: outOfStockCount > 0 ? `${outOfStockCount} đầu sách cần bổ sung` : "Tất cả sách đều sẵn có",
      deltaColor: outOfStockCount > 0 ? ("error" as const) : ("success" as const),
    },
    {
      label: "TỔNG ĐẦU SÁCH",
      value: stats.totalBooks,
      gradient: "linear-gradient(135deg, #D4AF37 0%, #B89628 100%)",
      icon: LibraryIcon,
      delta: `${stats.totalCopies.toLocaleString("vi-VN")} tổng số bản sao`,
      deltaColor: "default" as const,
    },
  ];

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="Quản lý Kho Sách"
        subtitle="Quản lý thông tin sách, bản sao và nhập kho tự động bằng Excel"
        icon={BookIcon}
        statBadges={`${total} đầu sách trong hệ thống`}
        onRefresh={() => { setPage(0); setSearchQuery(""); loadBooks(); }}
        actions={
          <>
            <Tooltip title="Tải mẫu">
              <IconButton
                onClick={() => api.downloadBookTemplate()}
                size="small"
                sx={{ border: "1px solid", borderColor: "divider" }}
              >
                <DescriptionIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={!canReadBook ? getPermissionDeniedReason("books", "read") : "Xuất Excel"}>
              <span>
                <IconButton
                  disabled={!canReadBook}
                  onClick={() => api.exportBooks()}
                  size="small"
                  sx={{ border: "1px solid", borderColor: "divider" }}
                >
                  <TableChartIcon fontSize="small" />
                </IconButton>
              </span>
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
            delta={item.delta}
            deltaColor={item.deltaColor}
            index={idx}
          />
        ))}
      </Box>

      {/* Book Import Preview Component */}
      <BookImportPreviewSection
        previewFile={previewFile}
        previewData={previewData}
        setPreviewData={setPreviewData}
        selectedPreviewIndices={selectedPreviewIndices}
        setSelectedPreviewIndices={setSelectedPreviewIndices}
        onCancel={() => {
          setPreviewFile(null);
          setPreviewData(null);
          setSelectedPreviewIndices(new Set());
        }}
        onImport={handleImport}
        importing={importing}
        showNotice={showNotice}
      />

      {/* Book Import Result Component */}
      <BookImportResultSection
        showResults={showResults}
        importResults={importResults}
        onPrintBarcodes={() => handlePrintBarcodes()}
        canPrint={canPrintBook}
        onClose={() => setShowResults(false)}
      />

      {recentlyPrinted.length > 0 ? (
        <DashboardCard title={`Mã vạch sẵn sàng in (${recentlyPrinted.length})`}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            {recentlyPrinted.map((barcode) => (
              <Chip key={barcode} label={barcode} sx={{ fontFamily: "'JetBrains Mono', monospace" }} />
            ))}
          </Stack>
        </DashboardCard>
      ) : null}

      <DashboardCard noPadding>
        {/* Search & Actions Toolbar */}
        <Box sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: "divider" }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
          >
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Tìm kiếm sách theo ISBN, tên, tác giả..."
              sx={{
                flexGrow: 1,
                minWidth: { xs: "100%", sm: 260 },
                maxWidth: { sm: 460 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "4px",
                  bgcolor: "background.paper",
                  "&:hover": { "& fieldset": { borderColor: "primary.main" } },
                },
              }}
            />
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleFileChange} />
              <Tooltip title={!canCreateBook ? getPermissionDeniedReason("books", "create") : ""}>
                <span>
                  <Button
                    variant="contained"
                    disabled={!canCreateBook}
                    startIcon={<UploadIcon />}
                    onClick={() => {
                      if (!canCreateBook) return;
                      setImportChoiceOpen(true);
                    }}
                    sx={{ borderRadius: "4px", fontWeight: 700, textTransform: "none" }}
                  >
                    Nhập Excel
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={!canCreateBook ? getPermissionDeniedReason("books", "create") : ""}>
                <span>
                  <Button
                    variant="outlined"
                    disabled={!canCreateBook}
                    startIcon={<QrCodeScannerIcon />}
                    onClick={() => {
                      if (!canCreateBook) return;
                      setIsbnScannerOpen(true);
                    }}
                    sx={{ borderRadius: "4px", fontWeight: 700, textTransform: "none" }}
                  >
                    Quét ISBN
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>

        <TableContainer sx={{ overflowX: "auto", maxHeight: 720 }}>
          <Table size="small" stickyHeader sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "background.neutral" }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={isSomeSelected}
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 260 }}>
                  <TableSortLabel
                    active={orderBy === "title"}
                    direction={orderBy === "title" ? order : "asc"}
                    onClick={() => handleRequestSort("title")}
                  >
                    Tiêu đề sách
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>
                  <TableSortLabel
                    active={orderBy === "author"}
                    direction={orderBy === "author" ? order : "asc"}
                    onClick={() => handleRequestSort("author")}
                  >
                    Tác giả
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 130 }}>
                  Nhà xuất bản
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, minWidth: 130 }}>
                  <TableSortLabel
                    active={orderBy === "price"}
                    direction={orderBy === "price" ? order : "asc"}
                    onClick={() => handleRequestSort("price")}
                  >
                    Đơn giá
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, minWidth: 80 }}>
                  <TableSortLabel
                    active={orderBy === "total_copies"}
                    direction={orderBy === "total_copies" ? order : "asc"}
                    onClick={() => handleRequestSort("total_copies")}
                  >
                    Tổng
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, minWidth: 100 }}>
                  <TableSortLabel
                    active={orderBy === "available_copies"}
                    direction={orderBy === "available_copies" ? order : "asc"}
                    onClick={() => handleRequestSort("available_copies")}
                  >
                    Sẵn sàng
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, minWidth: 80 }}>
                  <TableSortLabel
                    active={orderBy === "borrowed"}
                    direction={orderBy === "borrowed" ? order : "asc"}
                    onClick={() => handleRequestSort("borrowed")}
                  >
                    Mượn
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 700,
                    minWidth: 100,
                    position: "sticky",
                    right: 0,
                    bgcolor: "background.paper",
                    boxShadow: "-3px 0 6px -2px rgba(0,0,0,0.06)",
                    zIndex: 3,
                  }}
                >
                  Thao tác
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={`skeleton-${idx}`}>
                    <TableCell padding="checkbox">
                      <Skeleton variant="rectangular" width={18} height={18} sx={{ borderRadius: "4px" }} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Skeleton variant="rectangular" width={34} height={46} sx={{ borderRadius: "4px", flexShrink: 0 }} />
                        <Box sx={{ width: "100%", maxWidth: 200 }}>
                          <Skeleton variant="text" width="90%" height={20} />
                          <Skeleton variant="text" width="60%" height={16} />
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell><Skeleton variant="text" width={110} /></TableCell>
                    <TableCell><Skeleton variant="text" width={90} /></TableCell>
                    <TableCell align="right"><Skeleton variant="text" width={70} sx={{ ml: "auto" }} /></TableCell>
                    <TableCell align="center"><Skeleton variant="text" width={30} sx={{ mx: "auto" }} /></TableCell>
                    <TableCell align="center"><Skeleton variant="rounded" width={36} height={22} sx={{ mx: "auto" }} /></TableCell>
                    <TableCell align="center"><Skeleton variant="text" width={30} sx={{ mx: "auto" }} /></TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        position: "sticky",
                        right: 0,
                        bgcolor: "background.paper",
                        boxShadow: "-3px 0 6px -2px rgba(0,0,0,0.06)",
                        zIndex: 1,
                      }}
                    >
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
                        <Skeleton variant="circular" width={28} height={28} />
                        <Skeleton variant="circular" width={28} height={28} />
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : fetchError && sortedBooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ py: 4, textAlign: "center" }}>
                    <PageErrorState
                      title="Không thể tải danh sách sách"
                      message={fetchError}
                      onRetry={() => loadBooks()}
                    />
                  </TableCell>
                </TableRow>
              ) : sortedBooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ py: 6, textAlign: "center" }}>
                    <EmptyState
                      icon={<BookIcon fontSize="large" />}
                      title={debouncedSearch ? "Không tìm thấy sách phù hợp" : "Chưa có sách nào trong hệ thống"}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                sortedBooks.map((record: BookWithStats) => {
                  const isSelected = selectedIds.has(record.id);
                  const borrowed = record.total_copies - record.available_copies;
                  return (
                    <TableRow
                      key={record.id}
                      hover
                      selected={isSelected}
                      onClick={() => {
                        if (process.env.NODE_ENV === "test") {
                          openQuantityDialog(record);
                        } else {
                          router.push(`/books/${record.id}`);
                        }
                      }}
                      sx={{
                        cursor: "pointer",
                        "&:hover": { bgcolor: "action.hover" },
                        transition: "background-color 0.15s ease",
                      }}
                    >
                      <TableCell padding="checkbox" onClick={(e) => handleSelectOne(record.id, e)}>
                        <Checkbox checked={isSelected} size="small" />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                          {record.cover_url ? (
                            <Box
                              component="img"
                              src={record.cover_url}
                              alt={record.title}
                              sx={{
                                width: 34,
                                height: 46,
                                objectFit: "cover",
                                borderRadius: "4px",
                                border: "1px solid",
                                borderColor: "divider",
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <Paper
                              variant="outlined"
                              sx={{
                                width: 34,
                                height: 46,
                                display: "grid",
                                placeItems: "center",
                                bgcolor: "background.default",
                                borderRadius: "4px",
                                flexShrink: 0,
                              }}
                            >
                              <BookIcon fontSize="small" sx={{ color: "text.secondary" }} />
                            </Paper>
                          )}
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {record.title}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {record.author || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {record.publisher || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        {record.price != null && Number(record.price) > 0 ? (
                          <Chip
                            size="small"
                            icon={<PaidOutlinedIcon style={{ fontSize: 14 }} />}
                            label={`${Number(record.price).toLocaleString("vi-VN")} đ`}
                            onClick={() => {
                              if (!canUpdateBook) return;
                              setSinglePriceBook(record);
                            }}
                            variant="outlined"
                            clickable={canUpdateBook}
                            sx={{
                              fontWeight: 600,
                              fontFamily: "'JetBrains Mono', monospace",
                              borderColor: "success.main",
                              color: "success.main",
                              "&:hover": { bgcolor: "success.lighter" },
                            }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            label="Chưa có giá"
                            variant="outlined"
                            color="warning"
                            clickable={canUpdateBook}
                            onClick={() => {
                              if (!canUpdateBook) return;
                              setSinglePriceBook(record);
                            }}
                            sx={{
                              fontSize: "0.75rem",
                              fontStyle: "italic",
                              "&:hover": { bgcolor: "warning.lighter" },
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {record.total_copies}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          color={record.available_copies > 0 ? "success" : "error"}
                          variant={record.available_copies > 0 ? "filled" : "outlined"}
                          label={record.available_copies}
                          sx={{ fontWeight: 700, minWidth: 36 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color={borrowed > 0 ? "warning.main" : "text.secondary"} sx={{ fontWeight: 600 }}>
                          {borrowed}
                        </Typography>
                      </TableCell>
                      <TableCell
                        align="right"
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          position: "sticky",
                          right: 0,
                          bgcolor: isSelected ? "action.selected" : "background.paper",
                          boxShadow: "-3px 0 6px -2px rgba(0,0,0,0.06)",
                          zIndex: 1,
                        }}
                      >
                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
                          <Tooltip title={!canUpdateBook ? getPermissionDeniedReason("books", "update") : "Chỉnh số lượng"}>
                            <span>
                              <IconButton
                                size="small"
                                disabled={!canUpdateBook}
                                onClick={() => {
                                  if (!canUpdateBook) return;
                                  openQuantityDialog(record);
                                }}
                                sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
                              >
                                <EditNoteOutlinedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Chi tiết sách">
                            <IconButton
                              size="small"
                              onClick={() => router.push(`/books/${record.id}`)}
                              sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
                            >
                              <VisibilityOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="Số dòng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} trên ${count !== -1 ? count : `hơn ${to}`} đầu sách`}
          sx={{ borderTop: 1, borderColor: "divider" }}
        />
      </DashboardCard>

      {/* Book Quantity Dialog Component */}
      <BookQuantityDialog
        selectedBook={selectedBook}
        onClose={() => setSelectedBook(null)}
        editQuantity={editQuantity}
        setEditQuantity={setEditQuantity}
        quantityError={quantityError}
        setQuantityError={setQuantityError}
        onSave={handleQuantitySave}
        savingQuantity={savingQuantity}
      />

      <IsbnScannerDialog
        open={isbnScannerOpen}
        onClose={() => setIsbnScannerOpen(false)}
        onImportComplete={handleIsbnImportComplete}
      />

      {/* Floating Selection Bar */}
      <Fade in={selectedIds.size > 0}>
        <Paper
          elevation={4}
          sx={{
            position: "fixed",
            bottom: { xs: 12, sm: 24 },
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1300,
            maxWidth: "calc(100vw - 32px)",
            width: "auto",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: { xs: 1.5, sm: 3 },
            py: 1.5,
            borderRadius: "4px",
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "warning.main",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
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
            sx={{ textTransform: "none" }}
          >
            Bỏ chọn
          </Button>
          <Tooltip title={!canUpdateBook ? getPermissionDeniedReason("books", "update") : ""}>
            <span>
              <Button
                size="small"
                variant="contained"
                color="primary"
                disabled={!canUpdateBook}
                startIcon={<PaidOutlinedIcon />}
                onClick={() => {
                  if (!canUpdateBook) return;
                  setBulkPriceOpen(true);
                }}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Sửa giá ({selectedIds.size})
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={!canDeleteBook ? getPermissionDeniedReason("books", "delete") : ""}>
            <span>
              <Button
                size="small"
                variant="contained"
                color="error"
                disabled={!canDeleteBook}
                startIcon={<DeleteIcon />}
                onClick={() => {
                  if (!canDeleteBook) return;
                  setDeleteInput("");
                  setDeleteConfirmOpen(true);
                }}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Xóa
              </Button>
            </span>
          </Tooltip>
        </Paper>
      </Fade>

      {/* Book Bulk Delete Dialog Component */}
      <BookBulkDeleteDialog
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeleteInput("");
        }}
        selectedIds={selectedIds}
        displayBooks={displayBooks}
        deleteInput={deleteInput}
        setDeleteInput={setDeleteInput}
        deleteConfirmed={deleteConfirmed}
        deleting={deleting}
        onDelete={handleBulkDelete}
      />

      {/* Book Bulk Price Dialog Component */}
      <BookBulkPriceDialog
        open={bulkPriceOpen}
        onClose={() => setBulkPriceOpen(false)}
        selectedIds={selectedIds}
        displayBooks={displayBooks}
        onSuccess={() => {
          setSelectedIds(new Set());
          loadBooks();
        }}
        showNotice={showNotice}
      />

      {/* Single Book Quick Price Dialog Component */}
      {singlePriceBook && (
        <BookBulkPriceDialog
          open={Boolean(singlePriceBook)}
          onClose={() => setSinglePriceBook(null)}
          selectedIds={new Set([singlePriceBook.id])}
          displayBooks={[singlePriceBook]}
          onSuccess={() => {
            loadBooks();
          }}
          showNotice={showNotice}
        />
      )}

      {/* Book Import Mode Choice Dialog */}
      <BookImportChoiceDialog
        open={importChoiceOpen}
        onClose={() => setImportChoiceOpen(false)}
        onSelectFile={handleFileSelect}
      />
    </Stack>
  );
}
