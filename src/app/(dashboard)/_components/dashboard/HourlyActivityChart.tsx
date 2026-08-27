"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUpOutlined";
import BarChartIcon from "@mui/icons-material/BarChartOutlined";
import ShowChartIcon from "@mui/icons-material/ShowChartOutlined";
import ClockIcon from "@mui/icons-material/ScheduleOutlined";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import type { AccessLogPublic } from "@/lib/types";

interface HourlyActivityChartProps {
  logs: AccessLogPublic[];
  loading: boolean;
}

type ChartViewType = "area" | "bar";

function CustomChartTooltip({ active, payload, label, theme }: any) {
  if (!active || !payload || !payload.length) return null;

  const entryVal = payload.find((p: any) => p.dataKey === "entry")?.value || 0;
  const exitVal = payload.find((p: any) => p.dataKey === "exit")?.value || 0;
  const total = entryVal + exitVal;

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(12px)",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
        minWidth: 160,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1 }}>
        ⏰ {label}:00 — {label}:59
      </Typography>
      <Stack spacing={0.75}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10b981" }} />
            <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "text.primary" }}>Lượt vào</Typography>
          </Stack>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#10b981" }}>{entryVal}</Typography>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#f59e0b" }} />
            <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "text.primary" }}>Lượt ra</Typography>
          </Stack>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#f59e0b" }}>{exitVal}</Typography>
        </Stack>
        <Box sx={{ pt: 0.75, mt: 0.5, borderTop: "1px solid", borderColor: "divider" }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>Tổng lượt:</Typography>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main" }}>{total}</Typography>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

export default function HourlyActivityChart({ logs, loading }: HourlyActivityChartProps) {
  const theme = useTheme();
  const [chartType, setChartType] = useState<ChartViewType>("area");

  const hourlyData = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, entry: 0, exit: 0, total: 0 }));
    logs.forEach((log) => {
      const hour = new Date(log.access_time).getHours();
      if (hour >= 0 && hour < 24) {
        if (log.access_type === "entry") buckets[hour].entry += 1;
        if (log.access_type === "exit") buckets[hour].exit += 1;
        buckets[hour].total += 1;
      }
    });
    return buckets;
  }, [logs]);

  const peakHour = useMemo(() => {
    let max = { hour: 0, total: 0 };
    hourlyData.forEach((d) => {
      if (d.total > max.total) max = { hour: d.hour, total: d.total };
    });
    return max;
  }, [hourlyData]);

  const hasData = hourlyData.some((item) => item.total > 0);

  return (
    <DashboardCard
      title="Hoạt động theo giờ"
      subtitle="Phân bổ lưu lượng ra/vào hôm nay"
      actions={
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {hasData && peakHour.total > 0 && (
            <Chip
              icon={<TrendingUpIcon sx={{ fontSize: 14 }} />}
              label={`Cao điểm: ${peakHour.hour}h (${peakHour.total} lượt)`}
              size="small"
              sx={{
                bgcolor: theme.palette.mode === "dark" ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.1)",
                color: "primary.main",
                fontWeight: 700,
                fontSize: "0.72rem",
                display: { xs: "none", sm: "flex" },
              }}
            />
          )}
          <ButtonGroup size="small" variant="outlined">
            <Button
              variant={chartType === "area" ? "contained" : "outlined"}
              onClick={() => setChartType("area")}
              sx={{ px: 1, minWidth: 32 }}
              title="Biểu đồ miền"
            >
              <ShowChartIcon fontSize="small" />
            </Button>
            <Button
              variant={chartType === "bar" ? "contained" : "outlined"}
              onClick={() => setChartType("bar")}
              sx={{ px: 1, minWidth: 32 }}
              title="Biểu đồ cột"
            >
              <BarChartIcon fontSize="small" />
            </Button>
          </ButtonGroup>
        </Stack>
      }
    >
      {!hasData ? (
        <EmptyState
          icon={<ClockIcon sx={{ fontSize: 40, color: "text.disabled" }} />}
          title="Chưa có lượt ra/vào hôm nay"
        />
      ) : (
        <Box sx={{ height: 250, width: "100%", minWidth: 0, px: 0.5, pt: 1 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
            {chartType === "area" ? (
              <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="entryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="exitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} opacity={0.6} />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                  tickFormatter={(hour) => `${hour}h`}
                  interval={2}
                  axisLine={{ stroke: theme.palette.divider }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                  axisLine={{ stroke: theme.palette.divider }}
                />
                <Tooltip content={<CustomChartTooltip theme={theme} />} />
                <Legend
                  wrapperStyle={{ color: theme.palette.text.secondary, fontSize: 12, paddingTop: 6 }}
                  iconType="circle"
                />
                <Area
                  type="monotone"
                  dataKey="entry"
                  name="Lượt vào"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#entryGradient)"
                  activeDot={{ r: 5, stroke: "#10b981", strokeWidth: 2, fill: "#fff" }}
                />
                <Area
                  type="monotone"
                  dataKey="exit"
                  name="Lượt ra"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#exitGradient)"
                  activeDot={{ r: 5, stroke: "#f59e0b", strokeWidth: 2, fill: "#fff" }}
                />
              </AreaChart>
            ) : (
              <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} opacity={0.6} />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                  tickFormatter={(hour) => `${hour}h`}
                  interval={2}
                  axisLine={{ stroke: theme.palette.divider }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                  axisLine={{ stroke: theme.palette.divider }}
                />
                <Tooltip content={<CustomChartTooltip theme={theme} />} />
                <Legend
                  wrapperStyle={{ color: theme.palette.text.secondary, fontSize: 12, paddingTop: 6 }}
                  iconType="circle"
                />
                <Bar dataKey="entry" name="Lượt vào" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="exit" name="Lượt ra" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </Box>
      )}
    </DashboardCard>
  );
}

