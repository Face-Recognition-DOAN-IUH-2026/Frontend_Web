"use client";

import { useEffect, useState } from "react";
import { Users, BookOpen, DoorOpen, LogOut } from "lucide-react";
import api from "@/lib/api-client";
import type { StatsResponse } from "@/lib/types";

export default function StatsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getStats();
        setStats(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p>Đang tải...</p>;
  if (!stats) return <p>Không có dữ liệu</p>;

  const cards = [
    { label: "Tổng độc giả", value: stats.total_patrons, icon: Users, color: "bg-blue-500" },
    { label: "Đang trong thư viện", value: stats.active_patrons, icon: BookOpen, color: "bg-green-500" },
    { label: "Vào hôm nay", value: stats.today_entries, icon: DoorOpen, color: "bg-purple-500" },
    { label: "Ra hôm nay", value: stats.today_exits, icon: LogOut, color: "bg-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Statistics</h1>
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
    </div>
  );
}
