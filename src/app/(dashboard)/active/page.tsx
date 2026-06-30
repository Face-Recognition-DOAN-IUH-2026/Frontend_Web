"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
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
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import { fadeInUp, shimmer, slideInRight, successPop } from "@/lib/animations";
import NoticeSnackbar from "@/components/ui/NoticeSnackbar";
import type { ActivePatron, CameraEvent } from "@/lib/types";

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
  const [patrons, setPatrons] = useState<ActivePatron[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [exitPatron, setExitPatron] = useState<ActivePatron | null>(null);
  const [exiting, setExiting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ severity: "success" | "error"; message: string } | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const hasLoadedRef = useRef(false);
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getActivePatrons();
      const allowed = data.items
        .filter((p) => ACTIVE_CAMERA_IDS.has(p.camera_id))
        .sort((a, b) => new Date(b.entered_at).getTime() - new Date(a.entered_at).getTime());
      setPatrons(allowed);
      setLastUpdate(new Date());
      hasLoadedRef.current = true;
    } catch {
      setError("Không thể tải danh sách độc giả.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSSEEvent = useCallback((event: CameraEvent) => {
    if (!event.access_type || !event.patron_id) return;
    if (!ACTIVE_CAMERA_IDS.has(event.camera_id)) return;

    if (event.access_type === "entry" && event.status === "granted") {
      setPatrons((prev) => {
        if (prev.some((p) => p.id === event.patron_id)) return prev;
        const newPatron: ActivePatron = {
          id: event.patron_id!,
          full_name: event.full_name || event.student_code || "",
          student_code: event.student_code || "",
          entered_at: new Date().toISOString(),
          camera_id: event.camera_id,
          image_url: null,
          confidence: event.score ?? null,
        };
        return [newPatron, ...prev];
      });
      setLastUpdate(new Date());
    } else if (event.access_type === "exit" && event.status === "granted") {
      setPatrons((prev) => prev.filter((p) => p.id !== event.patron_id));
      setLastUpdate(new Date());
    }
  }, []);

  const startFallbackPolling = useCallback(() => {
    if (fallbackRef.current) clearInterval(fallbackRef.current);
    fallbackRef.current = setInterval(() => {
      if (!hasLoadedRef.current) return;
      load();
    }, 60000);
  }, [load]);

  const stopFallbackPolling = useCallback(() => {
    if (fallbackRef.current) {
      clearInterval(fallbackRef.current);
      fallbackRef.current = null;
    }
  }, []);

  useEffect(() => {
    load();

    const cleanup = api.connectAccessSSE(handleSSEEvent, (connected) => {
      setSseConnected(connected);
      if (connected) {
        stopFallbackPolling();
      } else {
        startFallbackPolling();
      }
    });

    startFallbackPolling();

    return () => {
      cleanup();
      stopFallbackPolling();
    };
  }, [handleSSEEvent, load, startFallbackPolling, stopFallbackPolling]);

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

  const stalePatrons = useMemo(() => {
    const now = Date.now();
    return patrons.filter((p) => {
      const hours = (now - new Date(p.entered_at).getTime()) / (1000 * 60 * 60);
      return hours > 8;
    });
  }, [patrons]);

  const handleForceExit = async () => {
    if (!exitPatron) return;
    setExiting(true);
    try {
      await api.forceExitPatron(exitPatron.id);
      setSnackbar({ severity: "success", message: `Đã đánh dấu ${exitPatron.full_name || exitPatron.student_code} đã ra` });
      setExitPatron(null);
      await load();
    } catch (err) {
      setSnackbar({ severity: "error", message: getErrorMessage(err) || "Lỗi khi đánh dấu ra" });
    } finally {
      setExiting(false);
    }
  };

  return (
    <Stack spacing={3}>
      {/* Gradient Header */}
      <Box
        sx={{
          p: 3,
          borderRadius: 3,
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
          border: "1px solid",
          borderColor: "rgba(99,102,241,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box sx={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", bgcolor: "rgba(99,102,241,0.08)", pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -60, left: 200, width: 220, height: 220, borderRadius: "50%", bgcolor: "rgba(99,102,241,0.05)", pointerEvents: "none" }} />

        <Stack direction="row" spacing={2} sx={{ zIndex: 1, alignItems: "center" }}>
          <Avatar sx={{ bgcolor: "rgba(99,102,241,0.3)", width: 52, height: 52, border: "1px solid rgba(99,102,241,0.5)" }}>
            <GroupsOutlinedIcon sx={{ color: "#a5b4fc", fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#e0e7ff" }}>Độc giả đang có mặt</Typography>
            <Typography variant="body2" sx={{ color: "rgba(199,210,254,0.7)", mt: 0.3 }}>
              {patrons.length} độc giả đang ở trong thư viện — cập nhật {lastUpdate.toLocaleTimeString("vi-VN")}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ zIndex: 1, alignItems: "center" }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: error ? "error.main" : sseConnected ? "#6ee7b7" : "#fcd34d", animation: sseConnected ? "pulse 2s ease-in-out infinite" : undefined }} />
            <Typography variant="caption" sx={{ color: "rgba(199,210,254,0.7)" }}>
              {error ? "Lỗi" : sseConnected ? "Live" : "Polling"}
            </Typography>
          </Stack>
          <Tooltip title="Làm mới">
            <IconButton onClick={load} size="small" sx={{ color: "#a5b4fc", border: "1px solid rgba(165,180,252,0.3)", "&:hover": { bgcolor: "rgba(165,180,252,0.1)" } }}>
              <RefreshOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Camera Stat Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
        {[
          { key: "entry_gate", label: "Cổng vào", icon: <DoorFrontOutlinedIcon sx={{ fontSize: 22 }} />, gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)" },
          { key: "exit_gate", label: "Cổng ra", icon: <ExitToAppOutlinedIcon sx={{ fontSize: 22 }} />, gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" },
          { key: "kiosk", label: "Kiosk", icon: <TerminalOutlinedIcon sx={{ fontSize: 22 }} />, gradient: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)" },
        ].map((cam, idx) => (
          <Paper key={cam.key} variant="outlined" sx={{
            p: 2, borderRadius: 3, position: "relative", overflow: "hidden", borderColor: "divider",
            transition: "transform 0.2s, box-shadow 0.2s",
            animation: `${fadeInUp} 0.4s ease-out`, animationDelay: `${idx * 0.07}s`, animationFillMode: "both",
            "&:hover": { transform: "translateY(-2px)", boxShadow: 4 },
          }}>
            <Box sx={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, background: cam.gradient, opacity: 0.12, borderRadius: "0 12px 0 60px" }} />
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Avatar sx={{ background: cam.gradient, width: 40, height: 40, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>{cam.icon}</Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{cam.label}</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{cameraCounts[cam.key] || 0}</Typography>
              </Box>
            </Stack>
          </Paper>
        ))}
      </Box>

      {stalePatrons.length > 0 && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {stalePatrons.length} độc giả ở trong thư viện quá 8 giờ
          </Typography>
          <Typography variant="body2">
            Có thể gate không detect exit. Kiểm tra và sử dụng nút &ldquo;Đánh dấu đã ra&rdquo; nếu cần.
          </Typography>
        </Alert>
      )}

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
              sx={{ width: { xs: "100%", sm: 320 }, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "background.paper", "&:hover": { "& fieldset": { borderColor: "primary.main" } } } }}
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
                  bgcolor: "rgba(0,0,0,0.04)",
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
                const avatarGradient =
                  dur.level <= 1
                    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    : dur.level === 2
                      ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                      : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
                return (
                  <Grid key={patron.id} size={{ xs: 12, xl: 6 }} sx={{ animation: `${fadeInUp} 0.35s ease-out`, animationDelay: `${idx * 0.05}s`, animationFillMode: "both" }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        overflow: "hidden",
                        position: "relative",
                        transition: "transform 0.2s, box-shadow 0.2s",
                        "&:hover": {
                          transform: "translateY(-1px)",
                          boxShadow: 4,
                        },
                      }}
                    >
                      {/* Duration accent bar */}
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
                              background: avatarGradient,
                              color: "#fff",
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
                                        ? "rgba(74,140,92,0.1)"
                                        : dur.level === 2
                                          ? "rgba(196,154,60,0.1)"
                                          : "rgba(184,92,74,0.1)",
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
                          <Tooltip title="Đánh dấu đã ra">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => setExitPatron(patron)}
                              sx={{ flexShrink: 0, mt: 0.5 }}
                            >
                              <LogoutIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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

      <Dialog open={!!exitPatron} onClose={() => !exiting && setExitPatron(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Xác nhận đánh dấu đã ra?</DialogTitle>
        <DialogContent>
          <Typography>
            Độc giả <strong>{exitPatron?.full_name || exitPatron?.student_code}</strong> sẽ được đánh dấu đã rời khỏi thư viện.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Dùng khi gate không detect được exit.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExitPatron(null)} disabled={exiting}>Hủy</Button>
          <Button variant="contained" color="warning" onClick={handleForceExit} disabled={exiting}>
            {exiting ? "Đang xử lý..." : "Đánh dấu đã ra"}
          </Button>
        </DialogActions>
      </Dialog>

      <NoticeSnackbar open={!!snackbar} message={snackbar?.message || ""} severity={snackbar?.severity || "success"} onClose={() => setSnackbar(null)} anchorOrigin={{ vertical: "top", horizontal: "right" }} />
    </Stack>
  );
}
