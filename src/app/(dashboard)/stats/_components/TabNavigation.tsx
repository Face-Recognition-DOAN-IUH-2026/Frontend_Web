"use client";

import { Stack, Chip, useTheme } from "@mui/material";
import { useRouter, usePathname } from "next/navigation";

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

export default function TabNavigation({ tabs, variant = "outlined", sx }: TabNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        flexWrap: "wrap",
        gap: 1,
        ...sx,
      }}
    >
      {tabs.map((tab) => (
        <Chip
          key={tab.href}
          label={tab.label}
          icon={tab.icon}
          variant={variant}
          color={
            pathname === tab.href || pathname.startsWith(tab.href + "/")
              ? "primary"
              : "default"
          }
          onClick={() => router.push(tab.href)}
          sx={{
            cursor: "pointer",
            fontWeight: pathname === tab.href ? 700 : 600,
            transition: "all 0.2s",
            "&:hover": {
              bgcolor:
                variant === "outlined"
                  ? "action.hover"
                  : theme.palette.primary.light,
              color: variant === "outlined" ? "primary.main" : "primary.contrastText",
            },
          }}
        />
      ))}
    </Stack>
  );
}