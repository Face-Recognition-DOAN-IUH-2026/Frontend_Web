"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  LinearProgress,
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
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import api, { getErrorMessage } from "@/lib/api-client";
import type { ConditionAttentionItem, ConditionAttentionReport } from "@/lib/types";
import { CONDITION_LABELS, type CopyCondition } from "@/lib/constants/copy";
import { usePermission, getPermissionDeniedReason } from "@/lib/permission-context";
import ConfirmDialog from "@/app/(dashboard)/_components/ui/ConfirmDialog";
import { fadeInUp, slideInRight } from "@/lib/animations";

const ACTION_COLOR: Record<string, "warning" | "error" | "info"> = {
  repair: "warning",
  review: "error",
  dispose: "info",
};

const STAT_DEFS = [
  {
    key: "minor_damage" as const,
    label: "Hư nhẹ",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    icon: <HandymanOutlinedIcon />,
  },
  {
    key: "major_damage" as const,
    label: "Hư nặng",
    gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    icon: <WarningAmberOutlinedIcon />,
  },
  {
    key: "lost" as const,
    label: "Mất",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
    icon: <DeleteOutlineOutlinedIcon />,
  },
  {
    key: "maintenance" as const,
    label: "Bảo trì",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
    icon: <BuildOutlinedIcon />,
  },
  {
    key: "disposed" as const,
    label: "Đã thanh lý",
    gradient: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
    icon: <ArchiveOutlinedIcon />,
  },
];

export default function ConditionAttentionSection() {
  const { can } = usePermission();
  const canDeleteBook = can("books", "delete");
  const [report, setReport] = useState<ConditionAttentionReport | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    kind: "dispose";
    item: ConditionAttentionItem;
  } | null>(null);
  const [acting, setActing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      const data = await api.getConditionAttention();
      setReport(data);
      setSelectedIds((prev) => new Set([...prev].filter((id) => data.items.some((i) => i.copy_id === id))));
    } catch (err) {
      setError(getErrorMessage(err) || "Không tải được báo cáo sách cần xử lý");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    setActing(true);
    try {
      await api.deleteBookCopy(pendingAction.item.copy_id);
      setNotice(`Đã xóa bản ${pendingAction.item.barcode} khỏi kho.`);
      setPendingAction(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err) || "Xử lý thất bại");
    } finally {
      setActing(false);
    }
  };

  const handleBulkDispose = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setActing(true);
    try {
      const res = await api.bulkDisposeCopies(ids);
      const skippedMsg = res.skipped.length > 0
        ? ` Bỏ qua ${res.skipped.length} bản (${res.skipped.map((s) => s.reason).join("; ")}).`
        : "";
      setNotice(`Đã xóa ${res.deleted} bản khỏi kho.${skippedMsg}`);
      setSelectedIds(new Set());
      setBulkConfirmOpen(false);
      await load();
    } catch (err) {
      setError(getErrorMessage(err) || "Xóa hàng loạt thất bại");
    } finally {
      setActing(false);
    }
  };

  const toggleSelect = (copyId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(copyId)) next.delete(copyId);
      else next.add(copyId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (!report) return prev;
      if (prev.size === report.items.length) return new Set();
      return new Set(report.items.map((i) => i.copy_id));
    });
  };

  if (error) {
    return <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>;
  }

  if (!report) return null;

  if (report.summary.total === 0) {
    return (
      <Alert severity="success" sx={{ borderRadius: 2 }}>
        Không có sách nào cần sửa chữa hay thanh lý. Kho sách đang trong tình trạng tốt.
      </Alert>
    );
  }

  const total = Math.max(report.summary.total, 1);

  return (
    <Stack spacing={2}>
      {/* IUH brand styled header */}
      <Box sx={{
        p: 2.5,
        borderRadius: 3,
        background: "linear-gradient(135deg, #0A2540 0%, #173859 55%, #8B0000 120%)",
        border: "1px solid",
        borderColor: "rgba(212, 175, 55, 0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 2,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(10, 37, 64, 0.15)",
      }}>
        <Box sx={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", bgcolor: "rgba(212,175,55,0.06)", pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -60, left: 200, width: 220, height: 220, borderRadius: "50%", bgcolor: "rgba(139,0,0,0.08)", pointerEvents: "none" }} />
        <Stack direction="row" spacing={2} sx={{ zIndex: 1, alignItems: "center" }}>
          <Avatar sx={{ bgcolor: "rgba(212, 175, 55, 0.2)", width: 48, height: 48, border: "1px solid rgba(212, 175, 55, 0.4)" }}>
            <WarningAmberOutlinedIcon sx={{ color: "#D4AF37", fontSize: 26 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF", display: "flex", alignItems: "center" }}>
              Sách cần xử lý
              <Chip label={`${report.summary.total} bản`} size="small" sx={{ ml: 1.5, fontWeight: 700, bgcolor: "rgba(212, 175, 55, 0.25)", color: "#FDE68A" }} />
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", mt: 0.3, fontSize: "0.82rem" }}>
              Theo dõi bản hư hỏng / mất để sửa chữa, thanh lý kịp thời
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1.25} sx={{ zIndex: 1, alignItems: "center" }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={isCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
            onClick={() => setIsCollapsed(!isCollapsed)}
            sx={{ color: "#FFFFFF", borderColor: "rgba(255,255,255,0.3)", borderRadius: 1.5, textTransform: "none", fontWeight: 600 }}
          >
            {isCollapsed ? "Mở rộng chi tiết" : "Thu gọn"}
          </Button>
          <Button
            component="a"
            href="/books"
            variant="outlined"
            size="small"
            sx={{ color: "rgba(255,255,255,0.9)", borderColor: "rgba(255,255,255,0.25)", borderRadius: 1.5, textTransform: "none" }}
          >
            Kho sách
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshOutlinedIcon />}
            onClick={() => void load()}
            disabled={refreshing}
            sx={{ color: "rgba(255,255,255,0.9)", borderColor: "rgba(255,255,255,0.25)", borderRadius: 1.5, textTransform: "none" }}
          >
            Tải lại
          </Button>
        </Stack>
      </Box>

      <Collapse in={!isCollapsed}>
        <Stack spacing={2} sx={{ pt: 1 }}>

      {/* Stat cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(5, 1fr)" }, gap: 2 }}>
        {STAT_DEFS.map((stat, idx) => (
          <Paper
            key={stat.key}
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 3,
              position: "relative",
              overflow: "hidden",
              borderColor: "divider",
              transition: "transform 0.2s, box-shadow 0.2s",
              animation: `${fadeInUp} 0.4s ease-out`,
              animationDelay: `${idx * 0.07}s`,
              animationFillMode: "both",
              "&:hover": { transform: "translateY(-2px)", boxShadow: 4 },
            }}
          >
            <Box sx={{
              position: "absolute", top: 0, right: 0,
              width: 80, height: 80,
              background: stat.gradient,
              opacity: 0.12,
              borderRadius: "0 12px 0 80px",
            }} />
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
              <Avatar sx={{ background: stat.gradient, width: 44, height: 44, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                {stat.icon}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {stat.label}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  {report.summary[stat.key]}
                </Typography>
              </Box>
            </Stack>
            <LinearProgress variant="determinate" value={Math.min(100, (report.summary[stat.key] / total) * 100)} sx={{
              mt: 1.5, height: 3, borderRadius: 2,
              bgcolor: "action.hover",
              "& .MuiLinearProgress-bar": { background: stat.gradient, borderRadius: 2 },
            }} />
          </Paper>
        ))}
      </Box>

      {/* Notice after quick actions */}
      {notice ? (
        <Alert severity="success" onClose={() => setNotice("")} sx={{ borderRadius: 2 }}>
          {notice}
        </Alert>
      ) : null}

      {/* Bulk dispose bar */}
      {selectedIds.size > 0 ? (
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: "flex", alignItems: "center", gap: 1.5, borderColor: "error.main" }}>
          <Chip label={`${selectedIds.size} đã chọn`} size="small" color="warning" sx={{ fontWeight: 700 }} />
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            Xóa vĩnh viễn các bản đã chọn khỏi kho (bản đang mượn sẽ được bỏ qua).
          </Typography>
          <Button size="small" variant="text" color="inherit" onClick={() => setSelectedIds(new Set())} sx={{ textTransform: "none" }}>
            Bỏ chọn
          </Button>
          <Button
            size="small"
            variant="contained"
            color="error"
            disabled={!canDeleteBook || acting}
            onClick={() => setBulkConfirmOpen(true)}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 1.5 }}
          >
            Xóa đã chọn
          </Button>
        </Paper>
      ) : null}

      {/* Detail table */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ "& .MuiTableCell-head": { fontWeight: 700, bgcolor: "action.hover", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" } }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={report.items.length > 0 && selectedIds.size === report.items.length}
                    indeterminate={selectedIds.size > 0 && selectedIds.size < report.items.length}
                    onChange={toggleSelectAll}
                    slotProps={{ input: { "aria-label": "Chọn tất cả"  } }}
                  />
                </TableCell>
                <TableCell>Sách & Mã vạch</TableCell>
                <TableCell>Tình trạng</TableCell>
                <TableCell>Đề xuất</TableCell>
                <TableCell align="center">Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {report.items.map((item, idx) => (
                <TableRow
                  key={item.copy_id}
                  hover
                  selected={selectedIds.has(item.copy_id)}
                  sx={{
                    transition: "background 0.15s",
                    animation: `${slideInRight} 0.3s ease-out`,
                    animationDelay: `${idx * 0.03}s`,
                    animationFillMode: "both",
                    "&:last-child td": { border: 0 },
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.has(item.copy_id)}
                      onChange={() => toggleSelect(item.copy_id)}
                      slotProps={{ input: { "aria-label": `Chọn ${item.barcode}`  } }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.book?.title || "—"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                      {item.barcode}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={CONDITION_LABELS[item.condition as CopyCondition] || item.condition}
                      sx={{ fontWeight: 600, fontSize: "0.72rem", borderRadius: 1.5 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={ACTION_COLOR[item.recommendation.action] || "default"}
                      label={item.recommendation.label}
                      sx={{ fontWeight: 700, fontSize: "0.75rem", borderRadius: 1.5, mb: 0.5 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {item.recommendation.reason}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {item.recommendation.action !== "repair" ? (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={!canDeleteBook || acting}
                        onClick={() => setPendingAction({ kind: "dispose", item })}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 1.5 }}
                      >
                        Thanh lý
                      </Button>
                    ) : (
                      <Typography variant="caption" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      </Stack>
      </Collapse>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title="Xác nhận thanh lý bản sao"
        message={
          pendingAction
            ? `Xóa bản sao ${pendingAction.item.barcode} (${pendingAction.item.book?.title || ""}) khỏi kho? Thao tác này không thể hoàn tác.`
            : ""
        }
        confirmLabel="Xóa khỏi kho"
        onConfirm={() => void handleConfirmAction()}
        onCancel={() => setPendingAction(null)}
        loading={acting}
        severity="error"
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        title={`Xác nhận xóa ${selectedIds.size} bản sao`}
        message={`Xóa vĩnh viễn ${selectedIds.size} bản đã chọn khỏi kho? Lịch sử mượn được giữ lại. Bản đang được mượn sẽ tự động bỏ qua. Thao tác này không thể hoàn tác.`}
        confirmLabel="Xóa vĩnh viễn"
        onConfirm={() => void handleBulkDispose()}
        onCancel={() => setBulkConfirmOpen(false)}
        loading={acting}
        severity="error"
      />
    </Stack>
  );
}
