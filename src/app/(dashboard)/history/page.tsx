"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";

import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import SensorsOutlinedIcon from "@mui/icons-material/SensorsOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import HighlightOffOutlinedIcon from "@mui/icons-material/HighlightOffOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import DoorFrontOutlinedIcon from "@mui/icons-material/DoorFrontOutlined";
import ExitToAppOutlinedIcon from "@mui/icons-material/ExitToAppOutlined";
import TerminalOutlinedIcon from "@mui/icons-material/TerminalOutlined";
import FaceOutlinedIcon from "@mui/icons-material/FaceOutlined";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";

import AntdDatePicker from "antd/es/date-picker";
import dayjs, { type Dayjs } from "dayjs";
import Table from "antd/es/table";
import type { ColumnsType } from "antd/es/table";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import api from "@/lib/api-client";
import { fadeInUp, slideInRight } from "@/lib/animations";
import type { AccessFrequencyDay, AccessLogPublic, CameraEvent } from "@/lib/types";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import MuiStatCard from "@/app/(dashboard)/_components/ui/MuiStatCard";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";

const { RangePicker } = AntdDatePicker;

const CAMERA_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  entry_gate: { label: "Cổng vào chính", icon: DoorFrontOutlinedIcon, color: "#10B981" },
  exit_gate: { label: "Cổng ra thư viện", icon: ExitToAppOutlinedIcon, color: "#2563EB" },
  kiosk: { label: "Kiosk tự phục vụ", icon: TerminalOutlinedIcon, color: "#F59E0B" },
  web_login: { label: "Đăng nhập web", icon: FaceOutlinedIcon, color: "#8B5CF6" },
};

function getStatusInfo(status: string) {
  if (status === "success" || status === "granted") {
    return { label: "Thành công", color: "success" as const, icon: CheckCircleOutlineOutlinedIcon, bg: "rgba(16, 185, 129, 0.12)", text: "#059669" };
  }
  if (status === "expired") {
    return { label: "Hết hạn thẻ", color: "warning" as const, icon: WarningAmberOutlinedIcon, bg: "rgba(245, 158, 11, 0.12)", text: "#d97706" };
  }
  if (status === "spoof") {
    return { label: "Phát hiện giả mạo", color: "error" as const, icon: ShieldOutlinedIcon, bg: "rgba(239, 68, 68, 0.12)", text: "#dc2626" };
  }
  return { label: "Không khớp", color: "error" as const, icon: HighlightOffOutlinedIcon, bg: "rgba(239, 68, 68, 0.12)", text: "#dc2626" };
}

function mapEventStatus(status: CameraEvent["status"]) {
  return status === "granted" ? "success" : status;
}

function formatRelativeTime(timestamp: string) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export default function HistoryPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [logs, setLogs] = useState<AccessLogPublic[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [accessType, setAccessType] = useState("");
  const [cameraId, setCameraId] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "7d" | "30d">("all");

  // Pagination
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(50);
  const currentPage = Math.floor(skip / limit) + 1;

  // Chart Frequency Data
  const [frequency, setFrequency] = useState<AccessFrequencyDay[]>([]);
  const [freqLoading, setFreqLoading] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setSkip(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Load access logs from backend
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const data = await api.getAccessLogs({
        search: debouncedSearch || undefined,
        accessType: accessType || undefined,
        cameraId: cameraId || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        skip,
        limit,
      });
      setLogs(data.items);
      setTotal(data.total);
    } catch {
      setError("Không thể tải lịch sử ra/vào. Vui lòng kiểm tra lại kết nối mạng.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, accessType, cameraId, status, dateFrom, dateTo, skip, limit]);

  useEffect(() => {
    load();
  }, [load]);

  // Load frequency chart data
  useEffect(() => {
    (async () => {
      setFreqLoading(true);
      try {
        const data = await api.getAccessFrequency({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        });
        setFrequency(Array.isArray(data.daily) ? data.daily : []);
      } catch {
        // Silently handle chart loading errors
      } finally {
        setFreqLoading(false);
      }
    })();
  }, [dateFrom, dateTo]);

  // Connect SSE for real-time live log prepending
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
      if (cameraId && event.camera_id !== cameraId) return;

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
  }, [live, skip, search, status, accessType, cameraId, limit]);

  // Handle Preset Date Selection
  const handleDatePreset = (preset: "all" | "today" | "7d" | "30d") => {
    setDatePreset(preset);
    setSkip(0);
    const today = dayjs().format("YYYY-MM-DD");
    if (preset === "all") {
      setDateFrom("");
      setDateTo("");
    } else if (preset === "today") {
      setDateFrom(today);
      setDateTo(today);
    } else if (preset === "7d") {
      setDateFrom(dayjs().subtract(7, "day").format("YYYY-MM-DD"));
      setDateTo(today);
    } else if (preset === "30d") {
      setDateFrom(dayjs().subtract(30, "day").format("YYYY-MM-DD"));
      setDateTo(today);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setAccessType("");
    setCameraId("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setDatePreset("all");
    setSkip(0);
  };

  // CSV Export for librarians
  const handleExportCsv = () => {
    if (logs.length === 0) return;
    const headers = [
      "Thời gian",
      "Mã sinh viên",
      "Họ tên độc giả",
      "Loại (Vào/Ra)",
      "Cổng kiểm soát",
      "Phương thức",
      "Độ khớp AI (%)",
      "Trạng thái kết quả",
    ];
    const rows = logs.map((log) => [
      new Date(log.access_time).toLocaleString("vi-VN"),
      log.student_code || "",
      log.patron_name || "",
      log.access_type === "entry" ? "Vào" : "Ra",
      CAMERA_CONFIG[log.camera_id]?.label || log.camera_id || "",
      log.verify_method || "face",
      log.confidence != null ? `${Math.round(log.confidence * 100)}%` : "",
      getStatusInfo(log.status).label,
    ]);
    const csvContent =
      "\uFEFF" +
      [
        headers.join(","),
        ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lich_su_ra_vao_thuvien_${dayjs().format("YYYYMMDD_HHmmss")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Frequency Stats Calculations
  const entryTotal = useMemo(() => frequency.reduce((sum, day) => sum + day.entry, 0), [frequency]);
  const exitTotal = useMemo(() => frequency.reduce((sum, day) => sum + day.exit, 0), [frequency]);
  const chartGrandTotal = entryTotal + exitTotal;

  // Table Columns Definition
  const columns: ColumnsType<AccessLogPublic> = [
    {
      title: "Thời gian",
      dataIndex: "access_time",
      key: "access_time",
      width: 170,
      sorter: (a, b) => new Date(a.access_time).getTime() - new Date(b.access_time).getTime(),
      render: (val: string) => {
        const d = new Date(val);
        const timeStr = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const dateStr = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
        return (
          <Box>
            <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, lineHeight: 1.2 }}>
              {timeStr}
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mt: 0.25 }}>
              <Typography variant="caption" color="text.secondary">
                {dateStr}
              </Typography>
              <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600 }}>
                · {formatRelativeTime(val)}
              </Typography>
            </Stack>
          </Box>
        );
      },
    },
    {
      title: "Độc giả & MSSV",
      dataIndex: "patron_name",
      key: "patron_name",
      width: 200,
      render: (val: string, record) => {
        const initial = (val || "Đ")[0].toUpperCase();
        return (
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: record.access_type === "entry" ? "rgba(16, 185, 129, 0.15)" : "rgba(37, 99, 235, 0.15)",
                color: record.access_type === "entry" ? "#059669" : "#2563eb",
                fontWeight: 800,
                fontSize: "0.85rem",
              }}
            >
              {initial}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                noWrap
                component={Link}
                href={record.patron_id ? `/patrons/${record.patron_id}` : `/patrons?search=${record.student_code || ""}`}
                sx={{
                  fontWeight: 750,
                  fontSize: "0.88rem",
                  color: "text.primary",
                  textDecoration: "none",
                  "&:hover": { color: "primary.main", textDecoration: "underline" },
                  display: "block",
                }}
              >
                {val || "Độc giả vãng lai"}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "text.secondary",
                  fontWeight: 600,
                  display: "block",
                }}
              >
                MSSV: {record.student_code || "---"}
              </Typography>
            </Box>
          </Stack>
        );
      },
    },
    {
      title: "Chiều",
      dataIndex: "access_type",
      key: "access_type",
      width: 110,
      render: (val: string) => {
        const isEntry = val === "entry";
        return (
          <Chip
            size="small"
            icon={isEntry ? <LoginOutlinedIcon sx={{ fontSize: "15px !important" }} /> : <LogoutOutlinedIcon sx={{ fontSize: "15px !important" }} />}
            label={isEntry ? "VÀO" : "RA"}
            sx={{
              height: 24,
              fontWeight: 800,
              fontSize: "0.72rem",
              bgcolor: isEntry ? "rgba(16, 185, 129, 0.12)" : "rgba(37, 99, 235, 0.12)",
              color: isEntry ? "#059669" : "#2563eb",
              border: "1px solid",
              borderColor: isEntry ? "rgba(16, 185, 129, 0.3)" : "rgba(37, 99, 235, 0.3)",
            }}
          />
        );
      },
    },
    {
      title: "Cổng kiểm soát",
      dataIndex: "camera_id",
      key: "camera_id",
      width: 160,
      render: (val: string) => {
        const cfg = CAMERA_CONFIG[val] || {
          label: val || "Cổng vào",
          icon: DoorFrontOutlinedIcon,
          color: "text.secondary",
        };
        const GateIcon = cfg.icon;
        return (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: 1,
                bgcolor: alpha(cfg.color, 0.12),
                color: cfg.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <GateIcon sx={{ fontSize: 16 }} />
            </Box>
            <Typography variant="body2" sx={{ fontSize: "0.82rem", fontWeight: 600 }}>
              {cfg.label}
            </Typography>
          </Stack>
        );
      },
    },
    {
      title: "Phương thức & Độ tin cậy",
      dataIndex: "confidence",
      key: "confidence",
      width: 170,
      sorter: (a, b) => (a.confidence ?? 0) - (b.confidence ?? 0),
      render: (val: number | null, record) => {
        const pct = val != null ? Math.round(val * 100) : null;
        return (
          <Box>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.5 }}>
              <FaceOutlinedIcon sx={{ fontSize: 15, color: "text.secondary" }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                {record.verify_method === "face" ? "Nhận diện khuôn mặt" : record.verify_method || "Thẻ RFID"}
              </Typography>
            </Stack>
            {pct != null ? (
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  color={pct >= 85 ? "success" : pct >= 70 ? "warning" : "error"}
                  sx={{ width: 68, height: 6, borderRadius: 99 }}
                />
                <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "monospace", fontSize: "0.75rem" }}>
                  {pct}%
                </Typography>
              </Stack>
            ) : (
              <Typography variant="caption" color="text.disabled">---</Typography>
            )}
          </Box>
        );
      },
    },
    {
      title: "Kết quả",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (val: string) => {
        const info = getStatusInfo(val);
        const Icon = info.icon;
        return (
          <Chip
            size="small"
            icon={<Icon sx={{ fontSize: "15px !important", color: `${info.text} !important` }} />}
            label={info.label}
            sx={{
              height: 24,
              fontSize: "0.72rem",
              fontWeight: 800,
              bgcolor: info.bg,
              color: info.text,
              border: `1px solid ${alpha(info.text, 0.3)}`,
            }}
          />
        );
      },
    },
  ];

  return (
    <Stack spacing={3}>
      {/* Page Header */}
      <PageHeader
        title="Lịch sử ra vào cổng"
        subtitle="Theo dõi chi tiết lượt quét thẻ, nhận diện khuôn mặt sinh trắc học và thời gian di chuyển qua các cổng"
        icon={HistoryOutlinedIcon}
        statBadges={`Tổng: ${total.toLocaleString("vi-VN")} lượt · ${entryTotal.toLocaleString("vi-VN")} vào · ${exitTotal.toLocaleString("vi-VN")} ra`}
        onRefresh={load}
        actions={
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />}
              onClick={handleExportCsv}
              disabled={logs.length === 0}
              sx={{
                borderRadius: 2,
                fontWeight: 700,
                textTransform: "none",
                borderColor: "divider",
                color: "text.primary",
                "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
              }}
            >
              Xuất CSV
            </Button>

            {/* SSE Live Real-time Status Switch */}
            <Chip
              onClick={() => setLive(!live)}
              icon={
                <RadioButtonCheckedIcon
                  sx={{
                    fontSize: "14px !important",
                    color: live ? "#059669 !important" : "#64748b !important",
                    animation: live ? "pulse 2s infinite" : "none",
                  }}
                />
              }
              label={live ? "SSE LIVE" : "POLLING"}
              size="small"
              clickable
              sx={{
                height: 32,
                bgcolor: live ? "rgba(16, 185, 129, 0.12)" : "action.hover",
                color: live ? "#059669" : "text.secondary",
                border: "1px solid",
                borderColor: live ? "rgba(16, 185, 129, 0.3)" : "divider",
                fontWeight: 800,
                fontSize: "0.75rem",
              }}
            />
          </Stack>
        }
      />

      {/* 4 Thẻ KPI Tóm Tắt (MuiStatCard) */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
        <MuiStatCard
          label="Tổng lượt truy cập"
          value={total}
          icon={HistoryOutlinedIcon}
          gradient="linear-gradient(135deg, #0A2540 0%, #0F3C5C 100%)"
          pct={100}
          delta="Bao gồm vào & ra"
          index={0}
        />
        <MuiStatCard
          label="Tổng lượt vào cổng"
          value={entryTotal}
          icon={LoginOutlinedIcon}
          gradient="linear-gradient(135deg, #059669 0%, #047857 100%)"
          delta={chartGrandTotal > 0 ? `${Math.round((entryTotal / chartGrandTotal) * 100)}% tổng lượt` : "Cổng vào"}
          deltaColor="success"
          index={1}
        />
        <MuiStatCard
          label="Tổng lượt ra cổng"
          value={exitTotal}
          icon={LogoutOutlinedIcon}
          gradient="linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)"
          delta={chartGrandTotal > 0 ? `${Math.round((exitTotal / chartGrandTotal) * 100)}% tổng lượt` : "Cổng ra"}
          deltaColor="default"
          index={2}
        />
        <MuiStatCard
          label="Tần suất trung bình"
          value={frequency.length > 0 ? Math.round(chartGrandTotal / frequency.length) : 0}
          icon={TrendingUpOutlinedIcon}
          gradient="linear-gradient(135deg, #D4AF37 0%, #B89628 100%)"
          delta="Lượt / ngày"
          deltaColor="warning"
          index={3}
        />
      </Box>

      {/* Thanh Bộ Lọc & Tìm Kiếm Chuyên Nghiệp */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2.5,
          p: 2.25,
          bgcolor: "background.paper",
          borderColor: "divider",
          boxShadow: (t) =>
            t.palette.mode === "dark"
              ? "0 4px 20px rgba(0, 0, 0, 0.25)"
              : "0 2px 10px rgba(0, 0, 0, 0.03)",
        }}
      >
        <Stack spacing={2}>
          {/* Hàng 1: Ô tìm kiếm + Dropdowns lọc */}
          <Grid container spacing={1.5} sx={{ alignItems: "center" }}>
            <Grid size={{ xs: 12, md: 3.5 }}>
              <TextField
                placeholder="Tìm theo MSSV hoặc họ tên độc giả..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                fullWidth
                size="small"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                    endAdornment: search ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearch("")} edge="end">
                          <ClearOutlinedIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"),
                  },
                }}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <TextField
                select
                label="Chiều di chuyển"
                value={accessType}
                onChange={(e) => { setAccessType(e.target.value); setSkip(0); }}
                fullWidth
                size="small"
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              >
                <MenuItem value="">Tất cả chiều</MenuItem>
                <MenuItem value="entry">Vào cổng</MenuItem>
                <MenuItem value="exit">Ra cổng</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <TextField
                select
                label="Cổng kiểm soát"
                value={cameraId}
                onChange={(e) => { setCameraId(e.target.value); setSkip(0); }}
                fullWidth
                size="small"
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              >
                <MenuItem value="">Tất cả cổng</MenuItem>
                <MenuItem value="entry_gate">Cổng vào chính</MenuItem>
                <MenuItem value="exit_gate">Cổng ra thư viện</MenuItem>
                <MenuItem value="kiosk">Kiosk tự phục vụ</MenuItem>
                <MenuItem value="web_login">Đăng nhập web</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <TextField
                select
                label="Kết quả quét"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setSkip(0); }}
                fullWidth
                size="small"
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              >
                <MenuItem value="">Tất cả kết quả</MenuItem>
                <MenuItem value="success">Thành công</MenuItem>
                <MenuItem value="failed">Không khớp</MenuItem>
                <MenuItem value="expired">Hết hạn thẻ</MenuItem>
                <MenuItem value="spoof">Phát hiện giả mạo</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 6, sm: 3, md: 2.5 }}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  onClick={load}
                  disabled={loading}
                  startIcon={<FilterAltOutlinedIcon />}
                  fullWidth
                  sx={{
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: "none",
                    height: 40,
                    background: "linear-gradient(135deg, #8B0000 0%, #700000 100%)",
                    "&:hover": { background: "linear-gradient(135deg, #700000 0%, #500000 100%)" },
                  }}
                >
                  Lọc
                </Button>
                <Tooltip title="Đặt lại bộ lọc về mặc định">
                  <IconButton
                    onClick={handleResetFilters}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      width: 40,
                      height: 40,
                    }}
                  >
                    <RestartAltOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Grid>
          </Grid>

          <Divider sx={{ borderColor: "divider" }} />

          {/* Hàng 2: Lọc khoảng thời gian (Presets Pills + DateRangePicker) */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between" }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", mr: 0.5 }}>
                Khoảng thời gian:
              </Typography>
              {[
                { id: "all", label: "Tất cả" },
                { id: "today", label: "Hôm nay" },
                { id: "7d", label: "7 ngày qua" },
                { id: "30d", label: "30 ngày qua" },
              ].map((p) => {
                const isSelected = datePreset === p.id;
                return (
                  <Chip
                    key={p.id}
                    label={p.label}
                    size="small"
                    clickable
                    onClick={() => handleDatePreset(p.id as any)}
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      bgcolor: isSelected ? "primary.main" : "action.hover",
                      color: isSelected ? "primary.contrastText" : "text.secondary",
                      border: "1px solid",
                      borderColor: isSelected ? "primary.main" : "transparent",
                    }}
                  />
                );
              })}
            </Stack>

            <Box sx={{ width: { xs: "100%", sm: 280 } }}>
              <RangePicker
                size="small"
                value={[
                  dateFrom ? dayjs(dateFrom) : null,
                  dateTo ? dayjs(dateTo) : null,
                ]}
                onChange={(dates) => {
                  setDatePreset("all");
                  setDateFrom(dates?.[0]?.format("YYYY-MM-DD") || "");
                  setDateTo(dates?.[1]?.format("YYYY-MM-DD") || "");
                  setSkip(0);
                }}
                style={{
                  width: "100%",
                  height: 36,
                  borderRadius: 8,
                  borderColor: theme.palette.divider,
                  backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                }}
                placeholder={["Từ ngày", "Đến ngày"]}
                format="DD/MM/YYYY"
              />
            </Box>
          </Stack>
        </Stack>
      </Paper>

      {/* Biểu Đồ Tần Suất Ra/Vào Theo Ngày */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          bgcolor: "background.paper",
          borderColor: "divider",
          boxShadow: (t) =>
            t.palette.mode === "dark"
              ? "0 4px 20px rgba(0, 0, 0, 0.25)"
              : "0 2px 10px rgba(0, 0, 0, 0.03)",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", mb: 2 }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: "rgba(10, 37, 64, 0.08)",
                color: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BarChartOutlinedIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Tần suất lượt vào / ra theo ngày
              </Typography>
              <Typography variant="caption" color="text.secondary">
                So sánh lưu lượng độc giả giữa cổng vào và cổng ra
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#10b981" }} />
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                Vào: {entryTotal.toLocaleString("vi-VN")}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#2563eb" }} />
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                Ra: {exitTotal.toLocaleString("vi-VN")}
              </Typography>
            </Stack>
          </Stack>
        </Stack>

        <LoadingOverlay loading={freqLoading} message="Đang tải dữ liệu biểu đồ...">
          {frequency.length === 0 ? (
            <Box sx={{ py: 5, textAlign: "center" }}>
              <EmptyState title="Chưa có dữ liệu tần suất trong khoảng thời gian đã chọn" />
            </Box>
          ) : (
            <Box sx={{ height: 260, width: "100%", minWidth: 0, pt: 1 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                <BarChart data={frequency} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis
                    dataKey="date"
                    fontSize={12}
                    tick={{ fill: theme.palette.text.secondary }}
                    tickFormatter={(val: string) => {
                      const d = new Date(`${val}T00:00:00`);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis allowDecimals={false} fontSize={12} tick={{ fill: theme.palette.text.secondary }} />
                  <RechartsTooltip
                    cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}
                    contentStyle={{
                      background: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 10,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                      color: theme.palette.text.primary,
                      fontSize: "0.85rem",
                    }}
                    labelFormatter={(val) => {
                      const d = new Date(`${val}T00:00:00`);
                      return d.toLocaleDateString("vi-VN", {
                        weekday: "long",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      });
                    }}
                  />
                  <Legend />
                  <Bar dataKey="entry" fill="#10b981" name="Lượt vào" radius={[5, 5, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="exit" fill="#2563eb" name="Lượt ra" radius={[5, 5, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </LoadingOverlay>
      </Paper>

      {/* Bảng Nhật Ký Truy Cập Chi Tiết */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 3,
          bgcolor: "background.paper",
          borderColor: "divider",
          overflow: "hidden",
          boxShadow: (t) =>
            t.palette.mode === "dark"
              ? "0 4px 20px rgba(0, 0, 0, 0.25)"
              : "0 2px 10px rgba(0, 0, 0, 0.03)",
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            px: 2.5,
            py: 2,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Nhật ký truy cập chi tiết
              </Typography>
              <Chip
                size="small"
                label={`${total.toLocaleString("vi-VN")} bản ghi`}
                sx={{
                  fontWeight: 800,
                  fontSize: "0.72rem",
                  bgcolor: "rgba(10, 37, 64, 0.08)",
                  color: "primary.main",
                }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Danh sách các sự kiện quét cổng, nhận diện sinh trắc học và đối chiếu Geofence
            </Typography>
          </Box>
        </Stack>

        {error ? (
          <Alert
            severity="error"
            sx={{ mx: 2.5, mt: 2, borderRadius: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => load()}>
                Thử lại
              </Button>
            }
          >
            {error}
          </Alert>
        ) : null}

        <Box sx={{ width: "100%", overflowX: "auto", p: 1 }}>
          <Table<AccessLogPublic>
            rowKey={(record) => record.id}
            columns={columns}
            dataSource={logs}
            loading={loading && logs.length === 0}
            pagination={{
              current: currentPage,
              pageSize: limit,
              total,
              showSizeChanger: true,
              pageSizeOptions: ["20", "50", "100"],
              showTotal: (totalCount, range) => `${range[0]}–${range[1]} trên tổng số ${totalCount.toLocaleString("vi-VN")} bản ghi`,
              onChange: (page: number, pageSize: number) => {
                setLimit(pageSize);
                setSkip((page - 1) * pageSize);
              },
            }}
            scroll={{ x: 960 }}
            size="middle"
            locale={{
              emptyText: (
                <Box sx={{ py: 5 }}>
                  <EmptyState title="Không tìm thấy bản ghi lịch sử nào phù hợp với bộ lọc hiện tại" />
                </Box>
              ),
            }}
          />
        </Box>
      </Paper>
    </Stack>
  );
}
