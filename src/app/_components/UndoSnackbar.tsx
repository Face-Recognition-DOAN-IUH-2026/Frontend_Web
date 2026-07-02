import { Button, Snackbar, Typography, Box, LinearProgress } from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";

interface UndoSnackbarProps {
  open: boolean;
  message: string;
  countdown: number;
  onUndo: () => void;
  onClose?: () => void;
}

export default function UndoSnackbar({ open, message, countdown, onUndo, onClose }: UndoSnackbarProps) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={null}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Box
        sx={{
          bgcolor: "grey.900",
          color: "common.white",
          borderRadius: 2,
          boxShadow: 6,
          px: 2.5,
          py: 1.5,
          minWidth: 360,
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2">{message}</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
            <LinearProgress
              variant="determinate"
              value={(countdown / 5) * 100}
              sx={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                bgcolor: "grey.700",
                "& .MuiLinearProgress-bar": { bgcolor: "primary.light" },
              }}
            />
            <Typography variant="caption" sx={{ color: "grey.400", minWidth: 24, textAlign: "right" }}>
              {countdown}s
            </Typography>
          </Box>
        </Box>
        <Button
          variant="text"
          size="small"
          startIcon={<UndoIcon />}
          onClick={onUndo}
          sx={{ color: "primary.light", whiteSpace: "nowrap", fontWeight: 600 }}
        >
          Hoàn tác
        </Button>
      </Box>
    </Snackbar>
  );
}
