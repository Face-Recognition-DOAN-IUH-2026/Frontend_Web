"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import EventRepeatRoundedIcon from "@mui/icons-material/EventRepeatRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import api, { getErrorMessage } from "@/lib/api-client";
import { useToast } from "@/lib/toast-context";
import type { StaffScheduleAssignment } from "@/lib/types";

interface CopyWeekDialogProps {
  open: boolean;
  onClose: () => void;
  currentWeekFrom: string; // YYYY-MM-DD (target week start - Monday)
  currentWeekTo: string;   // YYYY-MM-DD (target week end - Sunday)
  onCopied: () => void;
}

const DAY_NAMES = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];

function shiftDateByDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateViet(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function CopyWeekDialog({
  open,
  onClose,
  currentWeekFrom,
  currentWeekTo,
  onCopied,
}: CopyWeekDialogProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Source week is default previous week (7 days prior)
  const sourceFrom = useMemo(() => shiftDateByDays(currentWeekFrom, -7), [currentWeekFrom]);
  const sourceTo = useMemo(() => shiftDateByDays(currentWeekTo, -7), [currentWeekTo]);

  const [sourceAssignments, setSourceAssignments] = useState<StaffScheduleAssignment[]>([]);
  const [targetExisting, setTargetExisting] = useState<StaffScheduleAssignment[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const loadSourceData = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    try {
      const [sourceRes, targetRes] = await Promise.all([
        api.getScheduleAssignments({ from: sourceFrom, to: sourceTo }),
        api.getScheduleAssignments({ from: currentWeekFrom, to: currentWeekTo }),
      ]);

      const validSource = (sourceRes.items || []).filter(
        (a) => a.status !== "cancelled"
      );
      setSourceAssignments(validSource);
      setTargetExisting(targetRes.items || []);
      // Default: select all non-cancelled source assignments
      setSelectedIds(new Set(validSource.map((a) => a.id)));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [open, sourceFrom, sourceTo, currentWeekFrom, currentWeekTo]);

  useEffect(() => {
    if (open) {
      loadSourceData();
    }
  }, [open, loadSourceData]);

  // Map source date to target date by adding 7 days
  const mappedItems = useMemo(() => {
    return sourceAssignments.map((item) => {
      const targetWorkDate = shiftDateByDays(item.workDate, 7);
      const isAlreadyAssigned = targetExisting.some(
        (t) =>
          t.status !== "cancelled" &&
          t.staffId === item.staffId &&
          t.shiftId === item.shiftId &&
          t.workDate === targetWorkDate
      );
      const dayOfWeekIndex = new Date(`${item.workDate}T00:00:00`).getDay();
      const dayName = DAY_NAMES[dayOfWeekIndex];

      return {
        item,
        targetWorkDate,
        isAlreadyAssigned,
        dayName,
      };
    });
  }, [sourceAssignments, targetExisting]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sourceAssignments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sourceAssignments.map((a) => a.id)));
    }
  };

  const handleConfirmCopy = async () => {
    const candidates = mappedItems.filter((m) => {
      if (!selectedIds.has(m.item.id)) return false;
      if (skipDuplicates && m.isAlreadyAssigned) return false;
      return true;
    });

    if (candidates.length === 0) {
      toast.warning("Không có ca trực nào được chọn để sao chép.");
      return;
    }

    setSubmitting(true);
    setError(null);
    let successCount = 0;
    let failCount = 0;

    const bulkPayload = candidates.map((c) => ({
      staffId: c.item.staffId,
      shiftId: c.item.shiftId,
      zoneId: c.item.zoneId,
      workDate: c.targetWorkDate,
      note: `Sao chép từ tuần trước (${formatDateViet(c.item.workDate)})`,
    }));

    try {
      // Try bulk creation first
      await api.createScheduleAssignmentsBulk(bulkPayload);
      successCount = candidates.length;
    } catch {
      // Fallback: create individually if bulk has partial conflicts
      for (const payload of bulkPayload) {
        try {
          await api.createScheduleAssignment(payload);
          successCount++;
        } catch {
          failCount++;
        }
      }
    } finally {
      setSubmitting(false);
    }

    if (successCount > 0) {
      toast.success(
        `Đã sao chép thành công ${successCount} ca trực sang tuần ${formatDateViet(currentWeekFrom)} - ${formatDateViet(currentWeekTo)}${failCount > 0 ? ` (${failCount} ca bỏ qua do xung đột)` : ""}`
      );
      onCopied();
      onClose();
    } else {
      setError("Không thể sao chép các ca trực do trùng lịch hoặc xung đột khu vực.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            bgcolor: "background.paper",
            backgroundImage: "none",
          },
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: "primary.main",
            }}
          >
            <EventRepeatRoundedIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.1rem" }}>
              Sao chép lịch trực tuần trước
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tái sử dụng phân công lịch tuần trước sang tuần hiện tại nhanh chóng
            </Typography>
          </Box>
        </Stack>
        <IconButton size="small" onClick={onClose} disabled={submitting}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 2.5 }}>
        <Stack spacing={2.5}>
          {/* Week Comparison Header */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: isDark ? alpha(theme.palette.background.default, 0.6) : alpha(theme.palette.action.hover, 0.3),
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ alignItems: "center", justifyContent: "space-around" }}
            >
              {/* Source Week */}
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase" }}>
                  Tuần nguồn (Tuần trước)
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "primary.main" }}>
                  {formatDateViet(sourceFrom)} — {formatDateViet(sourceTo)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {loading ? "Đang tải..." : `${sourceAssignments.length} ca trực được tìm thấy`}
                </Typography>
              </Box>

              <ArrowForwardRoundedIcon sx={{ color: "text.secondary", transform: { xs: "rotate(90deg)", sm: "none" } }} />

              {/* Target Week */}
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase" }}>
                  Tuần đích (Tuần đang xem)
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "secondary.main" }}>
                  {formatDateViet(currentWeekFrom)} — {formatDateViet(currentWeekTo)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {targetExisting.length} ca hiện có trong tuần đích
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* Settings Options */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
                  Tự động bỏ qua các ca đã có sẵn ở tuần đích
                </Typography>
              }
            />

            {!loading && sourceAssignments.length > 0 && (
              <Button size="small" onClick={toggleSelectAll} sx={{ textTransform: "none", fontWeight: 600 }}>
                {selectedIds.size === sourceAssignments.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </Button>
            )}
          </Stack>

          {/* Assignments Preview List */}
          {loading ? (
            <Box sx={{ py: 6, display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary">
                Đang nạp phân công ca trực từ tuần trước...
              </Typography>
            </Box>
          ) : sourceAssignments.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.secondary" }}>
                Tuần trước không có ca trực nào được phân công.
              </Typography>
              <Typography variant="caption" color="text.disabled">
                Hãy chọn tuần nguồn khác hoặc sử dụng tính năng "Gợi ý lịch tự động" trên thanh công cụ.
              </Typography>
            </Paper>
          ) : (
            <Paper
              variant="outlined"
              sx={{
                maxHeight: 340,
                overflowY: "auto",
                borderRadius: 2,
                borderColor: "divider",
              }}
            >
              <List disablePadding>
                {mappedItems.map(({ item, targetWorkDate, isAlreadyAssigned, dayName }, idx) => {
                  const isChecked = selectedIds.has(item.id);
                  const isSkippedDueToDuplicate = skipDuplicates && isAlreadyAssigned;

                  return (
                    <ListItem
                      key={item.id}
                      divider={idx < mappedItems.length - 1}
                      sx={{
                        py: 1,
                        px: 1.5,
                        opacity: isSkippedDueToDuplicate ? 0.5 : 1,
                        bgcolor: isSkippedDueToDuplicate
                          ? alpha(theme.palette.action.disabledBackground, 0.1)
                          : isChecked
                          ? alpha(theme.palette.primary.main, 0.03)
                          : "transparent",
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Checkbox
                          size="small"
                          checked={isChecked}
                          disabled={isSkippedDueToDuplicate}
                          onChange={() => toggleSelect(item.id)}
                        />
                      </ListItemIcon>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {item.staff?.fullName || item.staff?.email || "Nhân viên"}
                          </Typography>
                          <Typography variant="caption" sx={{ px: 0.8, py: 0.2, borderRadius: 1, bgcolor: "action.hover", fontWeight: 600 }}>
                            {item.shift?.name || "Ca trực"} ({item.shift?.startTime?.slice(0, 5)} - {item.shift?.endTime?.slice(0, 5)})
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.zone?.zoneName || "Khu vực"}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.25 }}>
                          <Typography variant="caption" color="text.secondary">
                            {dayName}: {formatDateViet(item.workDate)} $\rightarrow$ <strong>{formatDateViet(targetWorkDate)}</strong>
                          </Typography>
                          {isAlreadyAssigned && (
                            <Tooltip title="Ca trực này đã tồn tại ở tuần đích">
                              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "warning.main" }}>
                                <WarningAmberRoundedIcon sx={{ fontSize: 13 }} />
                                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.68rem" }}>
                                  Đã có ca trùng
                                </Typography>
                              </Box>
                            </Tooltip>
                          )}
                        </Stack>
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
            </Paper>
          )}
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, px: 2.5, justifyContent: "space-between" }}>
        <Typography variant="caption" color="text.secondary">
          {!loading && sourceAssignments.length > 0 && (
            <>
              Sẽ sao chép: <strong>{mappedItems.filter(m => selectedIds.has(m.item.id) && (!skipDuplicates || !m.isAlreadyAssigned)).length}</strong> ca trực
            </>
          )}
        </Typography>

        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={onClose} disabled={submitting} sx={{ borderRadius: 2 }}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmCopy}
            disabled={submitting || loading || sourceAssignments.length === 0}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <ContentCopyRoundedIcon sx={{ fontSize: 18 }} />}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              bgcolor: "primary.main",
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            {submitting ? "Đang sao chép..." : "Xác nhận sao chép"}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
