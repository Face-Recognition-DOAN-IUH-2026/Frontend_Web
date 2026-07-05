"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import ConfigProvider from "antd/es/config-provider";
import { setupGlobalErrorHandlers } from "@/lib/error-reporter";
import { useColorMode } from "@/lib/mui-theme";
import { getAntdTheme } from "@/lib/antd-theme";
import AIWidget from "@/app/(dashboard)/_components/AIWidget";

const PUBLIC_PAGES = ["/library/vr-tour"];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showChatbot = !PUBLIC_PAGES.includes(pathname);
  const { effectiveMode } = useColorMode();
  const isDark = effectiveMode === "dark";

  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);

  return (
    <AntdRegistry>
      <ConfigProvider theme={getAntdTheme(isDark)}>
        {children}
        {showChatbot && <AIWidget />}
      </ConfigProvider>
    </AntdRegistry>
  );
}
