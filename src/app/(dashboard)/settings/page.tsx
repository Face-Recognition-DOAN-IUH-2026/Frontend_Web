"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import CloseIcon from "@mui/icons-material/Close";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import MeetingRoomOutlinedIcon from "@mui/icons-material/MeetingRoomOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import SearchOffOutlinedIcon from "@mui/icons-material/SearchOffOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import type { SystemConfigEntry } from "@/lib/types";

const CATEGORIES = ["borrow", "fine", "smtp", "automation", "access"] as const;

const CATEGORY_META: Record<string, { label: string; icon: React.ReactElement; color: string; gradient: string }> = {
  borrow: {
    label: "Mượn trả",
    icon: <MenuBookOutlinedIcon />,
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
  },
  fine: {
    label: "Phí phạt",
    icon: <MonetizationOnOutlinedIcon />,
    color: "#ef4444",
    gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
  },
  smtp: {
    label: "Email SMTP",
    icon: <EmailOutlinedIcon />,
    color: "#3b82f6",
    gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
  },
  automation: {
    label: "Tác vụ tự động",
    icon: <ScheduleOutlinedIcon />,
    color: "#10b981",
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  },
  access: {
    label: "Ra vào",
    icon: <MeetingRoomOutlinedIcon />,
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  },
} as const;

type TabCategory = (typeof CATEGORIES)[number];

function renderField(
  entry: SystemConfigEntry,
  value: any,
  onChange: (key: string, val: any) => void,
) {
  const label = entry.label;
  const desc = entry.description;

  if (typeof value === "boolean") {
    return (
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Switch
          checked={value}
          onChange={(e) => onChange(entry.config_key, e.target.checked)}
        />
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
          {desc && <Typography variant="caption" color="text.secondary">{desc}</Typography>}
        </Box>
      </Stack>
    );
  }

  if (Array.isArray(value) && typeof value[0] === "object") {
    return (
      <EditableTable
        label={label}
        description={desc}
        rows={value as Record<string, any>[]}
        onChange={(rows) => onChange(entry.config_key, rows)}
      />
    );
  }

  if (Array.isArray(value)) {
    return (
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>{label}</Typography>
        {desc && <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>{desc}</Typography>}
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }}>
          {(value as string[]).map((v, i) => (
            <Chip key={i} label={v} size="small" sx={{ borderRadius: 1.5, fontWeight: 600 }} />
          ))}
        </Stack>
      </Box>
    );
  }

  const isPassword = entry.config_key === "pass" || entry.config_key === "password";

  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>{label}</Typography>
      {desc && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
          {desc}
        </Typography>
      )}
      <PasswordField
        value={value ?? ""}
        isPassword={isPassword}
        type={typeof entry.config_value === "number" ? "number" : "text"}
        onChange={(e) => {
          const raw = e.target.value;
          const originalIsNum = typeof entry.config_value === "number";
          onChange(entry.config_key, originalIsNum ? (raw === "" ? 0 : Number(raw)) : raw);
        }}
      />
    </Box>
  );
}

function PasswordField({ value, isPassword, type, onChange }: {
  value: any; isPassword: boolean; type: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <TextField
      fullWidth
      type={isPassword && !show ? "password" : type === "number" ? "number" : "text"}
      value={value}
      onChange={onChange}
      size="small"
      slotProps={{
        input: isPassword ? {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setShow((s) => !s)} edge="end">
                {show ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
        } : undefined,
      }}
      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: "0.9rem" } }}
    />
  );
}

function EditableTable({ label, description, rows, onChange }: {
  label: string; description?: string | null;
  rows: Record<string, any>[]; onChange: (rows: Record<string, any>[]) => void;
}) {
  const keys = rows.length > 0 ? Object.keys(rows[0]) : [];

  const COLUMN_LABELS: Record<string, string> = {
    from: "Từ ngày",
    to: "Đến ngày",
    amount: "Số tiền (VNĐ)",
    bracket: "Bậc",
  };

  const updateCell = (rowIdx: number, colKey: string, val: any) => {
    const next = rows.map((r, i) => (i === rowIdx ? { ...r, [colKey]: val } : r));
    onChange(next);
  };

  const deleteRow = (rowIdx: number) => {
    onChange(rows.filter((_, i) => i !== rowIdx));
  };

  const addRow = () => {
    const template: Record<string, any> = {};
    keys.forEach((k) => { template[k] = null; });
    onChange([...rows, template]);
  };

  const formatCellValue = (key: string, val: any) => {
    if (val === null || val === undefined) return "";
    if (key === "to" && val === null) return "∞";
    return val;
  };

  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>{label}</Typography>
      {description && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>{description}</Typography>
      )}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& .MuiTableCell-head": { fontWeight: 700, bgcolor: "action.hover", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: 0.5 } }}>
              {keys.map((k) => (
                <TableCell key={k}>{COLUMN_LABELS[k] || k}</TableCell>
              ))}
              <TableCell width={48}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, ri) => (
              <TableRow key={ri} sx={{ "&:last-child td": { border: 0 } }}>
                {keys.map((k) => (
                  <TableCell key={k} sx={{ py: 0.5, px: 1 }}>
                    {k === "amount" ? (
                      <TextField
                        size="small"
                        type="number"
                        value={row[k] ?? ""}
                        onChange={(e) => updateCell(ri, k, e.target.value === "" ? null : Number(e.target.value))}
                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
                      />
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{
                          px: 1,
                          py: 0.5,
                          fontWeight: row[k] === null && k === "to" ? 400 : 600,
                          color: row[k] === null && k === "to" ? "text.disabled" : "text.primary",
                          fontFamily: k === "to" && row[k] === null ? "monospace" : undefined,
                          fontSize: "0.9rem",
                        }}
                      >
                        {formatCellValue(k, row[k])}
                      </Typography>
                    )}
                  </TableCell>
                ))}
                <TableCell sx={{ py: 0.5, px: 0.5 }}>
                  <IconButton size="small" color="error" onClick={() => deleteRow(ri)}>
                    <DeleteOutlineOutlinedIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Button
        size="small"
        startIcon={<AddOutlinedIcon />}
        onClick={addRow}
        sx={{ mt: 1, borderRadius: 2, fontWeight: 600, fontSize: "0.8rem" }}
      >
        Thêm bậc phạt
      </Button>
    </Box>
  );
}

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 3 }}>{children}</Box>;
}

export default function SettingsPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState<Record<string, SystemConfigEntry[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [modified, setModified] = useState<Record<string, Record<string, any>>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testEmailSending, setTestEmailSending] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isLoading, isAuthenticated, router]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getAdminSettings();
      setSettings(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Không thể tải cài đặt hệ thống.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentCategory = CATEGORIES[tab] as TabCategory | undefined;
  const entries = currentCategory && settings ? settings[currentCategory] || [] : [];

  const getCurrentValue = (entry: SystemConfigEntry) => {
    const cat = entry.category;
    const key = entry.config_key;
    if (modified[cat] && modified[cat][key] !== undefined) return modified[cat][key];
    return entry.config_value;
  };

  const handleFieldChange = (key: string, val: any) => {
    if (!currentCategory) return;
    setModified((prev) => ({
      ...prev,
      [currentCategory]: { ...(prev[currentCategory] || {}), [key]: val },
    }));
  };

  const hasChanges = currentCategory && modified[currentCategory] && Object.keys(modified[currentCategory]).length > 0;

  const handleSave = async () => {
    if (!currentCategory || !hasChanges) return;
    try {
      setSaving(true);
      const values = modified[currentCategory]!;
      await api.updateAdminSettings(currentCategory, values);
      setModified((prev) => {
        const next = { ...prev };
        delete next[currentCategory];
        return next;
      });
      load();
      setSnackbar({ open: true, message: "Lưu cài đặt thành công.", severity: "success" });
    } catch (err: any) {
      const msg = getErrorMessage(err) || "Lưu cài đặt thất bại.";
      setSnackbar({ open: true, message: msg, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!currentCategory) return;
    setModified((prev) => {
      const next = { ...prev };
      delete next[currentCategory];
      return next;
    });
  };

  const handleTestEmail = async () => {
    if (!testEmail || !settings?.smtp) return;
    try {
      setTestEmailSending(true);
      const smtpConfig: Record<string, any> = {};
      settings.smtp.forEach((e) => { smtpConfig[e.config_key] = e.config_value; });
      const res = await api.testSmtpConfig({ to: testEmail, ...smtpConfig } as any);
      if (res.success) {
        setSnackbar({ open: true, message: "Gửi email test thành công.", severity: "success" });
      } else {
        setSnackbar({ open: true, message: res.message || "Gửi email test thất bại.", severity: "error" });
      }
      setTestEmailOpen(false);
    } catch (err: any) {
      const msg = getErrorMessage(err) || "Gửi email test thất bại.";
      setSnackbar({ open: true, message: msg, severity: "error" });
    } finally {
      setTestEmailSending(false);
    }
  };

  const totalConfigs = settings ? Object.values(settings).reduce((sum, arr) => sum + arr.length, 0) : 0;
  const changedCount = Object.values(modified).reduce((sum, m) => sum + Object.keys(m).length, 0);

  if (isLoading) {
    return (
      <Stack sx={{ minHeight: 400, alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <Stack spacing={3} sx={{ pb: 4 }}>
      {/* ─── Gradient Header ─── */}
      <Box sx={{
        p: 3, borderRadius: 3,
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
        border: "1px solid", borderColor: "rgba(99,102,241,0.3)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 2, position: "relative", overflow: "hidden",
      }}>
        <Box sx={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", bgcolor: "rgba(99,102,241,0.08)", pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -60, left: 200, width: 220, height: 220, borderRadius: "50%", bgcolor: "rgba(99,102,241,0.05)", pointerEvents: "none" }} />
        <Stack direction="row" spacing={2} sx={{ zIndex: 1, alignItems: "center" }}>
          <Avatar sx={{ bgcolor: "rgba(99,102,241,0.3)", width: 52, height: 52, border: "1px solid rgba(99,102,241,0.5)" }}>
            <SettingsOutlinedIcon sx={{ color: "#a5b4fc", fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#e0e7ff" }}>Cài đặt hệ thống</Typography>
            <Typography variant="body2" sx={{ color: "rgba(199,210,254,0.7)", mt: 0.3 }}>
              {totalConfigs > 0
                ? `${totalConfigs} cấu hình · ${CATEGORIES.length} nhóm${changedCount > 0 ? ` · ${changedCount} thay đổi chưa lưu` : ""}`
                : "Quản lý cấu hình vận hành thư viện"}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ zIndex: 1 }}>
          <IconButton onClick={load} size="small" sx={{ color: "#a5b4fc", border: "1px solid rgba(165,180,252,0.3)", "&:hover": { bgcolor: "rgba(165,180,252,0.1)" } }}>
            <RefreshOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {/* ─── Error Banner ─── */}
      {error && (
        <Alert
          severity="error"
          sx={{ borderRadius: 2, fontWeight: 600 }}
          action={<Button size="small" onClick={load} sx={{ fontWeight: 700 }}>Thử lại</Button>}
        >
          {error}
        </Alert>
      )}

      {/* ─── Category Summary Chips ─── */}
      {settings && !error && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          {CATEGORIES.map((cat) => {
            const count = settings[cat]?.length || 0;
            const catMod = modified[cat] ? Object.keys(modified[cat]).length : 0;
            const meta = CATEGORY_META[cat];
            return (
              <Chip
                key={cat}
                icon={meta.icon}
                label={`${meta.label} (${count}${catMod ? `, ${catMod} đã sửa` : ""})`}
                variant={tab === CATEGORIES.indexOf(cat) ? "filled" : "outlined"}
                onClick={() => setTab(CATEGORIES.indexOf(cat))}
                sx={{
                  borderRadius: 2,
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  ...(tab === CATEGORIES.indexOf(cat)
                    ? { bgcolor: alpha(meta.color, 0.12), color: meta.color, borderColor: meta.color }
                    : {}),
                  transition: "all 0.15s",
                  "&:hover": { bgcolor: alpha(meta.color, 0.08) },
                }}
              />
            );
          })}
        </Stack>
      )}

      {/* ─── Tabs ─── */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2, pt: 0.5,
            minHeight: 52,
            "& .MuiTab-root": {
              textTransform: "none", fontWeight: 700, fontSize: "0.85rem",
              minHeight: 52, py: 1,
              flexDirection: "row", gap: 1,
            },
            "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0" },
          }}
        >
          {CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            const catMod = modified[cat] ? Object.keys(modified[cat]).length : 0;
            return (
              <Tab
                key={cat}
                icon={<Box sx={{ fontSize: "1.1rem", display: "flex" }}>{meta.icon}</Box>}
                iconPosition="start"
                label={
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                    <span>{meta.label}</span>
                    {catMod > 0 && (
                      <Chip
                        label={catMod}
                        size="small"
                        sx={{
                          height: 18, minWidth: 18, fontSize: "0.65rem", fontWeight: 800,
                          borderRadius: "9px", color: "#fff", bgcolor: meta.color,
                        }}
                      />
                    )}
                  </Stack>
                }
              />
            );
          })}
        </Tabs>
      </Paper>

      {/* ─── Content ─── */}
      {loading ? (
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
          <Stack spacing={3}>
            {[1, 2, 3, 4].map((i) => (
              <Box key={i}>
                <Skeleton variant="text" width="30%" height={20} />
                <Skeleton variant="rounded" height={40} sx={{ borderRadius: 2, mt: 0.5 }} />
              </Box>
            ))}
          </Stack>
        </Paper>
      ) : entries.length === 0 ? (
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 6 }}>
          <Stack sx={{ alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: "action.hover", display: "grid", placeItems: "center", color: "text.disabled" }}>
              <SearchOffOutlinedIcon fontSize="large" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Chưa có cài đặt</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, textAlign: "center" }}>
              Chưa có cài đặt nào cho nhóm &ldquo;{currentCategory && CATEGORY_META[currentCategory]?.label}&rdquo;.
            </Typography>
            <Button size="small" onClick={load} sx={{ borderRadius: 2, fontWeight: 600 }}>Tải lại</Button>
          </Stack>
        </Paper>
      ) : (
        CATEGORIES.map((cat, idx) => {
          const meta = CATEGORY_META[cat];
          return (
            <TabPanel key={cat} value={tab} index={idx}>
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
                {/* Category gradient accent bar */}
                <Box sx={{ height: 4, background: meta.gradient }} />

                <Box sx={{ p: 3 }}>
                  <Stack spacing={3}>
                    {entries.map((entry, ei) => (
                      <Box key={entry.id} sx={staggerSx(ei, 0.04)}>
                        {renderField(entry, getCurrentValue(entry), handleFieldChange)}
                      </Box>
                    ))}

                    <Divider sx={{ borderStyle: "dashed" }} />

                    {/* Action buttons */}
                    <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
                      {cat === "smtp" && (
                        <Button
                          variant="outlined"
                          startIcon={<EmailOutlinedIcon />}
                          onClick={() => setTestEmailOpen(true)}
                          sx={{ borderRadius: 2, fontWeight: 600 }}
                        >
                          Gửi email test
                        </Button>
                      )}
                      <Button
                        variant="outlined"
                        color="inherit"
                        startIcon={<RestartAltOutlinedIcon />}
                        disabled={!hasChanges}
                        onClick={handleReset}
                        sx={{ borderRadius: 2, fontWeight: 600 }}
                      >
                        Hoàn tác
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <SaveOutlinedIcon />}
                        disabled={!hasChanges || saving}
                        onClick={handleSave}
                        sx={{
                          borderRadius: 2, fontWeight: 700, minWidth: 140,
                          background: meta.gradient,
                          boxShadow: `0 4px 14px ${alpha(meta.color, 0.4)}`,
                          "&:hover": { opacity: 0.9 },
                          "&.Mui-disabled": { bgcolor: "action.disabledBackground" },
                        }}
                      >
                        {saving ? "Đang lưu..." : "Lưu thay đổi"}
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              </Paper>
            </TabPanel>
          );
        })
      )}

      {/* ─── Test Email Dialog ─── */}
      <Dialog open={testEmailOpen} onClose={() => setTestEmailOpen(false)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
          <EmailOutlinedIcon sx={{ color: CATEGORY_META.smtp.color }} />
          Gửi email test
          <IconButton onClick={() => setTestEmailOpen(false)} size="small" sx={{ position: "absolute", right: 16, top: 16 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Địa chỉ email nhận"
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            sx={{ mt: 1, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setTestEmailOpen(false)} sx={{ borderRadius: 2 }}>Hủy</Button>
          <Button
            variant="contained"
            disabled={!testEmail || testEmailSending}
            onClick={handleTestEmail}
            sx={{ borderRadius: 2, fontWeight: 700, bgcolor: CATEGORY_META.smtp.color, "&:hover": { bgcolor: "#1d4ed8" } }}
          >
            {testEmailSending ? "Đang gửi..." : "Gửi"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Save Feedback ─── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          icon={snackbar.severity === "success" ? <CheckCircleOutlineOutlinedIcon fontSize="small" /> : <ErrorOutlineOutlinedIcon fontSize="small" />}
          severity={snackbar.severity}
          sx={{ borderRadius: 2, fontWeight: 600, boxShadow: 4 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
