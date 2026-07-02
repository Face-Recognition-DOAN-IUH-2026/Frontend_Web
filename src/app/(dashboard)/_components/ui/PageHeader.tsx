import { ReactNode } from "react";
import { Avatar, Box, Button, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useRouter } from "next/navigation";
import type { SvgIconComponent } from "@mui/icons-material";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  backHref?: string;
  icon?: SvgIconComponent;
  gradient?: string;
  gradientIconBg?: string;
  gradientIconColor?: string;
  statBadges?: string;
  onRefresh?: () => void;
}

export default function PageHeader({
  title,
  subtitle,
  actions,
  backHref,
  icon: Icon,
  gradient,
  gradientIconBg = "rgba(99,102,241,0.3)",
  gradientIconColor = "#a5b4fc",
  statBadges,
  onRefresh,
}: PageHeaderProps) {
  const router = useRouter();

  if (gradient) {
    return (
      <Box
        sx={{
          p: 3, borderRadius: 3,
          background: gradient,
          border: "1px solid", borderColor: "rgba(99,102,241,0.3)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 2, position: "relative", overflow: "hidden",
        }}
      >
        <Box sx={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", bgcolor: "rgba(99,102,241,0.08)", pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -60, left: 200, width: 220, height: 220, borderRadius: "50%", bgcolor: "rgba(99,102,241,0.05)", pointerEvents: "none" }} />
        <Stack direction="row" spacing={2} sx={{ zIndex: 1, alignItems: "center" }}>
          {Icon && (
            <Avatar sx={{ bgcolor: gradientIconBg, width: 52, height: 52, border: "1px solid rgba(99,102,241,0.5)" }}>
              <Icon sx={{ color: gradientIconColor, fontSize: 28 }} />
            </Avatar>
          )}
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#e0e7ff" }}>{title}</Typography>
            {(subtitle || statBadges) && (
              <Typography variant="body2" sx={{ color: "rgba(199,210,254,0.7)", mt: 0.3 }}>
                {statBadges || subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ zIndex: 1, flexWrap: "wrap" }}>
          {onRefresh && (
            <Tooltip title="Tải lại">
              <IconButton onClick={onRefresh} size="small" sx={{ color: gradientIconColor, border: "1px solid rgba(165,180,252,0.3)", "&:hover": { bgcolor: "rgba(165,180,252,0.1)" } }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {actions}
        </Stack>
      </Box>
    );
  }

  return (
    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 3 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        {backHref && (
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push(backHref)}
            sx={{ minWidth: 0, px: 1 }}
          >
            Quay lại
          </Button>
        )}
        {Icon && !gradient && (
          <Avatar sx={{ bgcolor: "primary.main", width: 40, height: 40 }}>
            <Icon sx={{ color: "#fff", fontSize: 20 }} />
          </Avatar>
        )}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        {onRefresh && (
          <Tooltip title="Tải lại">
            <IconButton onClick={onRefresh} size="small"><RefreshIcon fontSize="small" /></IconButton>
          </Tooltip>
        )}
        {actions}
      </Stack>
    </Stack>
  );
}
