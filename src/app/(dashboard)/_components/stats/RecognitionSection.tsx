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
import VerifiedUserIcon from "@mui/icons-material/VerifiedUserOutlined";
import GppGoodIcon from "@mui/icons-material/GppGoodOutlined";
import GppBadIcon from "@mui/icons-material/GppBadOutlined";
import PersonSearchIcon from "@mui/icons-material/PersonSearchOutlined";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type { RecognitionStatItem } from "@/lib/types";
import DashboardCard from "../ui/DashboardCard";
import EmptyState from "../ui/EmptyState";
import MuiStatCard from "../ui/MuiStatCard";
import StatSectionSkeleton from "../ui/StatSectionSkeleton";

const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });

export default function RecognitionSection() {
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

  if (loading) {
    return <StatSectionSkeleton title="Thống kê nhận diện khuôn mặt & Cổng" chartHeight={320} />;
  }

  if (error) {
    return (
      <DashboardCard title="Thống kê nhận diện khuôn mặt & Cổng">
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

  const isEmpty = !data || data.length === 0 || data.every((d) => d.granted === 0 && d.spoof === 0 && d.no_match === 0);

  if (isEmpty) {
    return (
      <DashboardCard title="Thống kê nhận diện khuôn mặt & Cổng">
        <EmptyState
          title="Chưa có dữ liệu nhận diện"
          description="Hiện chưa có sự kiện nhận diện khuôn mặt nào được ghi nhận tại cổng hoặc kiosk."
        />
      </DashboardCard>
    );
  }

  const totalGranted = data.reduce((sum, d) => sum + (d.granted || 0), 0);
  const totalSpoof = data.reduce((sum, d) => sum + (d.spoof || 0), 0);
  const totalNoMatch = data.reduce((sum, d) => sum + (d.no_match || 0), 0);
  const totalEvaluated = totalGranted + totalSpoof + totalNoMatch;
  const overallAccuracy = totalEvaluated > 0 ? (totalGranted / totalEvaluated) * 100 : 0;

  return (
    <DashboardCard
      title="Thống kê nhận diện khuôn mặt & Cổng"
      subtitle="Số liệu 30 ngày qua: tỷ lệ chấp thuận, phát hiện giả mạo qua liveness và độ chính xác"
      actions={
        <Button size="small" startIcon={<RefreshIcon />} onClick={fetchData}>
          Làm mới
        </Button>
      }
    >
      <Stack spacing={3}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
          <MuiStatCard
            label="Độ chính xác AI"
            value={`${overallAccuracy.toFixed(1)}%`}
            icon={VerifiedUserIcon}
            gradient="linear-gradient(135deg, #059669 0%, #047857 100%)"
            delta={`Trên ${totalEvaluated.toLocaleString()} lượt quét`}
            deltaColor="success"
            index={0}
          />
          <MuiStatCard
            label="Lượt hợp lệ"
            value={totalGranted.toLocaleString()}
            icon={GppGoodIcon}
            gradient="linear-gradient(135deg, #0A2540 0%, #0F3C5C 100%)"
            delta="Xác thực danh tính thành công"
            deltaColor="default"
            index={1}
          />
          <MuiStatCard
            label="Phát hiện giả mạo"
            value={totalSpoof.toLocaleString()}
            icon={GppBadIcon}
            gradient="linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)"
            delta="Anti-spoofing ngăn chặn"
            deltaColor={totalSpoof > 0 ? "error" : "success"}
            index={2}
          />
          <MuiStatCard
            label="Không khớp khuôn mặt"
            value={totalNoMatch.toLocaleString()}
            icon={PersonSearchIcon}
            gradient="linear-gradient(135deg, #D4AF37 0%, #B89628 100%)"
            delta="Chưa đăng ký khuôn mặt"
            deltaColor="default"
            index={3}
          />
        </Box>

        <Box sx={{ width: "100%", height: 320, pt: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: "text.primary" }}>
            Xu hướng nhận diện khuôn mặt 30 ngày qua
          </Typography>
          <ResponsiveContainer width="100%" height="100%">
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
                itemStyle={{
                  color: theme.palette.text.primary,
                  fontWeight: 600,
                }}
                labelStyle={{
                  color: theme.palette.text.secondary,
                  fontWeight: 700,
                }}
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
        </Box>
      </Stack>
    </DashboardCard>
  );
}
