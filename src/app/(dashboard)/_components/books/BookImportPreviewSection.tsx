"use client";

import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AlertIcon from "@mui/icons-material/WarningAmberOutlined";
import CheckIcon from "@mui/icons-material/CheckCircleOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlineOutlined";
import type { BookImportPreviewRow } from "@/lib/types";
import { BarcodeRangeList } from "./BarcodeRangeList";

export interface BookImportPreviewSectionProps {
  previewFile: File | null;
  previewData: BookImportPreviewRow[] | null;
  setPreviewData: React.Dispatch<React.SetStateAction<BookImportPreviewRow[] | null>>;
  selectedPreviewIndices: Set<number>;
  setSelectedPreviewIndices: React.Dispatch<React.SetStateAction<Set<number>>>;
  onCancel: () => void;
  onImport: () => void;
  importing: boolean;
  showNotice: (severity: "success" | "error" | "warning" | "info", message: string) => void;
}

function statusColor(status: string): "success" | "info" | "warning" | "error" | "default" {
  if (["new", "imported"].includes(status)) return "success";
  if (["updated"].includes(status)) return "info";
  if (["exists", "skipped"].includes(status)) return "default";
  if (["warning"].includes(status)) return "warning";
  return "error";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    exists: "Đã có",
    new: "Mới",
    warning: "Cảnh báo",
    invalid: "Lỗi",
    imported: "Thành công",
    updated: "Cập nhật",
    skipped: "Bỏ qua",
    error: "Lỗi",
  };
  return labels[status] || status;
}

export function BookImportPreviewSection({
  previewFile,
  previewData,
  setPreviewData,
  selectedPreviewIndices,
  setSelectedPreviewIndices,
  onCancel,
  onImport,
  importing,
  showNotice,
}: BookImportPreviewSectionProps) {
  const [deletePreviewOpen, setDeletePreviewOpen] = useState(false);

  if (!previewFile || !previewData) return null;

  const newCount = previewData.filter((r) => ["new", "imported"].includes(r.status)).length;
  const existsCount = previewData.filter((r) => ["exists"].includes(r.status)).length;
  const warningCount = previewData.filter((r) => ["warning", "invalid", "error"].includes(r.status)).length;

  return (
    <>
      <Dialog
        open={Boolean(previewFile && previewData)}
        onClose={(_, reason) => {
          if (importing) return;
          if (reason !== "backdropClick") onCancel();
        }}
        maxWidth="xl"
        fullWidth
        scroll="paper"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              bgcolor: "background.paper",
              maxHeight: "90vh",
            },
          },
        }}
      >
        <DialogTitle
          component="div"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pb: 1.5,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Xem trước dữ liệu nhập kho: {previewFile.name}
            </Typography>
            <Chip size="small" color="primary" label={`${previewData.length} dòng`} sx={{ fontWeight: 700 }} />
          </Stack>
          <IconButton size="small" onClick={onCancel} disabled={importing} sx={{ color: "text.secondary" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Quick Summary Badges & Action */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
          >
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center" }}>
              <Chip size="small" variant="filled" color="success" label={`Mới: ${newCount}`} sx={{ fontWeight: 600 }} />
              <Chip size="small" variant="outlined" label={`Đã có sẵn: ${existsCount}`} sx={{ fontWeight: 600 }} />
              {warningCount > 0 && (
                <Chip
                  size="small"
                  variant="filled"
                  color="warning"
                  label={`Cần lưu ý / Lỗi: ${warningCount}`}
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Stack>

            {selectedPreviewIndices.size > 0 && (
              <Button
                size="small"
                color="error"
                variant="contained"
                startIcon={<DeleteIcon />}
                onClick={() => setDeletePreviewOpen(true)}
                sx={{ borderRadius: "4px", textTransform: "none", fontWeight: 700 }}
              >
                Xóa {selectedPreviewIndices.size} dòng đã chọn
              </Button>
            )}
          </Stack>

          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              maxHeight: "calc(75vh - 160px)",
              borderRadius: 2,
              overflowX: "auto",
              bgcolor: "background.paper",
            }}
          >
            <Table size="small" stickyHeader sx={{ minWidth: 1050 }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    padding="checkbox"
                    sx={{
                      fontWeight: 700,
                      borderBottom: "2px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      zIndex: 3,
                    }}
                  >
                    <Checkbox
                      size="small"
                      indeterminate={
                        selectedPreviewIndices.size > 0 &&
                        selectedPreviewIndices.size < (previewData?.filter((r) => r.status !== "invalid").length ?? 0)
                      }
                      checked={
                        !!previewData?.length &&
                        selectedPreviewIndices.size === previewData.filter((r) => r.status !== "invalid").length
                      }
                      onChange={(_, checked) => {
                        if (checked) {
                          setSelectedPreviewIndices(
                            new Set(previewData.map((_, i) => i).filter((i) => previewData[i].status !== "invalid"))
                          );
                        } else {
                          setSelectedPreviewIndices(new Set());
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      borderBottom: "2px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      zIndex: 3,
                      minWidth: 140,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ISBN
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      borderBottom: "2px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      zIndex: 3,
                      minWidth: 220,
                    }}
                  >
                    Tên sách
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      borderBottom: "2px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      zIndex: 3,
                      minWidth: 150,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Tác giả
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      borderBottom: "2px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      zIndex: 3,
                      minWidth: 150,
                      whiteSpace: "nowrap",
                    }}
                  >
                    NXB
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 700,
                      borderBottom: "2px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      zIndex: 3,
                      minWidth: 80,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Số lượng
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      borderBottom: "2px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      zIndex: 3,
                      minWidth: 140,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Đơn giá (VNĐ)
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      borderBottom: "2px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      zIndex: 3,
                      minWidth: 200,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Mã vạch mẫu
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      borderBottom: "2px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      zIndex: 3,
                      minWidth: 100,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Trạng thái
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 700,
                      borderBottom: "2px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      zIndex: 3,
                      width: 50,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Xóa
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 3, color: "text.secondary" }}>
                      Không có dòng nào
                    </TableCell>
                  </TableRow>
                ) : (
                  previewData.slice(0, 50).map((row, index) => {
                    const isSelected = selectedPreviewIndices.has(index);
                    const isInvalid = row.status === "invalid";
                    return (
                      <TableRow
                        key={`${row.isbn}-${index}`}
                        selected={isInvalid || isSelected}
                        sx={{
                          "&:hover .preview-delete-btn": { opacity: 1 },
                          "& > td": { py: 0.75 },
                          cursor: isInvalid ? "default" : "pointer",
                        }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={isSelected}
                            disabled={isInvalid}
                            onChange={(_, checked) => {
                              const newSet = new Set(selectedPreviewIndices);
                              if (checked) newSet.add(index);
                              else newSet.delete(index);
                              setSelectedPreviewIndices(newSet);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", py: 0.75, whiteSpace: "nowrap" }}>
                          {row.isbn || "-"}
                        </TableCell>
                        <TableCell sx={{ py: 0.75, fontWeight: 600 }}>{row.title || "-"}</TableCell>
                        <TableCell sx={{ py: 0.75, color: "text.secondary" }}>{row.author || "-"}</TableCell>
                        <TableCell sx={{ py: 0.75, color: "text.secondary" }}>{row.publisher || "-"}</TableCell>
                        <TableCell align="center" sx={{ py: 0.75, fontWeight: 700 }}>
                          {row.quantity}
                        </TableCell>
                        <TableCell sx={{ py: 0.75, minWidth: 140 }}>
                          <TextField
                            size="small"
                            variant="standard"
                            value={row.price != null ? row.price : ""}
                            placeholder="Chưa đặt"
                            type="number"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const val = e.target.value === "" ? null : Number(e.target.value);
                              setPreviewData((prev) => {
                                if (!prev) return prev;
                                const next = [...prev];
                                next[index] = { ...next[index], price: val };
                                return next;
                              });
                            }}
                            slotProps={{
                              input: {
                                endAdornment: (
                                  <Typography variant="caption" sx={{ color: "text.secondary", ml: 0.5 }}>
                                    đ
                                  </Typography>
                                ),
                                sx: { fontSize: "0.85rem", fontWeight: 600 },
                              },
                            }}
                            sx={{ width: 120 }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 0.75 }}>
                          <BarcodeRangeList barcodes={row.barcodes} />
                        </TableCell>
                        <TableCell sx={{ py: 0.75 }}>
                          <Chip size="small" color={statusColor(row.status)} label={statusLabel(row.status)} />
                        </TableCell>
                        <TableCell align="center" sx={{ py: 0.75 }}>
                          <IconButton
                            className="preview-delete-btn"
                            size="small"
                            sx={{ opacity: 0.6, "&:hover": { opacity: 1, color: "error.main" }, transition: "opacity 0.15s" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewData(previewData.filter((_, i) => i !== index));
                              setSelectedPreviewIndices((prev) => {
                                const next = new Set<number>();
                                prev.forEach((v) => {
                                  if (v < index) next.add(v);
                                  else if (v > index) next.add(v - 1);
                                });
                                return next;
                              });
                              showNotice("info", "Đã xóa dòng");
                            }}
                          >
                            <DeleteIcon fontSize="small" color="error" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider" }}>
          <Button variant="outlined" onClick={onCancel} disabled={importing} sx={{ textTransform: "none" }}>
            Hủy
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckIcon />}
            onClick={onImport}
            disabled={importing}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {importing ? "Đang nhập..." : "Xác nhận nhập kho"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deletePreviewOpen} onClose={() => setDeletePreviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AlertIcon sx={{ color: "warning.main" }} />
          Xóa {selectedPreviewIndices.size} dòng khỏi danh sách?
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Các dòng sau sẽ bị xóa khỏi danh sách trước khi nhập:
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: "auto", p: 1, bgcolor: "grey.900", borderRadius: 1 }}>
              {previewData?.filter((_, i) => selectedPreviewIndices.has(i)).slice(0, 10).map((row, idx) => (
                <Stack key={idx} direction="row" spacing={1} sx={{ py: 0.5, alignItems: "center" }}>
                  <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", color: "text.secondary", minWidth: 130 }}>
                    {row.isbn}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }} noWrap>
                    {row.title || "Không có tên"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    SL: {row.quantity}
                  </Typography>
                </Stack>
              ))}
              {selectedPreviewIndices.size > 10 ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, textAlign: "center" }}>
                  ... và {selectedPreviewIndices.size - 10} dòng khác
                </Typography>
              ) : null}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletePreviewOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => {
              setPreviewData(previewData.filter((_, i) => !selectedPreviewIndices.has(i)));
              setSelectedPreviewIndices(new Set());
              setDeletePreviewOpen(false);
              showNotice("info", `Đã xóa ${selectedPreviewIndices.size} dòng`);
            }}
          >
            Xóa {selectedPreviewIndices.size} dòng
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
