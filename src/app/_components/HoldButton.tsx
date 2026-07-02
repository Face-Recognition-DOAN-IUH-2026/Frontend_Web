import { Box, Button, CircularProgress, Typography } from "@mui/material";
import useHold from "@/lib/hooks/useHold";

interface HoldButtonProps {
  onHoldComplete: () => void;
  duration?: number;
  children: React.ReactNode;
  disabled?: boolean;
  color?: "primary" | "success" | "error" | "warning";
}

export default function HoldButton({ onHoldComplete, duration = 1000, children, disabled, color = "primary" }: HoldButtonProps) {
  const { holding, progress, onStart, onEnd } = useHold({ onHoldComplete, duration });

  return (
    <Box sx={{ position: "relative", display: "inline-flex" }}>
      <Button
        variant="contained"
        color={color}
        disabled={disabled}
        onMouseDown={onStart}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        onTouchStart={onStart}
        onTouchEnd={onEnd}
        sx={{
          minWidth: 160,
          position: "relative",
          transition: "none",
          ...(holding && { bgcolor: `${color}.dark` }),
        }}
      >
        {holding ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={18} color="inherit" variant="determinate" value={progress * 100} />
            <Typography variant="button">Giữ để xác nhận</Typography>
          </Box>
        ) : children}
      </Button>
    </Box>
  );
}
