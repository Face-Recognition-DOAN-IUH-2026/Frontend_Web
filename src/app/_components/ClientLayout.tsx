"use client";

import { useEffect } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import ConfigProvider from "antd/es/config-provider";
import { SWRConfig } from "swr";
import { setupGlobalErrorHandlers } from "@/lib/error-reporter";
import { useColorMode } from "@/lib/mui-theme";
import { getAntdTheme } from "@/lib/antd-theme";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { effectiveMode } = useColorMode();
  const isDark = effectiveMode === "dark";

  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);

  return (
    <AntdRegistry>
      <ConfigProvider theme={getAntdTheme(isDark)}>
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
      </ConfigProvider>
    </AntdRegistry>
  );
}
