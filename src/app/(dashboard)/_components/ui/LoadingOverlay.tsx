import { Box, CircularProgress, Stack, Typography } from "@mui/material";

interface LoadingOverlayProps {
  loading?: boolean;
  message?: string;
  children?: React.ReactNode;
}

export default function LoadingOverlay({ loading = true, message, children }: LoadingOverlayProps) {
  if (!loading) return <>{children}</>;

  return (
    <Stack
      spacing={1.5}
      sx={{
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        minHeight: 200,
      }}
    >
      <CircularProgress />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Stack>
  );
}
