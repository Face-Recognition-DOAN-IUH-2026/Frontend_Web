import { Avatar, Box, LinearProgress, Paper, Stack, Typography, useTheme } from "@mui/material";
import { fadeInUp } from "@/lib/animations";
import type { SvgIconComponent } from "@mui/icons-material";

interface MuiStatCardProps {
  label: string;
  value: number | string;
  icon: SvgIconComponent;
  /** gradient string — dùng để tô màu icon avatar và progress bar */
  gradient: string;
  pct?: number;
  index?: number;
  /** Optional: delta / trend text (e.g. "+12 hôm nay") */
  delta?: string;
  deltaColor?: "success" | "warning" | "error" | "default";
}

/**
 * Flat, data-first stat card — Anti-Slop compliant.
 *
 * Thiết kế:
 *  - Flat icon (no gradient avatar, no glow circle)
 *  - Left accent border 3px (color từ gradient parse)
 *  - Không hover dance (translateY / rotate)
 *  - Progress bar dùng flat color
 */
export default function MuiStatCard({
  label,
  value,
  icon: Icon,
  gradient,
  pct,
  index = 0,
  delta,
  deltaColor = "default",
}: MuiStatCardProps) {
  const theme = useTheme();

  const deltaColors = {
    success: "#059669",
    warning: "#D97706",
    error:   "#DC2626",
    default: "text.secondary",
  };

  // Parse accent color from gradient string (e.g. "linear-gradient(135deg, #1E40AF 0%, ...)")
  const accentColor = (() => {
    const match = gradient.match(/#[0-9A-Fa-f]{6}/);
    return match ? match[0] : theme.palette.primary.main;
  })();

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2,
        p: 2,
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.2s ease",
        animation: `${fadeInUp} 0.4s ease-out both`,
        animationDelay: `${index * 0.06}s`,
        // Left accent bar — flat, purposeful color
        borderLeft: `3px solid ${accentColor}`,
        "&:hover": {
          borderColor: accentColor,
        },
      }}
    >
      {/* Icon + Label row */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
        <Avatar
          sx={{
            bgcolor: `${accentColor}18`, // 10% opacity flat bg
            width: 36,
            height: 36,
            borderRadius: 1,
          }}
        >
          <Icon sx={{ color: accentColor, fontSize: 18 }} />
        </Avatar>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "text.secondary",
            fontSize: "0.72rem",
          }}
        >
          {label}
        </Typography>
      </Stack>

      {/* Value */}
      <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1, mb: pct != null ? 1.5 : 0 }}>
        {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
      </Typography>

      {/* Delta / trend */}
      {delta && (
        <Typography
          variant="caption"
          sx={{ color: deltaColors[deltaColor], fontWeight: 600, display: "block", mt: 0.5 }}
        >
          {delta}
        </Typography>
      )}

      {/* Progress bar — flat color, no gradient */}
      {pct != null && (
        <LinearProgress
          variant="determinate"
          value={Math.min(pct, 100)}
          sx={{
            height: 3,
            borderRadius: 2,
            bgcolor: "action.hover",
            mt: delta ? 0.75 : 0,
            "& .MuiLinearProgress-bar": { bgcolor: accentColor, borderRadius: 2 },
          }}
        />
      )}
    </Paper>
  );
}
