"use client";

import { Box, useTheme, useMediaQuery, Tabs, Tab } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { useAIWidgetStore } from "./store/useAIWidgetStore";
import AIWidgetHeader from "./AIWidgetHeader";
import ScoreTab from "./tabs/ScoreTab";
import ChatTab from "./tabs/ChatTab";
import ActionsTab from "./tabs/ActionsTab";

export default function AIWidgetPanel() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { isOpen, activeTab, minimize } = useAIWidgetStore();

  const panelWidth = isMobile ? "100vw" : 420;

  return (
    <AnimatePresence>
      {isOpen && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            left: isMobile ? 0 : "auto",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <motion.div
            initial={{ x: panelWidth, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: panelWidth, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            style={{
              width: panelWidth,
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                bgcolor: "background.paper",
                boxShadow: isMobile ? 0 : 6,
                borderLeft: isMobile ? 0 : 1,
                borderColor: "divider",
                borderRadius: isMobile ? 0 : "12px 0 0 12px",
                overflow: "hidden",
              }}
            >
              <AIWidgetHeader onMinimize={minimize} />

              <TabNavigation />

              <Box sx={{ flex: 1, overflow: "auto" }}>
                <AnimatePresence mode="wait">
                  {activeTab === "score" && <ScoreTab key="score" />}
                  {activeTab === "chat" && <ChatTab key="chat" />}
                  {activeTab === "actions" && <ActionsTab key="actions" />}
                </AnimatePresence>
              </Box>
            </Box>
          </motion.div>
        </Box>
      )}
    </AnimatePresence>
  );
}

function TabNavigation() {
  const theme = useTheme();
  const { activeTab, setActiveTab } = useAIWidgetStore();

  const handleChange = (_: React.SyntheticEvent, newValue: 'score' | 'chat' | 'actions') => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.default" }}>
      <Tabs
        value={activeTab}
        onChange={handleChange}
        variant="fullWidth"
        sx={{
          minHeight: 44,
          "& .MuiTab-root": {
            minHeight: 44,
            fontWeight: 600,
            fontSize: "0.8rem",
            textTransform: "none",
          },
          "& .Mui-selected": {
            color: "primary.main",
          },
          "& .MuiTabs-indicator": {
            bgcolor: "primary.main",
          },
        }}
      >
        <Tab label="Score" value="score" />
        <Tab label="Chat" value="chat" />
        <Tab label="Actions" value="actions" />
      </Tabs>
    </Box>
  );
}