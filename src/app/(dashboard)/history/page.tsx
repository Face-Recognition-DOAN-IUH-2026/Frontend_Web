"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api-client";
import type { AccessLogPublic, CameraEvent } from "@/lib/types";

const PAGE_SIZES = [20, 50, 100];

export default function HistoryPage() {
  const [logs, setLogs] = useState<AccessLogPublic[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);

  const [search, setSearch] = useState("");
  const [accessType, setAccessType] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(50);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(skip / limit) + 1;

  const load = useCallback(async (append = false) => {
    setLoading(true);
    try {
      const data = await api.getAccessLogs({
        search: search || undefined,
        accessType: accessType || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        skip,
        limit,
      });
      if (append) {
        setLogs((prev) => [...prev, ...data.items]);
      } else {
        setLogs(data.items);
      }
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [search, accessType, status, dateFrom, dateTo, skip, limit]);

  useEffect(() => { load(); }, [load]);

  const liveCleanup = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!live) {
      if (liveCleanup.current) { liveCleanup.current(); liveCleanup.current = null; }
      return;
    }
    if (skip !== 0) return;
    const cleanup = api.connectAccessSSE((event: CameraEvent) => {
      if (search) {
        const q = search.toLowerCase();
        if (!event.full_name?.toLowerCase().includes(q) && !event.student_code?.toLowerCase().includes(q)) return;
      }
      if (status && event.status !== status) return;
      if (accessType && event.access_type !== accessType) return;
      const newLog: AccessLogPublic = {
        id: `sse-${Date.now()}`,
        patron_id: event.patron_id || null,
        patron_name: event.full_name || null,
        student_code: event.student_code || null,
        access_type: event.access_type || "entry",
        verify_method: "face",
        confidence: event.score || null,
        camera_id: event.camera_id,
        access_time: new Date().toISOString(),
        status: event.status === "granted" ? "success" : event.status,
      };
      setLogs((prev) => {
        const idx = prev.findIndex((l) => l.id.startsWith("sse-"));
        if (idx >= 0) return [newLog, ...prev.slice(0, idx)];
        return [newLog, ...prev];
      });
      setTotal((prev) => prev + 1);
    });
    liveCleanup.current = cleanup;
    return cleanup;
  }, [live, skip, search, status, accessType]);

  const handleSearch = () => {
    setSkip(0);
    load();
  };

  const goToPage = (page: number) => {
    setSkip((page - 1) * limit);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Lịch sử ra vào</h1>
        <span className="text-sm text-gray-500">Tổng: {total}</span>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Tìm kiếm</span>
          <input
            className="mt-1 block w-40 px-3 py-2 border rounded-md text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="MSSV hoặc tên..."
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Loại</span>
          <select
            className="mt-1 block w-28 px-3 py-2 border rounded-md text-sm"
            value={accessType}
            onChange={(e) => setAccessType(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="entry">Vào</option>
            <option value="exit">Ra</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Kết quả</span>
          <select
            className="mt-1 block w-28 px-3 py-2 border rounded-md text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="success">Thành công</option>
            <option value="failed">Thất bại</option>
            <option value="expired">Hết hạn</option>
            <option value="spoof">Giả mạo</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Từ ngày</span>
          <input
            type="date"
            className="mt-1 block w-36 px-3 py-2 border rounded-md text-sm"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Đến ngày</span>
          <input
            type="date"
            className="mt-1 block w-36 px-3 py-2 border rounded-md text-sm"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? "..." : "🔍 Lọc"}
        </button>
        <label className="flex items-center gap-2 text-sm ml-auto">
          <span className="text-gray-600">Live</span>
          <input
            type="checkbox"
            className="toggle"
            checked={live}
            onChange={(e) => setLive(e.target.checked)}
          />
        </label>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        {loading && logs.length === 0 ? (
          <p className="p-4 text-gray-500">Đang tải...</p>
        ) : logs.length === 0 ? (
          <p className="p-4 text-gray-500">Không có dữ liệu</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-3 font-medium">Thời gian</th>
                <th className="p-3 font-medium">Họ tên</th>
                <th className="p-3 font-medium">MSSV</th>
                <th className="p-3 font-medium">Loại</th>
                <th className="p-3 font-medium">Phương thức</th>
                <th className="p-3 font-medium">Cổng</th>
                <th className="p-3 font-medium">Độ tin cậy</th>
                <th className="p-3 font-medium">Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="p-3 whitespace-nowrap">{new Date(log.access_time).toLocaleString("vi-VN")}</td>
                  <td className="p-3 font-medium">{log.patron_name || "-"}</td>
                  <td className="p-3 text-gray-600">{log.student_code || "-"}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      log.access_type === "entry"
                        ? "bg-green-100 text-green-800"
                        : "bg-orange-100 text-orange-800"
                    }`}>
                      {log.access_type === "entry" ? "Vào" : "Ra"}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600">{log.verify_method}</td>
                  <td className="p-3 text-gray-600">{log.camera_id}</td>
                  <td className="p-3">
                    {log.confidence != null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              log.confidence >= 0.8 ? "bg-green-500" : log.confidence >= 0.6 ? "bg-yellow-500" : "bg-red-500"
                            }`}
                            style={{ width: `${(log.confidence * 100).toFixed(0)}%` }}
                          />
                        </div>
                        <span className="text-xs">{(log.confidence * 100).toFixed(0)}%</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      log.status === "success"
                        ? "bg-green-100 text-green-800"
                        : log.status === "expired"
                        ? "bg-yellow-100 text-yellow-800"
                        : log.status === "spoof"
                        ? "bg-red-100 text-red-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {log.status === "success" ? "✓" : log.status === "expired" ? "!" : "✗"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Số dòng:</span>
          <select
            className="px-2 py-1 border rounded-md"
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setSkip(0); }}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 border rounded-md disabled:opacity-40"
            disabled={currentPage <= 1}
            onClick={() => goToPage(1)}
          >
            ««
          </button>
          <button
            className="px-3 py-1 border rounded-md disabled:opacity-40"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
          >
            «
          </button>
          <span className="px-3 py-1">
            Trang {currentPage} / {totalPages}
          </span>
          <button
            className="px-3 py-1 border rounded-md disabled:opacity-40"
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(currentPage + 1)}
          >
            »
          </button>
          <button
            className="px-3 py-1 border rounded-md disabled:opacity-40"
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(totalPages)}
          >
            »»
          </button>
        </div>
      </div>
    </div>
  );
}