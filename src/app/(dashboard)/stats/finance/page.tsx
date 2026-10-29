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
import AttachMoneyIcon from "@mui/icons-material/AttachMoneyOutlined";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import QrCode2Icon from "@mui/icons-material/QrCode2Outlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmberOutlined";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type { FinanceStats } from "@/lib/types";
import { StatCard, ChartCard, SectionLayout, TabNavigation, KpiGrid, type KpiCardProps } from "../_components";

const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

const tabs = [
  { label: "Tổng quan", href: "/stats" },
  { label: "Tài chính", href: "/stats/finance" },
  { label: "Kho sách", href: "/stats/inventory" },
  { label: "Nhận diện", href: "/stats/recognition" },
  { label: "Real-time", href: "/stats/realtime" },
];

export default function FinancePage() {
  const theme = useTheme();
  const [data, setData] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getFinanceStats(12);
      setData(res);
    } catch (err: any) {
      setError(getErrorMessage(err) || "Lỗi tải thống kê tài chính");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isEmpty = !data || (data.collected_total === 0 && data.outstanding_total === 0);

  const kpiCards: KpiCardProps[] = data
    ? [
        {
          label: "Tổng tiền phạt đã thu",
          value: formatCurrency(data.collected_total),
          icon: <AttachMoneyIcon />,
          gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
          delta: `${data.paid_count} lượt đã thanh toán`,
          deltaColor: "success" as const,
          pct: data.paid_count > 0 ? Math.min(100, (data.paid_count / (data.paid_count + data.unpaid_count)) * 100) : 0,
        },
        {
          label: "Tiền mặt (Cash)",
          value: formatCurrency(data.by_method.cash),
          icon: <AccountBalanceWalletIcon />,
          gradient: "linear-gradient(135deg, #0A2540 0%, #0F3C5C 100%)",
          delta: "Thu trực tiếp tại quầy",
          deltaColor: "default" as const,
        },
        {
          label: "Chuyển khoản QR",
          value: formatCurrency(data.by_method.qr ?? data.by_method.qr_code ?? 0),
          icon: <QrCode2Icon />,
          gradient: "linear-gradient(135deg, #D4AF37 0%, #B89628 100%)",
          delta: "Cổng thanh toán điện tử",
          deltaColor: "default" as const,
        },
        {
          label: "Tiền phạt tồn đọng",
          value: formatCurrency(data.outstanding_total),
          icon: <WarningAmberIcon />,
          gradient: "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)",
          delta: `${data.unpaid_count} lượt chưa thanh toán`,
          deltaColor: data.outstanding_total > 0 ? "error" : "success",
          pct: data.unpaid_count > 0 ? Math.min(100, (data.unpaid_count / (data.paid_count + data.unpaid_count)) * 100) : 0,
        },
      ]
    : [];

  return (
    <Stack spacing={3} sx={{ minHeight: 900 }}>
      <TabNavigation tabs={tabs} />

      <SectionLayout
        title="Thống kê tài chính & Tiền phạt"
        subtitle="Tổng hợp tiền phạt đã thu theo phương thức thanh toán và xu hướng 12 tháng"
        icon={<AttachMoneyIcon />}
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
            Chưa có dữ liệu tài chính. Hiện chưa có bản ghi thu tiền phạt hoặc nợ phạt nào trong hệ thống.
          </Alert>
        )}

        {data && data.monthly && data.monthly.length > 0 && (
          <ChartCard
            title="Doanh thu tiền phạt theo tháng"
            subtitle="12 tháng gần nhất"
            height={350}
          >
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data.monthly} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                <YAxis
                  tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                  tickFormatter={(val) => `${(val / 1000).toLocaleString("vi-VN")}k`}
                />
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
                  formatter={(val: any) => [formatCurrency(Number(val) || 0), "Doanh thu"]}
                />
                <Bar dataKey="collected" name="Tiền phạt đã thu" fill={theme.palette.mode === "dark" ? "#34D399" : "#059669"} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {data && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
              Chi tiết phương thức thanh toán
            </Typography>
            <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
              <Chip
                label={`Tiền mặt: ${formatCurrency(data.by_method.cash)}`}
                icon={<AccountBalanceWalletIcon />}
                size="medium"
                color="info"
                variant="outlined"
              />
              <Chip
                label={`QR Code: ${formatCurrency(data.by_method.qr ?? data.by_method.qr_code ?? 0)}`}
                icon={<QrCode2Icon />}
                size="medium"
                color="warning"
                variant="outlined"
              />
              <Chip
                label={`Tổng thu: ${formatCurrency(data.collected_total)}`}
                icon={<AttachMoneyIcon />}
                size="medium"
                color="success"
                variant="outlined"
              />
              <Chip
                label={`Còn nợ: ${formatCurrency(data.outstanding_total)}`}
                icon={<WarningAmberIcon />}
                size="medium"
                color="error"
                variant="outlined"
              />
            </Stack>
          </Box>
        )}
      </SectionLayout>
    </Stack>
  );
}