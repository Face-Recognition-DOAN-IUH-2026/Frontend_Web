"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import ConfigProvider from "antd/es/config-provider";
import { AnimatePresence, motion } from "framer-motion";
import { SWRConfig } from "swr";
import { setupGlobalErrorHandlers } from "@/lib/error-reporter";
import { useColorMode } from "@/lib/mui-theme";
import { getAntdTheme } from "@/lib/antd-theme";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { effectiveMode } = useColorMode();
  const isDark = effectiveMode === "dark";
  const pathname = usePathname();

  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);

  return (
    <AntdRegistry>
      <ConfigProvider theme={getAntdTheme(isDark)}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
          >
            <SWRConfig
              value={{
                dedupingInterval: 5000,
                revalidateOnFocus: false,
                errorRetryCount: 2,
                keepPreviousData: true,
              }}
            >
              {children}
            </SWRConfig>
          </motion.div>
        </AnimatePresence>
      </ConfigProvider>
    </AntdRegistry>
  );
}
