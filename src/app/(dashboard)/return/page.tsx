"use client";

import { useState } from "react";
import api, { getErrorMessage } from "@/lib/api-client";
import type { BorrowRecord, BookInfo } from "@/lib/types";
import { BookOpen, User, Calendar, CheckCircle, XCircle } from "lucide-react";

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

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Trả sách</h1>
        <p className="text-gray-600 mt-1">Quét mã vạch thẻ sách để trả (chỉ nhân viên thư viện)</p>
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 px-4 py-3 border rounded-lg text-lg font-mono"
          value={barcode}
          onChange={(e) => { setBarcode(e.target.value); setResult(null); }}
          onKeyDown={(e) => e.key === "Enter" && handleLookup()}
          placeholder="Nhập mã vạch..."
          autoFocus
        />
        <button
          className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          onClick={handleLookup}
          disabled={loading || !barcode.trim()}
        >
          {loading ? "Đang tra..." : "Tra cứu"}
        </button>
      </div>

      {lookupError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <XCircle className="w-5 h-5" />
          {lookupError}
        </div>
      )}

      {record && (
        <div className="p-6 bg-white border rounded-lg space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Thông tin mượn sách
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Mã vạch:</span>
              <p className="font-mono font-medium">{barcode}</p>
            </div>
            <div>
              <span className="text-gray-500">Trạng thái:</span>
              <p>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {record.status}
                </span>
              </p>
            </div>
            <div>
              <span className="text-gray-500">Mã bạn đọc:</span>
              <p className="font-medium">{record.patron_id}</p>
            </div>
            <div>
              <span className="text-gray-500">Mã sách:</span>
              <p className="font-medium">{record.book_id}</p>
            </div>
            <div>
              <span className="text-gray-500">Ngày mượn:</span>
              <p>{new Date(record.borrow_at).toLocaleDateString("vi-VN")}</p>
            </div>
            <div>
              <span className="text-gray-500">Hạn trả:</span>
              <p className="text-red-600 font-medium">{new Date(record.due_at).toLocaleDateString("vi-VN")}</p>
            </div>
          </div>
          <button
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg disabled:opacity-50 text-lg font-semibold"
            onClick={handleReturn}
            disabled={returning}
          >
            {returning ? "Đang xử lý..." : "Xác nhận trả sách"}
          </button>
        </div>
      )}

      {result && (
        <div className={`p-4 border rounded-lg flex items-center gap-3 ${
          result.success ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {result.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {result.message}
        </div>
      )}
    </div>
  );
}
