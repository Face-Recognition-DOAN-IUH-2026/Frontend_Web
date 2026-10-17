"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
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
import DashboardCard from "../ui/DashboardCard";
import EmptyState from "../ui/EmptyState";
import MuiStatCard from "../ui/MuiStatCard";
import StatSectionSkeleton from "../ui/StatSectionSkeleton";

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

export default function FinanceSection() {
  const theme = useTheme();
  const [data, setData] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getFinanceStats(6);
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

  if (loading) {
    return <StatSectionSkeleton title="Thống kê tài chính & Tiền phạt" chartHeight={300} />;
  }

  if (error) {
    return (
      <DashboardCard title="Thống kê tài chính & Tiền phạt">
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
      </DashboardCard>
    );
  }

  const isEmpty = !data || (data.collected_total === 0 && data.outstanding_total === 0);

  if (isEmpty) {
    return (
      <DashboardCard title="Thống kê tài chính & Tiền phạt">
        <EmptyState
          title="Chưa có dữ liệu tài chính"
          description="Hiện chưa có bản ghi thu tiền phạt hoặc nợ phạt nào trong hệ thống."
        />
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Thống kê tài chính & Tiền phạt"
      subtitle="Tổng hợp tiền phạt đã thu theo phương thức thanh toán và xu hướng tháng"
      actions={
        <Button size="small" startIcon={<RefreshIcon />} onClick={fetchData}>
          Làm mới
        </Button>
      }
    >
      <Stack spacing={3}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
          <MuiStatCard
            label="Tổng tiền phạt đã thu"
            value={formatCurrency(data.collected_total)}
            icon={AttachMoneyIcon}
            gradient="linear-gradient(135deg, #059669 0%, #047857 100%)"
            delta={`${data.paid_count} lượt đã thanh toán`}
            deltaColor="success"
            index={0}
          />
          <MuiStatCard
            label="Tiền mặt (Cash)"
            value={formatCurrency(data.by_method.cash)}
            icon={AccountBalanceWalletIcon}
            gradient="linear-gradient(135deg, #0A2540 0%, #0F3C5C 100%)"
            delta="Thu trực tiếp tại quầy"
            deltaColor="default"
            index={1}
          />
          <MuiStatCard
            label="Chuyển khoản QR"
            value={formatCurrency(data.by_method.qr ?? data.by_method.qr_code ?? 0)}
            icon={QrCode2Icon}
            gradient="linear-gradient(135deg, #D4AF37 0%, #B89628 100%)"
            delta="Cổng thanh toán điện tử"
            deltaColor="default"
            index={2}
          />
          <MuiStatCard
            label="Tiền phạt tồn đọng"
            value={formatCurrency(data.outstanding_total)}
            icon={WarningAmberIcon}
            gradient="linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)"
            delta={`${data.unpaid_count} lượt chưa thanh toán`}
            deltaColor={data.outstanding_total > 0 ? "error" : "success"}
            index={3}
          />
        </Box>

        {data.monthly && data.monthly.length > 0 && (
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: "text.primary" }}>
              Doanh thu tiền phạt theo tháng
            </Typography>
            <ResponsiveContainer width="100%" height={300} style={{ height: 300 }}>
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
                  itemStyle={{
                    color: theme.palette.text.primary,
                    fontWeight: 600,
                  }}
                  labelStyle={{
                    color: theme.palette.text.secondary,
                    fontWeight: 700,
                  }}
                  formatter={(val: any) => [formatCurrency(Number(val) || 0), "Doanh thu"]}
                />
                <Bar dataKey="collected" name="Tiền phạt đã thu" fill={theme.palette.mode === "dark" ? "#34D399" : "#059669"} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Stack>
    </DashboardCard>
  );
}
