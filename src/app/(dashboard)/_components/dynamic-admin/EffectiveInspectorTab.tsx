"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Check from "@mui/icons-material/Check";
import CodeOutlinedIcon from "@mui/icons-material/CodeOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

import {
  ALL_RESOURCES,
  ALL_ACTIONS,
  ALL_ROUTES,
  RESOURCE_LABELS,
  ACTION_LABELS,
  CATEGORY_LABELS,
  type EffectivePermissions,
  type RouteCategory,
  type SystemRoute,
} from "@/lib/types";

export interface EffectiveInspectorTabProps {
  effectivePermissionsPreview: EffectivePermissions;
  setToast: (toast: { open: boolean; message: string; severity: "success" | "error" | "info" }) => void;
}

export function EffectiveInspectorTab({
  effectivePermissionsPreview,
  setToast,
}: EffectiveInspectorTabProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [copied, setCopied] = useState(false);
  const [showJson, setShowJson] = useState(false);

  const jsonString = JSON.stringify(effectivePermissionsPreview, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setToast({
      open: true,
      message: "Đã sao chép cấu hình quyền vào bộ nhớ tạm!",
      severity: "success",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getRouteLabel = (path: string) => {
    const found = ALL_ROUTES.find((r) => r.path === path);
    return found ? found.label : path;
  };

  // Group allowed routes by category
  const allowedRoutesByCategory = React.useMemo(() => {
    const map: Partial<Record<RouteCategory, string[]>> = {};
    const allowedSet = new Set(effectivePermissionsPreview.allowedPages);
    ALL_ROUTES.forEach((r) => {
      if (allowedSet.has(r.path)) {
        const cat = r.category || "library";
        if (!map[cat]) map[cat] = [];
        map[cat]!.push(r.path);
      }
    });
    return map;
  }, [effectivePermissionsPreview.allowedPages]);

  return (
    <Stack spacing={2.5}>
      {/* ── TOP BANNER: Nhân viên đang kiểm tra & Trạng thái ─────────────────── */}
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          borderRadius: 2,
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 1.5,
              bgcolor: alpha(theme.palette.success.main, 0.1),
              color: theme.palette.success.main,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <VerifiedUserOutlinedIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Bản Tóm Tắt Quyền Hạn Đang Áp Dụng
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.84rem" }}>
              Tổng hợp quyền thực tế nhân viên có thể sử dụng khi đăng nhập vào hệ thống
            </Typography>
          </Box>
        </Stack>

        <Chip
          icon={effectivePermissionsPreview.isCustom ? <CheckCircleOutlineOutlinedIcon /> : undefined}
          label={
            effectivePermissionsPreview.isCustom
              ? "Đang dùng thiết lập đặc quyền riêng"
              : "Đang dùng bộ quyền chuẩn theo chức vụ"
          }
          color={effectivePermissionsPreview.isCustom ? "primary" : "default"}
          sx={{ fontWeight: 700, borderRadius: 1, py: 0.5 }}
        />
      </Paper>

      {/* ── 2 COLUMN SUMMARY: Quyền mở màn hình & Quyền thao tác dữ liệu ─────── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1.15fr" },
          gap: 2.5,
        }}
      >
        {/* Left: Danh sách màn hình được phép mở */}
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: 2,
            borderColor: "divider",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "0.92rem" }}>
              Màn hình chức năng được phép mở ({effectivePermissionsPreview.allowedPages.length} mục)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Các tính năng xuất hiện trên thanh điều hướng menu của nhân viên
            </Typography>
          </Box>

          <Stack spacing={2} sx={{ maxHeight: 420, overflowY: "auto", pr: 0.5 }}>
            {(Object.keys(allowedRoutesByCategory) as RouteCategory[]).map((cat) => {
              const paths = allowedRoutesByCategory[cat] || [];
              if (paths.length === 0) return null;

              return (
                <Box key={cat}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 0.75 }}>
                    {CATEGORY_LABELS[cat]} ({paths.length})
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    {paths.map((path) => (
                      <Chip
                        key={path}
                        label={getRouteLabel(path)}
                        size="small"
                        icon={<CheckCircleOutlineOutlinedIcon sx={{ fontSize: "14px !important" }} />}
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.78rem",
                          borderRadius: 1,
                          bgcolor: alpha("#059669", 0.08),
                          color: "#059669",
                          border: "1px solid",
                          borderColor: alpha("#059669", 0.2),
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              );
            })}

            {effectivePermissionsPreview.allowedPages.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", py: 2, textAlign: "center" }}>
                Nhân viên hiện không được mở màn hình nào.
              </Typography>
            )}
          </Stack>
        </Paper>

        {/* Right: Bảng thao tác nghiệp vụ (6 Actions) */}
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            borderColor: "divider",
            bgcolor: "background.paper",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: 2.5,
              py: 1.75,
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: isDark ? "background.default" : "#F8FAFC",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "0.92rem" }}>
              Quyền thao tác nghiệp vụ thư viện (Chi tiết 6 hành động)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Chi tiết các tác vụ được phép thực hiện trên từng phân hệ sách & bạn đọc
            </Typography>
          </Box>

          <TableContainer sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: isDark ? alpha("#FFFFFF", 0.02) : "#F1F5F9" }}>
                  <TableCell sx={{ fontWeight: 700, width: "25%" }}>Phân hệ</TableCell>
                  {ALL_ACTIONS.map((act) => (
                    <TableCell key={act} align="center" sx={{ fontWeight: 700, width: "12.5%" }}>
                      {ACTION_LABELS[act] || act}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {ALL_RESOURCES.map((res) => {
                  const perms = effectivePermissionsPreview.crud?.[res] || {
                    read: false,
                    create: false,
                    update: false,
                    delete: false,
                    approve: false,
                    print: false,
                  };

                  return (
                    <TableRow key={res} hover>
                      <TableCell sx={{ py: 1.1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.82rem" }}>
                          {RESOURCE_LABELS[res] || res}
                        </Typography>
                      </TableCell>
                      {ALL_ACTIONS.map((act) => {
                        const isGranted = Boolean(perms[act]);
                        return (
                          <TableCell key={act} align="center" sx={{ py: 1 }}>
                            {isGranted ? (
                              <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 18, color: "#059669" }} />
                            ) : (
                              <CancelOutlinedIcon sx={{ fontSize: 18, color: isDark ? "#475569" : "#CBD5E1" }} />
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      {/* ── BOTTOM: Tùy chọn xem dữ liệu kỹ thuật (Ẩn mặc định cho thủ thư) ──── */}
      <Box sx={{ pt: 1 }}>
        <Button
          size="small"
          variant="text"
          startIcon={showJson ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          onClick={() => setShowJson(!showJson)}
          sx={{ textTransform: "none", color: "text.secondary", fontSize: "0.82rem", fontWeight: 600 }}
        >
          {showJson ? "Ẩn cấu hình kỹ thuật (JSON)" : "Xem chi tiết cấu hình kỹ thuật (Dành cho Quản trị viên IT)"}
        </Button>

        <Collapse in={showJson}>
          <Paper
            variant="outlined"
            sx={{
              mt: 1.5,
              borderRadius: 2,
              borderColor: "divider",
              bgcolor: isDark ? "#0A0D14" : "#1E293B",
              color: "#E2E8F0",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                p: 1.5,
                px: 2,
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <CodeOutlinedIcon sx={{ fontSize: 18, color: "primary.light" }} />
                <Typography sx={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.8rem", fontWeight: 700, color: "#94A3B8" }}>
                  runtime_payload.json
                </Typography>
              </Stack>
              <Button
                size="small"
                startIcon={copied ? <Check sx={{ fontSize: 16 }} /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
                onClick={handleCopy}
                sx={{
                  color: copied ? "#10B981" : "#E2E8F0",
                  textTransform: "none",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  bgcolor: "rgba(255,255,255,0.08)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                }}
              >
                {copied ? "Đã chép" : "Sao chép cấu hình"}
              </Button>
            </Box>

            <Box
              component="pre"
              sx={{
                p: 2,
                m: 0,
                maxHeight: 280,
                overflow: "auto",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "0.78rem",
                lineHeight: 1.6,
                color: "#38BDF8",
              }}
            >
              {jsonString}
            </Box>
          </Paper>
        </Collapse>
      </Box>
    </Stack>
  );
}
export default EffectiveInspectorTab;

