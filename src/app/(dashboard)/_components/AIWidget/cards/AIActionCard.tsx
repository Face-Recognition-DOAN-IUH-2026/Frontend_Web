"use client";

import { Card, CardActionArea, CardContent, Box, Typography, Stack } from "@mui/material";
import { useRouter } from "next/navigation";
import { useAIWidgetStore } from "../store/useAIWidgetStore";

interface AIActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  path: string;
  color?: string;
}

export default function AIActionCard({ icon, title, description, path, color = "primary.main" }: AIActionCardProps) {
  const router = useRouter();
  const { close } = useAIWidgetStore();

  const handleClick = () => {
    router.push(path);
    close();
  };

  return (
    <Card
      variant="outlined"
      sx={{
        flex: "1 1 calc(50% - 8px)",
        minWidth: 0,
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: 2,
          borderColor: color,
        },
      }}
    >
      <CardActionArea onClick={handleClick} sx={{ p: 1.5 }}>
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          <Stack spacing={1}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                bgcolor: `${color}15`,
                color: color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {icon}
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
              {description}
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}