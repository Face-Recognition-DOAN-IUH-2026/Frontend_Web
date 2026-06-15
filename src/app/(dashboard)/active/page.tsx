"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import DoorFrontOutlinedIcon from "@mui/icons-material/DoorFrontOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import api from "@/lib/api-client";
import type { ActivePatron } from "@/lib/types";

const ACTIVE_CAMERA_IDS = new Set(["entry_gate", "exit_gate", "kiosk"]);

const CAMERA_LABELS: Record<string, string> = {
  entry_gate: "Cổng vào",
  exit_gate: "Cổng ra",
  kiosk: "Kiosk",
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "Vừa vào";
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`;
}

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
        .filter((patron) => ACTIVE_CAMERA_IDS.has(patron.camera_id))
        .sort((a, b) => new Date(b.entered_at).getTime() - new Date(a.entered_at).getTime());
      setPatrons(allowed);
      setLastUpdate(new Date());
    } catch {
      setError("Không thể tải danh sách độc giả đang trong thư viện.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredPatrons = useMemo(() => {
    const q = normalizeQuery(search);
    if (!q) return patrons;
    return patrons.filter((patron) => (
      patron.full_name.toLowerCase().includes(q)
      || patron.student_code.toLowerCase().includes(q)
    ));
  }, [patrons, search]);

  const cameraCounts = useMemo(() => (
    patrons.reduce<Record<string, number>>((acc, patron) => {
      acc[patron.camera_id] = (acc[patron.camera_id] || 0) + 1;
      return acc;
    }, {})
  ), [patrons]);

  return (
    <Stack spacing={3}>
      <Paper
        variant="outlined"
        sx={{
          overflow: "hidden",
          background: `linear-gradient(135deg, ${theme.palette.success.dark}33, ${theme.palette.background.paper} 55%)`,
        }}
      >
        <Grid container>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ p: 3, height: "100%", borderRight: { md: `1px solid ${theme.palette.divider}` } }}>
              <Stack spacing={2.5} sx={{ height: "100%", justifyContent: "space-between" }}>
                <Avatar sx={{ bgcolor: "success.main", color: "success.contrastText", width: 52, height: 52 }}>
                  <GroupsOutlinedIcon />
                </Avatar>
                <Box>
                  <Typography variant="overline" color="success.main" sx={{ fontWeight: 800 }}>
                    Đang trong thư viện
                  </Typography>
                  <Typography variant="h2" sx={{ mt: 0.5, fontWeight: 900, letterSpacing: 0 }}>
                    {patrons.length}
                  </Typography>
                  <Typography color="text.secondary">
                    Chỉ tính lượt hợp lệ từ cổng vào, cổng ra và kiosk.
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={2.5} sx={{ p: 3 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 850 }}>
                    Hiện diện trong thư viện
                  </Typography>
                  <Typography color="text.secondary">
                    Theo dõi nhanh độc giả đang ở trong thư viện theo dữ liệu camera/kiosk.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                  <Chip color={error ? "error" : "success"} label={error ? "Lỗi cập nhật" : "Đang cập nhật"} />
                  <Tooltip title="Làm mới danh sách">
                    <span>
                      <Button
                        variant="outlined"
                        startIcon={<RefreshOutlinedIcon />}
                        onClick={load}
                        disabled={loading}
                      >
                        Làm mới
                      </Button>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>

              {error && <Alert severity="error">{error}</Alert>}

              <Grid container spacing={1.5}>
                {Object.entries(CAMERA_LABELS).map(([cameraId, label]) => (
                  <Grid key={cameraId} size={{ xs: 12, sm: 4 }}>
                    <Card variant="outlined" sx={{ height: "100%" }}>
                      <CardContent>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                          <Avatar sx={{ bgcolor: "action.hover", color: "text.secondary" }}>
                            <ShieldOutlinedIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography color="text.secondary" variant="body2">
                              {label}
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 850 }}>
                              {cameraCounts[cameraId] || 0}
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <Typography variant="caption" color="text.secondary">
                Cập nhật lần cuối: {lastUpdate.toLocaleTimeString("vi-VN")}
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ alignItems: { md: "center" }, justifyContent: "space-between", mb: 2.5 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 850 }}>
              Độc giả đang có mặt
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {filteredPatrons.length} kết quả hiển thị
            </Typography>
          </Box>
          <TextField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên hoặc MSSV..."
            size="small"
            sx={{ width: { xs: "100%", md: 360 } }}
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

        {loading && patrons.length === 0 ? (
          <Stack spacing={2} sx={{ minHeight: 280, alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={32} />
            <Typography color="text.secondary">Đang tải danh sách...</Typography>
          </Stack>
        ) : patrons.length === 0 ? (
          <Alert icon={<DoorFrontOutlinedIcon />} severity="info">
            Chưa có độc giả trong thư viện. Danh sách sẽ tự cập nhật khi có lượt vào hợp lệ.
          </Alert>
        ) : filteredPatrons.length === 0 ? (
          <Alert icon={<SearchOutlinedIcon />} severity="warning">
            Không tìm thấy độc giả phù hợp với từ khóa hiện tại.
          </Alert>
        ) : (
          <Grid container spacing={1.5}>
            {filteredPatrons.map((patron) => {
              const percent = patron.confidence == null ? null : Math.round(patron.confidence * 100);
              return (
                <Grid key={patron.id} size={{ xs: 12, xl: 6 }}>
                  <Card variant="outlined" sx={{ height: "100%" }}>
                    <CardContent>
                      <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
                        <Avatar sx={{ bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 800 }}>
                          {initials(patron.full_name)}
                        </Avatar>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            sx={{ justifyContent: "space-between", alignItems: { sm: "flex-start" } }}
                          >
                            <Box sx={{ minWidth: 0 }}>
                              <Typography noWrap sx={{ fontWeight: 800 }}>
                                {patron.full_name || "Chưa có tên"}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                                {patron.student_code}
                              </Typography>
                            </Box>
                            <Chip color="success" label="Đang ở trong" size="small" />
                          </Stack>

                          <Grid container spacing={1.5} sx={{ mt: 2 }}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                <AccessTimeOutlinedIcon color="disabled" fontSize="small" />
                                <Typography variant="body2">{formatTime(patron.entered_at)}</Typography>
                              </Stack>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                <LocationOnOutlinedIcon color="disabled" fontSize="small" />
                                <Typography variant="body2">
                                  {CAMERA_LABELS[patron.camera_id] || patron.camera_id}
                                </Typography>
                              </Stack>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                <VerifiedUserOutlinedIcon color="disabled" fontSize="small" />
                                <Typography variant="body2">{formatDuration(patron.entered_at)}</Typography>
                              </Stack>
                            </Grid>
                          </Grid>

                          {percent != null && (
                            <Stack direction="row" spacing={1.5} sx={{ mt: 2, alignItems: "center" }}>
                              <LinearProgress
                                variant="determinate"
                                value={percent}
                                color={percent >= 80 ? "success" : percent >= 60 ? "warning" : "error"}
                                sx={{ flex: 1, height: 7, borderRadius: 99 }}
                              />
                              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 38, textAlign: "right" }}>
                                {percent}%
                              </Typography>
                            </Stack>
                          )}
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Paper>
    </Stack>
  );
}
