"use client";

import React, { useState } from "react";
import { Box, Typography, Button, CircularProgress, Stack } from "@mui/material";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";
import AIScoreCard from "../cards/AIScoreCard";
import { useAIWidgetStore } from "../store/useAIWidgetStore";

export default function ScoreTab() {
  const { lastSummary, updateSummary } = useAIWidgetStore();
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ai/command-center/summary");
      if (response.ok) {
        const data = await response.json();
        updateSummary(data);
      }
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