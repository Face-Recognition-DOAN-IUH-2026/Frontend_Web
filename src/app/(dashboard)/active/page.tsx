"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import DoorFrontOutlinedIcon from "@mui/icons-material/DoorFrontOutlined";
import ExitToAppOutlinedIcon from "@mui/icons-material/ExitToAppOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import TerminalOutlinedIcon from "@mui/icons-material/TerminalOutlined";
import api from "@/lib/api-client";
import { fadeInUp, shimmer, slideInRight, successPop } from "@/lib/animations";
import type { ActivePatron } from "@/lib/types";

const ACTIVE_CAMERA_IDS = new Set(["entry_gate", "exit_gate", "kiosk"]);

const CAMERA_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  entry_gate: { label: "Cổng vào", icon: DoorFrontOutlinedIcon },
  exit_gate: { label: "Cổng ra", icon: ExitToAppOutlinedIcon },
  kiosk: { label: "Kiosk", icon: TerminalOutlinedIcon },
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDuration(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return { text: "Vừa vào", level: 0 as const };
  if (minutes < 60) return { text: `${minutes} phút`, level: 1 as const };
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 2) return { text: rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`, level: 2 as const };
  return { text: rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`, level: 3 as const };
}

const DURATION_ACCENT: Record<number, string> = {
  0: "#4A8C5C",
  1: "#4A8C5C",
  2: "#C49A3C",
  3: "#B85C4A",
};

function initials(name?: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

export default function ActivePage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [patrons, setPatrons] = useState<ActivePatron[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const load = async () => {
    try {
      setError(null);
      const data = await api.getActivePatrons();
      const allowed = data.items
        .filter((p) => ACTIVE_CAMERA_IDS.has(p.camera_id))
        .sort((a, b) => new Date(b.entered_at).getTime() - new Date(a.entered_at).getTime());
      setPatrons(allowed);
      setLastUpdate(new Date());
    } catch {
      setError("Không thể tải danh sách độc giả.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const q = normalizeQuery(search);
  const filtered = useMemo(() => {
    if (!q) return patrons;
    return patrons.filter((p) =>
      p.full_name.toLowerCase().includes(q) || p.student_code.toLowerCase().includes(q)
    );
  }, [patrons, search]);

  const cameraCounts = useMemo(() =>
    patrons.reduce<Record<string, number>>((acc, p) => {
      acc[p.camera_id] = (acc[p.camera_id] || 0) + 1;
      return acc;
    }, {}),
    [patrons]
  );

  return (
    <Stack spacing={3}>
      {/* Header — hero count + camera breakdown */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Grid container spacing={3} sx={{ alignItems: "flex-end" }}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack spacing={1}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    color: "text.secondary",
                  }}
                >
                  Hiện tại
                </Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: 900,
                      letterSpacing: { xs: -1, sm: -2 },
                      lineHeight: 1,
                      fontSize: { xs: "3rem", sm: "3.75rem" },
                    }}
                  >
                    {patrons.length}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 500, color: "text.secondary" }}>
                    độc giả
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
                  Danh sách độc giả đang ở trong thư viện, cập nhật từ hệ thống cổng và kiosk.
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
                  {Object.entries(CAMERA_CONFIG).map(([id, cfg]) => {
                    const Icon = cfg.icon as React.ComponentType<{ fontSize?: string; sx?: object }>;
                    return (
                      <Paper
                        key={id}
                        variant="outlined"
                        sx={{
                          flex: { xs: "1 1 100%", sm: "1 1 0" },
                          minWidth: 0,
                          p: 1.5,
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          borderRadius: 2,
                          background: "transparent",
                        }}
                      >
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 1.5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                            color: "text.secondary",
                          }}
                        >
                          <Icon fontSize="small" />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>
                            {cfg.label}
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                            {cameraCounts[id] || 0}
                          </Typography>
                        </Box>
                      </Paper>
                    );
                  })}
                </Stack>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: error ? "error.main" : "success.main",
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {error ? "Lỗi cập nhật" : `Cập nhật: ${lastUpdate.toLocaleTimeString("vi-VN")}`}
                    </Typography>
                  </Stack>
                  <Button size="small" variant="outlined" startIcon={<RefreshOutlinedIcon />} onClick={load} disabled={loading}>
                    Làm mới
                  </Button>
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Patron list */}
      <Paper variant="outlined" sx={{ borderRadius: 3 }}>
        <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
          {/* Search bar */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", mb: 2.5 }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Độc giả
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {filtered.length} kết quả
              </Typography>
            </Box>
            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc MSSV..."
              size="small"
              sx={{ width: { xs: "100%", sm: 320 } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlinedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Stack>

          {/* Content states */}
          {loading && patrons.length === 0 ? (
            <Stack sx={{ minHeight: 300, alignItems: "center", justifyContent: "center", gap: 2 }}>
              <CircularProgress size={28} sx={{ animation: `${shimmer} 1.5s ease-in-out infinite` }} />
              <Typography variant="body2" color="text.secondary">
                Đang tải...
              </Typography>
            </Stack>
          ) : patrons.length === 0 ? (
            <Stack
              sx={{
                minHeight: 300,
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
                py: 6,
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                  color: "text.disabled",
                  mb: 1,
                }}
              >
                <MenuBookOutlinedIcon sx={{ fontSize: 32 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "text.secondary" }}>
                Thư viện đang yên tĩnh
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ textAlign: "center", maxWidth: 360 }}>
                Chưa có độc giả nào trong thư viện. Danh sách sẽ tự động cập nhật khi có lượt vào hợp lệ.
              </Typography>
            </Stack>
          ) : filtered.length === 0 ? (
            <Stack
              sx={{
                minHeight: 200,
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
                py: 4,
              }}
            >
              <SearchOutlinedIcon sx={{ fontSize: 36, color: "text.disabled" }} />
              <Typography variant="body1" color="text.secondary">
                Không tìm thấy độc giả &ldquo;{search}&rdquo;
              </Typography>
            </Stack>
          ) : (
            <Grid container spacing={1.5}>
              {filtered.map((patron, idx) => {
                const dur = getDuration(patron.entered_at);
                const accent = DURATION_ACCENT[dur.level];
                const percent = patron.confidence == null ? null : Math.round(patron.confidence * 100);
                return (
                  <Grid key={patron.id} size={{ xs: 12, xl: 6 }} sx={{ animation: `${fadeInUp} 0.35s ease-out`, animationDelay: `${idx * 0.05}s`, animationFillMode: "both" }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        overflow: "hidden",
                        position: "relative",
                        transition: "box-shadow 0.15s",
                        "&:hover": {
                          boxShadow: theme.shadows[2],
                        },
                      }}
                    >
                      {/* Duration accent bar — like a book spine */}
                      <Box
                        sx={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 3,
                          bgcolor: accent,
                          opacity: 0.7,
                        }}
                      />

                      <Box sx={{ pl: 2.5, pr: 2, py: 1.5 }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              fontSize: 13,
                              fontWeight: 700,
                              bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                              color: "text.primary",
                            }}
                          >
                            {initials(patron.full_name)}
                          </Avatar>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ justifyContent: "space-between", alignItems: "flex-start" }}
                            >
                              <Box sx={{ minWidth: 0 }}>
                                <Typography noWrap sx={{ fontWeight: 700, fontSize: 14 }}>
                                  {patron.full_name || "Chưa có tên"}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ fontFamily: "monospace", fontSize: 12 }}
                                >
                                  {patron.student_code}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexShrink: 0 }}>
                                {percent != null && (
                                  <Tooltip title={`Độ chính xác: ${percent}%`}>
                                    <Box
                                      sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        bgcolor:
                                          percent >= 80 ? "success.main" : percent >= 60 ? "warning.main" : "error.main",
                                      }}
                                    />
                                  </Tooltip>
                                )}
                                <Box
                                  sx={{
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: 0.75,
                                    bgcolor:
                                      dur.level <= 1
                                        ? isDark ? "rgba(74,140,92,0.15)" : "rgba(74,140,92,0.1)"
                                        : dur.level === 2
                                          ? isDark ? "rgba(196,154,60,0.15)" : "rgba(196,154,60,0.1)"
                                          : isDark ? "rgba(184,92,74,0.15)" : "rgba(184,92,74,0.1)",
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{ fontWeight: 700, fontSize: 11, color: accent, whiteSpace: "nowrap" }}
                                  >
                                    {dur.text}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Stack>

                            <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: "wrap", rowGap: 0.5 }}>
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                                <AccessTimeOutlinedIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                                  {formatTime(patron.entered_at)}
                                </Typography>
                              </Stack>
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                                <LocationOnOutlinedIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                                  {CAMERA_CONFIG[patron.camera_id]?.label || patron.camera_id}
                                </Typography>
                              </Stack>
                            </Stack>
                          </Box>
                        </Stack>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      </Paper>
    </Stack>
  );
}
