import { Avatar, Box, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { fadeInUp } from "@/lib/animations";
import type { SvgIconComponent } from "@mui/icons-material";

interface MuiStatCardProps {
  label: string;
  value: number | string;
  icon: SvgIconComponent;
  gradient: string;
  pct?: number;
  index?: number;
}

export default function MuiStatCard({ label, value, icon: Icon, gradient, pct, index = 0 }: MuiStatCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3, position: "relative", overflow: "hidden", p: 2.5,
        transition: "all 0.25s ease",
        animation: `${fadeInUp} 0.5s ease-out`,
        animationDelay: `${index * 0.07}s`,
        animationFillMode: "both",
        "&:hover": { transform: "translateY(-2px)", boxShadow: 4 },
      }}
    >
      <Box sx={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: gradient, opacity: 0.12, pointerEvents: "none" }} />
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
        <Avatar sx={{ background: gradient, width: 44, height: 44 }}>
          <Icon sx={{ color: "#fff", fontSize: 22 }} />
        </Avatar>
        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: "uppercase", color: "text.secondary", letterSpacing: 0.5 }}>
          {label}
        </Typography>
      </Stack>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
        {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
      </Typography>
      {pct != null && (
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 3, borderRadius: 2, bgcolor: "rgba(99,102,241,0.08)",
            "& .MuiLinearProgress-bar": { background: gradient, borderRadius: 2 },
          }}
        />
      )}
    </Paper>
  );
}
