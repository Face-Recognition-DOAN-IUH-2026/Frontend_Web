"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Box, Backdrop } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import AIWidgetTrigger from "./AIWidgetTrigger";
import AIWidgetPanel from "./AIWidgetPanel";
import { useAIWidgetStore } from "./store/useAIWidgetStore";

const BLACKLIST_PATHS = ["/login", "/register", "/gate", "/liveness", "/identify"];

export default function AIWidget() {
  const pathname = usePathname();
  const { isOpen, close, proactiveMessage } = useAIWidgetStore();

  const isBlacklisted = BLACKLIST_PATHS.some((p) => pathname?.startsWith(p));

  const storedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
  const userData = storedUser ? JSON.parse(storedUser) : null;
  const role = userData?.role || 'staff';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  useEffect(() => {
    if (proactiveMessage && !isOpen) {
      const timer = setTimeout(() => {
        useAIWidgetStore.getState().open();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [proactiveMessage, isOpen]);

  if (isBlacklisted) return null;

  return (
    <>
      <AIWidgetTrigger />
      <AnimatePresence>
        {isOpen && (
          <Backdrop
            open
            onClick={close}
            sx={{
              position: "fixed",
              inset: 0,
              bgcolor: "rgba(0,0,0,0.3)",
              zIndex: 99998,
              backdropFilter: "blur(2px)",
            }}
          />
        )}
      </AnimatePresence>
      <AIWidgetPanel role={role} />
    </>
  );
}