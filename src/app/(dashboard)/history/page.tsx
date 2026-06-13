"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api-client";
import FrequencyChart from "@/components/frequency-chart";
import type { AccessFrequencyDay, AccessLogPublic, CameraEvent } from "@/lib/types";

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

  const [frequency, setFrequency] = useState<AccessFrequencyDay[]>([]);
  const [freqLoading, setFreqLoading] = useState(false);

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

  useEffect(() => {
    (async () => {
      setFreqLoading(true);
      try {
        const data = await api.getAccessFrequency({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        });
        setFrequency(data.daily);
      } finally {
        setFreqLoading(false);
      }
    })();
  }, [dateFrom, dateTo]);

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
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-caption text-text-3">Tìm kiếm</label>
          <input
            className="input w-44"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="MSSV hoặc tên..."
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-caption text-text-3">Loại</label>
          <select
            className="input w-32"
            value={accessType}
            onChange={(e) => setAccessType(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="entry">Vào</option>
            <option value="exit">Ra</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-caption text-text-3">Kết quả</label>
          <select
            className="input w-36"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="success">Thành công</option>
            <option value="failed">Thất bại</option>
            <option value="expired">Hết hạn</option>
            <option value="spoof">Giả mạo</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-caption text-text-3">Từ ngày</label>
          <input
            type="date"
            className="input w-40"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-caption text-text-3">Đến ngày</label>
          <input
            type="date"
            className="input w-40"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <button
          className="btn-primary px-4 py-2.5"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? "..." : "Lọc"}
        </button>
        <label className="flex items-center gap-2 text-body-sm ml-auto cursor-pointer">
          <span className="text-text-3">Live</span>
          <input
            type="checkbox"
            className="toggle"
            checked={live}
            onChange={(e) => setLive(e.target.checked)}
          />
        </label>
        <span className="text-body-sm text-text-3 ml-auto self-center">Tổng: {total}</span>
      </div>

      {/* Frequency chart */}
      {frequency.length > 0 && (
        <FrequencyChart data={frequency} loading={freqLoading} />
      )}

      <div className="overflow-x-auto border border-border rounded-lg">
        {loading && logs.length === 0 ? (
          <div className="p-8 text-center text-text-3 text-body-sm">Đang tải...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-text-3 text-body-sm">Không có dữ liệu</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Họ tên</th>
                <th>MSSV</th>
                <th>Loại</th>
                <th>Phương thức</th>
                <th>Cổng</th>
                <th>Độ tin cậy</th>
                <th>Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap font-mono text-text-3">
                    {new Date(log.access_time).toLocaleString("vi-VN")}
                  </td>
                  <td className="font-medium">{log.patron_name || "-"}</td>
                  <td className="font-mono text-text-3">{log.student_code || "-"}</td>
                  <td>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      log.access_type === "entry"
                        ? "bg-success/15 text-success"
                        : "bg-warning/15 text-warning"
                    }`}>
                      {log.access_type === "entry" ? "Vào" : "Ra"}
                    </span>
                  </td>
                  <td className="text-text-3">{log.verify_method}</td>
                  <td className="font-mono text-text-3">{log.camera_id}</td>
                  <td>
                    {log.confidence != null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              log.confidence >= 0.8 ? "bg-success" : log.confidence >= 0.6 ? "bg-warning" : "bg-error"
                            }`}
                            style={{ width: `${(log.confidence * 100).toFixed(0)}%` }}
                          />
                        </div>
                        <span className="text-caption text-text-3">{(log.confidence * 100).toFixed(0)}%</span>
                      </div>
                    ) : (
                      <span className="text-text-3">-</span>
                    )}
                  </td>
                  <td>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      log.status === "success"
                        ? "bg-success/15 text-success"
                        : log.status === "expired"
                        ? "bg-warning/15 text-warning"
                        : log.status === "spoof"
                        ? "bg-error/15 text-error"
                        : "bg-error/15 text-error"
                    }`}>
                      {log.status === "success" ? "✓" : log.status === "expired" ? "!" : "✗"} {log.status === "success" ? "Thành công" : log.status === "expired" ? "Hết hạn" : "Thất bại"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between text-body-sm">
        <div className="flex items-center gap-2">
          <span className="text-text-3">Số dòng:</span>
          <select
            className="input py-1.5 w-20"
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setSkip(0); }}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="btn-ghost px-3 py-1.5"
            disabled={currentPage <= 1}
            onClick={() => goToPage(1)}
          >
            ««
          </button>
          <button
            className="btn-ghost px-3 py-1.5"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
          >
            «
          </button>
          <span className="px-3 py-1.5 text-text-2">
            Trang {currentPage} / {totalPages}
          </span>
          <button
            className="btn-ghost px-3 py-1.5"
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(currentPage + 1)}
          >
            »
          </button>
          <button
            className="btn-ghost px-3 py-1.5"
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

