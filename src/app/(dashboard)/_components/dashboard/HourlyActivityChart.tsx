"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Box, useTheme } from "@mui/material";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import ClockIcon from "@mui/icons-material/ScheduleOutlined";
import type { AccessLogPublic } from "@/lib/types";

interface HourlyActivityChartProps {
  logs: AccessLogPublic[];
  loading: boolean;
}

export default function HourlyActivityChart({ logs, loading }: HourlyActivityChartProps) {
  const theme = useTheme();

  const hourlyData = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, entry: 0, exit: 0, total: 0 }));
    logs.forEach((log) => {
      const hour = new Date(log.access_time).getHours();
      if (log.access_type === "entry") buckets[hour].entry += 1;
      if (log.access_type === "exit") buckets[hour].exit += 1;
      buckets[hour].total += 1;
    });
    return buckets;
  }, [logs]);

  const hasData = hourlyData.some((item) => item.total > 0);

  return (
    <DashboardCard title="Hoạt động theo giờ" subtitle="Phân bổ lượt ra/vào theo giờ">
      {!hasData ? (
        <EmptyState
          icon={<ClockIcon sx={{ fontSize: 40, color: "text.disabled" }} />}
          title="Chưa có lượt ra/vào hôm nay"
        />
      ) : (
        <Box sx={{ height: 220, px: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} interval={2} />
              <YAxis allowDecimals={false} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }}
                labelFormatter={(label) => `${label}:00 - ${label}:59`}
                formatter={(value: any, name: any) => [value, name === "entry" ? "Vào" : "Ra"]}
              />
              <Legend wrapperStyle={{ color: theme.palette.text.secondary, fontSize: 12 }} />
              <Bar dataKey="entry" name="Vào" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
              <Bar dataKey="exit" name="Ra" fill={theme.palette.secondary.main} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}
    </DashboardCard>
  );
}
