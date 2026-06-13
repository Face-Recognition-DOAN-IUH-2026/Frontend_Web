"use client";

import { useState } from "react";
import api, { getErrorMessage } from "@/lib/api-client";
import type { BorrowRecord } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { BookOpen, CheckCircle, XCircle, ScanLine, ArrowRight } from "lucide-react";

export default function ReturnPage() {
  const [barcode, setBarcode] = useState("");
  const [record, setRecord] = useState<BorrowRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [returning, setReturning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleLookup = async () => {
    if (!barcode.trim()) return;
    setLoading(true);
    setLookupError("");
    setResult(null);
    setRecord(null);
    try {
      const data = await api.lookupBorrowByBarcode(barcode.trim());
      if (!data) {
        setLookupError("Không tìm thấy bản ghi mượn cho mã vạch này");
        return;
      }
      setRecord(data);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setLookupError("Không tìm thấy bản ghi mượn cho mã vạch này");
      } else {
        setLookupError(getErrorMessage(err) || "Lỗi tra cứu");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!record) return;
    setReturning(true);
    setResult(null);
    try {
      await api.staffReturnBook(barcode.trim());
      setResult({ success: true, message: "Trả sách thành công!" });
      setRecord(null);
      setBarcode("");
    } catch (err: any) {
      setResult({ success: false, message: getErrorMessage(err) || "Trả sách thất bại" });
    } finally {
      setReturning(false);
    }
  };

  const isOverdue = record ? new Date(record.due_at) < new Date() : false;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Search bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <ScanLine size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
          <input
            className="input pl-10 text-lg font-mono"
            value={barcode}
            onChange={(e) => { setBarcode(e.target.value); setResult(null); }}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            placeholder="Nhập mã vạch..."
            autoFocus
          />
        </div>
        <button
          className="btn-primary px-6 py-2.5 text-body-md"
          onClick={handleLookup}
          disabled={loading || !barcode.trim()}
        >
          {loading ? "Đang tra..." : "Tra cứu"}
        </button>
      </div>

      {/* Error */}
      {lookupError && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-3 text-error">
          <XCircle size={18} />
          {lookupError}
        </div>
      )}

      {/* Record info */}
      {record && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen size={18} className="text-primary" />
              Thông tin mượn sách
            </CardTitle>
            <Badge variant={record.status === "borrowed" ? "warning" : "neutral"}>
              {record.status === "borrowed" ? "Đang mượn" : record.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-body-sm">
              <div>
                <p className="text-text-3 text-caption">Mã vạch</p>
                <p className="font-mono font-medium text-text">{barcode}</p>
              </div>
              <div>
                <p className="text-text-3 text-caption">Mã bạn đọc</p>
                <p className="font-mono font-medium text-text">{record.patron_id}</p>
              </div>
              <div>
                <p className="text-text-3 text-caption">Mã sách</p>
                <p className="font-mono font-medium text-text">{record.book_id}</p>
              </div>
              <div>
                <p className="text-text-3 text-caption">Vị trí</p>
                <p className="font-mono text-text">{record.shelf_location || "-"}</p>
              </div>
              <div>
                <p className="text-text-3 text-caption">Ngày mượn</p>
                <p className="text-text">{new Date(record.borrow_at).toLocaleDateString("vi-VN")}</p>
              </div>
              <div className={isOverdue ? "text-error" : ""}>
                <p className="text-text-3 text-caption">Hạn trả</p>
                <p className={`font-semibold ${isOverdue ? "text-error" : "text-text"}`}>
                  {new Date(record.due_at).toLocaleDateString("vi-VN")}
                  {isOverdue && " ⚠️"}
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <button
                className="btn-primary w-full py-3 text-body-md font-semibold flex items-center justify-center gap-2"
                onClick={handleReturn}
                disabled={returning}
              >
                {returning ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-bg border-t-transparent animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Xác nhận trả sách
                  </>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <div className={`p-4 border rounded-lg flex items-center gap-3 animate-fade-in ${
          result.success
            ? "bg-success/10 border-success/20 text-success"
            : "bg-error/10 border-error/20 text-error"
        }`}>
          {result.success ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <p className="text-body-md font-medium">{result.message}</p>
        </div>
      )}
    </div>
  );
}