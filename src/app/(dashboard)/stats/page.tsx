"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, BookOpen, DoorOpen, LogOut, Clock, TrendingUp } from "lucide-react";
import api from "@/lib/api-client";
import type { AccessLogPublic, ActivePatron, StatsResponse } from "@/lib/types";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function StatsPage() {
  const router = useRouter();
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

  if (loading) return <p className="text-gray-500 p-4">Đang tải...</p>;
  if (!stats) return <p className="text-gray-500 p-4">Không có dữ liệu</p>;

  const cards = [
    { label: "Tổng độc giả", value: stats.total_patrons, icon: Users, color: "bg-blue-500" },
    { label: "Đang trong thư viện", value: stats.active_patrons, icon: BookOpen, color: "bg-green-500" },
    { label: "Vào hôm nay", value: stats.today_entries, icon: DoorOpen, color: "bg-purple-500" },
    { label: "Ra hôm nay", value: stats.today_exits, icon: LogOut, color: "bg-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Thống kê</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="p-6 bg-white rounded-lg border">
              <div className="flex items-center gap-4">
                <div className={`${card.color} p-3 rounded-lg text-white`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{card.value}</p>
                  <p className="text-sm text-gray-600">{card.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly distribution */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Phân bố theo giờ hôm nay</h2>
          </div>
          <div className="flex items-end gap-1 h-40">
            {hourlyData.map((count, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500">{count || ""}</span>
                <div
                  className="w-full bg-blue-500 rounded-t transition-all"
                  style={{ height: `${(count / maxHourly) * 100}%`, minHeight: count > 0 ? "4px" : "2px" }}
                />
                <span className="text-xs text-gray-400">{i}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Currently in library */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Đang trong thư viện ({activePatrons.length})</h2>
          </div>
          {activePatrons.length === 0 ? (
            <p className="text-gray-400 text-sm">Không có ai</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {activePatrons.slice(0, 20).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm border-b pb-1 last:border-0">
                  <div>
                    <span className="font-medium">{p.full_name}</span>
                    <span className="text-gray-400 ml-2">{p.student_code}</span>
                  </div>
                  <span className="text-xs text-gray-500">{new Date(p.entered_at).toLocaleTimeString("vi-VN")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold">Hoạt động gần đây</h2>
        </div>
        {todayLogs.length === 0 ? (
          <p className="text-gray-400 text-sm">Chưa có hoạt động hôm nay</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="p-2 font-medium">Thời gian</th>
                  <th className="p-2 font-medium">Độc giả</th>
                  <th className="p-2 font-medium">Loại</th>
                  <th className="p-2 font-medium">Cổng</th>
                  <th className="p-2 font-medium">Phương thức</th>
                </tr>
              </thead>
              <tbody>
                {todayLogs.slice(0, 30).map((l) => (
                  <tr key={l.id} className="border-t hover:bg-gray-50">
                    <td className="p-2 whitespace-nowrap text-gray-600">{new Date(l.access_time).toLocaleTimeString("vi-VN")}</td>
                    <td className="p-2 font-medium">{l.patron_name || l.student_code || "-"}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        l.access_type === "entry" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                      }`}>{l.access_type === "entry" ? "Vào" : "Ra"}</span>
                    </td>
                    <td className="p-2 text-gray-600">{l.camera_id}</td>
                    <td className="p-2 text-gray-600">{l.verify_method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}