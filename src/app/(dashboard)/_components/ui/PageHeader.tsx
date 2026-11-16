import { ReactNode } from "react";
import { Avatar, Box, Button, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";
import { useRouter } from "next/navigation";
import type { SvgIconComponent } from "@mui/icons-material";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  backHref?: string;
  icon?: SvgIconComponent;
  /** @deprecated gradient variant được bỏ — dùng flat header thực tế hơn */
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
  onRefresh,
  statBadges,
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <Stack
      direction="row"
      sx={{
        alignItems: "flex-start",
        justifyContent: "space-between",
        mb: 3,
        gap: 2,
        flexWrap: "wrap",
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        {backHref && (
          <IconButton
            onClick={() => router.push(backHref)}
            size="small"
            sx={{
              border: "1px solid",
              borderColor: "divider",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        )}
        {Icon && (
          <Avatar
            sx={{
              bgcolor: "action.selected",
              width: 42,
              height: 42,
              borderRadius: 2,
            }}
          >
            <Icon sx={{ color: "primary.main", fontSize: 22 }} />
          </Avatar>
        )}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            {title}
          </Typography>
          {(subtitle || statBadges) && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {statBadges || subtitle}
            </Typography>
          )}
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0 }}>
        {onRefresh && (
          <Tooltip title="Tải lại">
            <IconButton
              onClick={onRefresh}
              size="small"
              sx={{
                border: "1px solid",
                borderColor: "divider",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {actions}
      </Stack>
    </Stack>
  );
}
