import { ReactNode } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useRouter } from "next/navigation";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  backHref?: string;
}

export default function PageHeader({ title, subtitle, actions, backHref }: PageHeaderProps) {
  const router = useRouter();

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
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
      {actions && <Stack direction="row" spacing={1}>{actions}</Stack>}
    </Stack>
  );
}
