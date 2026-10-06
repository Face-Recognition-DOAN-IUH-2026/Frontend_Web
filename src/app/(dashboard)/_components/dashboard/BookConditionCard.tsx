"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import LibraryIcon from "@mui/icons-material/MenuBookOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type { ConditionDistribution } from "@/lib/types";
import { CONDITION_LABELS } from "@/lib/constants/copy";

const CONDITION_COLORS: Record<string, string> = {
  new: "#10b981",
  good: "#6366f1",
  minor_damage: "#f59e0b",
  major_damage: "#ef4444",
  lost: "#8b5cf6",
  unknown: "#94a3b8",
};

const CONDITION_ORDER = ["new", "good", "minor_damage", "major_damage", "lost", "unknown"];

export default function BookConditionCard() {
  const [data, setData] = useState<ConditionDistribution | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getConditionDistribution()
      .then(setData)
      .catch((err) => setError(getErrorMessage(err) || "Không tải được thống kê tình trạng sách"));
  }, []);

  const slices = useMemo(() => {
    if (!data) return [];
    return CONDITION_ORDER.filter((key) => (data.conditions[key] || 0) > 0).map((key) => ({
      key,
      label: (CONDITION_LABELS as Record<string, string>)[key] || (key === "unknown" ? "Không rõ" : key),
      value: data.conditions[key],
      color: CONDITION_COLORS[key] || "#94a3b8",
    }));
  }, [data]);

  const total = data?.total_copies ?? 0;

  return (
    <DashboardCard
      title="Tình trạng sách"
      subtitle={total > 0 ? `${total} bản sao` : undefined}
      actions={
        total > 0 ? (
          <Chip size="small" label={`${total} bản sao`} sx={{ fontWeight: 700 }} />
        ) : undefined
      }
    >
      {error ? (
        <Typography variant="body2" color="error.main">{error}</Typography>
      ) : !data || total === 0 ? (
        <EmptyState
          icon={<LibraryIcon sx={{ fontSize: 40, color: "text.disabled" }} />}
          title="Chưa có dữ liệu tình trạng sách"
        />
      ) : (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "center" }}>
          <Box sx={{ height: 200, width: "100%", maxWidth: 240, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={160}>
              <PieChart>
                <Tooltip formatter={(value: any) => [`${value} bản`, "Số lượng"]} />
                <Pie data={slices} dataKey="value" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {slices.map((s) => (
                    <Cell key={s.key} fill={s.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </Box>
          <Stack spacing={1} sx={{ flex: 1, minWidth: 0, width: "100%" }}>
            {slices.map((s) => (
              <Stack key={s.key} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: s.color, flexShrink: 0 }} />
                <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                  {s.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40, textAlign: "right" }}>
                  {Math.round((s.value / total) * 100)}%
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      )}
    </DashboardCard>
  );
}
