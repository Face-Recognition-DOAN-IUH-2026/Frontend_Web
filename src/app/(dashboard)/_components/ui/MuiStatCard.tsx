import { Avatar, Box, LinearProgress, Paper, Stack, Typography } from "@mui/material";
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
  const deltaColors = {
    success: "#059669",
    warning: "#D97706",
    error:   "#DC2626",
    default: "text.secondary",
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3,
        p: 2.5,
        position: "relative",
        overflow: "hidden",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        animation: `${fadeInUp} 0.45s ease-out both`,
        animationDelay: `${index * 0.06}s`,
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 6px 20px rgba(30,96,145,0.12)",
        },
      }}
    >
      {/* Subtle background glow (toned-down, no rainbow) */}
      <Box
        sx={{
          position: "absolute",
          top: -24,
          right: -24,
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: gradient,
          opacity: 0.08,
          pointerEvents: "none",
        }}
      />

      {/* Icon + Label row */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2 }}>
        <Avatar
          sx={{
            background: gradient,
            width: 40,
            height: 40,
            borderRadius: 2,
          }}
        >
          <Icon sx={{ color: "#fff", fontSize: 20 }} />
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
            "& .MuiLinearProgress-bar": { background: gradient, borderRadius: 2 },
          }}
        />
      )}
    </Paper>
  );
}
