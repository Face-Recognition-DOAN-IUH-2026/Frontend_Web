"use client";

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from "@mui/material";
import type { BorrowRecord, StaffPatronActiveBorrowsResponse } from "@/lib/types";
import { usePermission, getPermissionDeniedReason } from "@/lib/permission-context";

interface ReturnConfirmDialogProps {
  record: BorrowRecord | null;
  detail: StaffPatronActiveBorrowsResponse | null;
  condition: string;
  onConditionChange: (val: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export default function ReturnConfirmDialog({
  record,
  detail,
  condition,
  onConditionChange,
  onClose,
  onConfirm,
  loading,
}: ReturnConfirmDialogProps) {
  const { can } = usePermission();
  const canUpdateBorrow = can("borrows", "update");
  const patronName = detail?.patron.full_name || detail?.patron.student_code || "độc giả";

  return (
    <Dialog open={!!record} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Xác nhận trả sách</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Xác nhận nhận lại sách &quot;<strong>{record?.book?.title || record?.book_id}</strong>&quot; từ độc giả {patronName}?
        </DialogContentText>

        {record && record.due_at && new Date(record.due_at).getTime() < Date.now() ? (() => {
          const days = Math.max(1, Math.ceil((Date.now() - new Date(record.due_at).getTime()) / (1000 * 60 * 60 * 24)));
          const fine = days * 5000;
          return (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Sách đã quá hạn {days} ngày
              </Typography>
              <Typography variant="body2" sx={{ fontSize: "0.82rem", mt: 0.5 }}>
                Phí phạt trễ hạn ước tính: <strong>{fine.toLocaleString("vi-VN")} đ</strong> (5.000 đ/ngày). Thủ thư vui lòng kiểm tra và thu phí (nếu có) trước khi hoàn tất.
              </Typography>
            </Alert>
          );
        })() : null}

        <Select
          value={condition}
          onChange={(e) => onConditionChange(e.target.value)}
          displayEmpty
          fullWidth
          size="small"
        >
          <MenuItem value="">Tình trạng sách (tuỳ chọn)</MenuItem>
          <MenuItem value="Còn mới">Còn mới</MenuItem>
          <MenuItem value="Bình thường">Bình thường</MenuItem>
          <MenuItem value="Sách cũ">Sách cũ</MenuItem>
          <MenuItem value="Rách bìa">Rách bìa</MenuItem>
          <MenuItem value="Rách trang">Rách trang</MenuItem>
          <MenuItem value="Thiếu trang">Thiếu trang</MenuItem>
          <MenuItem value="Ẩm mốc">Ẩm mốc</MenuItem>
          <MenuItem value="Viết/bôi bẩn">Viết/bôi bẩn</MenuItem>
          <MenuItem value="Hư hỏng nặng">Hư hỏng nặng</MenuItem>
        </Select>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Hủy</Button>
        <Tooltip title={!canUpdateBorrow ? getPermissionDeniedReason("borrows", "update") : ""}>
          <span>
            <Button
              variant="contained"
              color="success"
              onClick={() => {
                if (!canUpdateBorrow) return;
                onConfirm();
              }}
              disabled={loading || !canUpdateBorrow}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {loading ? "Đang trả..." : "Xác nhận trả"}
            </Button>
          </span>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
}
