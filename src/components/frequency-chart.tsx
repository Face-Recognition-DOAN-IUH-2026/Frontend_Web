"use client";

import { BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { AccessFrequencyDay } from "@/lib/types";

export default function FrequencyChart({ data, loading }: { data: AccessFrequencyDay[]; loading: boolean }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-gray-500" />
        <h2 className="text-lg font-semibold">Thống kê tần suất ra vào</h2>
      </div>
      {loading ? (
        <p className="text-gray-500 text-sm">Đang tải...</p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => {
                const date = new Date(d + "T00:00:00");
                return date.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" });
              }}
              fontSize={12}
            />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip
              labelFormatter={(d: any) => {
                if (!d) return "";
                const date = new Date(String(d) + "T00:00:00");
                return date.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
              }}
            />
            <Legend />
            <Bar dataKey="entry" fill="#22c55e" name="Vào" radius={[4, 4, 0, 0]} />
            <Bar dataKey="exit" fill="#fb923c" name="Ra" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
