"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import api, { getErrorMessage } from "@/lib/api-client";
import type {
  BookWithStats,
  BookImportPreviewRow,
  BookImportResultRow,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/ui/StatCard";
import { useToast } from "@/components/ui/Toast";
import {
  BookOpen,
  Upload,
  FileSpreadsheet,
  Search,
  X,
  CheckCircle,
  AlertCircle,
  SkipForward,
  Eye,
  Download,
  Printer,
  Package,
  Library,
  RefreshCw,
} from "lucide-react";

export default function BooksPage() {
  const { addToast } = useToast();
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
  const [importing, setImporting] = useState(false);

  const [importResults, setImportResults] = useState<BookImportResultRow[] | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [recentlyPrinted, setRecentlyPrinted] = useState<string[]>([]);

  const [page, setPage] = useState(0);
  const limit = 30;

  const [selectedBook, setSelectedBook] = useState<BookWithStats | null>(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [editQuantity, setEditQuantity] = useState(0);
  const [savingQuantity, setSavingQuantity] = useState(false);
  const [quantityError, setQuantityError] = useState("");

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listBooks({ skip: page * limit, limit });
      setBooks(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      addToast({ type: "error", title: "Lỗi tải dữ liệu", description: getErrorMessage(err) });
      setBooks([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, addToast]);

  const handleRowClick = (book: BookWithStats) => {
    setSelectedBook(book);
    setEditQuantity(book.total_copies);
    setQuantityError("");
    setShowQuantityModal(true);
  };

  const handleCloseModal = () => {
    setShowQuantityModal(false);
    setSelectedBook(null);
    setEditQuantity(0);
    setQuantityError("");
  };

  useEffect(() => { loadBooks(); }, [loadBooks]);

  useEffect(() => {
    if (!showQuantityModal) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleCloseModal(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showQuantityModal, handleCloseModal]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.searchBooks(searchQuery);
        setSearchResults(results);
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewFile(file);
    setPreviewData(null);
    setShowResults(false);
    setPreviewLoading(true);
    try {
      const data = await api.getBarcodePreview(file);
      setPreviewData(data.rows);
      addToast({ type: "info", title: "Xem trước file", description: `Đã đọc ${data.total_rows} dòng (hiển thị tối đa 100)` });
    } catch (err) {
      addToast({ type: "error", title: "Lỗi đọc file", description: getErrorMessage(err) });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleImport = async () => {
    if (!previewFile) return;
    setImporting(true);
    setShowResults(false);
    try {
      const result = await api.importBooks(previewFile);
      setImportResults(result.results);
      setShowResults(true);
      setPreviewData(null);
      setPreviewFile(null);
      setSearchQuery("");
      setPage(0);
      await loadBooks();
      if (result.errors === 0) {
        addToast({ type: "success", title: "Nhập kho thành công", description: `Đã nhập ${result.imported} đầu sách (${result.skipped} bị bỏ qua)` });
      } else {
        addToast({ type: "warning", title: "Nhập kho hoàn thành (có lỗi)", description: `${result.imported} nhập thành công, ${result.errors} lỗi` });
      }
    } catch (err) {
      addToast({ type: "error", title: "Lỗi nhập kho", description: getErrorMessage(err) });
    } finally {
      setImporting(false);
    }
  };

  const handleQuantitySave = async () => {
    if (!selectedBook) return;
    const borrowed = selectedBook.total_copies - selectedBook.available_copies;
    if (editQuantity < borrowed) {
      setQuantityError(`Tối thiểu ${borrowed} bản (${borrowed} bản đang mượn)`);
      return;
    }
    if (editQuantity < 1) {
      setQuantityError("Số lượng phải lớn hơn 0");
      return;
    }
    setSavingQuantity(true);
    try {
      const updated = await api.updateBookQuantity(selectedBook.id, editQuantity);
      setBooks(prev => prev.map(b => b.id === updated.id ? updated : b));
      setSearchResults(prev => prev.map(b => b.id === updated.id ? updated : b));
      addToast({ type: "success", title: "Đã cập nhật", description: `Số lượng: ${updated.total_copies} bản` });
      handleCloseModal();
    } catch (err) {
      addToast({ type: "error", title: "Lỗi", description: getErrorMessage(err) });
    } finally {
      setSavingQuantity(false);
    }
  };

  const handlePrintBarcodes = async (bookId?: string) => {
    try {
      const barcodes = await api.getBarcodes(bookId);
      if (barcodes.length === 0) {
        addToast({ type: "info", title: "Không có mã vạch", description: "Không tìm thấy mã vạch để in" });
        return;
      }
      setRecentlyPrinted(barcodes.map(b => b.barcode));
      addToast({ type: "success", title: "Đã sinh mã vạch", description: `${barcodes.length} mã vạch sẵn sàng in (xem bảng bên dưới)` });
    } catch (err) {
      addToast({ type: "error", title: "Lỗi", description: getErrorMessage(err) });
    }
  };

  const stats = {
    totalBooks: total,
    totalCopies: (books ?? []).reduce((s, b) => s + (b?.total_copies ?? 0), 0),
    availableCopies: (books ?? []).reduce((s, b) => s + (b?.available_copies ?? 0), 0),
    borrowedCopies: (books ?? []).reduce((s, b) => s + ((b?.total_copies ?? 0) - (b?.available_copies ?? 0)), 0),
  };

  const displayBooks = searchQuery.trim() ? searchResults : books;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tổng đầu sách" value={stats.totalBooks} icon={Library} accentColor="primary" description="Trong hệ thống" />
        <StatCard label="Tổng bản sao" value={stats.totalCopies} icon={Package} accentColor="info" description="Tất cả các bản" />
        <StatCard label="Sẵn sàng" value={stats.availableCopies} icon={CheckCircle} accentColor="success" description="Có thể mượn" />
        <StatCard label="Đang được mượn" value={stats.borrowedCopies} icon={BookOpen} accentColor="warning" description="Đang lưu hành" />
      </div>

      {/* Search + Import */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[280px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
          <input
            className="input pl-10 pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm sách (ISBN, tên, tác giả)..."
          />
          {searching && (
            <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 animate-spin" />
          )}
          {searchQuery && !searching && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text">
              <X size={14} />
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
        <Button variant="secondary" icon={<Upload size={15} />} onClick={() => fileInputRef.current?.click()}>
          Nhập kho Excel
        </Button>
        <Button variant="ghost" icon={<RefreshCw size={15} />} onClick={() => { setPage(0); setSearchQuery(""); loadBooks(); }}>
          Tải lại
        </Button>
        <Button variant="ghost" icon={<Download size={15} />} onClick={() => api.downloadBookTemplate()}>
          Tải mẫu .xlsx
        </Button>
        <Button variant="ghost" icon={<Download size={15} />} onClick={() => api.exportBooks()}>
          Xuất Excel
        </Button>
      </div>

      {/* Search results hint */}
      {searchQuery.trim() && (
        <Card padding="none">
          <CardContent className="p-0">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <p className="text-body-sm text-text-3">
                Kết quả tìm kiếm: <span className="text-text font-medium">{searchResults.length}</span> cuốn sách
              </p>
              {searchResults.length > 0 && (
                <Button size="sm" variant="ghost" icon={<Eye size={14} />} onClick={() => handlePrintBarcodes()}>
                  In mã vạch
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload zone / Preview */}
      {previewFile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-primary" />
              Xem trước: {previewFile.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw size={20} className="animate-spin text-text-3" />
                <span className="ml-3 text-text-3">Đang đọc file...</span>
              </div>
            ) : previewData && previewData.length > 0 ? (
              <>
                <div className="flex items-center gap-3 text-body-sm text-text-3">
                  <span className="px-2 py-0.5 rounded bg-success/15 text-success">{previewData.filter(r => r.status !== "invalid").length} hàng hợp lệ</span>
                  <span className="px-2 py-0.5 rounded bg-error/15 text-error">{previewData.filter(r => r.status === "invalid").length} hàng lỗi</span>
                </div>
                <div className="overflow-x-auto max-h-72 overflow-y-auto border border-border rounded-lg">
                  <table className="table">
                    <thead className="sticky top-0 bg-surface-2">
                      <tr>
                        <th>ISBN</th>
                        <th>Tên sách</th>
                        <th>Tác giả</th>
                        <th>SL</th>
                        <th>Mã vạch mẫu</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 20).map((row, i) => (
                        <tr key={i} className={row.status === "invalid" ? "bg-error/5" : ""}>
                          <td className="font-mono text-sm">{row.isbn || "-"}</td>
                          <td className="text-sm max-w-[200px] truncate">{row.title || "-"}</td>
                          <td className="text-text-3 text-sm">{row.author || "-"}</td>
                          <td className="text-center font-mono">{row.quantity}</td>
                          <td className="font-mono text-xs text-text-3">{row.barcodes[0] || "-"}</td>
                          <td>
                            <Badge variant={row.status === "exists" ? "neutral" : row.status === "new" ? "success" : row.status === "warning" ? "warning" : "error"}>
                              {row.status === "exists" ? "Đã có" : row.status === "new" ? "Mới" : row.status === "warning" ? "Cảnh báo" : "Lỗi"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.length > 20 && (
                  <p className="text-caption text-text-3 text-center">...và {previewData.length - 20} dòng nữa</p>
                )}
                <div className="flex gap-3 justify-end">
                  <Button variant="ghost" onClick={() => { setPreviewFile(null); setPreviewData(null); }}>
                    Hủy
                  </Button>
                  <Button icon={<CheckCircle size={15} />} onClick={handleImport} loading={importing}>
                    Xác nhận nhập kho
                  </Button>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Import results */}
      {showResults && importResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle size={16} className="text-success" />
              Kết quả nhập kho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 text-body-sm">
              <span className="px-2 py-0.5 rounded bg-success/15 text-success">Nhập: {importResults.filter(r => r.status === "imported").length}</span>
              <span className="px-2 py-0.5 rounded bg-info/15 text-info">Cập nhật: {importResults.filter(r => r.status === "updated").length}</span>
              <span className="px-2 py-0.5 rounded bg-warning/15 text-warning">Cảnh báo: {importResults.filter(r => r.status === "warning").length}</span>
              <span className="px-2 py-0.5 rounded bg-text-2/15 text-text-2">Bỏ qua: {importResults.filter(r => r.status === "skipped").length}</span>
              <span className="px-2 py-0.5 rounded bg-error/15 text-error">Lỗi: {importResults.filter(r => r.status === "error").length}</span>
            </div>
            <div className="overflow-x-auto max-h-64 overflow-y-auto border border-border rounded-lg">
              <table className="table">
                <thead className="sticky top-0 bg-surface-2">
                  <tr>
                    <th>ISBN</th>
                    <th>Tên sách</th>
                    <th>SL</th>
                    <th>Barcode mẫu</th>
                    <th>Trạng thái</th>
                    <th>Thông báo</th>
                  </tr>
                </thead>
                <tbody>
                  {importResults.map((row, i) => (
                    <tr key={i} className={row.status === "error" ? "bg-error/5" : row.status === "warning" ? "bg-warning/5" : ""}>
                      <td className="font-mono text-sm">{row.isbn || "-"}</td>
                      <td className="text-sm max-w-[200px] truncate">{row.title || "-"}</td>
                      <td className="text-center font-mono">{row.quantity}</td>
                      <td className="font-mono text-xs text-text-3">{row.barcodes[0] || "-"}</td>
                      <td>
                        <Badge variant={row.status === "imported" ? "success" : row.status === "updated" ? "info" : row.status === "warning" ? "warning" : row.status === "skipped" ? "neutral" : "error"}>
                          {row.status === "updated" ? "Cập nhật" : row.status === "imported" ? "Thành công" : row.status === "warning" ? "Cảnh báo" : row.status === "skipped" ? "Bỏ qua" : "Lỗi"}
                        </Badge>
                      </td>
                      <td className="text-caption text-text-3 max-w-[200px] truncate">{row.message || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {importResults.some(r => r.status === "imported" || r.status === "warning") && (
              <div className="flex gap-3">
                <Button size="sm" variant="secondary" icon={<Printer size={14} />} onClick={() => handlePrintBarcodes()}>
                  In mã vạch vừa tạo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recently printed barcodes */}
      {recentlyPrinted.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer size={16} className="text-text-3" />
              Mã vạch sẵn sàng in ({recentlyPrinted.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {recentlyPrinted.map((bc) => (
                <div key={bc} className="flex flex-col items-center p-2 border border-border rounded-lg bg-surface-2 min-w-[120px]">
                  <span className="font-mono text-sm font-bold text-text">{bc}</span>
                </div>
              ))}
            </div>
            <p className="text-caption text-text-3 mt-3">Sử dụng trình in mã vạch của hệ thống hoặc copy danh sách barcode để in theo template.</p>
          </CardContent>
        </Card>
      )}

      {/* Book listing */}
      <Card padding="none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>ISBN</th>
                  <th>Tiêu đề</th>
                  <th>Tác giả</th>
                  <th className="text-center">Tổng</th>
                  <th className="text-center">Sẵn sàng</th>
                  <th className="text-center">Mượn</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-text-3">
                      <RefreshCw size={18} className="animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : displayBooks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center mx-auto mb-3 text-text-3">
                        <BookOpen size={20} />
                      </div>
                      <p className="text-text-3">
                        {searchQuery ? "Không tìm thấy sách phù hợp" : "Chưa có sách nào trong hệ thống"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayBooks.map((book) => (
                    <tr key={book.id} className="group cursor-pointer hover:bg-surface-2/50 transition-colors" onClick={() => handleRowClick(book)}>
                      <td className="font-mono text-sm text-primary">{book.isbn}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          {book.cover_url ? (
                            <img src={book.cover_url} alt={book.title} className="w-8 h-10 object-cover rounded border border-border" />
                          ) : (
                            <div className="w-8 h-10 rounded border border-border bg-surface-2 flex items-center justify-center">
                              <BookOpen size={14} className="text-text-3" />
                            </div>
                          )}
                          <span className="font-medium text-sm">{book.title}</span>
                        </div>
                      </td>
                      <td className="text-text-3 text-sm">{book.author || "-"}</td>
                      <td className="text-center font-mono">{book.total_copies}</td>
                      <td className="text-center">
                        <Badge variant={book.available_copies > 0 ? "success" : "error"}>
                          {book.available_copies}
                        </Badge>
                      </td>
                      <td className="text-center font-mono text-text-3">
                        {book.total_copies - book.available_copies}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!searchQuery && total > limit && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-caption text-text-3">
                Hiển thị {page * limit + 1}–{Math.min((page + 1) * limit, total)} / {total} đầu sách
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  Trước
                </Button>
                <Button size="sm" variant="ghost" disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)}>
                  Sau
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quantity edit modal */}
      {showQuantityModal && selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={handleCloseModal}>
          <div className="bg-surface rounded-xl border border-border shadow-xl w-full max-w-md animate-fade-in-up" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-3 p-5 border-b border-border">
              {selectedBook.cover_url ? (
                <img src={selectedBook.cover_url} alt={selectedBook.title} className="w-10 h-13 object-cover rounded border border-border" />
              ) : (
                <div className="w-10 h-13 rounded border border-border bg-surface-2 flex items-center justify-center">
                  <BookOpen size={16} className="text-text-3" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-display font-semibold text-text truncate">{selectedBook.title}</h3>
                <p className="text-body-sm text-text-3 font-mono">ISBN: {selectedBook.isbn}</p>
              </div>
              <button onClick={handleCloseModal} className="text-text-3 hover:text-text transition-colors p-1">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5">
              <div className="flex gap-4 text-center">
                <div className="flex-1 p-3 rounded-lg bg-surface-2">
                  <p className="text-body-sm text-text-3">Tổng</p>
                  <p className="font-display font-bold text-text text-xl">{selectedBook.total_copies}</p>
                </div>
                <div className="flex-1 p-3 rounded-lg bg-surface-2">
                  <p className="text-body-sm text-text-3">Sẵn sàng</p>
                  <p className="font-display font-bold text-success text-xl">{selectedBook.available_copies}</p>
                </div>
                <div className="flex-1 p-3 rounded-lg bg-surface-2">
                  <p className="text-body-sm text-text-3">Đang mượn</p>
                  <p className="font-display font-bold text-warning text-xl">{selectedBook.total_copies - selectedBook.available_copies}</p>
                </div>
              </div>

              <div>
                <label className="block text-body-sm font-medium text-text-2 mb-1.5">Số lượng mới</label>
                <input
                  type="number"
                  min={1}
                  className={`input ${quantityError ? "border-error focus:border-error focus:ring-error/30" : ""}`}
                  value={editQuantity}
                  onChange={e => { setEditQuantity(parseInt(e.target.value) || 0); setQuantityError(""); }}
                />
                {quantityError && (
                  <p className="mt-1.5 text-body-sm text-error flex items-center gap-1">
                    <AlertCircle size={13} />
                    {quantityError}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 justify-end p-5 border-t border-border">
              <Button variant="ghost" onClick={handleCloseModal}>Huỷ</Button>
              <Button loading={savingQuantity} onClick={handleQuantitySave}>Lưu thay đổi</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}