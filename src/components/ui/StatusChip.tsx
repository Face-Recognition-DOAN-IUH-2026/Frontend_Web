import { Chip, ChipProps } from "@mui/material";
import { statusLabel, statusColor } from "@/lib/utils";

interface StatusChipProps {
  status: string;
  size?: ChipProps["size"];
}

export default function StatusChip({ status, size = "small" }: StatusChipProps) {
  const color = statusColor(status);
  const label = statusLabel(status);

  return (
    <Chip
      label={label}
      color={color === "default" ? "default" : color}
      size={size}
      variant="outlined"
      sx={{ fontWeight: 600 }}
    />
  );
}
