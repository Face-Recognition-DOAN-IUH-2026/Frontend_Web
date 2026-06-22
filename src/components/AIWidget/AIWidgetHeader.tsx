"use client";

import { Box, IconButton, Typography, Tabs, Tab, useTheme, useMediaQuery } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import CloseIcon from "@mui/icons-material/CloseOutlined";
import MinimizeIcon from "@mui/icons-material/MinimizeOutlined";
import { useAIWidgetStore } from "./store/useAIWidgetStore";

interface AIWidgetHeaderProps {
  onMinimize: () => void;
}

export default function AIWidgetHeader({ onMinimize }: AIWidgetHeaderProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { activeTab, setActiveTab } = useAIWidgetStore();

  const handleTabChange = (_: React.SyntheticEvent, newValue: 'score' | 'chat' | 'actions') => {
    setActiveTab(newValue);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 2,
        py: 1.5,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 800, color: "text.primary", display: "flex", alignItems: "center", gap: 1 }}
      >
        <Box
          component="span"
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          🤖
        </Box>
        AI Library Helper
      </Typography>

      <Box sx={{ display: "flex", gap: 0.5 }}>
        <IconButton size="small" onClick={onMinimize} sx={{ color: "text.secondary" }}>
          <MinimizeIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={() => useAIWidgetStore.getState().close()} sx={{ color: "text.secondary" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}