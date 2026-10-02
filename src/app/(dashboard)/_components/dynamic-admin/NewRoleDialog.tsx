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
        Thêm Nhóm Chức vụ Mới
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Mã chức vụ (Key)"
            placeholder="vd: tro_ly, thu_thu_kho, kiem_ke"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            fullWidth
            size="small"
            helperText="Viết thường không dấu, dùng để nhận diện nội bộ hệ thống"
            slotProps={{ input: { sx: { fontFamily: "'JetBrains Mono', monospace" } } }}
          />
          <TextField
            label="Tên gọi chức vụ / vị trí"
            placeholder="vd: Thủ thư quản lý kho, Trợ lý thư viện, Cán bộ kiểm kê"
            value={newRoleLabel}
            onChange={(e) => setNewRoleLabel(e.target.value)}
            fullWidth
            size="small"
            helperText="Tên gọi hiển thị thân thiện trên thẻ nhân viên và phân quyền"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Hủy bỏ
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
          Tạo chức vụ
        </Button>
      </DialogActions>
    </Dialog>
  );
}
