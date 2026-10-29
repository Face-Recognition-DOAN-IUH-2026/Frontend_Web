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
  useTheme,
} from "@mui/material";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUserOutlined";
import GppGoodIcon from "@mui/icons-material/GppGoodOutlined";
import GppBadIcon from "@mui/icons-material/GppBadOutlined";
import PersonSearchIcon from "@mui/icons-material/PersonSearchOutlined";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type { RecognitionStatItem } from "@/lib/types";
import { StatCard, ChartCard, SectionLayout, TabNavigation, KpiGrid } from "../_components";

const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });

const tabs = [
  { label: "Tổng quan", href: "/stats" },
  { label: "Tài chính", href: "/stats/finance" },
  { label: "Kho sách", href: "/stats/inventory" },
  { label: "Nhận diện", href: "/stats/recognition" },
  { label: "Real-time", href: "/stats/realtime" },
];

export default function RecognitionPage() {
  const theme = useTheme();
  const [data, setData] = useState<RecognitionStatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getRecognitionStats(30);
      setData(res || []);
    } catch (err: any) {
      setError(getErrorMessage(err) || "Lỗi tải thống kê nhận diện");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isEmpty = !data || data.length === 0 || data.every((d) => d.granted === 0 && d.spoof === 0 && d.no_match === 0);

  const totalGranted = data.reduce((sum, d) => sum + (d.granted || 0), 0);
  const totalSpoof = data.reduce((sum, d) => sum + (d.spoof || 0), 0);
  const totalNoMatch = data.reduce((sum, d) => sum + (d.no_match || 0), 0);
  const totalEvaluated = totalGranted + totalSpoof + totalNoMatch;
  const overallAccuracy = totalEvaluated > 0 ? (totalGranted / totalEvaluated) * 100 : 0;

  const kpiCards = [
    {
      label: "Độ chính xác AI",
      value: `${overallAccuracy.toFixed(1)}%`,
      icon: <VerifiedUserIcon />,
      gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
      delta: `Trên ${totalEvaluated.toLocaleString()} lượt quét`,
      deltaColor: "success" as const,
    },
    {
      label: "Lượt hợp lệ",
      value: totalGranted.toLocaleString(),
      icon: <GppGoodIcon />,
      gradient: "linear-gradient(135deg, #0A2540 0%, #0F3C5C 100%)",
      delta: "Xác thực danh tính thành công",
      deltaColor: "default" as const,
    },
    {
      label: "Phát hiện giả mạo",
      value: totalSpoof.toLocaleString(),
      icon: <GppBadIcon />,
      gradient: "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)",
      delta: "Anti-spoofing ngăn chặn",
      deltaColor: totalSpoof > 0 ? "error" : "success",
    },
    {
      label: "Không khớp khuôn mặt",
      value: totalNoMatch.toLocaleString(),
      icon: <PersonSearchIcon />,
      gradient: "linear-gradient(135deg, #D4AF37 0%, #B89628 100%)",
      delta: "Chưa đăng ký khuôn mặt",
      deltaColor: "default" as const,
    },
  ];

  return (
    <Stack spacing={3} sx={{ minHeight: 900 }}>
      <TabNavigation tabs={tabs} />

      <SectionLayout
        title="Thống kê nhận diện khuôn mặt & Cổng"
        subtitle="Số liệu 30 ngày qua: tỷ lệ chấp thuận, phát hiện giả mạo qua liveness và độ chính xác"
        icon={<VerifiedUserIcon />}
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
            Chưa có dữ liệu nhận diện. Hiện chưa có sự kiện nhận diện khuôn mặt nào được ghi nhận tại cổng hoặc kiosk.
          </Alert>
        )}

        {data && data.length > 0 && (
          <ChartCard title="Xu hướng nhận diện khuôn mặt 30 ngày qua" subtitle="Hợp lệ, Không khớp, Giả mạo theo từng ngày" height={380}>
            <ResponsiveContainer width="100%" height={380} style={{ height: 380 }}>
              <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 8,
                    color: theme.palette.text.primary,
                    boxShadow: theme.palette.mode === "dark" ? "0 4px 20px rgba(0,0,0,0.5)" : "0 4px 20px rgba(0,0,0,0.08)",
                  }}
                  itemStyle={{ color: theme.palette.text.primary, fontWeight: 600 }}
                  labelStyle={{ color: theme.palette.text.secondary, fontWeight: 700 }}
                />
                <Legend
                  wrapperStyle={{ color: theme.palette.text.secondary, fontSize: 12 }}
                  formatter={(value) => <span style={{ color: theme.palette.text.primary, fontWeight: 600 }}>{value}</span>}
                />
                <Bar dataKey="granted" name="Hợp lệ" fill={theme.palette.mode === "dark" ? "#34D399" : "#059669"} radius={[4, 4, 0, 0]} />
                <Bar dataKey="no_match" name="Không khớp" fill={theme.palette.mode === "dark" ? "#FBBF24" : "#D4AF37"} radius={[4, 4, 0, 0]} />
                <Bar dataKey="spoof" name="Giả mạo" fill={theme.palette.mode === "dark" ? "#F87171" : "#8B0000"} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {data && data.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
              Chi tiết từng ngày
            </Typography>
            <Box sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "action.hover" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>Ngày</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Hợp lệ</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Không khớp</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Giả mạo</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Tổng</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Độ chính xác</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d) => {
                    const total = (d.granted || 0) + (d.no_match || 0) + (d.spoof || 0);
                    const accuracy = total > 0 ? ((d.granted || 0) / total * 100).toFixed(1) : 0;
                    return (
                      <tr key={d.date} style={{ borderBottom: "1px solid", borderColor: "divider" }}>
                        <td style={{ padding: "12px 16px" }}>{d.date}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "success.main" }}>{d.granted || 0}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "warning.main" }}>{d.no_match || 0}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "error.main" }}>{d.spoof || 0}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700 }}>{total}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700 }}>{accuracy}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Box>
          </Box>
        )}
      </SectionLayout>
    </Stack>
  );
}