import { Snackbar, Alert, AlertColor, SnackbarOrigin } from "@mui/material";

interface NoticeSnackbarProps {
  open: boolean;
  message: string;
  severity?: AlertColor;
  onClose: () => void;
  autoHideDuration?: number;
  anchorOrigin?: SnackbarOrigin;
  slideAnimation?: boolean;
}

export default function NoticeSnackbar({
  open,
  message,
  severity = "success",
  onClose,
  autoHideDuration = 3000,
  anchorOrigin = { vertical: "bottom", horizontal: "right" },
  slideAnimation = true,
}: NoticeSnackbarProps) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        sx={{
          borderRadius: 2,
          boxShadow: 4,
          ...(slideAnimation && {
            animation: "slideInRight 0.3s ease-out",
            "@keyframes slideInRight": {
              from: { transform: "translateX(100%)", opacity: 0 },
              to: { transform: "translateX(0)", opacity: 1 },
            },
          }),
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
