"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Check from "@mui/icons-material/Check";
import CodeOutlinedIcon from "@mui/icons-material/CodeOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";

import type { EffectivePermissions } from "@/lib/types";

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

  const jsonString = JSON.stringify(effectivePermissionsPreview, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setToast({
      open: true,
      message: "Đã sao chép cấu hình quyền (JSON) vào clipboard!",
      severity: "success",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
        gap: 2.5,
      }}
    >
      {/* ── LEFT: Resolved Summary ────────────────────────────────────────── */}
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          borderRadius: 2,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "0.92rem" }}>
              Quyền hạn thực tế tại Runtime
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Kết quả hợp nhất giữa vai trò gốc (Baseline) và ghi đè cá nhân (Override)
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 0.75 }}>
              Trạng thái áp dụng
            </Typography>
            <Chip
              icon={effectivePermissionsPreview.isCustom ? <CheckCircleOutlineOutlinedIcon /> : undefined}
              label={
                effectivePermissionsPreview.isCustom
                  ? "Đang áp dụng cấu hình ghi đè cá nhân (Custom Override)"
                  : "Đang áp dụng cấu hình vai trò chuẩn (Standard Role)"
              }
              color={effectivePermissionsPreview.isCustom ? "primary" : "default"}
              sx={{ fontWeight: 700, borderRadius: 1 }}
            />
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 1 }}>
              Màn hình được phép truy cập ({effectivePermissionsPreview.allowedPages.length} trang)
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, maxHeight: 320, overflowY: "auto", p: 0.5 }}>
              {effectivePermissionsPreview.allowedPages.map((path) => (
                <Chip
                  key={path}
                  label={path}
                  size="small"
                  sx={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    borderRadius: 1,
                    bgcolor: alpha("#059669", 0.1),
                    color: "#059669",
                    border: "1px solid",
                    borderColor: alpha("#059669", 0.25),
                  }}
                />
              ))}
            </Box>
          </Box>
        </Stack>
      </Paper>

      {/* ── RIGHT: Formatted JSON Payload ─────────────────────────────────── */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          borderColor: "divider",
          bgcolor: isDark ? "#0A0D14" : "#1E293B",
          color: "#E2E8F0",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
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
            {copied ? "Đã chép" : "Sao chép JSON"}
          </Button>
        </Box>

        <Box
          component="pre"
          sx={{
            p: 2,
            m: 0,
            overflowX: "auto",
            flex: 1,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "0.78rem",
            lineHeight: 1.6,
            color: "#38BDF8",
          }}
        >
          {jsonString}
        </Box>
      </Paper>
    </Box>
  );
}
export default EffectiveInspectorTab;
