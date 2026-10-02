"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import SearchIcon from "@mui/icons-material/Search";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";

const MOCK_ROUTES = [
  { path: "/dashboard", label: "Tổng quan Dashboard", resource: "dashboard" },
  { path: "/books", label: "Quản lý Kho sách & Giáo trình", resource: "books" },
  { path: "/patrons", label: "Hồ sơ Độc giả & Sinh viên", resource: "patrons" },
  { path: "/borrow", label: "Lập phiếu Mượn sách", resource: "borrows" },
  { path: "/return", label: "Xử lý Trả sách & Thu hồi", resource: "borrows" },
  { path: "/gate", label: "Giám sát Cổng ra vào AI", resource: "gate" },
  { path: "/history", label: "Lịch sử Điểm danh & Mượn trả", resource: "history" },
  { path: "/staff-schedules", label: "Phân ca trực Thủ thư", resource: "schedules" },
  { path: "/settings", label: "Cài đặt Hệ thống", resource: "settings" },
  { path: "/stats", label: "Báo cáo Thống kê & KPI", resource: "stats" },
];

export default function SplitPaneAdminSandbox() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [selectedRole, setSelectedRole] = useState("staff");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [allowedRoutes, setAllowedRoutes] = useState<string[]>([
    "/dashboard",
    "/books",
    "/patrons",
    "/borrow",
    "/return",
    "/history",
  ]);

  const toggleRoute = (path: string) => {
    if (selectedRole === "admin" || path === "/dashboard") return;
    setAllowedRoutes((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const filteredRoutes = MOCK_ROUTES.filter((r) => {
    const match =
      r.label.toLowerCase().includes(search.toLowerCase()) ||
      r.path.toLowerCase().includes(search.toLowerCase());
    if (!match) return false;
    const isAllowed = selectedRole === "admin" || allowedRoutes.includes(r.path);
    if (filter === "allowed") return isAllowed;
    if (filter === "blocked") return !isAllowed;
    return true;
  });

  return (
    <Box sx={{ width: "100%", pb: 4 }}>
      {/* ── ZONE A: TOP ACTION & COMPACT METRIC BAR (H = 96px) ────────────── */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "3px",
                bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                border: "1px solid",
                borderColor: isDark ? "#334155" : "#CBD5E1",
                display: "grid",
                placeItems: "center",
                color: "#2563EB",
              }}
            >
              <ShieldOutlinedIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box>
              <Typography
                variant="subtitle1"
                sx={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  letterSpacing: "-0.01em",
                  color: isDark ? "#F8FAFC" : "#0F172A",
                  lineHeight: 1.2,
                }}
              >
                DESIGN SANDBOX — SPLIT-PANE HIGH-DENSITY ADMIN
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Thử nghiệm cơ chế Bố cục phân vùng: Vùng B (Rail) + Vùng C (Data Table) + Vùng D (Live Inspector)
              </Typography>
            </Box>
          </Stack>

          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshOutlinedIcon />}
            sx={{ borderRadius: "3px", textTransform: "none", fontSize: "0.8rem", fontWeight: 600 }}
          >
            Tải lại
          </Button>
        </Stack>

        {/* Compact Metric Bar */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: "3px",
            border: "1px solid",
            borderColor: isDark ? "#334155" : "#E2E8F0",
            bgcolor: isDark ? "#1E293B" : "#FFFFFF",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
          }}
        >
          <Box sx={{ p: 1.5, borderRight: "1px solid", borderColor: isDark ? "#334155" : "#E2E8F0" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase", fontSize: "0.68rem" }}>
              Vai trò hệ thống
            </Typography>
            <Typography sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "#2563EB" }}>
              3 roles
            </Typography>
          </Box>
          <Box sx={{ p: 1.5, borderRight: "1px solid", borderColor: isDark ? "#334155" : "#E2E8F0" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase", fontSize: "0.68rem" }}>
              Trang cấp [{selectedRole}]
            </Typography>
            <Typography sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "#059669" }}>
              {selectedRole === "admin" ? MOCK_ROUTES.length : allowedRoutes.length}/{MOCK_ROUTES.length}
            </Typography>
          </Box>
          <Box sx={{ p: 1.5, borderRight: "1px solid", borderColor: isDark ? "#334155" : "#E2E8F0" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase", fontSize: "0.68rem" }}>
              Mật độ CRUD mở
            </Typography>
            <Typography sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "#D97706" }}>
              24/28 actions
            </Typography>
          </Box>
          <Box sx={{ p: 1.5 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase", fontSize: "0.68rem" }}>
              Tài khoản kích hoạt
            </Typography>
            <Typography sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "1.4rem", color: isDark ? "#F8FAFC" : "#0F172A" }}>
              8 nhân sự
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* ── 3-COLUMN SPLIT-PANE ARCHITECTURE (ZONES B, C, D) ──────────────── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "200px 1fr 320px" },
          gap: 2,
          alignItems: "start",
        }}
      >
        {/* ── ZONE B: LEFT CONTROL RAIL (15%) ─────────────────────────────── */}
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: "3px",
            border: "1px solid",
            borderColor: isDark ? "#334155" : "#E2E8F0",
            bgcolor: isDark ? "#1E293B" : "#FFFFFF",
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1, display: "block" }}>
            VAI TRÒ (ROLES)
          </Typography>

          <Stack spacing={1}>
            {[
              { id: "admin", label: "Admin", count: 2, icon: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 16 }} /> },
              { id: "staff", label: "Thủ thư (Staff)", count: 5, icon: <PersonOutlineOutlinedIcon sx={{ fontSize: 16 }} /> },
              { id: "viewer", label: "Quan sát (Viewer)", count: 1, icon: <PersonOutlineOutlinedIcon sx={{ fontSize: 16 }} /> },
            ].map((r) => {
              const active = selectedRole === r.id;
              return (
                <Button
                  key={r.id}
                  fullWidth
                  startIcon={r.icon}
                  onClick={() => setSelectedRole(r.id)}
                  sx={{
                    justifyContent: "space-between",
                    borderRadius: "3px",
                    textTransform: "none",
                    fontFamily: "'Source Sans 3', sans-serif",
                    fontWeight: active ? 700 : 500,
                    fontSize: "0.82rem",
                    py: 0.8,
                    px: 1.2,
                    bgcolor: active ? (isDark ? "#2563EB" : "#2563EB") : "transparent",
                    color: active ? "#FFFFFF" : isDark ? "#CBD5E1" : "#334155",
                    border: "1px solid",
                    borderColor: active ? "#2563EB" : isDark ? "#334155" : "#E2E8F0",
                    "&:hover": {
                      bgcolor: active ? "#1D4ED8" : alpha("#2563EB", 0.06),
                    },
                  }}
                >
                  <span>{r.label}</span>
                  <Chip
                    label={r.count}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      borderRadius: "2px",
                      bgcolor: active ? "rgba(255,255,255,0.2)" : isDark ? "#0F172A" : "#F1F5F9",
                      color: active ? "#FFFFFF" : "text.secondary",
                    }}
                  />
                </Button>
              );
            })}

            <Button
              fullWidth
              size="small"
              variant="outlined"
              startIcon={<AddCircleOutlineOutlinedIcon />}
              sx={{
                borderRadius: "3px",
                textTransform: "none",
                fontSize: "0.75rem",
                fontWeight: 600,
                borderColor: isDark ? "#334155" : "#CBD5E1",
                mt: 1,
              }}
            >
              Thêm vai trò
            </Button>
          </Stack>

          <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em", mt: 2.5, mb: 1, display: "block" }}>
            TÁC VỤ NHANH
          </Typography>

          <Stack spacing={0.75}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setAllowedRoutes(MOCK_ROUTES.map((r) => r.path))}
              disabled={selectedRole === "admin"}
              sx={{ fontSize: "0.75rem", textTransform: "none", borderRadius: "3px", justifyContent: "flex-start" }}
            >
              Cấp toàn bộ trang
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={() => setAllowedRoutes(["/dashboard"])}
              disabled={selectedRole === "admin"}
              sx={{ fontSize: "0.75rem", textTransform: "none", borderRadius: "3px", justifyContent: "flex-start" }}
            >
              Chỉ giữ Dashboard
            </Button>
          </Stack>
        </Paper>

        {/* ── ZONE C: PRIMARY DATA WORKSPACE (60%) ─────────────────────────── */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: "3px",
            border: "1px solid",
            borderColor: isDark ? "#334155" : "#E2E8F0",
            bgcolor: isDark ? "#1E293B" : "#FFFFFF",
            overflow: "hidden",
          }}
        >
          {/* Workspace Filter Bar */}
          <Box
            sx={{
              p: 1.5,
              borderBottom: "1px solid",
              borderColor: isDark ? "#334155" : "#E2E8F0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1.5,
              bgcolor: isDark ? "#0F172A" : "#F8FAFC",
            }}
          >
            <TextField
              size="small"
              placeholder="Lọc trang hoặc URL route..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                  sx: {
                    height: 32,
                    fontSize: "0.82rem",
                    fontFamily: "'JetBrains Mono', monospace",
                    bgcolor: isDark ? "#1E293B" : "#FFFFFF",
                    borderRadius: "3px",
                    width: 240,
                  },
                },
              }}
            />

            <Select
              size="small"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              sx={{
                height: 32,
                fontSize: "0.8rem",
                bgcolor: isDark ? "#1E293B" : "#FFFFFF",
                borderRadius: "3px",
              }}
            >
              <MenuItem value="all">Tất cả trang ({MOCK_ROUTES.length})</MenuItem>
              <MenuItem value="allowed">Được cấp ({allowedRoutes.length})</MenuItem>
              <MenuItem value="blocked">Bị chặn ({MOCK_ROUTES.length - allowedRoutes.length})</MenuItem>
            </Select>
          </Box>

          {/* High-Density Data Table */}
          <TableContainer sx={{ maxHeight: 520 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? "#0F172A" : "#F1F5F9", width: "42%" }}>
                    Màn hình chức năng
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? "#0F172A" : "#F1F5F9", width: "38%" }}>
                    Route URL
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, bgcolor: isDark ? "#0F172A" : "#F1F5F9", width: "20%" }}>
                    Phân quyền
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRoutes.map((route) => {
                  const isAllowed = selectedRole === "admin" || allowedRoutes.includes(route.path);
                  const isDashboard = route.path === "/dashboard";

                  return (
                    <TableRow
                      key={route.path}
                      hover
                      sx={{
                        transition: "background-color 100ms ease",
                        "&:hover": {
                          bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(37,99,235,0.03)",
                        },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                          {route.label}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: "'JetBrains Mono', monospace",
                            color: isDark ? "#94A3B8" : "#475569",
                            bgcolor: isDark ? "#0F172A" : "#F1F5F9",
                            px: 0.8,
                            py: 0.2,
                            borderRadius: "2px",
                            border: "1px solid",
                            borderColor: isDark ? "#334155" : "#E2E8F0",
                          }}
                        >
                          {route.path}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1 }}>
                          <Chip
                            label={isAllowed ? "ĐƯỢC VÀO" : "CHẶN"}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              fontFamily: "'JetBrains Mono', monospace",
                              borderRadius: "2px",
                              bgcolor: isAllowed ? alpha("#059669", 0.12) : alpha("#DC2626", 0.1),
                              color: isAllowed ? "#059669" : "#DC2626",
                              border: "1px solid",
                              borderColor: isAllowed ? alpha("#059669", 0.3) : alpha("#DC2626", 0.3),
                            }}
                          />
                          <Switch
                            size="small"
                            checked={isAllowed}
                            disabled={selectedRole === "admin" || isDashboard}
                            onChange={() => toggleRoute(route.path)}
                            color="primary"
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Footer Save CTA */}
          <Box
            sx={{
              p: 1.5,
              borderTop: "1px solid",
              borderColor: isDark ? "#334155" : "#E2E8F0",
              display: "flex",
              justifyContent: "flex-end",
              bgcolor: isDark ? "#0F172A" : "#F8FAFC",
            }}
          >
            <Button
              variant="contained"
              size="small"
              startIcon={<SaveOutlinedIcon />}
              disabled={selectedRole === "admin"}
              sx={{
                borderRadius: "3px",
                px: 2.5,
                fontWeight: 700,
                fontFamily: "'Space Grotesk', sans-serif",
                textTransform: "none",
                bgcolor: "#2563EB",
                color: "#FFFFFF",
              }}
            >
              Lưu cấu hình [{selectedRole}]
            </Button>
          </Box>
        </Paper>

        {/* ── ZONE D: RIGHT INSPECTOR PANEL (25%) ──────────────────────────── */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: "3px",
            border: "1px solid",
            borderColor: isDark ? "#334155" : "#E2E8F0",
            bgcolor: isDark ? "#1E293B" : "#FFFFFF",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              LIVE RUNTIME AUDIT
            </Typography>

            <Tooltip title="Sao chép JSON">
              <IconButton size="small">
                <ContentCopyIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          </Box>

          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary", display: "block", mb: 0.5 }}>
            Trang hiệu lực ({selectedRole === "admin" ? MOCK_ROUTES.length : allowedRoutes.length}):
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 2 }}>
            {(selectedRole === "admin" ? MOCK_ROUTES.map((r) => r.path) : allowedRoutes).map((p) => (
              <Chip
                key={p}
                label={p}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.68rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  borderRadius: "2px",
                  bgcolor: alpha("#059669", 0.12),
                  color: "#059669",
                  border: "1px solid",
                  borderColor: alpha("#059669", 0.3),
                }}
              />
            ))}
          </Box>

          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary", display: "block", mb: 0.5 }}>
            Payload JSON:
          </Typography>

          <Box
            component="pre"
            sx={{
              p: 1.5,
              borderRadius: "3px",
              bgcolor: isDark ? "#0F172A" : "#F8FAFC",
              border: "1px solid",
              borderColor: isDark ? "#334155" : "#E2E8F0",
              fontSize: "0.72rem",
              fontFamily: "'JetBrains Mono', monospace",
              overflowX: "auto",
              maxHeight: 280,
              color: isDark ? "#38BDF8" : "#0369A1",
            }}
          >
            {JSON.stringify(
              {
                role: selectedRole,
                allowedPages: selectedRole === "admin" ? MOCK_ROUTES.map((r) => r.path) : allowedRoutes,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
