"use client";

import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  useTheme,
} from "@mui/material";

export interface NewRoleDialogProps {
  open: boolean;
  onClose: () => void;
  newRoleName: string;
  setNewRoleName: (val: string) => void;
  newRoleLabel: string;
  setNewRoleLabel: (val: string) => void;
  onCreate: () => void;
}

export function NewRoleDialog({
  open,
  onClose,
  newRoleName,
  setNewRoleName,
  newRoleLabel,
  setNewRoleLabel,
  onCreate,
}: NewRoleDialogProps) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: "4px" } } }}
    >
      <DialogTitle sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
        Tạo vai trò mới
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Mã vai trò (Key ID)"
            placeholder="e.g. intern, student_assistant"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            fullWidth
            size="small"
            helperText="Viết liền không dấu, dùng để định danh trong backend"
            slotProps={{ input: { sx: { fontFamily: "'JetBrains Mono', monospace" } } }}
          />
          <TextField
            label="Tên hiển thị (Label)"
            placeholder="e.g. Thực tập sinh thư viện"
            value={newRoleLabel}
            onChange={(e) => setNewRoleLabel(e.target.value)}
            fullWidth
            size="small"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={onCreate}
          disabled={!newRoleName.trim()}
          sx={{
            textTransform: "none",
            borderRadius: "4px",
            bgcolor: theme.palette.primary.main,
            "&:hover": { bgcolor: theme.palette.primary.dark },
          }}
        >
          Tạo vai trò
        </Button>
      </DialogActions>
    </Dialog>
  );
}
