import { Avatar, Box, LinearProgress, Paper, Stack, Typography, alpha, useTheme } from "@mui/material";
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
 * Supports both Light and Dark modes with optimal text contrast.
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
  const isDark = theme.palette.mode === "dark";

  // Parse accent color from gradient string and adapt for dark mode contrast
  const accentColor = (() => {
    const match = gradient.match(/#[0-9A-Fa-f]{6}/);
    const raw = match ? match[0].toUpperCase() : theme.palette.primary.main;
    if (isDark) {
      // In dark mode, ensure dark colors have high contrast against #0C1E32 paper
      if (raw === "#0A2540" || raw === "#0F3C5C" || raw === "#1E40AF") return "#38BDF8"; // Sky cyan for navy
      if (raw === "#8B0000" || raw === "#700000" || raw === "#900C3F") return "#F87171"; // Coral red for dark red
      if (raw === "#D4AF37" || raw === "#B89628") return "#FBBF24"; // Bright amber for gold
      if (raw === "#059669" || raw === "#047857") return "#34D399"; // Mint emerald
      if (raw === "#475569" || raw === "#334155") return "#94A3B8"; // Slate
      if (raw === "#DC2626") return "#F87171"; // Bright red
    }
    return raw;
  })();

  const deltaColors = {
    success: isDark ? "#34D399" : "#059669",
    warning: isDark ? "#FBBF24" : "#D97706",
    error:   isDark ? "#F87171" : "#DC2626",
    default: "text.secondary",
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2,
        p: 2,
        position: "relative",
        overflow: "hidden",
        bgcolor: "background.paper",
        transition: "border-color 0.2s ease",
        animation: `${fadeInUp} 0.4s ease-out both`,
        animationDelay: `${index * 0.06}s`,
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
            bgcolor: alpha(accentColor, isDark ? 0.2 : 0.1),
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
      <Typography
        variant="h4"
        sx={{
          fontWeight: 800,
          lineHeight: 1,
          mb: pct != null ? 1.5 : 0,
          color: "text.primary",
        }}
      >
        {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
      </Typography>

      {/* Delta / trend */}
      {delta && (
        <Typography
          variant="caption"
          sx={{
            color: deltaColors[deltaColor],
            fontWeight: 600,
            display: "block",
            mt: 0.5,
          }}
        >
          {delta}
        </Typography>
      )}

      {/* Progress bar */}
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
