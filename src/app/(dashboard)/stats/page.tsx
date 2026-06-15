"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "@/lib/api-client";
import type { AccessLogPublic, ActivePatron, BorrowRecord, CameraEvent, StatsResponse } from "@/lib/types";
import StatCard from "@/components/ui/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Camera,
  Clock,
  LogIn,
  LogOut,
  Radio,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

type RealtimeState = "connecting" | "connected" | "disconnected";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function isBorrowActive(record: BorrowRecord) {
  return record.status === "borrowed" || record.status === "borrowing";
}

function isPhysicalAccessLog(log: AccessLogPublic) {
  return ["entry_gate", "exit_gate", "kiosk"].includes(log.camera_id);
}

function formatCameraId(cameraId?: string | null) {
  if (!cameraId || !["entry_gate", "exit_gate", "kiosk"].includes(cameraId)) return "-";
  return cameraId;
}

function formatTime(value?: string) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatShortTime(value?: string) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatConfidence(value?: number | null) {
  if (typeof value !== "number") return "-";
  return `${Math.round(value * 100)}%`;
}

function buildAccessLogFromEvent(event: CameraEvent): AccessLogPublic {
  return {
    id: `${event.camera_id}-${event.patron_id || event.student_code || "unknown"}-${Date.now()}`,
    patron_id: event.patron_id || null,
    patron_name: event.full_name || null,
    student_code: event.student_code || null,
    access_type: event.access_type === "exit" ? "exit" : "entry",
    verify_method: "face",
    confidence: event.score ?? null,
    camera_id: event.camera_id,
    access_time: new Date().toISOString(),
    status: event.status,
  };
}

function AccessTypeBadge({ type }: { type?: string }) {
  if (type === "entry") return <Badge variant="success" dot>Vào</Badge>;
  if (type === "exit") return <Badge variant="warning" dot>Ra</Badge>;
  return <Badge variant="neutral" dot>{type || "?"}</Badge>;
}

function StatusBadge({ status }: { status?: string }) {
  if (status === "success" || status === "granted") return <Badge variant="success" dot>Thành công</Badge>;
  if (status === "no_match") return <Badge variant="warning" dot>Không khớp</Badge>;
  if (status === "expired") return <Badge variant="warning" dot>Hết hạn</Badge>;
  if (status === "spoof") return <Badge variant="error" dot>Giả mạo</Badge>;
  if (status === "wrong_direction") return <Badge variant="warning" dot>Sai chiều</Badge>;
  if (status === "already_granted") return <Badge variant="info" dot>Đã ghi nhận</Badge>;
  return <Badge variant="error" dot>{status === "denied" ? "Từ chối" : "Thất bại"}</Badge>;
}

function HourlyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload.find((p: any) => p.dataKey === "entry")?.value ?? 0;
  const exit = payload.find((p: any) => p.dataKey === "exit")?.value ?? 0;
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 shadow-xl">
      <p className="text-body-sm font-semibold text-text">{label}:00 - {label}:59</p>
      <div className="mt-2 space-y-1 text-body-sm">
        <p className="flex items-center justify-between gap-8 text-success">
          <span>Vào</span>
          <span className="font-mono">{entry}</span>
        </p>
        <p className="flex items-center justify-between gap-8 text-warning">
          <span>Ra</span>
          <span className="font-mono">{exit}</span>
        </p>
        <p className="flex items-center justify-between gap-8 border-t border-border pt-1 text-text">
          <span>Tổng</span>
          <span className="font-mono">{entry + exit}</span>
        </p>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [todayLogs, setTodayLogs] = useState<AccessLogPublic[]>([]);
  const [activePatrons, setActivePatrons] = useState<ActivePatron[]>([]);
  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeState, setRealtimeState] = useState<RealtimeState>("connecting");

  const refreshActivePatrons = useCallback(async () => {
    try {
      const active = await api.getActivePatrons();
      setActivePatrons(active.items);
    } catch {
      // Keep the last known list visible if refresh fails.
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const today = toDateStr(new Date());
        const [s, logs, active, allBorrows] = await Promise.all([
          api.getStats(),
          api.getAccessLogs({ dateFrom: today, limit: 200 }),
          api.getActivePatrons(),
          api.getBorrowHistory(),
        ]);
        setStats(s);
        setTodayLogs(logs.items.filter(isPhysicalAccessLog));
        setActivePatrons(active.items);
        setBorrows(allBorrows || []);
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setRealtimeState("connecting");
    const cleanup = api.connectAccessSSE(
      (event: CameraEvent) => {
        if (event.status !== "granted") return;
        const log = buildAccessLogFromEvent(event);
        if (!isPhysicalAccessLog(log)) return;
        setTodayLogs((prev) => [log, ...prev].slice(0, 200));
        setStats((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            today_entries: prev.today_entries + (log.access_type === "entry" ? 1 : 0),
            today_exits: prev.today_exits + (log.access_type === "exit" ? 1 : 0),
          };
        });
        refreshActivePatrons();
      },
      (connected) => setRealtimeState(connected ? "connected" : "disconnected"),
    );
    return cleanup;
  }, [refreshActivePatrons]);

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }),
    [],
  );

  const hourlyData = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${hour.toString().padStart(2, "0")}h`,
      entry: 0,
      exit: 0,
      total: 0,
    }));
    todayLogs.forEach((log) => {
      const hour = new Date(log.access_time).getHours();
      if (log.access_type === "entry") buckets[hour].entry += 1;
      if (log.access_type === "exit") buckets[hour].exit += 1;
      buckets[hour].total += 1;
    });
    return buckets;
  }, [todayLogs]);

  const hasHourlyData = hourlyData.some((item) => item.total > 0);

  const borrowStats = useMemo(() => {
    const active = borrows.filter(isBorrowActive);
    const overdue = active.filter((b) => new Date(b.due_at) < new Date());
    return {
      total: borrows.length,
      active: active.length,
      overdue: overdue.length,
      returned: borrows.filter((b) => b.status === "returned").length,
    };
  }, [borrows]);

  const recentBorrows = useMemo(() => {
    return [...borrows]
      .filter(isBorrowActive)
      .sort((a, b) => new Date(b.borrow_at).getTime() - new Date(a.borrow_at).getTime())
      .slice(0, 12);
  }, [borrows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-body-sm text-text-3">Đang tải thống kê vận hành...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-body-sm text-text-3">Không có dữ liệu</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary" dot>Hôm nay</Badge>
              <span className="text-body-sm text-text-3">{todayLabel}</span>
            </div>
            <h2 className="mt-3 text-display-xl text-text">Thống kê vận hành</h2>
            <p className="mt-1 text-body-md text-text-3">
              Theo dõi ra/vào, hiện diện và mượn trả trong ngày
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
              <p className="text-caption">Tổng độc giả</p>
              <p className="text-heading-lg text-text">{stats.total_patrons.toLocaleString("vi-VN")}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    realtimeState === "connected"
                      ? "bg-success animate-pulse"
                      : realtimeState === "connecting"
                        ? "bg-warning animate-pulse"
                        : "bg-error"
                  }`}
                />
                <p className="text-body-sm font-medium text-text">
                  {realtimeState === "connected"
                    ? "Đang cập nhật"
                    : realtimeState === "connecting"
                      ? "Đang kết nối"
                      : "Mất kết nối"}
                </p>
              </div>
              <p className="mt-1 text-caption">Realtime access events</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Đang trong thư viện"
          value={activePatrons.length}
          icon={UserCheck}
          accentColor="success"
          description="Có mặt hiện tại"
        />
        <StatCard
          label="Vào hôm nay"
          value={stats.today_entries}
          icon={LogIn}
          accentColor="info"
          description="Từ 00:00"
        />
        <StatCard
          label="Ra hôm nay"
          value={stats.today_exits}
          icon={LogOut}
          accentColor="warning"
          description="Từ 00:00"
        />
        <StatCard
          label="Hoạt động hôm nay"
          value={todayLogs.length}
          icon={Activity}
          accentColor="primary"
          description="Log đã tải"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.9fr] gap-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={16} className="text-text-3" />
                Lượt ra/vào theo giờ hôm nay
              </CardTitle>
              <p className="mt-1 text-body-sm text-text-3">Tách lượt vào và ra để nhìn cao điểm trong ngày</p>
            </div>
          </CardHeader>
          <CardContent>
            {!hasHourlyData ? (
              <div className="flex h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-2/40 text-center">
                <Clock size={30} className="text-text-3" />
                <p className="mt-3 text-body-sm text-text-3">Chưa có lượt ra/vào hôm nay</p>
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2E3345" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fill: "#B8B0A4", fontSize: 11 }} interval={1} />
                    <YAxis allowDecimals={false} tick={{ fill: "#B8B0A4", fontSize: 11 }} />
                    <Tooltip content={<HourlyTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Legend wrapperStyle={{ color: "#B8B0A4", fontSize: 12 }} />
                    <Bar dataKey="entry" name="Vào" fill="#4A8C5C" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="exit" name="Ra" fill="#C49A3C" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCheck size={16} className="text-text-3" />
                Đang trong thư viện
              </CardTitle>
              <p className="mt-1 text-body-sm text-text-3">{activePatrons.length} độc giả đang hiện diện</p>
            </div>
          </CardHeader>
          <CardContent>
            {activePatrons.length === 0 ? (
              <div className="flex h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-2/40 text-center">
                <Users size={30} className="text-text-3" />
                <p className="mt-3 text-body-sm text-text-3">Không có ai trong thư viện</p>
              </div>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {activePatrons.slice(0, 20).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/60 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-sm font-bold text-primary">
                        {p.full_name?.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-body-sm font-semibold text-text">{p.full_name || "Không rõ tên"}</p>
                        <p className="font-mono text-caption text-text-3">{p.student_code || "---"}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-caption text-text-2">{formatShortTime(p.entered_at)}</p>
                      <p className="mt-0.5 flex items-center justify-end gap-1 font-mono text-caption text-text-3">
                        <Camera size={11} />
                        {formatCameraId(p.camera_id)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card padding="none">
        <CardHeader className="p-4 border-b border-border">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={16} className="text-text-3" />
              Hoạt động hôm nay
            </CardTitle>
            <p className="mt-1 text-body-sm text-text-3">Các lượt ra/vào mới nhất từ camera và kiosk</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {todayLogs.length === 0 ? (
            <div className="p-8 text-center">
              <Radio size={30} className="mx-auto text-text-3" />
              <p className="mt-3 text-body-sm text-text-3">Chưa có hoạt động hôm nay</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Độc giả</th>
                    <th>Loại</th>
                    <th>Camera</th>
                    <th>Độ tin cậy</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {todayLogs.slice(0, 30).map((log) => (
                    <tr key={log.id}>
                      <td className="font-mono text-text-3">{formatTime(log.access_time)}</td>
                      <td>
                        <p className="font-medium text-text">{log.patron_name || "Không rõ tên"}</p>
                        <p className="font-mono text-caption text-text-3">{log.student_code || log.patron_id || "---"}</p>
                      </td>
                      <td><AccessTypeBadge type={log.access_type} /></td>
                      <td className="font-mono text-text-3">{formatCameraId(log.camera_id)}</td>
                      <td className="font-mono text-text-3">{formatConfidence(log.confidence)}</td>
                      <td><StatusBadge status={log.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard
          label="Tổng lượt mượn"
          value={borrowStats.total}
          icon={BookOpen}
          accentColor="primary"
          description="Tất cả phiếu mượn"
        />
        <StatCard
          label="Đang mượn"
          value={borrowStats.active}
          icon={BookOpen}
          accentColor="success"
          description="Chưa trả"
        />
        <StatCard
          label="Quá hạn"
          value={borrowStats.overdue}
          icon={AlertTriangle}
          accentColor="error"
          description="Cần xử lý"
        />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen size={16} className="text-text-3" />
              Sách đang mượn ({borrowStats.active})
              {borrowStats.overdue > 0 && (
                <Badge variant="error" className="ml-2">{borrowStats.overdue} quá hạn</Badge>
              )}
            </CardTitle>
            <p className="mt-1 text-body-sm text-text-3">Theo dõi nhanh các phiếu chưa trả</p>
          </div>
        </CardHeader>
        <CardContent>
          {recentBorrows.length === 0 ? (
            <div className="flex h-44 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-2/40 text-center">
              <BookOpen size={30} className="text-text-3" />
              <p className="mt-3 text-body-sm text-text-3">Không có sách đang được mượn</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sách</th>
                    <th>Độc giả</th>
                    <th>Ngày mượn</th>
                    <th>Hạn trả</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBorrows.map((record) => {
                    const isOverdue = new Date(record.due_at) < new Date();
                    return (
                      <tr key={record.id} className={isOverdue ? "bg-error/5" : ""}>
                        <td>
                          <p className="font-medium text-text">{record.book?.title || record.book_id}</p>
                          <p className="font-mono text-caption text-text-3">{record.book?.isbn || record.book_id}</p>
                        </td>
                        <td className="font-mono text-text-3">{record.patron_id}</td>
                        <td>{new Date(record.borrow_at).toLocaleDateString("vi-VN")}</td>
                        <td className={isOverdue ? "text-error font-semibold" : ""}>
                          {new Date(record.due_at).toLocaleDateString("vi-VN")}
                        </td>
                        <td>
                          <Badge variant={isOverdue ? "error" : "success"}>
                            {isOverdue ? "Quá hạn" : "Đúng hạn"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
