"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import SensorsOutlinedIcon from "@mui/icons-material/SensorsOutlined";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "@/lib/api-client";
import { fadeInUp, shimmer, slideInRight, successPop } from "@/lib/animations";
import type { AccessFrequencyDay, AccessLogPublic, CameraEvent } from "@/lib/types";

const PAGE_SIZES = [20, 50, 100];

const CAMERA_LABELS: Record<string, string> = {
  entry_gate: "Cổng vào",
  exit_gate: "Cổng ra",
  kiosk: "Kiosk",
  web_login: "Đăng nhập web",
};

function getStatusLabel(status: string) {
  if (status === "success" || status === "granted") return "Thành công";
  if (status === "expired") return "Hết hạn";
  if (status === "spoof") return "Giả mạo";
  return "Thất bại";
}

function getStatusColor(status: string): "success" | "warning" | "error" {
  if (status === "success" || status === "granted") return "success";
  if (status === "expired") return "warning";
  return "error";
}

function mapEventStatus(status: CameraEvent["status"]) {
  return status === "granted" ? "success" : status;
}

export default function HistoryPage() {
  const theme = useTheme();
  const [logs, setLogs] = useState<AccessLogPublic[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(true);

  const [search, setSearch] = useState("");
  const [accessType, setAccessType] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(50);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(skip / limit) + 1;

  const [frequency, setFrequency] = useState<AccessFrequencyDay[]>([]);
  const [freqLoading, setFreqLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const data = await api.getAccessLogs({
        search: search || undefined,
        accessType: accessType || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        skip,
        limit,
      });
      setLogs(data.items);
      setTotal(data.total);
    } catch {
      setError("Không thể tải lịch sử ra/vào.");
    } finally {
      setLoading(false);
    }
  }, [search, accessType, status, dateFrom, dateTo, skip, limit]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      setFreqLoading(true);
      try {
        const data = await api.getAccessFrequency({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        });
        setFrequency(Array.isArray(data.daily) ? data.daily : []);
      } finally {
        setFreqLoading(false);
      }
    })();
  }, [dateFrom, dateTo]);

  const liveCleanup = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!live || skip !== 0) {
      if (liveCleanup.current) {
        liveCleanup.current();
        liveCleanup.current = null;
      }
      return;
    }

    const cleanup = api.connectAccessSSE((event: CameraEvent) => {
      const mappedStatus = mapEventStatus(event.status);
      if (search) {
        const q = search.toLowerCase();
        if (!event.full_name?.toLowerCase().includes(q) && !event.student_code?.toLowerCase().includes(q)) return;
      }
      if (status && mappedStatus !== status) return;
      if (accessType && event.access_type !== accessType) return;

      const newLog: AccessLogPublic = {
        id: `sse-${Date.now()}`,
        patron_id: event.patron_id || null,
        patron_name: event.full_name || null,
        student_code: event.student_code || null,
        access_type: event.access_type || "entry",
        verify_method: "face",
        confidence: event.score || null,
        camera_id: event.camera_id,
        access_time: new Date().toISOString(),
        status: mappedStatus,
      };
      setLogs((prev) => [newLog, ...prev.filter((log) => !log.id.startsWith("sse-")).slice(0, limit - 1)]);
      setTotal((prev) => prev + 1);
    });
    liveCleanup.current = cleanup;
    return cleanup;
  }, [live, skip, search, status, accessType, limit]);

  const handleFilter = () => {
    if (skip === 0) {
      load();
    } else {
      setSkip(0);
    }
  };

  const goToPage = (page: number) => {
    setSkip((page - 1) * limit);
  };

  const entryTotal = useMemo(() => frequency.reduce((sum, day) => sum + day.entry, 0), [frequency]);
  const exitTotal = useMemo(() => frequency.reduce((sum, day) => sum + day.exit, 0), [frequency]);

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2}
          sx={{ alignItems: { lg: "center" }, justifyContent: "space-between" }}
        >
          <Box>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
              <HistoryOutlinedIcon color="primary" />
              <Typography variant="h4" sx={{ fontWeight: 850 }}>
                Lịch sử ra/vào
              </Typography>
            </Stack>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Tra cứu log theo độc giả, trạng thái, thời gian và theo dõi live từ camera.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Chip color={live ? "success" : "default"} icon={<SensorsOutlinedIcon />} label={live ? "Live đang bật" : "Live đang tắt"} />
            <Chip label={`Tổng: ${total}`} />
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mb: 2 }}>
          <FilterAltOutlinedIcon color="disabled" />
          <Typography variant="h6" sx={{ fontWeight: 850 }}>
            Bộ lọc
          </Typography>
        </Stack>

        <Grid container spacing={1.5} sx={{ alignItems: "center" }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              label="Tìm kiếm"
              placeholder="MSSV hoặc tên..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleFilter()}
              fullWidth
              size="small"
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
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 1.7 }}>
            <TextField select label="Loại" value={accessType} onChange={(event) => setAccessType(event.target.value)} fullWidth size="small">
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="entry">Vào</MenuItem>
              <MenuItem value="exit">Ra</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 1.9 }}>
            <TextField select label="Kết quả" value={status} onChange={(event) => setStatus(event.target.value)} fullWidth size="small">
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="success">Thành công</MenuItem>
              <MenuItem value="failed">Thất bại</MenuItem>
              <MenuItem value="expired">Hết hạn</MenuItem>
              <MenuItem value="spoof">Giả mạo</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 1.8 }}>
            <TextField
              label="Từ ngày"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 1.8 }}>
            <TextField
              label="Đến ngày"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 1.3 }}>
            <Button variant="contained" onClick={handleFilter} disabled={loading} fullWidth>
              Lọc
            </Button>
          </Grid>
          <Grid size={{ xs: 12, md: 1.5 }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
              <Typography variant="body2" color="text.secondary">Live</Typography>
              <Switch checked={live} onChange={(event) => setLive(event.target.checked)} />
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mb: 2 }}>
              <BarChartOutlinedIcon color="disabled" />
              <Typography variant="h6" sx={{ fontWeight: 850 }}>
                Tần suất ra/vào theo ngày
              </Typography>
            </Stack>

            {freqLoading ? (
              <Stack sx={{ height: 260, alignItems: "center", justifyContent: "center" }}>
                <CircularProgress size={28} sx={{ animation: `${shimmer} 1.5s ease-in-out infinite` }} />
              </Stack>
            ) : frequency.length === 0 ? (
              <Alert severity="info">Chưa có dữ liệu tần suất trong khoảng thời gian đã chọn.</Alert>
            ) : (
              <Box sx={{ height: 270 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={frequency} margin={{ top: 8, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis
                      dataKey="date"
                      fontSize={12}
                      tick={{ fill: theme.palette.text.secondary }}
                      tickFormatter={(value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                    />
                    <YAxis allowDecimals={false} fontSize={12} tick={{ fill: theme.palette.text.secondary }} />
                    <Tooltip
                      cursor={{ fill: theme.palette.action.hover }}
                      contentStyle={{
                        background: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                        color: theme.palette.text.primary,
                      }}
                      labelFormatter={(value) => new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN", {
                        weekday: "long",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    />
                    <Legend />
                    <Bar dataKey="entry" fill={theme.palette.success.main} name="Vào" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="exit" fill={theme.palette.warning.main} name="Ra" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={2} sx={{ height: "100%" }}>
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <LoginOutlinedIcon color="success" />
                  <Box>
                    <Typography color="text.secondary">Lượt vào trong biểu đồ</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 850 }}>{entryTotal}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <LogoutOutlinedIcon color="warning" />
                  <Box>
                    <Typography color="text.secondary">Lượt ra trong biểu đồ</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 850 }}>{exitTotal}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ p: 2, alignItems: { md: "center" }, justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 850 }}>
              Nhật ký truy cập
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Trang {currentPage} / {totalPages}
            </Typography>
          </Box>
          {error && <Alert severity="error" sx={{ py: 0 }}>{error}</Alert>}
        </Stack>

        <TableContainer>
          <Table size="small" sx={{ minWidth: 980 }}>
            <TableHead>
              <TableRow>
                <TableCell>Thời gian</TableCell>
                <TableCell>Độc giả</TableCell>
                <TableCell>MSSV</TableCell>
                <TableCell>Loại</TableCell>
                <TableCell>Phương thức</TableCell>
                <TableCell>Cổng</TableCell>
                <TableCell>Độ tin cậy</TableCell>
                <TableCell>Kết quả</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Stack sx={{ py: 6, alignItems: "center" }}>
                      <CircularProgress size={28} sx={{ animation: `${shimmer} 1.5s ease-in-out infinite` }} />
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Alert severity="info">Không có dữ liệu lịch sử phù hợp.</Alert>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log, idx) => {
                  const confidence = log.confidence == null ? null : Math.round(log.confidence * 100);
                  const statusColor = getStatusColor(log.status);
                  return (
                    <TableRow key={log.id} hover sx={{ animation: `${slideInRight} 0.3s ease-out`, animationDelay: `${idx * 0.03}s`, animationFillMode: "both" }}>
                      <TableCell sx={{ whiteSpace: "nowrap", fontFamily: "monospace", color: "text.secondary" }}>
                        {new Date(log.access_time).toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{log.patron_name || "-"}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", color: "text.secondary" }}>{log.student_code || "-"}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={log.access_type === "entry" ? "success" : "warning"}
                          label={log.access_type === "entry" ? "Vào" : "Ra"}
                        />
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>{log.verify_method}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                        {CAMERA_LABELS[log.camera_id] || log.camera_id}
                      </TableCell>
                      <TableCell sx={{ minWidth: 150 }}>
                        {confidence == null ? (
                          <Typography color="text.secondary">-</Typography>
                        ) : (
                          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                            <LinearProgress
                              variant="determinate"
                              value={confidence}
                              color={confidence >= 80 ? "success" : confidence >= 60 ? "warning" : "error"}
                              sx={{ width: 80, height: 7, borderRadius: 99 }}
                            />
                            <Typography variant="caption" color="text.secondary">{confidence}%</Typography>
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color={statusColor} label={getStatusLabel(log.status)} sx={{ animation: log.status === "success" || log.status === "granted" ? `${successPop} 0.35s ease-out` : undefined }} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, alignItems: { sm: "center" }, justifyContent: "space-between" }}
        >
          <TextField
            select
            label="Số dòng"
            value={limit}
            onChange={(event) => { setLimit(Number(event.target.value)); setSkip(0); }}
            size="small"
            sx={{ width: 120 }}
          >
            {PAGE_SIZES.map((size) => (
              <MenuItem key={size} value={size}>{size}</MenuItem>
            ))}
          </TextField>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Button variant="outlined" disabled={currentPage <= 1} onClick={() => goToPage(1)}>
              Đầu
            </Button>
            <Button variant="outlined" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
              Trước
            </Button>
            <Typography color="text.secondary" sx={{ px: 1 }}>
              {currentPage} / {totalPages}
            </Typography>
            <Button variant="outlined" disabled={currentPage >= totalPages} onClick={() => goToPage(currentPage + 1)}>
              Sau
            </Button>
            <Button variant="outlined" disabled={currentPage >= totalPages} onClick={() => goToPage(totalPages)}>
              Cuối
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
