"use client";

import { Box, IconButton, Badge, useTheme } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import { useAIWidgetStore } from "./store/useAIWidgetStore";

export default function AIWidgetTrigger() {
  const theme = useTheme();
  const { isOpen, toggle, isMinimized, activeTab, proactiveMessage } = useAIWidgetStore();

  const shouldShow = isOpen || proactiveMessage;

  return (
    <AnimatePresence>
      {shouldShow && !isMinimized && (
        <Box
          sx={{
            position: "fixed",
            bottom: { xs: 80, sm: 24 },
            right: 24,
            zIndex: 9999,
          }}
        >
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
            }}
          >
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              badgeContent={
                activeTab === "score" ? null : (
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      border: "2px solid",
                      borderColor: "background.paper",
                    }}
                  />
                )
              }
            >
              <IconButton
                onClick={toggle}
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  boxShadow: 6,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: "primary.dark",
                    transform: "scale(1.05)",
                    boxShadow: 8,
                  },
                }}
              >
                <SmartToyIcon sx={{ fontSize: 28 }} />
              </IconButton>
            </Badge>
          </motion.div>
        </Box>
      )}
    </AnimatePresence>
  );
}