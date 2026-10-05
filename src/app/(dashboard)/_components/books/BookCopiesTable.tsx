"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlineOutlined";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import api, { getErrorMessage } from "@/lib/api-client";
import type { BookCopy } from "@/lib/types";
import {
  CONDITION_CODES,
  CONDITION_LABELS,
  getConditionColor,
  COPY_STATUS_CODES,
  COPY_STATUS_LABELS,
  getStatusColor,
  type CopyCondition,
  type CopyStatus,
} from "@/lib/constants/copy";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";

interface BookCopiesTableProps {
  bookId: string;
  isbn?: string;
  copies?: BookCopy[];
  loading?: boolean;
  onRefresh: () => void;
  showNotice: (
    severity: "success" | "error" | "warning" | "info",
    message: string
  ) => void;
}

export function BookCopiesTable({
  bookId,
  isbn,
  copies: rawCopies = [],
  loading = false,
  onRefresh,
  showNotice,
}: BookCopiesTableProps) {
  const copies = Array.isArray(rawCopies)
    ? rawCopies
    : Array.isArray((rawCopies as any)?.items)
    ? (rawCopies as any).items
    : Array.isArray((rawCopies as any)?.data)
    ? (rawCopies as any).data
    : [];

  // Add modal state
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addBarcode, setAddBarcode] = useState("");
  const [addCondition, setAddCondition] = useState<CopyCondition>("new");
  const [addStatus, setAddStatus] = useState<CopyStatus>("available");
  const [addShelf, setAddShelf] = useState("");

  // Edit modal state
  const [editCopy, setEditCopy] = useState<BookCopy | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editCondition, setEditCondition] = useState<CopyCondition>("good");
  const [editStatus, setEditStatus] = useState<CopyStatus>("available");
  const [editShelf, setEditShelf] = useState("");
  const [editNote, setEditNote] = useState("");

  // Delete modal state
  const [deleteCopy, setDeleteCopy] = useState<BookCopy | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleOpenAdd = () => {
    setAddBarcode("");
    setAddCondition("new");
    setAddStatus("available");
    setAddShelf("");
    setAddOpen(true);
  };

  const handleCreate = async () => {
    setAddLoading(true);
    try {
      await api.createBookCopy({
        book_id: bookId,
        barcode: addBarcode.trim() || undefined,
        condition: addCondition,
        status: addStatus,
        shelf_location: addShelf.trim() || undefined,
      });
      showNotice("success", "Thêm bản sao thành công");
      setAddOpen(false);
      onRefresh();
    } catch (err) {
      showNotice("error", getErrorMessage(err) || "Thêm bản sao thất bại");
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenEdit = (copy: BookCopy) => {
    setEditCopy(copy);
    setEditCondition((copy.condition as CopyCondition) || "good");
    setEditStatus((copy.status as CopyStatus) || "available");
    setEditShelf(copy.shelf_location || "");
    setEditNote("");
  };

  const handleUpdate = async () => {
    if (!editCopy) return;
    setEditLoading(true);
    try {
      await api.updateBookCopy(editCopy.id, {
        condition: editCondition,
        status: editStatus,
        shelf_location: editShelf.trim() || undefined,
        note: editNote.trim() || undefined,
      });
      showNotice("success", "Cập nhật bản sao thành công");
      setEditCopy(null);
      onRefresh();
    } catch (err) {
      showNotice("error", getErrorMessage(err) || "Cập nhật bản sao thất bại");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCopy) return;
    setDeleteLoading(true);
    try {
      await api.deleteBookCopy(deleteCopy.id);
      showNotice("success", "Xóa bản sao thành công");
      setDeleteCopy(null);
      onRefresh();
    } catch (err) {
      showNotice("error", getErrorMessage(err) || "Xóa bản sao thất bại");
    } finally {
      setDeleteLoading(false);
    }
  };

  const cardAction = (
    <Button
      variant="contained"
      size="small"
      startIcon={<AddIcon />}
      onClick={handleOpenAdd}
    >
      Thêm bản sao
    </Button>
  );

  return (
    <DashboardCard title="Danh sách bản sao" actions={cardAction}>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : copies.length === 0 ? (
        <Box sx={{ py: 3, textAlign: "center" }}>
          <Typography color="text.secondary">
            Chưa có bản sao nào. Hãy nhấn &quot;Thêm bản sao&quot; để tạo mã vạch quản lý.
          </Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Mã vạch</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Tình trạng</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Ngày nhập</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Vị trí kệ</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Thao tác
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {copies.map((copy: BookCopy) => {
                const condition = (copy.condition as CopyCondition) || "new";
                const status = (copy.status as CopyStatus) || "available";
                const formattedDate = copy.imported_at
                  ? new Date(copy.imported_at).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "-";

                return (
                  <TableRow key={copy.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <QrCode2Icon fontSize="small" sx={{ color: "text.secondary" }} />
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: "monospace", fontWeight: 600 }}
                        >
                          {copy.barcode}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={CONDITION_LABELS[condition] || condition}
                        color={getConditionColor(condition)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={COPY_STATUS_LABELS[status] || status}
                        color={getStatusColor(status)}
                      />
                    </TableCell>
                    <TableCell>{formattedDate}</TableCell>
                    <TableCell>{copy.shelf_location || "-"}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Chỉnh sửa bản sao">
                        <IconButton
                          aria-label={`Sửa bản sao ${copy.barcode}`}
                          size="small"
                          onClick={() => handleOpenEdit(copy)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Xóa bản sao">
                        <IconButton
                          aria-label={`Xóa bản sao ${copy.barcode}`}
                          size="small"
                          color="error"
                          onClick={() => setDeleteCopy(copy)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Copy Dialog */}
      <Dialog
        open={addOpen}
        onClose={() => !addLoading && setAddOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Thêm bản sao mới</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Mã vạch (Barcode)"
              placeholder={`VD: LIB-${isbn || "..."}-001`}
              helperText="Để trống để hệ thống tự động sinh theo mẫu LIB-<isbn>-<seq>"
              value={addBarcode}
              onChange={(e) => setAddBarcode(e.target.value)}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="add-condition-label">Tình trạng sách</InputLabel>
              <Select
                labelId="add-condition-label"
                label="Tình trạng sách"
                value={addCondition}
                onChange={(e) => setAddCondition(e.target.value as CopyCondition)}
              >
                {CONDITION_CODES.map((code) => (
                  <MenuItem key={code} value={code}>
                    {CONDITION_LABELS[code]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="add-status-label">Trạng thái mượn</InputLabel>
              <Select
                labelId="add-status-label"
                label="Trạng thái mượn"
                value={addStatus}
                onChange={(e) => setAddStatus(e.target.value as CopyStatus)}
              >
                {COPY_STATUS_CODES.map((code) => (
                  <MenuItem key={code} value={code}>
                    {COPY_STATUS_LABELS[code]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Vị trí kệ"
              placeholder="VD: Kệ A1-02"
              value={addShelf}
              onChange={(e) => setAddShelf(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAddOpen(false)} disabled={addLoading}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={addLoading}
            startIcon={addLoading ? <CircularProgress size={16} /> : null}
          >
            {addLoading ? "Đang thêm..." : "Thêm"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Copy Dialog */}
      <Dialog
        open={Boolean(editCopy)}
        onClose={() => !editLoading && setEditCopy(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Cập nhật bản sao</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Mã vạch (Barcode)"
              value={editCopy?.barcode || ""}
              disabled
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="edit-condition-label">Tình trạng sách</InputLabel>
              <Select
                labelId="edit-condition-label"
                label="Tình trạng sách"
                value={editCondition}
                onChange={(e) => setEditCondition(e.target.value as CopyCondition)}
              >
                {CONDITION_CODES.map((code) => (
                  <MenuItem key={code} value={code}>
                    {CONDITION_LABELS[code]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="edit-status-label">Trạng thái mượn</InputLabel>
              <Select
                labelId="edit-status-label"
                label="Trạng thái mượn"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as CopyStatus)}
              >
                {COPY_STATUS_CODES.map((code) => (
                  <MenuItem key={code} value={code}>
                    {COPY_STATUS_LABELS[code]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Vị trí kệ"
              value={editShelf}
              onChange={(e) => setEditShelf(e.target.value)}
              fullWidth
            />
            <TextField
              label="Lý do thay đổi (ghi chú lịch sử)"
              placeholder="VD: Kiểm tra định kỳ, phát hiện rách gáy..."
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditCopy(null)} disabled={editLoading}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdate}
            disabled={editLoading}
            startIcon={editLoading ? <CircularProgress size={16} /> : null}
          >
            {editLoading ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Copy Dialog */}
      <Dialog
        open={Boolean(deleteCopy)}
        onClose={() => !deleteLoading && setDeleteCopy(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận xóa bản sao</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Bạn có chắc muốn xóa bản sao{" "}
            <strong>{deleteCopy?.barcode}</strong>? Thao tác này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteCopy(null)} disabled={deleteLoading}>
            Hủy
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={16} /> : null}
          >
            {deleteLoading ? "Đang xóa..." : "Xóa"}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardCard>
  );
}
export default BookCopiesTable;
