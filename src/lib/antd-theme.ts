"use client";

import { theme as antdTheme } from "antd";
import type { ThemeConfig } from "antd";

const { darkAlgorithm, defaultAlgorithm } = antdTheme;

export function getAntdTheme(isDark: boolean): ThemeConfig {
  return {
    algorithm: isDark ? darkAlgorithm : defaultAlgorithm,
    token: {
      colorPrimary: "#8B0000",
      colorSuccess: isDark ? "#4A8C5C" : "#226B42",
      colorWarning: isDark ? "#D4AF37" : "#B45309",
      colorError: isDark ? "#EF4444" : "#B42318",
      colorInfo: isDark ? "#60A5FA" : "#1D4ED8",
      colorBgContainer: isDark ? "#1C2030" : "#FFFFFF",
      colorBgElevated: isDark ? "#252A3A" : "#FFFFFF",
      colorBgLayout: isDark ? "#0D111B" : "#F6F8FB",
      colorText: isDark ? "#EDE2DF" : "#101828",
      colorTextSecondary: isDark ? "#B8B0A4" : "#344054",
      colorBorder: isDark ? "#2E3345" : "#D0D7E2",
      colorBorderSecondary: isDark ? "#252A3A" : "#E4E7EC",
      borderRadius: 8,
      fontFamily: "Source Sans 3, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      fontSize: 14,
      colorLink: "#8B0000",
      colorLinkHover: isDark ? "#D4AF37" : "#B22222",
      controlHeight: 36,
      wireframe: false,
    },
    components: {
      Table: {
        headerBg: isDark ? "#252A3A" : "#F9FAFB",
        headerColor: isDark ? "#B8B0A4" : "#344054",
        headerSortActiveBg: isDark ? "#2E3345" : "#F2F4F7",
        headerSortHoverBg: isDark ? "#2E3345" : "#F2F4F7",
        rowHoverBg: isDark ? "rgba(139, 0, 0, 0.08)" : "rgba(139, 0, 0, 0.04)",
        rowSelectedBg: isDark ? "rgba(139, 0, 0, 0.15)" : "rgba(139, 0, 0, 0.08)",
        rowSelectedHoverBg: isDark ? "rgba(139, 0, 0, 0.2)" : "rgba(139, 0, 0, 0.12)",
        borderColor: isDark ? "#2E3345" : "#E4E7EC",
        stickyScrollBarBg: isDark ? "#2E3345" : "#D0D7E2",
        stickyScrollBarBorderRadius: 4,
      },
      Form: {
        labelColor: isDark ? "#B8B0A4" : "#344054",
      },
      Button: {
        primaryShadow: "0 2px 0 rgba(139, 0, 0, 0.1)",
        defaultShadow: "0 2px 0 rgba(0,0,0,0.02)",
        fontWeight: 600,
      },
      Input: {
        activeBorderColor: "#8B0000",
        hoverBorderColor: isDark ? "#B22222" : "#8B0000",
      },
      Select: {
        optionSelectedBg: isDark ? "rgba(139, 0, 0, 0.15)" : "rgba(139, 0, 0, 0.08)",
      },
      Steps: {
        colorPrimary: "#8B0000",
      },
      Notification: {
        colorInfo: isDark ? "#1C2030" : "#FFFFFF",
      },
    },
  };
}
