import { Card, CardContent, Stack, Typography, type SxProps, type Theme } from "@mui/material";
import { ReactNode } from "react";

interface DashboardCardProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
  noPadding?: boolean;
  sx?: SxProps<Theme>;
}

export default function DashboardCard({
  title,
  subtitle,
  actions,
  children,
  noPadding = false,
  sx,
}: DashboardCardProps) {
  return (
    <Card
      variant="outlined"
      sx={[
        {
          borderRadius: 3,
          display: "flex",
          flexDirection: "column",
          height: "100%",
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {(title || actions) && (
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between", px: 2.5, pt: 2, pb: 1 }}
        >
          <Stack>
            {title && (
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Stack>
          {actions && <Stack direction="row" spacing={0.5}>{actions}</Stack>}
        </Stack>
      )}
      <CardContent
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          ...(noPadding ? { p: 0, "&:last-child": { pb: 0 } } : { px: 2.5, pb: 2.5 }),
        }}
      >
        {children}
      </CardContent>
    </Card>
  );
}
