"use client";

import { useEffect } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import ConfigProvider from "antd/es/config-provider";
import { setupGlobalErrorHandlers } from "@/lib/error-reporter";
import { useColorMode } from "@/lib/mui-theme";
import { getAntdTheme } from "@/lib/antd-theme";
import N8nChatWidget from "@/app/_components/N8nChatWidget";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { effectiveMode } = useColorMode();
  const isDark = effectiveMode === "dark";

  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);

  return (
    <AntdRegistry>
      <ConfigProvider theme={getAntdTheme(isDark)}>
        {children}
        <N8nChatWidget />
      </ConfigProvider>
    </AntdRegistry>
  );
}
