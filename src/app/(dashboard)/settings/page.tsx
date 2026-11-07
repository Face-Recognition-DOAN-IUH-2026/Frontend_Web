"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { useToast } from "@/lib/toast-context";
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
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import api, { getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import type { SystemConfigEntry } from "@/lib/types";

const CATEGORIES = ["borrow", "fine", "smtp", "automation", "access"] as const;

interface CategoryMetaItem {
  label: string;
  sublabel: string;
  icon: React.ReactElement;
  color: string;
  gradient: string;
}

const CATEGORY_META: Record<string, CategoryMetaItem> = {
  borrow: {
    label: "Mượn trả",
    sublabel: "Chính sách thời hạn & định mức mượn sách",
    icon: <MenuBookOutlinedIcon />,
    color: "#8B0000",
    gradient: "linear-gradient(135deg, #8B0000 0%, #A00000 100%)",
  },
  fine: {
    label: "Phí phạt & Bồi thường",
    sublabel: "Biểu phí trễ hạn, hư hỏng và mất tài liệu",
    icon: <MonetizationOnOutlinedIcon />,
    color: "#DC2626",
    gradient: "linear-gradient(135deg, #DC2626 0%, #EA580C 100%)",
  },
  smtp: {
    label: "Máy chủ Email",
    sublabel: "Cấu hình gửi email thông báo tự động (SMTP)",
    icon: <EmailOutlinedIcon />,
    color: "#0A2540",
    gradient: "linear-gradient(135deg, #0A2540 0%, #1E3A8A 100%)",
  },
  automation: {
    label: "Tác vụ tự động",
    sublabel: "Lịch quét quá hạn, nhắc gia hạn và dọn dẹp hệ thống",
    icon: <ScheduleOutlinedIcon />,
    color: "#059669",
    gradient: "linear-gradient(135deg, #059669 0%, #10B981 100%)",
  },
  access: {
    label: "Kiểm soát ra vào",
    sublabel: "Quy định thời gian lưu trú và cổng thư viện",
    icon: <MeetingRoomOutlinedIcon />,
    color: "#D97706",
    gradient: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)",
  },
} as const;

type TabCategory = (typeof CATEGORIES)[number];

/** Tra cứu đơn vị đo lường phù hợp theo từng config_key */
function getFieldAdornment(configKey: string): string | null {
  if (configKey.includes("days") || configKey.endsWith("_before")) return "ngày";
  if (configKey.includes("books")) return "cuốn";
  if (configKey.includes("renewals")) return "lần";
  if (configKey.includes("hours")) return "giờ";
  if (configKey.includes("per_day") || configKey.includes("price") || configKey.includes("fixed")) return "VNĐ";
  if (configKey.includes("pct")) return "%";
  if (configKey === "port") return "Port";
  return null;
}

/** Render các trường đặc thù */
function renderField(
  entry: SystemConfigEntry,
  value: any,
  onChange: (key: string, val: any) => void,
) {
  const label = entry.label;
  const desc = entry.description;
  const unit = getFieldAdornment(entry.config_key);

  // 1. Trường Boolean (Switch Tile phong cách cao cấp)
  if (typeof value === "boolean") {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          px: 2.5,
          borderRadius: 3,
          border: "1px solid",
          borderColor: value ? alpha("#10B981", 0.4) : "divider",
          bgcolor: value ? alpha("#10B981", 0.04) : "background.paper",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "all 0.2s ease",
          "&:hover": { borderColor: "primary.main" },
        }}
      >
        <Box sx={{ pr: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
              {label}
            </Typography>
            <Chip
              size="small"
              label={value ? "Đang bật" : "Đang tắt"}
              sx={{
                height: 20,
                fontSize: "0.7rem",
                fontWeight: 700,
                bgcolor: value ? alpha("#10B981", 0.15) : alpha("#64748B", 0.15),
                color: value ? "#059669" : "#64748B",
              }}
            />
          </Stack>
          {desc && (
            <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
              {desc}
            </Typography>
          )}
        </Box>
        <Switch
          checked={value}
          onChange={(e) => onChange(entry.config_key, e.target.checked)}
          sx={{
            "& .MuiSwitch-switchBase.Mui-checked": {
              color: "#10B981",
              "& + .MuiSwitch-track": { bgcolor: "#10B981" },
            },
          }}
        />
      </Paper>
    );
  }

  // 2. Bảng biểu phí theo bậc (EditableTable)
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

  // 3. Mảng chuỗi (danh sách vai trò được thông báo notify_roles)
  if (Array.isArray(value)) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary", mb: 0.5 }}>
          {label}
        </Typography>
        {desc && (
          <Typography variant="caption" sx={{ color: "text.secondary", mb: 1.5, display: "block" }}>
            {desc}
          </Typography>
        )}
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
          {(value as string[]).map((v, i) => (
            <Chip
              key={i}
              label={v === "admin" ? "Quản trị viên (admin)" : v === "staff" ? "Thủ thư (staff)" : v}
              size="medium"
              sx={{
                borderRadius: 2,
                fontWeight: 700,
                bgcolor: alpha("#8B0000", 0.08),
                color: "#8B0000",
                border: "1px solid",
                borderColor: alpha("#8B0000", 0.2),
              }}
            />
          ))}
        </Stack>
      </Paper>
    );
  }

  // 4. Object phân loại mức hư hại (damage_fee_pct / damage_fee_fixed)
  if (value !== null && typeof value === "object") {
    const KEY_LABELS: Record<string, { label: string; desc: string; color: string }> = {
      minor: { label: "Hư nhẹ", desc: "Rách trang nhỏ, gấp bìa, bẩn nhẹ", color: "#F59E0B" },
      major: { label: "Hư nặng", desc: "Mất trang, ướt nước, gãy bìa nghiêm trọng", color: "#EF4444" },
      lost: { label: "Mất sách", desc: "Không thể thu hồi hoặc mất hoàn toàn", color: "#8B0000" },
    };

    const isPct = entry.config_key.includes("pct");

    return (
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary", mb: 0.5 }}>
          {label}
        </Typography>
        {desc && (
          <Typography variant="caption" sx={{ color: "text.secondary", mb: 2, display: "block" }}>
            {desc}
          </Typography>
        )}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
            gap: 2,
          }}
        >
          {Object.entries(value as Record<string, any>).map(([k, v]) => {
            const meta = KEY_LABELS[k] || { label: k, desc: "", color: "#64748B" };
            return (
              <Paper
                key={k}
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: alpha(meta.color, 0.04),
                  border: "1px solid",
                  borderColor: alpha(meta.color, 0.2),
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: meta.color, mb: 0.5 }}>
                  {meta.label}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5, minHeight: 32 }}>
                  {meta.desc}
                </Typography>
                <TextField
                  type="number"
                  size="small"
                  fullWidth
                  value={v ?? ""}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                            {isPct ? "%" : "VNĐ"}
                          </Typography>
                        </InputAdornment>
                      ),
                    },
                  }}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onChange(entry.config_key, {
                      ...(value as Record<string, any>),
                      [k]: raw === "" ? 0 : Math.max(0, Number(raw)),
                    });
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      bgcolor: "background.paper",
                      fontWeight: 700,
                    },
                  }}
                />
              </Paper>
            );
          })}
        </Box>
      </Paper>
    );
  }

  // 5. Trường Mật khẩu hoặc Trường nhập văn bản / số thông thường
  const isPassword = entry.config_key === "pass" || entry.config_key === "password" || entry.is_encrypted;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
          {label}
        </Typography>
        {desc && (
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.3 }}>
            {desc}
          </Typography>
        )}
      </Box>

      <PasswordField
        value={value ?? ""}
        isPassword={isPassword}
        type={typeof entry.config_value === "number" ? "number" : "text"}
        unit={unit}
        onChange={(e) => {
          const raw = e.target.value;
          const originalIsNum = typeof entry.config_value === "number";
          onChange(entry.config_key, originalIsNum ? (raw === "" ? 0 : Number(raw)) : raw);
        }}
      />
    </Paper>
  );
}

/** Component nhập Password / Text có Adornment và nút sao chép / ẩn hiện */
function PasswordField({
  value,
  isPassword,
  type,
  unit,
  onChange,
}: {
  value: any;
  isPassword: boolean;
  type: string;
  unit: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [show, setShow] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    if (value && typeof value === "string") {
      navigator.clipboard.writeText(value);
      toast.success("Đã sao chép vào bộ nhớ đệm!");
    }
  };

  return (
    <TextField
      fullWidth
      type={isPassword && !show ? "password" : type === "number" ? "number" : "text"}
      value={value}
      onChange={onChange}
      size="small"
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                {unit && (
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      color: "text.secondary",
                      px: 0.8,
                      py: 0.2,
                      borderRadius: 1,
                      bgcolor: "action.hover",
                    }}
                  >
                    {unit}
                  </Typography>
                )}
                {isPassword && (
                  <>
                    <IconButton size="small" onClick={() => setShow((s) => !s)} edge="end" title={show ? "Ẩn" : "Hiện"}>
                      {show ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                    </IconButton>
                    {value && value !== "••••••••" && (
                      <IconButton size="small" onClick={handleCopy} edge="end" title="Sao chép">
                        <ContentCopyOutlinedIcon fontSize="small" />
                      </IconButton>
                    )}
                  </>
                )}
              </Stack>
            </InputAdornment>
          ),
        },
      }}
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: 2,
          fontSize: "0.95rem",
          fontWeight: 600,
        },
      }}
    />
  );
}

/** Bảng biểu phí phạt theo bậc thang */
function EditableTable({
  label,
  description,
  rows,
  onChange,
}: {
  label: string;
  description?: string | null;
  rows: Record<string, any>[];
  onChange: (rows: Record<string, any>[]) => void;
}) {
  const theme = useTheme();

  const KEY_ORDER = ["from", "to", "amount", "bracket"];
  const keys = (rows.length > 0 ? Object.keys(rows[0]) : []).sort((a, b) => {
    const ia = KEY_ORDER.indexOf(a);
    const ib = KEY_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const COLUMN_LABELS: Record<string, string> = {
    from: "Từ ngày",
    to: "Đến ngày (để trống = ∞)",
    amount: "Mức phạt",
    bracket: "Bậc phạt",
  };

  const updateCell = (rowIdx: number, colKey: string, val: any) => {
    const next = rows.map((r, i) => (i === rowIdx ? { ...r, [colKey]: val } : r));
    onChange(next);
  };

  const deleteRow = (rowIdx: number) => {
    onChange(rows.filter((_, i) => i !== rowIdx));
  };

  const addRow = () => {
    const lastRow = rows.length > 0 ? rows[rows.length - 1] : null;
    const nextFrom = lastRow && lastRow.to ? Number(lastRow.to) + 1 : rows.length * 7 + 1;
    const template: Record<string, any> = {
      from: nextFrom,
      to: null,
      amount: 50000,
    };
    onChange([...rows, template]);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
          {label}
        </Typography>
        {description && (
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.3 }}>
            {description}
          </Typography>
        )}
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha("#8B0000", 0.05) }}>
              <TableCell sx={{ fontWeight: 800, width: 70, color: "#8B0000" }}>Bậc</TableCell>
              {keys.map((k) => (
                <TableCell key={k} sx={{ fontWeight: 800, color: "text.primary" }}>
                  {COLUMN_LABELS[k] || k}
                </TableCell>
              ))}
              <TableCell align="right" sx={{ fontWeight: 800, width: 60 }}>
                Xóa
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, ri) => (
              <TableRow key={ri} hover sx={{ "&:last-child td": { border: 0 } }}>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>
                  #{ri + 1}
                </TableCell>
                {keys.map((k) => (
                  <TableCell key={k} sx={{ py: 1, px: 1 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={row[k] ?? ""}
                      placeholder={k === "to" && row[k] == null ? "Vô cực (∞)" : undefined}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.disabled" }}>
                                {k === "amount" ? "VNĐ" : "ngày"}
                              </Typography>
                            </InputAdornment>
                          ),
                        },
                      }}
                      onChange={(e) => updateCell(ri, k, e.target.value === "" ? null : Number(e.target.value))}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          bgcolor: "background.paper",
                          fontWeight: 700,
                        },
                      }}
                    />
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ py: 1, px: 1 }}>
                  <Tooltip title="Xóa bậc phạt này">
                    <IconButton size="small" color="error" onClick={() => deleteRow(ri)}>
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
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
        sx={{
          mt: 2,
          borderRadius: 2,
          fontWeight: 700,
          color: "#8B0000",
          "&:hover": { bgcolor: alpha("#8B0000", 0.08) },
        }}
      >
        Thêm bậc phạt mới
      </Button>
    </Paper>
  );
}

export default function SettingsPage() {
  const theme = useTheme();
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState<Record<string, SystemConfigEntry[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [modified, setModified] = useState<Record<string, Record<string, any>>>({});
  const [searchQuery, setSearchQuery] = useState("");

  // Test Email state
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

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [load, user?.role]);

  const currentCategory = CATEGORIES[tab] as TabCategory | undefined;
  const rawEntries = currentCategory && settings ? settings[currentCategory] || [] : [];

  // Lọc theo từ khóa tìm kiếm (Search Filter)
  const entries = useMemo(() => {
    if (!searchQuery.trim()) return rawEntries;
    const q = searchQuery.toLowerCase().trim();
    return rawEntries.filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        e.config_key.toLowerCase().includes(q)
    );
  }, [rawEntries, searchQuery]);

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

  const hasChanges =
    currentCategory && modified[currentCategory] && Object.keys(modified[currentCategory]).length > 0;
  const currentModifiedCount =
    currentCategory && modified[currentCategory] ? Object.keys(modified[currentCategory]).length : 0;

  const handleSave = async () => {
    if (!currentCategory || !hasChanges) return;
    const values = modified[currentCategory]!;

    // Validation riêng cho bảng biểu phí
    if (currentCategory === "fine" && values.fine_brackets !== undefined) {
      const rows = values.fine_brackets as Array<Record<string, any>>;
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i] || {};
        const from = row.from === "" || row.from == null ? null : Number(row.from);
        const to = row.to === "" || row.to == null ? null : Number(row.to);
        const amount = row.amount === "" || row.amount == null ? null : Number(row.amount);

        if (from == null || !Number.isFinite(from) || from < 1) {
          toast.error(`Bậc ${i + 1}: "Từ ngày" phải là số từ 1 trở lên.`);
          return;
        }
        if (amount == null || !Number.isFinite(amount) || amount < 0) {
          toast.error(`Bậc ${i + 1}: "Số tiền" phải là số từ 0 trở lên.`);
          return;
        }
        if (to !== null && (!Number.isFinite(to) || to < from)) {
          toast.error(`Bậc ${i + 1}: "Đến ngày" phải để trống (∞) hoặc từ ${from} trở lên.`);
          return;
        }
      }
    }

    try {
      setSaving(true);
      await api.updateAdminSettings(currentCategory, values);
      setModified((prev) => {
        const next = { ...prev };
        delete next[currentCategory];
        return next;
      });
      load();
      toast.success(`Đã lưu cấu hình danh mục "${CATEGORY_META[currentCategory].label}" thành công.`);
    } catch (err: any) {
      const msg = getErrorMessage(err) || "Lưu cài đặt thất bại.";
      toast.error(msg);
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
    toast.info("Đã hoàn tác các thay đổi chưa lưu trong danh mục này.");
  };

  const handleTestEmail = async () => {
    if (!testEmail || !settings?.smtp) return;
    const passEntry = settings.smtp.find((e) => e.config_key === "pass" || e.config_key === "password");
    const passValue = passEntry ? getCurrentValue(passEntry) : "";

    if (!passValue || /^•+$/.test(String(passValue))) {
      toast.error("Vui lòng nhập mật khẩu SMTP mới trước khi gửi email test.");
      return;
    }

    try {
      setTestEmailSending(true);
      const smtpConfig: Record<string, any> = {};
      settings.smtp.forEach((e) => {
        smtpConfig[e.config_key] = getCurrentValue(e);
      });
      const res = await api.testSmtpConfig({ to: testEmail, ...smtpConfig } as any);
      if (res.success) {
        toast.success("Gửi email test thành công!");
      } else {
        toast.error(res.message || "Gửi email test thất bại.");
      }
      setTestEmailOpen(false);
    } catch (err: any) {
      const msg = getErrorMessage(err) || "Gửi email test thất bại.";
      toast.error(msg);
    } finally {
      setTestEmailSending(false);
    }
  };

  const totalConfigs = settings ? Object.values(settings).reduce((sum, arr) => sum + arr.length, 0) : 0;
  const totalChangedCount = Object.values(modified).reduce((sum, m) => sum + Object.keys(m).length, 0);

  if (isLoading) {
    return (
      <Stack sx={{ minHeight: 400, alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={32} sx={{ color: "#8B0000" }} />
      </Stack>
    );
  }

  if (!isAuthenticated) return null;

  if (user?.role !== "admin") {
    return (
      <Stack spacing={3} sx={{ pb: 6, maxWidth: 800, mx: "auto" }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3.5,
            p: 6,
            border: "1px solid",
            borderColor: "divider",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: alpha("#8B0000", 0.08),
              color: "#8B0000",
              display: "grid",
              placeItems: "center",
              mx: "auto",
              mb: 2,
            }}
          >
            <ShieldOutlinedIcon sx={{ fontSize: 36 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 900, color: "#0A2540", mb: 1 }}>
            Giới hạn quyền quản trị
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440, mx: "auto", mb: 3 }}>
            Chức năng cấu hình hệ thống chỉ dành riêng cho tài khoản Quản trị viên (Admin). Vui lòng liên hệ bộ phận kỹ thuật IUH để được cấp quyền.
          </Typography>
          <Button
            variant="contained"
            onClick={() => router.push("/dashboard")}
            sx={{
              borderRadius: 2,
              fontWeight: 800,
              background: "linear-gradient(135deg, #8B0000 0%, #A00000 100%)",
            }}
          >
            Quay lại Bảng điều khiển
          </Button>
        </Paper>
      </Stack>
    );
  }

  const currentMeta = currentCategory ? CATEGORY_META[currentCategory] : null;

  return (
    <Stack spacing={3} sx={{ maxWidth: 1200, mx: "auto", pb: 10 }}>
      {/* 1. Header chuẩn nhận diện IUH */}
      <Box sx={staggerSx(0)}>
        <PageHeader
          title="Cấu hình hệ thống"
          subtitle="Quản lý chính sách mượn trả, biểu phí phạt, máy chủ email thông báo và các tác vụ nền tự động."
          icon={SettingsOutlinedIcon}
          actions={
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}>
              <Chip
                icon={<TuneOutlinedIcon sx={{ fontSize: "16px !important" }} />}
                label={`${totalConfigs} tham số`}
                size="small"
                sx={{
                  bgcolor: alpha("#0A2540", 0.08),
                  color: "#0A2540",
                  fontWeight: 700,
                  borderRadius: "8px",
                }}
              />
              <Chip
                label={`${CATEGORIES.length} nhóm nghiệp vụ`}
                size="small"
                variant="outlined"
                sx={{ borderRadius: "8px", fontWeight: 600 }}
              />
              {totalChangedCount > 0 && (
                <Chip
                  icon={<WarningAmberOutlinedIcon sx={{ fontSize: "16px !important" }} />}
                  label={`${totalChangedCount} thay đổi chưa lưu`}
                  size="small"
                  sx={{
                    bgcolor: alpha("#DC2626", 0.12),
                    color: "#DC2626",
                    fontWeight: 800,
                    borderRadius: "8px",
                  }}
                />
              )}
              <IconButton
                onClick={load}
                size="small"
                title="Làm mới cài đặt"
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                }}
              >
                <RefreshOutlinedIcon fontSize="small" />
              </IconButton>
            </Stack>
          }
        />
      </Box>

      {/* Thông báo lỗi nếu có */}
      {error && (
        <Alert
          severity="error"
          sx={{ borderRadius: 2.5 }}
          action={
            <Button size="small" onClick={load} sx={{ fontWeight: 700 }}>
              Thử lại
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* 2. Thanh Tabs Danh mục hiện đại */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3.5,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: 2, pb: 0, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => {
              setTab(v);
              setSearchQuery("");
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 52,
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 750,
                fontSize: "0.9rem",
                minHeight: 52,
                py: 1,
                px: 2,
                borderRadius: "10px 10px 0 0",
                transition: "all 0.2s",
                "&.Mui-selected": {
                  color: currentMeta?.color || "primary.main",
                },
              },
              "& .MuiTabs-indicator": {
                height: 3,
                borderRadius: "3px 3px 0 0",
                bgcolor: currentMeta?.color || "primary.main",
              },
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
                    <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
                      <span>{meta.label}</span>
                      {catMod > 0 && (
                        <Chip
                          label={catMod}
                          size="small"
                          sx={{
                            height: 18,
                            minWidth: 18,
                            fontSize: "0.65rem",
                            fontWeight: 800,
                            borderRadius: "9px",
                            color: "#fff",
                            bgcolor: meta.color,
                          }}
                        />
                      )}
                    </Stack>
                  }
                />
              );
            })}
          </Tabs>

          {/* Ô tìm kiếm nhanh cấu hình */}
          <TextField
            size="small"
            placeholder="Tìm kiếm tham số..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery("")}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{
              maxWidth: 260,
              mb: 1.5,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2.5,
                bgcolor: alpha(theme.palette.background.default, 0.7),
              },
            }}
          />
        </Box>

        {/* Thanh ruy băng nhận diện màu sắc theo từng danh mục */}
        <Box sx={{ height: 4, background: currentMeta?.gradient }} />
      </Paper>

      {/* 3. Banner tóm tắt danh mục đang chọn */}
      {currentMeta && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            px: 3,
            borderRadius: 3,
            border: "1px solid",
            borderColor: alpha(currentMeta.color, 0.2),
            background: `linear-gradient(135deg, ${alpha(currentMeta.color, 0.04)} 0%, ${alpha("#0A2540", 0.02)} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                bgcolor: alpha(currentMeta.color, 0.12),
                color: currentMeta.color,
                display: "grid",
                placeItems: "center",
              }}
            >
              {currentMeta.icon}
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0A2540" }}>
                {currentMeta.label}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {currentMeta.sublabel} • Hiển thị {entries.length} / {rawEntries.length} tham số
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            {currentCategory === "smtp" && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<EmailOutlinedIcon />}
                onClick={() => {
                  setTestEmail(user?.email || "admin@iuh.edu.vn");
                  setTestEmailOpen(true);
                }}
                sx={{
                  borderRadius: 2,
                  fontWeight: 700,
                  borderColor: currentMeta.color,
                  color: currentMeta.color,
                  "&:hover": { borderColor: currentMeta.color, bgcolor: alpha(currentMeta.color, 0.05) },
                }}
              >
                Gửi email test
              </Button>
            )}

            <Button
              variant="outlined"
              size="small"
              startIcon={<RestartAltOutlinedIcon />}
              disabled={!hasChanges}
              onClick={handleReset}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Hoàn tác
            </Button>

            <Button
              variant="contained"
              size="small"
              startIcon={saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <SaveOutlinedIcon />}
              disabled={!hasChanges || saving}
              onClick={handleSave}
              sx={{
                borderRadius: 2,
                fontWeight: 800,
                background: currentMeta.gradient,
                boxShadow: `0 4px 14px ${alpha(currentMeta.color, 0.3)}`,
                "&:hover": { opacity: 0.9 },
                "&.Mui-disabled": { bgcolor: "action.disabledBackground" },
              }}
            >
              {saving ? "Đang lưu..." : `Lưu thay đổi (${currentModifiedCount})`}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* 4. Nội dung Cấu hình */}
      {loading ? (
        <Paper elevation={0} sx={{ borderRadius: 3.5, p: 4, border: "1px solid", borderColor: "divider" }}>
          <Stack spacing={3}>
            {[1, 2, 3, 4].map((i) => (
              <Box key={i}>
                <Skeleton variant="text" width="25%" height={24} />
                <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2, mt: 1 }} />
              </Box>
            ))}
          </Stack>
        </Paper>
      ) : entries.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3.5,
            p: 6,
            border: "1px solid",
            borderColor: "divider",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              bgcolor: "action.hover",
              display: "grid",
              placeItems: "center",
              mx: "auto",
              mb: 2,
              color: "text.secondary",
            }}
          >
            <SearchOffOutlinedIcon fontSize="large" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#0A2540", mb: 0.5 }}>
            {searchQuery ? "Không tìm thấy tham số phù hợp" : "Chưa có cấu hình cho danh mục này"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: "auto", mb: 2 }}>
            {searchQuery
              ? `Không có tham số nào khớp với từ khóa "${searchQuery}". Hãy thử tìm kiếm từ khóa khác.`
              : `Hiện chưa có tham số nào được đăng ký trong danh mục "${currentMeta?.label}".`}
          </Typography>
          {searchQuery ? (
            <Button variant="outlined" onClick={() => setSearchQuery("")} sx={{ borderRadius: 2, fontWeight: 700 }}>
              Xóa bộ lọc tìm kiếm
            </Button>
          ) : (
            <Button variant="outlined" onClick={load} sx={{ borderRadius: 2, fontWeight: 700 }}>
              Tải lại danh sách
            </Button>
          )}
        </Paper>
      ) : (
        <Stack spacing={2.5} sx={staggerSx(1)}>
          {/* Cảnh báo logic mượn sách nếu có */}
          {currentCategory === "borrow" &&
            (() => {
              const findVal = (key: string) => {
                const e = rawEntries.find((x) => x.config_key === key);
                return e ? getCurrentValue(e) : undefined;
              };
              const total = Number(findVal("max_borrow_books"));
              const perSlip = Number(findVal("max_borrow_books_per_slip"));

              if (Number.isFinite(total) && Number.isFinite(perSlip) && perSlip > total) {
                return (
                  <Alert
                    severity="warning"
                    icon={<WarningAmberOutlinedIcon />}
                    sx={{ borderRadius: 2.5 }}
                  >
                    Số sách tối đa mỗi phiếu ({perSlip} cuốn) đang lớn hơn tổng số sách được mượn cùng lúc ({total} cuốn).
                    Vui lòng điều chỉnh để mỗi phiếu ≤ {total} cuốn nhằm đảm bảo tính logic khi phát hành phiếu mượn.
                  </Alert>
                );
              }
              return null;
            })()}

          {/* Render danh sách các trường cấu hình */}
          {entries.map((entry) => (
            <Box key={entry.id}>
              {renderField(entry, getCurrentValue(entry), handleFieldChange)}
            </Box>
          ))}
        </Stack>
      )}

      {/* 5. Thanh Thao tác Nổi (Sticky Floating Action Bar khi có thay đổi chưa lưu) */}
      {hasChanges && (
        <Paper
          elevation={6}
          sx={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            py: 1.5,
            px: 3,
            borderRadius: 4,
            background: "rgba(10, 37, 64, 0.92)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: 2.5,
            color: "#FFFFFF",
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: "#F59E0B",
                boxShadow: "0 0 8px #F59E0B",
              }}
            />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Bạn có <strong>{currentModifiedCount}</strong> thay đổi chưa lưu trong &ldquo;{currentMeta?.label}&rdquo;
            </Typography>
          </Stack>

          <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255, 255, 255, 0.2)" }} />

          <Stack direction="row" spacing={1}>
            <Button
              variant="text"
              size="small"
              onClick={handleReset}
              sx={{
                color: "rgba(255, 255, 255, 0.8)",
                fontWeight: 700,
                borderRadius: 2,
                "&:hover": { color: "#FFF", bgcolor: "rgba(255, 255, 255, 0.1)" },
              }}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={saving ? <CircularProgress size={14} sx={{ color: "#FFF" }} /> : <SaveOutlinedIcon />}
              disabled={saving}
              onClick={handleSave}
              sx={{
                borderRadius: 2,
                fontWeight: 800,
                bgcolor: "#8B0000",
                color: "#FFF",
                boxShadow: "0 4px 14px rgba(139, 0, 0, 0.4)",
                "&:hover": { bgcolor: "#A00000" },
              }}
            >
              {saving ? "Đang lưu..." : "Lưu ngay"}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* 6. Dialog Gửi Email Test */}
      <Dialog
        open={testEmailOpen}
        onClose={() => setTestEmailOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3.5,
              p: 1,
              border: "1px solid",
              borderColor: "divider",
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: alpha("#0A2540", 0.08),
                color: "#0A2540",
                display: "flex",
              }}
            >
              <EmailOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Gửi email kiểm tra SMTP
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Xác thực kết nối máy chủ gửi thư
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={() => setTestEmailOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2, lineHeight: 1.5 }}>
            Hệ thống sẽ gửi một thông điệp test chứa mã kiểm tra tới địa chỉ hộp thư bên dưới để xác nhận cổng kết nối và chứng chỉ TLS.
          </Typography>

          <TextField
            autoFocus
            fullWidth
            label="Địa chỉ email nhận test"
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="vd: thuthu@iuh.edu.vn"
            sx={{
              mb: 1.5,
              "& .MuiOutlinedInput-root": { borderRadius: 2.5, fontWeight: 600 },
            }}
          />

          {user?.email && user.email !== testEmail && (
            <Button
              size="small"
              variant="text"
              onClick={() => setTestEmail(user.email)}
              sx={{ fontSize: "0.78rem", fontWeight: 700 }}
            >
              Điền nhanh email của tôi ({user.email})
            </Button>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setTestEmailOpen(false)}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            disabled={!testEmail || testEmailSending}
            onClick={handleTestEmail}
            startIcon={testEmailSending ? <CircularProgress size={16} sx={{ color: "#FFF" }} /> : <SendOutlinedIcon />}
            sx={{
              borderRadius: 2,
              fontWeight: 800,
              background: "linear-gradient(135deg, #0A2540 0%, #1E3A8A 100%)",
              boxShadow: "0 4px 14px rgba(10, 37, 64, 0.25)",
            }}
          >
            {testEmailSending ? "Đang gửi email..." : "Gửi thư test"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
