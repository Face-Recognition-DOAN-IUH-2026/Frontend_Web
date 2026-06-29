"use client";

import React, { useState } from "react";
import { Box, Typography, Button, CircularProgress, Stack } from "@mui/material";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";
import AIScoreCard from "../cards/AIScoreCard";
import { useAIWidgetStore } from "../store/useAIWidgetStore";
import api from "@/lib/api-client";

export default function ScoreTab() {
  const { lastSummary, updateSummary } = useAIWidgetStore();
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const raw = await api.getAiCommandCenterSummary();
      updateSummary({
        operational_score: raw.operational_score,
        active_patrons: raw.snapshot.active_patrons,
        overdue_borrows: raw.snapshot.overdue_borrows,
        scheduled_staff_today: raw.snapshot.scheduled_staff_today,
        today_entries: raw.snapshot.today_entries,
        today_exits: raw.snapshot.today_exits,
        generated_at: raw.generated_at,
      });
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
          Tình trạng hệ thống
        </Typography>
        <Button
          size="small"
          startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
          sx={{ fontSize: "0.75rem" }}
        >
          Refresh
        </Button>
      </Stack>

      <AIScoreCard />
    </Box>
  );
}