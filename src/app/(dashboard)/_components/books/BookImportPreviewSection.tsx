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
  Typography,
} from "@mui/material";
import AlertIcon from "@mui/icons-material/WarningAmberOutlined";
import CheckIcon from "@mui/icons-material/CheckCircleOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import type { BookImportPreviewRow } from "@/lib/types";

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

  return (
    <>
      <DashboardCard title={`Xem trước: ${previewFile.name} (${previewData.length} dòng)`}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">
              {selectedPreviewIndices.size > 0 ? `Đã chọn ${selectedPreviewIndices.size} dòng` : "Chọn dòng để xóa"}
            </Typography>
            {selectedPreviewIndices.size > 0 ? (
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={() => setDeletePreviewOpen(true)}
              >
                Xóa {selectedPreviewIndices.size} dòng
              </Button>
            ) : null}
          </Stack>

          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320, borderRadius: 2, overflowX: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ fontWeight: 700, borderBottom: "2px solid", borderColor: "divider" }}>
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
                  <TableCell sx={{ fontWeight: 700, borderBottom: "2px solid", borderColor: "divider" }}>ISBN</TableCell>
                  <TableCell sx={{ fontWeight: 700, borderBottom: "2px solid", borderColor: "divider" }}>Tên sách</TableCell>
                  <TableCell sx={{ fontWeight: 700, borderBottom: "2px solid", borderColor: "divider" }}>Tác giả</TableCell>
                  <TableCell sx={{ fontWeight: 700, borderBottom: "2px solid", borderColor: "divider" }}>NXB</TableCell>
                  <TableCell sx={{ fontWeight: 700, borderBottom: "2px solid", borderColor: "divider" }}>Số lượng</TableCell>
                  <TableCell sx={{ fontWeight: 700, borderBottom: "2px solid", borderColor: "divider" }}>Mã vạch mẫu</TableCell>
                  <TableCell sx={{ fontWeight: 700, borderBottom: "2px solid", borderColor: "divider" }}>Trạng thái</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, borderBottom: "2px solid", borderColor: "divider" }}>
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
                          "& > td": { py: 0.5 },
                          cursor: isInvalid ? "default" : "pointer",
                          ...staggerSx(index, 0.03),
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
                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", py: 0.5 }}>{row.isbn || "-"}</TableCell>
                        <TableCell sx={{ py: 0.5 }}>{row.title || "-"}</TableCell>
                        <TableCell sx={{ py: 0.5 }}>{row.author || "-"}</TableCell>
                        <TableCell sx={{ py: 0.5 }}>{row.publisher || "-"}</TableCell>
                        <TableCell sx={{ py: 0.5 }}>{row.quantity}</TableCell>
                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", py: 0.5 }}>{row.barcodes[0] || "-"}</TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <Chip size="small" color={statusColor(row.status)} label={statusLabel(row.status)} />
                        </TableCell>
                        <TableCell align="center" sx={{ py: 0.5 }}>
                          <IconButton
                            className="preview-delete-btn"
                            size="small"
                            sx={{ opacity: 0, transition: "opacity 0.15s" }}
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

          <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
            <Button variant="outlined" onClick={onCancel} sx={{ textTransform: "none" }}>
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
          </Stack>
        </Stack>
      </DashboardCard>

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
