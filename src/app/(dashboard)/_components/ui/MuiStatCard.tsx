import { Avatar, Box, Chip, LinearProgress, Paper, Stack, Typography, alpha, useTheme } from "@mui/material";
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
 * Modern Aesthetic KPI Stat Card — Chuẩn Impeccable Design.
 * Tối ưu tỷ lệ tương phản, typography Space Grotesk và micro-interactions.
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
        borderRadius: 2.5,
        p: 2.25,
        position: "relative",
        overflow: "hidden",
        bgcolor: isDark ? alpha(theme.palette.background.paper, 0.8) : "background.paper",
        backdropFilter: "blur(10px)",
        borderColor: alpha(accentColor, isDark ? 0.2 : 0.15),
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        animation: `${fadeInUp} 0.4s ease-out both`,
        animationDelay: `${index * 0.05}s`,
        "&:hover": {
          transform: "translateY(-3px)",
          borderColor: accentColor,
          boxShadow: isDark
            ? `0 12px 28px -6px rgba(0, 0, 0, 0.5), 0 0 16px ${alpha(accentColor, 0.15)}`
            : `0 12px 28px -6px ${alpha(accentColor, 0.14)}, 0 2px 6px ${alpha(accentColor, 0.06)}`,
        },
      }}
    >
      {/* Icon + Label row with optional right percentage chip */}
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
          <Avatar
            sx={{
              bgcolor: alpha(accentColor, isDark ? 0.22 : 0.12),
              width: 38,
              height: 38,
              borderRadius: 2,
              boxShadow: `0 2px 8px ${alpha(accentColor, 0.2)}`,
            }}
          >
            <Icon sx={{ color: accentColor, fontSize: 20 }} />
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

        {pct != null && (
          <Chip
            size="small"
            label={`${Math.round(pct)}%`}
            sx={{
              height: 20,
              fontSize: "0.68rem",
              fontWeight: 800,
              fontFamily: "'Space Grotesk', monospace",
              bgcolor: alpha(accentColor, isDark ? 0.2 : 0.1),
              color: accentColor,
              border: `1px solid ${alpha(accentColor, 0.25)}`,
            }}
          />
        )}
      </Stack>

      {/* Main KPI Value */}
      <Typography
        variant="h4"
        sx={{
          fontFamily: "'Space Grotesk', -apple-system, sans-serif",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          mb: 0.5,
          color: "text.primary",
        }}
      >
        {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
      </Typography>

      {/* Delta / trend text */}
      {delta && (
        <Typography
          variant="caption"
          sx={{
            color: deltaColors[deltaColor],
            fontWeight: 600,
            display: "block",
            lineHeight: 1.3,
            mt: 0.5,
          }}
        >
          {delta}
        </Typography>
      )}

      {/* Modern Pill Progress bar */}
      {pct != null && (
        <LinearProgress
          variant="determinate"
          value={Math.min(pct, 100)}
          sx={{
            height: 5,
            borderRadius: 99,
            bgcolor: alpha(accentColor, isDark ? 0.15 : 0.1),
            mt: delta ? 1 : 1.25,
            "& .MuiLinearProgress-bar": {
              bgcolor: accentColor,
              borderRadius: 99,
            },
          }}
        />
      )}
    </Paper>
  );
}
