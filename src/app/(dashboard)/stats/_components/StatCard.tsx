"use client";

import { Box, Typography, Avatar } from "@mui/material";
import { alpha } from "@mui/material";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  delta?: string;
  deltaColor?: "success" | "error" | "warning" | "info" | "default";
  pct?: number;
  index?: number;
  sx?: object;
}

export default function StatCard({
  label,
  value,
  icon,
  gradient,
  delta,
  deltaColor = "default",
  pct,
  index = 0,
  sx,
}: StatCardProps) {
  const isError = deltaColor === "error";
  const isSuccess = deltaColor === "success";
  const isWarning = deltaColor === "warning";

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 3,
        border: `1px solid`,
        borderColor: isError ? "error.main" : isSuccess ? "success.main" : "divider",
        borderWidth: isError || isSuccess ? 2 : 1,
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": { transform: "translateY(-2px)", boxShadow: 4 },
        animation: `fadeInUp 0.4s ease-out`,
        animationDelay: `${index * 0.07}s`,
        animationFillMode: "both",
        ...sx,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 80,
          height: 80,
          background: gradient,
          opacity: 0.12,
          borderRadius: "0 12px 0 80px",
        }}
      />
      <Box sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <Avatar
              sx={{
                background: gradient,
                width: 44,
                height: 44,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
            >
              {icon}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {label}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {value}
              </Typography>
            </Box>
          </Box>
        </Box>
        {(pct !== undefined || delta) && (
          <Box sx={{ mt: 1.5 }}>
            {pct !== undefined && (
              <>
                <Box
                  sx={{
                    height: 3,
                    borderRadius: 2,
                    background: "action.hover",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      width: `${Math.min(100, Math.max(0, pct))}%`,
                      height: "100%",
                      background: gradient,
                      borderRadius: 2,
                      transition: "width 0.5s ease-out",
                    }}
                  />
                </Box>
              </>
            )}
            {delta && (
              <Typography
                variant="caption"
                sx={{
                  mt: 0.5,
                  color: isError
                    ? "error.main"
                    : isSuccess
                    ? "success.main"
                    : isWarning
                    ? "warning.main"
                    : "text.secondary",
                  fontWeight: 600,
                  fontSize: "0.72rem",
                }}
              >
                {delta}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}