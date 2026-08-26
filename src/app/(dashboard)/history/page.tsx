"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import SensorsOutlinedIcon from "@mui/icons-material/SensorsOutlined";
import AntdDatePicker from "antd/es/date-picker";
import dayjs from "dayjs";

const { RangePicker } = AntdDatePicker;
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
import Table from "antd/es/table";
import Tag from "antd/es/tag";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import api from "@/lib/api-client";
import { successPop } from "@/lib/animations";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import type { AccessFrequencyDay, AccessLogPublic, CameraEvent } from "@/lib/types";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import MuiStatCard from "@/app/(dashboard)/_components/ui/MuiStatCard";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";

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

  const entryTotal = useMemo(() => frequency.reduce((sum, day) => sum + day.entry, 0), [frequency]);
  const exitTotal = useMemo(() => frequency.reduce((sum, day) => sum + day.exit, 0), [frequency]);

  const columns: ColumnsType<AccessLogPublic> = [
    {
      title: "Thời gian",
      dataIndex: "access_time",
      key: "access_time",
      width: 180,
      sorter: (a, b) => new Date(a.access_time).getTime() - new Date(b.access_time).getTime(),
      render: (val: string) => (
        <span style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "#B8B0A4" }}>
          {new Date(val).toLocaleString("vi-VN")}
        </span>
      ),
    },
    {
      title: "Độc giả",
      dataIndex: "patron_name",
      key: "patron_name",
      width: 160,
      render: (val: string) => <span style={{ fontWeight: 600 }}>{val || "-"}</span>,
    },
    {
      title: "MSSV",
      dataIndex: "student_code",
      key: "student_code",
      width: 120,
      render: (val: string) => <span style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{val || "-"}</span>,
    },
    {
      title: "Loại",
      dataIndex: "access_type",
      key: "access_type",
      width: 80,
      filters: [
        { text: "Vào", value: "entry" },
        { text: "Ra", value: "exit" },
      ],
      onFilter: (value, record) => record.access_type === value,
      render: (val: string) => (
        <Tag color={val === "entry" ? "green" : "orange"}>
          {val === "entry" ? "Vào" : "Ra"}
        </Tag>
      ),
    },
    {
      title: "Phương thức",
      dataIndex: "verify_method",
      key: "verify_method",
      width: 100,
      render: (val: string) => <span style={{ color: "#B8B0A4" }}>{val}</span>,
    },
    {
      title: "Cổng",
      dataIndex: "camera_id",
      key: "camera_id",
      width: 120,
      render: (val: string) => (
        <span style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>
          {CAMERA_LABELS[val] || val}
        </span>
      ),
    },
    {
      title: "Độ tin cậy",
      dataIndex: "confidence",
      key: "confidence",
      width: 150,
      sorter: (a, b) => (a.confidence ?? 0) - (b.confidence ?? 0),
      render: (val: number | null) => {
        if (val == null) return <span style={{ color: "#B8B0A4" }}>-</span>;
        const pct = Math.round(val * 100);
        return (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <LinearProgress
              variant="determinate"
              value={pct}
              color={pct >= 80 ? "success" : pct >= 60 ? "warning" : "error"}
              sx={{ width: 80, height: 7, borderRadius: 99 }}
            />
            <span style={{ fontSize: "0.75rem", color: "#B8B0A4" }}>{pct}%</span>
          </Stack>
        );
      },
    },
    {
      title: "Kết quả",
      dataIndex: "status",
      key: "status",
      width: 110,
      filters: [
        { text: "Thành công", value: "success" },
        { text: "Thất bại", value: "failed" },
        { text: "Hết hạn", value: "expired" },
        { text: "Giả mạo", value: "spoof" },
      ],
      onFilter: (value, record) => record.status === value,
      render: (val: string) => {
        const colorMap: Record<string, string> = {
          success: "green", granted: "green",
          expired: "orange",
          spoof: "red", failed: "red",
        };
        return (
          <Tag color={colorMap[val] || "default"}>
            {getStatusLabel(val)}
          </Tag>
        );
      },
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Lịch sử ra vào cổng"
        subtitle={`Theo dõi lượt quét thẻ, nhận diện khuôn mặt và thời gian ra vào`}
        icon={HistoryOutlinedIcon}
        statBadges={`Tổng: ${total} lượt`}
        onRefresh={load}
        actions={
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Chip
              icon={<SensorsOutlinedIcon sx={{ fontSize: 16 }} />}
              label={live ? "Trực tiếp" : "Tự làm mới"}
              size="small"
              sx={{
                bgcolor: live ? "rgba(5, 150, 105, 0.12)" : "action.hover",
                color: live ? "success.main" : "text.secondary",
                border: "1px solid",
                borderColor: live ? "rgba(5, 150, 105, 0.3)" : "divider",
                fontWeight: 600,
              }}
            />
          </Stack>
        }
      />

      <DashboardCard title="Bộ lọc tìm kiếm">
        <Grid container spacing={1.5} sx={{ alignItems: "center" }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              label="Tìm kiếm"
              placeholder="MSSV hoặc tên độc giả..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" ? handleFilter() : undefined}
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
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <RangePicker
              size="small"
              value={[
                dateFrom ? dayjs(dateFrom) : null,
                dateTo ? dayjs(dateTo) : null,
              ]}
              onChange={(dates) => {
                setDateFrom(dates?.[0]?.format("YYYY-MM-DD") || "");
                setDateTo(dates?.[1]?.format("YYYY-MM-DD") || "");
              }}
              style={{ width: "100%", height: 40 }}
              placeholder={["Từ ngày", "Đến ngày"]}
              format="DD/MM/YYYY"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 1.3 }}>
            <Button
              variant="contained"
              onClick={handleFilter}
              disabled={loading}
              fullWidth
              sx={{ borderRadius: 2, fontWeight: 700, height: 40 }}
            >
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
      </DashboardCard>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <DashboardCard title="Tần suất ra/vào theo ngày">
            <LoadingOverlay loading={freqLoading} message="Đang tải biểu đồ...">
              {frequency.length === 0 ? (
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
            </LoadingOverlay>
          </DashboardCard>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={2} sx={{ height: "100%" }}>
            <MuiStatCard
              label="Lượt vào trong biểu đồ"
              value={entryTotal}
              icon={LoginOutlinedIcon}
              gradient="linear-gradient(135deg, #059669 0%, #047857 100%)"
              pct={100}
              index={0}
            />
            <MuiStatCard
              label="Lượt ra trong biểu đồ"
              value={exitTotal}
              icon={LogoutOutlinedIcon}
              gradient="linear-gradient(135deg, #D97706 0%, #B45309 100%)"
              pct={100}
              index={1}
            />
          </Stack>
        </Grid>
      </Grid>

      <DashboardCard
        title="Nhật ký truy cập"
        subtitle={`Tổng: ${total} bản ghi`}
        noPadding
      >
        {error ? <Alert severity="error" sx={{ mx: 2.5, mt: 2 }}>{error}</Alert> : null}

        <Box sx={{ px: 1, py: 1 }}>
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
              showTotal: (total, range) => `${range[0]}–${range[1]} / ${total} bản ghi`,
              onChange: (page: number, pageSize: number) => {
                setLimit(pageSize);
                setSkip((page - 1) * pageSize);
              },
            }}
            scroll={{ x: 980 }}
            size="small"
            locale={{
              emptyText: (
                <EmptyState title="Không có dữ liệu lịch sử phù hợp" />
              ),
            }}
          />
        </Box>
      </DashboardCard>
    </Stack>
  );
}
