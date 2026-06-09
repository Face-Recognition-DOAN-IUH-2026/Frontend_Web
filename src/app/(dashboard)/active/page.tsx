"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api-client";
import type { ActivePatron } from "@/lib/types";

export default function ActivePage() {
  const [patrons, setPatrons] = useState<ActivePatron[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await api.getActivePatrons();
      setPatrons(data.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">In Library</h1>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
          {patrons.length} đang ở trong thư viện
        </span>
      </div>

      {loading ? (
        <p>Đang tải...</p>
      ) : patrons.length === 0 ? (
        <p className="text-gray-500">Không có ai trong thư viện</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patrons.map((p) => (
            <div key={p.id} className="p-4 border rounded-lg bg-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {p.full_name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{p.full_name}</p>
                  <p className="text-sm text-gray-500">{p.student_code}</p>
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-600">
                <p>Vào lúc: {new Date(p.entered_at).toLocaleTimeString("vi-VN")}</p>
                <p>Cổng: {p.camera_id}</p>
                {p.confidence && <p>Độ tin cậy: {(p.confidence * 100).toFixed(0)}%</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}