"use client";

import { Box } from "@mui/material";
import { ReactNode } from "react";

export interface KpiCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  gradient: string;
  delta?: string;
  deltaColor?: "success" | "error" | "warning" | "info" | "default";
  pct?: number;
}

interface KpiGridProps {
  cards: KpiCardProps[];
  sx?: object;
}

export default function KpiGrid({ cards, sx }: KpiGridProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
        gap: 2,
        ...sx,
      }}
    >
      {cards.map((card, index) => (
        <StatCard key={index} index={index} {...card} />
      ))}
    </Box>
  );
}

import StatCard from "./StatCard";