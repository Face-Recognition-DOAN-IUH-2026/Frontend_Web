"use client";

import { Box, CircularProgress, Paper, Typography } from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { AccessFrequencyDay } from "@/lib/types";

export default function FrequencyChart({ data, loading }: { data: AccessFrequencyDay[]; loading: boolean }) {
  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <BarChartIcon sx={{ fontSize: 20, color: "text.secondary" }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Thống kê tần suất ra vào
        </Typography>
      </Box>
      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">Đang tải...</Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2E3345" />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => {
                const date = new Date(d + "T00:00:00");
                return date.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" });
              }}
              fontSize={12}
              tick={{ fill: "#B8B0A4" }}
            />
            <YAxis allowDecimals={false} fontSize={12} tick={{ fill: "#B8B0A4" }} />
            <Tooltip
              labelStyle={{ color: "#EDE8DF" }}
              contentStyle={{ background: "#1C2030", border: "1px solid #2E3345", borderRadius: "8px" }}
              labelFormatter={(d: any) => {
                if (!d) return "";
                const date = new Date(String(d) + "T00:00:00");
                return date.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
              }}
            />
            <Legend wrapperStyle={{ color: "#B8B0A4" }} />
            <Bar dataKey="entry" fill="#4A8C5C" name="Vào" radius={[4, 4, 0, 0]} />
            <Bar dataKey="exit" fill="#C49A3C" name="Ra" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}
