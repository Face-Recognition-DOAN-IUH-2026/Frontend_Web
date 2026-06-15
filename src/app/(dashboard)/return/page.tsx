"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api, { getErrorMessage } from "@/lib/api-client";
import type {
  BorrowRecord,
  StaffActiveBorrowerSummary,
  StaffPatronActiveBorrowsResponse,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AlertTriangle,
  BookCheck,
  BookOpen,
  CheckCircle,
  Clock,
  RefreshCw,
  Search,
  UserRound,
  Users,
} from "lucide-react";

type BorrowerFilter = "all" | "overdue" | "active";

function isOverdue(record: BorrowRecord) {
  return new Date(record.due_at) < new Date();
}

function daysUntil(value: string) {
  const today = new Date();
  const due = new Date(value);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function dueBadge(record: BorrowRecord) {
  const left = daysUntil(record.due_at);
  if (left < 0) return <Badge variant="error" dot>Quá hạn {Math.abs(left)} ngày</Badge>;
  if (left <= 2) return <Badge variant="warning" dot>Sắp đến hạn</Badge>;
  return <Badge variant="success" dot>Đúng hạn</Badge>;
}

function borrowerName(borrower: StaffActiveBorrowerSummary) {
  return borrower.patron.full_name || borrower.patron.student_code || "Không rõ tên";
}

export default function ReturnPage() {
  const [borrowers, setBorrowers] = useState<StaffActiveBorrowerSummary[]>([]);
  const [selectedStudentCode, setSelectedStudentCode] = useState<string | null>(null);
  const [detail, setDetail] = useState<StaffPatronActiveBorrowsResponse | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<BorrowerFilter>("all");
  const [loadingBorrowers, setLoadingBorrowers] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadBorrowers = useCallback(async () => {
    setLoadingBorrowers(true);
    setError("");
    try {
      const data = await api.getActiveBorrowers();
      setBorrowers(data.items);
      setSelectedStudentCode((current) => {
        if (current && data.items.some((item) => item.patron.student_code === current)) return current;
        return data.items[0]?.patron.student_code ?? null;
      });
    } catch (err: any) {
      setError(getErrorMessage(err) || "Không thể tải danh sách độc giả đang mượn");
    } finally {
      setLoadingBorrowers(false);
    }
  }, []);

  const loadPatronDetail = useCallback(async (studentCode: string) => {
    setLoadingDetail(true);
    setError("");
    try {
      const data = await api.getActiveBorrowsByStudentCode(studentCode);
      setDetail(data);
    } catch (err: any) {
      setDetail(null);
      setError(getErrorMessage(err) || "Không thể tải sách đang mượn của độc giả");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    loadBorrowers();
  }, [loadBorrowers]);

  useEffect(() => {
    if (selectedStudentCode) {
      loadPatronDetail(selectedStudentCode);
    } else {
      setDetail(null);
    }
  }, [selectedStudentCode, loadPatronDetail]);

  const filteredBorrowers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return borrowers.filter((borrower) => {
      const matchesSearch = !q
        || borrower.patron.student_code.toLowerCase().includes(q)
        || (borrower.patron.full_name || "").toLowerCase().includes(q);
      const matchesFilter =
        filter === "all"
        || (filter === "overdue" && borrower.overdue_count > 0)
        || (filter === "active" && borrower.overdue_count === 0);
      return matchesSearch && matchesFilter;
    });
  }, [borrowers, filter, search]);

  const totals = useMemo(() => {
    return {
      borrowers: borrowers.length,
      books: borrowers.reduce((sum, item) => sum + item.total_borrowed, 0),
      overdue: borrowers.reduce((sum, item) => sum + item.overdue_count, 0),
    };
  }, [borrowers]);

  const selectedBorrower = useMemo(
    () => borrowers.find((item) => item.patron.student_code === selectedStudentCode) ?? null,
    [borrowers, selectedStudentCode],
  );

  const handleReturnRecord = async (record: BorrowRecord) => {
    setReturningId(record.id);
    setResult(null);
    setError("");
    try {
      await api.staffReturnBorrowRecord(record.id);
      setResult({ success: true, message: "Trả sách thành công" });
      await loadBorrowers();
      if (selectedStudentCode) {
        await loadPatronDetail(selectedStudentCode);
      }
    } catch (err: any) {
      setResult({ success: false, message: getErrorMessage(err) || "Trả sách thất bại" });
    } finally {
      setReturningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card accent="primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-label">Độc giả đang mượn</p>
              <p className="text-display-xl text-text">{totals.borrowers}</p>
            </div>
            <Users className="text-primary" size={24} />
          </div>
        </Card>
        <Card accent="success">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-label">Sách chưa trả</p>
              <p className="text-display-xl text-text">{totals.books}</p>
            </div>
            <BookOpen className="text-success" size={24} />
          </div>
        </Card>
        <Card accent="error">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-label">Sách quá hạn</p>
              <p className="text-display-xl text-text">{totals.overdue}</p>
            </div>
            <AlertTriangle className="text-error" size={24} />
          </div>
        </Card>
      </div>

      {error ? (
        <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-body-sm text-error">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className={`rounded-lg border px-4 py-3 text-body-sm ${
          result.success ? "border-success/30 bg-success/10 text-success" : "border-error/30 bg-error/10 text-error"
        }`}>
          <div className="flex items-center gap-2">
            {result.success ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span>{result.message}</span>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        <Card className="min-h-[620px]">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users size={17} className="text-text-3" />
                Độc giả đang mượn
              </CardTitle>
              <p className="mt-1 text-body-sm text-text-3">Chọn độc giả để xem sách cần trả</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={loadBorrowers}
              disabled={loadingBorrowers}
              title="Tải lại"
            >
              <RefreshCw size={16} className={loadingBorrowers ? "animate-spin" : ""} />
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            <Input
              placeholder="Tìm theo MSSV hoặc tên..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              icon={<Search size={16} />}
            />

            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "all", label: "Tất cả" },
                { value: "overdue", label: "Quá hạn" },
                { value: "active", label: "Đang mượn" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setFilter(item.value as BorrowerFilter)}
                  className={`rounded-md border px-3 py-2 text-body-sm font-medium transition-colors ${
                    filter === item.value
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-surface-2 text-text-2 hover:text-text"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {loadingBorrowers ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : borrowers.length === 0 ? (
              <EmptyState
                icon={<BookCheck size={24} />}
                title="Không có độc giả đang mượn sách"
                description="Tất cả sách đã được trả hoặc chưa có phiếu mượn đang hoạt động."
              />
            ) : filteredBorrowers.length === 0 ? (
              <EmptyState
                icon={<Search size={24} />}
                title="Không tìm thấy độc giả phù hợp"
                description="Thử đổi từ khóa tìm kiếm hoặc bộ lọc."
              />
            ) : (
              <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
                {filteredBorrowers.map((borrower) => {
                  const selected = borrower.patron.student_code === selectedStudentCode;
                  return (
                    <button
                      key={borrower.patron.id}
                      onClick={() => {
                        setSelectedStudentCode(borrower.patron.student_code);
                        setResult(null);
                      }}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-surface-2/60 hover:border-primary/40 hover:bg-surface-2"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-body-sm font-semibold text-text">{borrowerName(borrower)}</p>
                          <p className="mt-1 font-mono text-caption text-text-3">{borrower.patron.student_code}</p>
                        </div>
                        {borrower.overdue_count > 0 ? (
                          <Badge variant="error">{borrower.overdue_count} quá hạn</Badge>
                        ) : (
                          <Badge variant="success">Đúng hạn</Badge>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-caption text-text-3">
                        <span>{borrower.total_borrowed} sách đang mượn</span>
                        <span className="text-right">Hạn gần nhất {formatDate(borrower.nearest_due_at)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[620px]">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserRound size={17} className="text-text-3" />
                Chi tiết trả sách
              </CardTitle>
              <p className="mt-1 text-body-sm text-text-3">
                {selectedBorrower ? `${borrowerName(selectedBorrower)} - ${selectedBorrower.patron.student_code}` : "Chọn một độc giả ở danh sách bên trái"}
              </p>
            </div>
          </CardHeader>

          <CardContent>
            {!selectedStudentCode ? (
              <EmptyState
                icon={<UserRound size={24} />}
                title="Chưa chọn độc giả"
                description="Chọn một độc giả đang mượn để xem sách và xác nhận trả."
                className="min-h-[420px]"
              />
            ) : loadingDetail ? (
              <div className="flex min-h-[420px] items-center justify-center">
                <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : !detail || detail.records.length === 0 ? (
              <EmptyState
                icon={<BookCheck size={24} />}
                title="Đã trả hết sách"
                description="Độc giả này không còn sách đang mượn."
                className="min-h-[420px]"
              />
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
                  <Badge variant="primary">{detail.total} sách đang mượn</Badge>
                  {detail.overdue_count > 0 ? (
                    <Badge variant="error">{detail.overdue_count} quá hạn</Badge>
                  ) : (
                    <Badge variant="success">Không quá hạn</Badge>
                  )}
                  {detail.patron.email ? <span className="text-body-sm text-text-3">{detail.patron.email}</span> : null}
                </div>

                {detail.records.map((record) => {
                  const overdue = isOverdue(record);
                  const book = record.book;
                  return (
                    <div
                      key={record.id}
                      className={`rounded-lg border p-4 ${
                        overdue ? "border-error/40 bg-error/5" : "border-border bg-surface-2/50"
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {dueBadge(record)}
                            <span className="font-mono text-caption text-text-3">{book?.isbn || record.book_id}</span>
                          </div>
                          <h3 className="mt-2 text-heading-md text-text">
                            {book?.title || record.book_id}
                          </h3>
                          {book?.author ? (
                            <p className="mt-1 text-body-sm text-text-3">{book.author}</p>
                          ) : null}
                          <div className="mt-3 grid grid-cols-1 gap-2 text-body-sm text-text-3 sm:grid-cols-3">
                            <span className="flex items-center gap-1.5">
                              <Clock size={14} />
                              Mượn {formatDate(record.borrow_at)}
                            </span>
                            <span className={overdue ? "font-semibold text-error" : ""}>
                              Hạn {formatDate(record.due_at)}
                            </span>
                            <span>Kệ {record.shelf_location || book?.shelf_location || "-"}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleReturnRecord(record)}
                          loading={returningId === record.id}
                          disabled={!!returningId}
                          icon={<CheckCircle size={16} />}
                          className="shrink-0"
                        >
                          Xác nhận trả
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
