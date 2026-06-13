"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api-client";
import type { AccessLogPublic, ActivePatron, StatsResponse } from "@/lib/types";
import StatCard from "@/components/ui/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Users, BookOpen, LogIn, LogOut, Clock, TrendingUp, UserCheck } from "lucide-react";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [todayLogs, setTodayLogs] = useState<AccessLogPublic[]>([]);
  const [activePatrons, setActivePatrons] = useState<ActivePatron[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const today = toDateStr(new Date());
        const [s, logs, active] = await Promise.all([
          api.getStats(),
          api.getAccessLogs({ dateFrom: today, limit: 200 }),
          api.getActivePatrons(),
        ]);
        setStats(s);
        setTodayLogs(logs.items);
        setActivePatrons(active.items);
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hourlyData = useMemo(() => {
    const buckets = new Array(24).fill(0);
    todayLogs.forEach((l) => {
      const h = new Date(l.access_time).getHours();
      buckets[h]++;
    });
    return buckets;
  }, [todayLogs]);

  const maxHourly = Math.max(...hourlyData, 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-body-sm text-text-3">Đang tải...</p>
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
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tổng độc giả"
          value={stats.total_patrons}
          icon={Users}
          accentColor="primary"
          description="Đã đăng ký"
        />
        <StatCard
          label="Đang trong thư viện"
          value={stats.active_patrons}
          icon={UserCheck}
          accentColor="success"
          description="Có mặt"
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={16} className="text-text-3" />
              Phân bố theo giờ hôm nay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-0.5 h-36">
              {hourlyData.map((count, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <span className="text-caption text-text-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {count || ""}
                  </span>
                  <div
                    className="w-full bg-primary/60 hover:bg-primary rounded-t transition-all"
                    style={{ height: `${Math.max((count / maxHourly) * 100, count > 0 ? 4 : 2)}%` }}
                  />
                  <span className="text-caption text-text-3">{i}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Currently in library */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen size={16} className="text-text-3" />
              Đang trong thư viện ({activePatrons.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activePatrons.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center mx-auto mb-2 text-text-3">
                  <UserCheck size={18} />
                </div>
                <p className="text-body-sm text-text-3">Không có ai trong thư viện</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {activePatrons.slice(0, 20).map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                        {p.full_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="text-body-sm font-medium text-text">{p.full_name}</p>
                        <p className="text-caption text-text-3 font-mono">{p.student_code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-caption text-text-3">
                        {new Date(p.entered_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {p.confidence && (
                        <p className="text-caption text-success">{(p.confidence * 100).toFixed(0)}%</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity table */}
      <Card padding="none">
        <CardHeader className="p-4 border-b border-border">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={16} className="text-text-3" />
            Hoạt động hôm nay
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {todayLogs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-body-sm text-text-3">Chưa có hoạt động hôm nay</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Độc giả</th>
                    <th>Loại</th>
                    <th>Cổng</th>
                    <th>Xác thực</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {todayLogs.slice(0, 30).map((l) => (
                    <tr key={l.id}>
                      <td className="font-mono text-text-3">
                        {new Date(l.access_time).toLocaleTimeString("vi-VN")}
                      </td>
                      <td className="font-medium">{l.patron_name || l.student_code || "-"}</td>
                      <td>
                        <Badge variant={l.access_type === "entry" ? "success" : "warning"} dot>
                          {l.access_type === "entry" ? "Vào" : "Ra"}
                        </Badge>
                      </td>
                      <td className="font-mono text-text-3">{l.camera_id}</td>
                      <td className="text-text-3">{l.verify_method}</td>
                      <td>
                        <Badge variant={l.status === "granted" ? "success" : "error"} dot>
                          {l.status === "granted" ? "Thành công" : "Thất bại"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}