"use client";

import { useMemo } from "react";
import { Avatar, Box, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { fadeInUp } from "@/lib/animations";
import PeopleIcon from "@mui/icons-material/PeopleOutlined";
import PersonIcon from "@mui/icons-material/PersonOutlined";
import UpdateIcon from "@mui/icons-material/UpdateOutlined";
import FaceIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import type { PatronPublic } from "@/lib/types";

interface PatronStatCardsProps {
  patrons: PatronPublic[];
}

const STAT_GRADIENT = {
  total: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
  active: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  expired: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  face: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.every((v) => v === 0)) return null;
  return (
    <Box sx={{ height: 32, mt: 1 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.map((v) => ({ v }))}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default function PatronStatCards({ patrons }: PatronStatCardsProps) {
  const stats = useMemo(() => {
    const activeCount = patrons.filter((p) => p.status === "active").length;
    const expiredCount = patrons.filter((p) => p.status === "expired" || p.status === "inactive").length;
    const faceCount = patrons.filter((p) => p.has_face).length;

    const now = new Date();
    const dailyData: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const count = patrons.filter((p) => p.created_at?.startsWith(dateStr)).length;
      dailyData.push(count);
    }

    return { activeCount, expiredCount, faceCount, dailyData };
  }, [patrons]);

  const items = [
    { label: "Tổng độc giả", value: patrons.length, gradient: STAT_GRADIENT.total, icon: PeopleIcon, pct: 100, sparkColor: "#6366f1" },
    { label: "Hoạt động", value: stats.activeCount, gradient: STAT_GRADIENT.active, icon: PersonIcon, pct: patrons.length ? Math.round((stats.activeCount / patrons.length) * 100) : 0, sparkColor: "#10b981" },
    { label: "Hết hạn / Khóa", value: stats.expiredCount, gradient: STAT_GRADIENT.expired, icon: UpdateIcon, pct: patrons.length ? Math.round((stats.expiredCount / patrons.length) * 100) : 0, sparkColor: "#f59e0b" },
    { label: "Có khuôn mặt", value: stats.faceCount, gradient: STAT_GRADIENT.face, icon: FaceIcon, pct: patrons.length ? Math.round((stats.faceCount / patrons.length) * 100) : 0, sparkColor: "#3b82f6" },
  ];

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2 }}>
      {items.map((item, idx) => (
        <Paper
          key={item.label}
          variant="outlined"
          sx={{
            borderRadius: 3, position: "relative", overflow: "hidden", p: 2.5,
            transition: "all 0.25s ease",
            animation: `${fadeInUp} 0.5s ease-out`,
            animationDelay: `${idx * 0.07}s`,
            animationFillMode: "both",
            "&:hover": { transform: "translateY(-2px)", boxShadow: 4 },
          }}
        >
          <Box sx={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: item.gradient, opacity: 0.12, pointerEvents: "none" }} />
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
            <Avatar sx={{ background: item.gradient, width: 44, height: 44 }}>
              <item.icon sx={{ color: "#fff", fontSize: 22 }} />
            </Avatar>
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: "uppercase", color: "text.secondary", letterSpacing: 0.5 }}>
              {item.label}
            </Typography>
          </Stack>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            {typeof item.value === "number" ? item.value.toLocaleString("vi-VN") : item.value}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={item.pct}
            sx={{
              height: 3, borderRadius: 2, bgcolor: "rgba(99,102,241,0.08)",
              "& .MuiLinearProgress-bar": { background: item.gradient, borderRadius: 2 },
            }}
          />
          <Sparkline data={stats.dailyData} color={item.sparkColor} />
        </Paper>
      ))}
    </Box>
  );
}
