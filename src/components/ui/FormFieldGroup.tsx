import { ReactNode } from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";

interface FormFieldGroupProps {
  title?: string;
  children: ReactNode;
  divider?: boolean;
}

export default function FormFieldGroup({ title, children, divider = false }: FormFieldGroupProps) {
  return (
    <Stack spacing={2}>
      {title && (
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.secondary" }}>
          {title}
        </Typography>
      )}
      <Stack spacing={2}>{children}</Stack>
      {divider && <Divider />}
    </Stack>
  );
}
