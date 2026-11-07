"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Paper, Typography, alpha, useTheme } from "@mui/material";
import ChartIcon from "@mui/icons-material/BarChartOutlined";
import AttachMoneyIcon from "@mui/icons-material/AttachMoneyOutlined";
import MenuBookIcon from "@mui/icons-material/MenuBookOutlined";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUserOutlined";
import RadioIcon from "@mui/icons-material/SettingsInputAntennaOutlined";

export interface TabItem {
  label: string;
  href: string;
  icon?: React.ReactElement;
}

interface TabNavigationProps {
  tabs: TabItem[];
  variant?: "outlined" | "filled";
  sx?: object;
}

const DEFAULT_ICONS: Record<string, React.ReactElement> = {
  "/stats": <ChartIcon sx={{ fontSize: 18 }} />,
  "/stats/finance": <AttachMoneyIcon sx={{ fontSize: 18 }} />,
  "/stats/inventory": <MenuBookIcon sx={{ fontSize: 18 }} />,
  "/stats/recognition": <VerifiedUserIcon sx={{ fontSize: 18 }} />,
  "/stats/realtime": <RadioIcon sx={{ fontSize: 18 }} />,
};

export default function TabNavigation({ tabs, sx }: TabNavigationProps) {
  const pathname = usePathname();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        p: 0.75,
        borderRadius: 2.5,
        bgcolor: isDark ? alpha(theme.palette.background.paper, 0.7) : "background.paper",
        display: "inline-flex",
        flexWrap: "wrap",
        gap: 0.75,
        width: "fit-content",
        maxWidth: "100%",
        borderColor: "divider",
        ...sx,
      }}
    >
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/stats"
            ? pathname === "/stats"
            : pathname === tab.href || pathname.startsWith(tab.href + "/");

        const icon = tab.icon || DEFAULT_ICONS[tab.href];

        return (
          <Box
            key={tab.href}
            component={Link}
            href={tab.href}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 0.85,
              borderRadius: 2,
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: isActive ? 700 : 600,
              color: isActive ? "#ffffff" : "text.secondary",
              bgcolor: isActive
                ? isDark ? theme.palette.primary.main : "#8B0000"
                : "transparent",
              boxShadow: isActive
                ? isDark ? "0 2px 8px rgba(0,0,0,0.4)" : "0 2px 8px rgba(139, 0, 0, 0.25)"
                : "none",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                bgcolor: isActive
                  ? isDark ? theme.palette.primary.dark : "#700000"
                  : isDark ? alpha("#ffffff", 0.06) : alpha(theme.palette.primary.main, 0.05),
                color: isActive ? "#ffffff" : "text.primary",
              },
            }}
          >
            {icon && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  color: isActive ? "#ffffff" : "inherit",
                }}
              >
                {icon}
              </Box>
            )}
            <Typography variant="body2" sx={{ fontWeight: "inherit", fontSize: "inherit", color: "inherit" }}>
              {tab.label}
            </Typography>
          </Box>
        );
      })}
    </Paper>
  );
}