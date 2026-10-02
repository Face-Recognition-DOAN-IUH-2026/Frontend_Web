"use client";

import { Box, IconButton, Tooltip, Typography, useTheme, useMediaQuery } from "@mui/material";
import CloseIcon from "@mui/icons-material/CloseOutlined";
import MinimizeIcon from "@mui/icons-material/MinimizeOutlined";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import { useAIWidgetStore } from "./store/useAIWidgetStore";

interface AIWidgetHeaderProps {
  onMinimize: () => void;
}

export default function AIWidgetHeader({ onMinimize }: AIWidgetHeaderProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { activeTab, setActiveTab, clearMessages } = useAIWidgetStore();

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
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          🤖
        </Box>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 800, color: "text.primary", whiteSpace: "nowrap" }}
        >
          AI Library Helper
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
        {activeTab === 'chat' && (
          <Tooltip title="Bắt đầu đoạn chat mới">
            <IconButton
              size="small"
              onClick={() => clearMessages()}
              sx={{
                color: "primary.main",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <AddCommentOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Thu nhỏ">
          <IconButton size="small" onClick={onMinimize} sx={{ color: "text.secondary" }}>
            <MinimizeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Đóng">
          <IconButton size="small" onClick={() => useAIWidgetStore.getState().close()} sx={{ color: "text.secondary" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}