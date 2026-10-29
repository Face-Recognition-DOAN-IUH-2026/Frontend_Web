"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import MenuBookIcon from "@mui/icons-material/MenuBookOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopyOutlined";
import PriceCheckIcon from "@mui/icons-material/PriceCheckOutlined";
import AddBusinessIcon from "@mui/icons-material/AddBusinessOutlined";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type { InventoryStats } from "@/lib/types";
import { StatCard, ChartCard, SectionLayout, TabNavigation, KpiGrid } from "../_components";

const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });

const STATUS_LABELS: Record<string, string> = {
  available: "Có sẵn",
  borrowed: "Đang mượn",
  maintenance: "Bảo trì",
  disposed: "Đã thanh lý",
  reserved: "Đã đặt trước",
};

const CONDITION_LABELS: Record<string, { label: string; color: "success" | "info" | "warning" | "error" | "default" }> = {
  new: { label: "Mới 100%", color: "success" },
  good: { label: "Bình thường", color: "info" },
  minor_damage: { label: "Hư nhẹ", color: "warning" },
  major_damage: { label: "Hư nặng", color: "error" },
  lost: { label: "Mất sách", color: "error" },
};

const tabs = [
  { label: "Tổng quan", href: "/stats" },
  { label: "Tài chính", href: "/stats/finance" },
  { label: "Kho sách", href: "/stats/inventory" },
  { label: "Nhận diện", href: "/stats/recognition" },
  { label: "Real-time", href: "/stats/realtime" },
];

export default function InventoryPage() {
  const theme = useTheme();
  const [data, setData] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getInventoryStats();
      setData(res);
    } catch (err: any) {
      setError(getErrorMessage(err) || "Lỗi tải thống kê kho sách");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isEmpty = !data || (data.books_total === 0 && data.copies_total === 0);

  const kpiCards = data
    ? [
        {
          label: "Tổng đầu sách",
          value: data.books_total,
          icon: <MenuBookIcon />,
          gradient: "linear-gradient(135deg, #0A2540 0%, #0F3C5C 100%)",
          delta: "Số lượng đầu sách lưu trữ",
          deltaColor: "default" as const,
        },
        {
          label: "Tổng bản sao",
          value: data.copies_total,
          icon: <ContentCopyIcon />,
          gradient: "linear-gradient(135deg, #D4AF37 0%, #B89628 100%)",
          delta: `Sẵn sàng mượn: ${data.copies_by_status.available ?? 0}`,
          deltaColor: "success" as const,
        },
        {
          label: "Định giá sách",
          value: `${data.price_coverage.priced} / ${data.books_total}`,
          icon: <PriceCheckIcon />,
          gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
          delta: `Đã định giá: ${data.price_coverage.priced} cuốn`,
          deltaColor: "success" as const,
        },
        {
          label: "Nhập mới (30 ngày)",
          value: data.imports_last_30d,
          icon: <AddBusinessIcon />,
          gradient: "linear-gradient(135deg, #8B0000 0%, #700000 100%)",
          delta: "Bản sao bổ sung gần đây",
          deltaColor: "default" as const,
        },
      ]
    : [];

  const statusChartData = data
    ? Object.entries(data.copies_by_status).map(([st, cnt]) => ({
        status: STATUS_LABELS[st] || st,
        count: cnt,
      }))
    : [];

  const categoryChartData = data ? (data.categories || []).slice(0, 8) : [];

  const isDark = theme.palette.mode === "dark";

  return (
    <Stack spacing={3} sx={{ minHeight: 900 }}>
      <TabNavigation tabs={tabs} />

      <SectionLayout
        title="Thống kê kho sách & Hiện trạng"
        subtitle="Phân bố bản sao theo trạng thái mượn trả, tình trạng vật lý và danh mục khoa / thể loại"
        icon={<MenuBookIcon />}
        actions={
          <Button size="small" startIcon={<RefreshIcon />} onClick={fetchData} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : "Làm mới"}
          </Button>
        }
        kpiCards={<KpiGrid cards={kpiCards} />}
      >
        {loading && (
          <Chip variant="outlined" label="Đang tải dữ liệu..." icon={<CircularProgress size={16} />} color="info" />
        )}

        {error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" startIcon={<RefreshIcon />} onClick={fetchData}>
                Thử lại
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {isEmpty && (
          <Alert severity="info">
            Chưa có dữ liệu kho sách. Hiện chưa có đầu sách hoặc bản sao sách nào trong hệ thống thư viện.
          </Alert>
        )}

        {data && (
          <>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.divider, 0.05), border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: "text.primary" }}>
                Tình trạng vật lý bản sao sách
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                {Object.entries(data.copies_by_condition).map(([cond, count]) => {
                  const meta = CONDITION_LABELS[cond] || { label: cond, color: "default" };
                  return (
                    <Chip
                      key={cond}
                      label={`${meta.label}: ${count} bản`}
                      color={meta.color as any}
                      variant="outlined"
                      sx={{
                        fontWeight: 700,
                        ...(isDark && {
                          bgcolor:
                            meta.color === "info"
                              ? "rgba(56, 189, 248, 0.16)"
                              : meta.color === "success"
                              ? "rgba(52, 211, 153, 0.16)"
                              : meta.color === "warning"
                              ? "rgba(251, 191, 36, 0.16)"
                              : meta.color === "error"
                              ? "rgba(248, 113, 113, 0.16)"
                              : undefined,
                          color:
                            meta.color === "info"
                              ? "#38bdf8"
                              : meta.color === "success"
                              ? "#34d399"
                              : meta.color === "warning"
                              ? "#fbbf24"
                              : meta.color === "error"
                              ? "#f87171"
                              : undefined,
                          borderColor:
                            meta.color === "info"
                              ? "rgba(56, 189, 248, 0.5)"
                              : meta.color === "success"
                              ? "rgba(52, 211, 153, 0.5)"
                              : meta.color === "warning"
                              ? "rgba(251, 191, 36, 0.5)"
                              : meta.color === "error"
                              ? "rgba(248, 113, 113, 0.5)"
                              : undefined,
                        }),
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "5fr 7fr" }, gap: 3, mt: 3 }}>
              <ChartCard title="Phân bổ theo trạng thái" subtitle="Số lượng bản sao theo trạng thái mượn trả" height={300}>
                <ResponsiveContainer width="100%" height={300} style={{ height: 300 }}>
                  <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                    <XAxis dataKey="status" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                        color: theme.palette.text.primary,
                        boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.5)" : "0 4px 20px rgba(0,0,0,0.08)",
                      }}
                      itemStyle={{ color: theme.palette.text.primary, fontWeight: 600 }}
                      labelStyle={{ color: theme.palette.text.secondary, fontWeight: 700 }}
                    />
                    <Bar dataKey="count" name="Số bản sao" fill={isDark ? "#38bdf8" : "#0A2540"} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <Box sx={{ display: "flex", flexDirection: "column" }}>
                <ChartCard title="Phân bổ theo Khoa / Thể loại sách" subtitle="Top 8 danh mục có nhiều đầu sách nhất" height={300}>
                  <ResponsiveContainer width="100%" height={300} style={{ height: 300 }}>
                    <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                      <XAxis dataKey="name" interval={0} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                          color: theme.palette.text.primary,
                          boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.5)" : "0 4px 20px rgba(0,0,0,0.08)",
                        }}
                        itemStyle={{ color: theme.palette.text.primary, fontWeight: 600 }}
                        labelStyle={{ color: theme.palette.text.secondary, fontWeight: 700 }}
                      />
                      <Bar dataKey="count" name="Số đầu sách" fill={isDark ? "#fbbf24" : "#D4AF37"} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 1 }}>
                  {categoryChartData.map((cat) => (
                    <Chip
                      key={cat.name}
                      label={`${cat.name}: ${cat.count} đầu sách`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: 11 }}
                    />
                  ))}
                </Stack>
              </Box>
            </Box>
          </>
        )}
      </SectionLayout>
    </Stack>
  );
}