"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fade,
  FormControl,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUploadOutlined";
import FileDownloadIcon from "@mui/icons-material/FileDownloadOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmberOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import TableViewOutlinedIcon from "@mui/icons-material/TableViewOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type {
  PatronImportErrorItem,
  PatronImportPreviewResponse,
  PatronImportPreviewRow,
  PatronImportResponse,
} from "@/lib/types";

interface PatronImportWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STEPS = ["Chọn file Excel", "Xem trước dữ liệu", "Báo cáo kết quả"];

const ERROR_LABELS: Record<string, string> = {
  missing_field: "Thiếu trường bắt buộc (MSSV hoặc Họ tên)",
  invalid_phone: "SĐT không hợp lệ (cần đúng 10 số, bắt đầu bằng 0)",
  invalid_email: "Email không đúng định dạng",
  duplicate_in_file: "Trùng lặp MSSV/Email/CCCD ngay trong file",
  duplicate_email: "Email này đã được dùng bởi tài khoản khác trong hệ thống",
  duplicate_identity: "Số CCCD đã tồn tại trong hệ thống",
  duplicate_student_code: "Mã sinh viên đã tồn tại trong hệ thống",
  card_conflict: "Mã thẻ THV-[MSSV] trùng với thẻ đã cấp cho người khác",
  create_failed: "Lỗi hệ thống khi tạo tài khoản",
  update_failed: "Lỗi hệ thống khi cập nhật thông tin",
};

export default function PatronImportWizard({
  open,
  onClose,
  onSuccess,
}: PatronImportWizardProps) {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview state
  const [previewData, setPreviewData] = useState<PatronImportPreviewResponse | null>(null);
  const [mode, setMode] = useState<"skip" | "update">("skip");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "exists" | "error">("all");

  // Pagination for Preview table
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Result state
  const [result, setResult] = useState<PatronImportResponse | null>(null);
  const [copiedErrors, setCopiedErrors] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setActiveStep(0);
    setFile(null);
    setPreviewData(null);
    setResult(null);
    setError(null);
    setLoading(false);
    setMode("skip");
    setSearchQuery("");
    setStatusFilter("all");
    setPage(0);
    setCopiedErrors(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await api.downloadPatronTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "patron_import_template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(getErrorMessage(err) || "Không thể tải file mẫu");
    }
  };

  const handleDownloadSample100 = () => {
    const a = document.createElement("a");
    a.href = "/patron_test_100.xlsx";
    a.download = "patron_test_100.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setError("Dung lượng file tối đa là 5MB");
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      if (dropped.size > 5 * 1024 * 1024) {
        setError("Dung lượng file tối đa là 5MB");
        return;
      }
      setFile(dropped);
      setError(null);
    }
  };

  const handleProceedToPreview = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.previewPatronImport(file);
      setPreviewData(res);
      setPage(0);
      setActiveStep(1);
    } catch (err) {
      setError(getErrorMessage(err) || "Lỗi đọc file Excel");
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.executePatronImport(file, mode);
      setResult(res);
      setActiveStep(2);
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err) || "Lỗi xử lý import");
    } finally {
      setLoading(false);
    }
  };

  // Filter & Search preview rows
  const filteredPreviewRows = useMemo(() => {
    if (!previewData?.preview) return [];
    let list = previewData.preview;

    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.student_code.toLowerCase().includes(q) ||
          r.full_name.toLowerCase().includes(q) ||
          (r.class_name && r.class_name.toLowerCase().includes(q)) ||
          r.email.toLowerCase().includes(q) ||
          (r.phone && r.phone.toLowerCase().includes(q)) ||
          (r.identity_number && r.identity_number.toLowerCase().includes(q))
      );
    }

    return list;
  }, [previewData, statusFilter, searchQuery]);

  const paginatedPreviewRows = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredPreviewRows.slice(start, start + rowsPerPage);
  }, [filteredPreviewRows, page, rowsPerPage]);

  const handleCopyErrors = () => {
    if (!result?.errors || result.errors.length === 0) return;
    const text = result.errors
      .map(
        (e) =>
          `Dòng ${e.row} [${e.student_code || "N/A"}]: ${
            ERROR_LABELS[e.code] || e.message
          }`
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopiedErrors(true);
    setTimeout(() => setCopiedErrors(false), 2500);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3.5,
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: theme.palette.mode === "dark"
              ? "0 24px 48px rgba(0,0,0,0.7)"
              : "0 24px 48px rgba(10,37,64,0.18)",
            border: `1px solid ${theme.palette.divider}`,
          },
        },
      }}
    >
      {/* DIALOG HEADER */}
      <DialogTitle
        component="div"
        sx={{
          m: 0,
          px: 3,
          py: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${theme.palette.divider}`,
          background: theme.palette.mode === "dark"
            ? "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)"
            : "linear-gradient(135deg, rgba(139,0,0,0.04) 0%, rgba(10,37,64,0.03) 100%)",
        }}
      >
        <Stack direction="row" spacing={1.75} sx={{ alignItems: "center" }}>
          <Avatar
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: "primary.main",
              width: 44,
              height: 44,
              borderRadius: 2.5,
            }}
          >
            <TableViewOutlinedIcon sx={{ fontSize: 26 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Import Độc Giả Hàng Loạt Bằng Excel
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tải danh sách sinh viên đầu khóa vào hệ thống và khởi tạo tài khoản tự động
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={handleClose} size="small" aria-label="close" sx={{ color: "text.secondary" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* STEPPER BAR */}
      <Box
        sx={{
          px: 4,
          py: 1.75,
          bgcolor: theme.palette.mode === "dark" ? "background.default" : alpha(theme.palette.grey[100], 0.7),
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stepper activeStep={activeStep}>
          {STEPS.map((label, idx) => (
            <Step key={label} completed={activeStep > idx}>
              <StepLabel
                slotProps={{
                  stepIcon: {
                    sx: {
                      "&.Mui-active": { color: "primary.main" },
                      "&.Mui-completed": { color: "success.main" },
                    },
                  },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: activeStep === idx ? 700 : 500 }}>
                  {label}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* CONTENT AREA */}
      <DialogContent sx={{ p: 3, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* ── STEP 0: CHỌN FILE ──────────────────────────────────────────────── */}
        {activeStep === 0 && (
          <Fade in timeout={300}>
            <Stack spacing={3}>
              {/* Dropzone */}
              <Box
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  border: "2px dashed",
                  borderColor: file ? "primary.main" : "divider",
                  borderRadius: 3.5,
                  p: { xs: 4, md: 5 },
                  textAlign: "center",
                  bgcolor: file
                    ? alpha(theme.palette.primary.main, 0.04)
                    : theme.palette.mode === "dark"
                    ? "background.paper"
                    : "#fafbfc",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                    transform: "translateY(-1px)",
                  },
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx,.xls"
                  style={{ display: "none" }}
                />
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    mx: "auto",
                    mb: 1.75,
                    bgcolor: file ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.grey[500], 0.1),
                    color: file ? "primary.main" : "text.secondary",
                  }}
                >
                  <CloudUploadIcon sx={{ fontSize: 36 }} />
                </Avatar>

                {file ? (
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {file.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Dung lượng: {(file.size / 1024).toFixed(1)} KB — Bấm vào đây nếu muốn chọn file khác
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Kéo thả file Excel vào đây hoặc bấm để chọn file
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Hỗ trợ định dạng chuẩn <b>.xlsx, .xls</b> (Tối đa 2000 dòng, dung lượng file ≤ 5MB)
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Action Downloads */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: "center" }}>
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="outlined"
                    startIcon={<FileDownloadIcon />}
                    onClick={handleDownloadTemplate}
                    sx={{ borderRadius: 2, fontWeight: 600, textTransform: "none" }}
                  >
                    Tải file Excel mẫu (.xlsx)
                  </Button>
                  <Button
                    variant="text"
                    color="secondary"
                    startIcon={<InsertDriveFileOutlinedIcon />}
                    onClick={handleDownloadSample100}
                    sx={{ borderRadius: 2, fontWeight: 600, textTransform: "none" }}
                  >
                    Tải file test mẫu (100 độc giả)
                  </Button>
                </Stack>

                {file && (
                  <Chip
                    icon={<InsertDriveFileOutlinedIcon />}
                    label={`${file.name} (${(file.size / 1024).toFixed(1)} KB)`}
                    color="primary"
                    variant="outlined"
                    onDelete={() => setFile(null)}
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Stack>

              {/* Supported Columns Guide */}
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: theme.palette.mode === "dark" ? "background.paper" : "#fcfcfd",
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                  <InfoOutlinedIcon fontSize="small" color="primary" /> Cấu trúc các cột trong file Excel:
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  <Chip size="small" label="Mã sinh viên *" color="primary" variant="filled" sx={{ fontWeight: 700 }} />
                  <Chip size="small" label="Họ và tên *" color="primary" variant="filled" sx={{ fontWeight: 700 }} />
                  <Chip size="small" label="Lớp" variant="outlined" />
                  <Chip size="small" label="Khóa học / Niên khóa" variant="outlined" />
                  <Chip size="small" label="Email (Tùy chọn)" variant="outlined" />
                  <Chip size="small" label="Số điện thoại (10 số)" variant="outlined" />
                  <Chip size="small" label="CCCD/CMND" variant="outlined" />
                  <Chip size="small" label="Hạn thẻ (YYYY-MM-DD)" variant="outlined" />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
                  * Cột có dấu sao bắt buộc phải có dữ liệu. Email để trống sẽ tự động cấp theo định dạng <code>[mssv]@library.local</code>.
                </Typography>
              </Paper>

              {/* Policy Alert */}
              <Alert severity="info" sx={{ borderRadius: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Chính sách tài khoản sinh viên được tạo tự động:
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                  • <b>Mật khẩu mặc định:</b> Cấp mã mặc định <b>11111111</b>. Độc giả bắt buộc phải đổi mật khẩu ở lần đăng nhập đầu tiên.
                  <br />
                  • <b>Mã thẻ thư viện:</b> Tự động sinh tiền tố chuẩn <b>THV-[MSSV]</b> với trạng thái hoạt động ngay lập tức.
                </Typography>
              </Alert>
            </Stack>
          </Fade>
        )}

        {/* ── STEP 1: XEM TRƯỚC & THẨM ĐỊNH (REVIEW KHI IMPORT) ─────────────────── */}
        {activeStep === 1 && previewData && (
          <Fade in timeout={300}>
            <Stack spacing={2.5}>
              {/* 4 KPI METRIC CARDS */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr 1fr", md: "1.2fr 1fr 1fr 1fr" },
                  gap: 1.75,
                }}
              >
                {/* Total */}
                <Card
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: theme.palette.mode === "dark" ? "background.paper" : "#f8fafc",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    TỔNG SỐ DÒNG
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.25 }}>
                    {previewData.total_rows}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Đã đọc từ file
                  </Typography>
                </Card>

                {/* New */}
                <Card
                  variant="outlined"
                  onClick={() => setStatusFilter(statusFilter === "new" ? "all" : "new")}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    cursor: "pointer",
                    borderColor: statusFilter === "new" ? "success.main" : "divider",
                    bgcolor: alpha(theme.palette.success.main, 0.06),
                    transition: "all 0.2s",
                    "&:hover": { borderColor: "success.main" },
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "success.dark", fontWeight: 700 }}>
                      BẢN GHI MỚI
                    </Typography>
                    <CheckCircleRoundedIcon color="success" sx={{ fontSize: 18 }} />
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: "success.main", mt: 0.25 }}>
                    {previewData.summary.new}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "success.dark" }}>
                    Sẵn sàng tạo mới
                  </Typography>
                </Card>

                {/* Exists */}
                <Card
                  variant="outlined"
                  onClick={() => setStatusFilter(statusFilter === "exists" ? "all" : "exists")}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    cursor: "pointer",
                    borderColor: statusFilter === "exists" ? "warning.main" : "divider",
                    bgcolor: alpha(theme.palette.warning.main, 0.08),
                    transition: "all 0.2s",
                    "&:hover": { borderColor: "warning.main" },
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "warning.dark", fontWeight: 700 }}>
                      BẢN GHI ĐÃ CÓ
                    </Typography>
                    <WarningAmberIcon color="warning" sx={{ fontSize: 18 }} />
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: "warning.main", mt: 0.25 }}>
                    {previewData.summary.exists}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "warning.dark" }}>
                    Đã có MSSV trong DB
                  </Typography>
                </Card>

                {/* Error */}
                <Card
                  variant="outlined"
                  onClick={() => setStatusFilter(statusFilter === "error" ? "all" : "error")}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    cursor: "pointer",
                    borderColor: statusFilter === "error" ? "error.main" : "divider",
                    bgcolor: alpha(theme.palette.error.main, 0.06),
                    transition: "all 0.2s",
                    "&:hover": { borderColor: "error.main" },
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "error.dark", fontWeight: 700 }}>
                      BẢN GHI LỖI
                    </Typography>
                    <ErrorOutlineIcon color="error" sx={{ fontSize: 18 }} />
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: "error.main", mt: 0.25 }}>
                    {previewData.summary.error}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "error.dark" }}>
                    Sẽ được tự động bỏ qua
                  </Typography>
                </Card>
              </Box>

              {/* STRATEGY SELECTOR CARDS */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Chiến lược xử lý khi sinh viên đã tồn tại:
                </Typography>
                <RadioGroup row value={mode} onChange={(e) => setMode(e.target.value as "skip" | "update")}>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, width: "100%" }}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: 2.5,
                        borderColor: mode === "skip" ? "primary.main" : "divider",
                        bgcolor: mode === "skip" ? alpha(theme.palette.primary.main, 0.04) : "background.paper",
                        transition: "all 0.2s",
                      }}
                    >
                      <CardActionArea onClick={() => setMode("skip")} sx={{ p: 1.75 }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                          <Radio checked={mode === "skip"} value="skip" sx={{ p: 0.25, mt: 0.25 }} />
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              Bỏ qua (Giữ nguyên độc giả cũ)
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Khuyên dùng: Chỉ thêm các độc giả mới, bảo toàn tuyệt đối mọi thông tin sinh viên đã có.
                            </Typography>
                          </Box>
                        </Stack>
                      </CardActionArea>
                    </Card>

                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: 2.5,
                        borderColor: mode === "update" ? "primary.main" : "divider",
                        bgcolor: mode === "update" ? alpha(theme.palette.primary.main, 0.04) : "background.paper",
                        transition: "all 0.2s",
                      }}
                    >
                      <CardActionArea onClick={() => setMode("update")} sx={{ p: 1.75 }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                          <Radio checked={mode === "update"} value="update" sx={{ p: 0.25, mt: 0.25 }} />
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              Cập nhật (Lớp, Khóa học, SĐT, Email, Hạn thẻ)
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Cập nhật thông tin lớp, khóa, hạn thẻ cho sinh viên đã có. Mật khẩu và mã thẻ được giữ nguyên.
                            </Typography>
                          </Box>
                        </Stack>
                      </CardActionArea>
                    </Card>
                  </Box>
                </RadioGroup>
              </Box>

              {/* SEARCH & FILTER CONTROLS */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: "center" }}>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", mr: 0.5 }}>
                    Lọc bảng:
                  </Typography>
                  <Chip
                    size="small"
                    label={`Tất cả (${previewData.preview.length})`}
                    color={statusFilter === "all" ? "primary" : "default"}
                    variant={statusFilter === "all" ? "filled" : "outlined"}
                    onClick={() => { setStatusFilter("all"); setPage(0); }}
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    size="small"
                    label={`Mới: ${previewData.summary.new}`}
                    color={statusFilter === "new" ? "success" : "default"}
                    variant={statusFilter === "new" ? "filled" : "outlined"}
                    onClick={() => { setStatusFilter("new"); setPage(0); }}
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    size="small"
                    label={`Đã có sẵn: ${previewData.summary.exists}`}
                    color={statusFilter === "exists" ? "warning" : "default"}
                    variant={statusFilter === "exists" ? "filled" : "outlined"}
                    onClick={() => { setStatusFilter("exists"); setPage(0); }}
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    size="small"
                    label={`Lỗi: ${previewData.summary.error}`}
                    color={statusFilter === "error" ? "error" : "default"}
                    variant={statusFilter === "error" ? "filled" : "outlined"}
                    onClick={() => { setStatusFilter("error"); setPage(0); }}
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>

                <TextField
                  size="small"
                  placeholder="Tìm theo MSSV, Họ tên, Lớp..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                        </InputAdornment>
                      ),
                      endAdornment: searchQuery ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setSearchQuery("")}>
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : undefined,
                    },
                  }}
                  sx={{ width: { xs: "100%", sm: 280 } }}
                />
              </Stack>

              {/* REVIEW DATA TABLE */}
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                  maxHeight: 380,
                  borderRadius: 2.5,
                  overflowY: "auto",
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell width={65} align="center" sx={{ fontWeight: 700, bgcolor: "background.paper" }}>
                        Dòng
                      </TableCell>
                      <TableCell width={115} sx={{ fontWeight: 700, bgcolor: "background.paper" }}>
                        MSSV
                      </TableCell>
                      <TableCell width={180} sx={{ fontWeight: 700, bgcolor: "background.paper" }}>
                        Họ và tên
                      </TableCell>
                      <TableCell width={130} sx={{ fontWeight: 700, bgcolor: "background.paper" }}>
                        Lớp / Khóa
                      </TableCell>
                      <TableCell width={190} sx={{ fontWeight: 700, bgcolor: "background.paper" }}>
                        Email
                      </TableCell>
                      <TableCell width={115} sx={{ fontWeight: 700, bgcolor: "background.paper" }}>
                        SĐT
                      </TableCell>
                      <TableCell width={130} sx={{ fontWeight: 700, bgcolor: "background.paper" }}>
                        CCCD/CMND
                      </TableCell>
                      <TableCell width={110} sx={{ fontWeight: 700, bgcolor: "background.paper" }}>
                        Hạn thẻ
                      </TableCell>
                      <TableCell width={110} align="center" sx={{ fontWeight: 700, bgcolor: "background.paper" }}>
                        Trạng thái
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedPreviewRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 5, color: "text.secondary" }}>
                          <Typography variant="body2">Không tìm thấy bản ghi nào khớp với điều kiện lọc</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedPreviewRows.map((r, idx) => {
                        const isError = r.status === "error";
                        const isExists = r.status === "exists";
                        const hasPhoneErr = r.errors?.some((e) => e.includes("phone"));
                        const hasCodeErr = r.errors?.some((e) => e.includes("student_code") || e.includes("duplicate"));
                        const hasEmailErr = r.errors?.some((e) => e.includes("email"));

                        return (
                          <TableRow
                            key={`${r.row}-${idx}`}
                            hover
                            sx={{
                              bgcolor: isError
                                ? alpha(theme.palette.error.main, 0.05)
                                : isExists
                                ? alpha(theme.palette.warning.main, 0.03)
                                : undefined,
                              transition: "background-color 0.15s",
                            }}
                          >
                            <TableCell align="center" sx={{ color: "text.secondary", fontWeight: 600 }}>
                              {r.row}
                            </TableCell>
                            <TableCell
                              sx={{
                                fontWeight: 700,
                                color: hasCodeErr ? "error.main" : "text.primary",
                              }}
                            >
                              {r.student_code}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{r.full_name}</TableCell>
                            <TableCell>
                              {r.class_name ? (
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {r.class_name}
                                </Typography>
                              ) : null}
                              <Typography variant="caption" color="text.secondary">
                                {r.course || "—"}
                              </Typography>
                            </TableCell>
                            <TableCell
                              sx={{
                                color: hasEmailErr ? "error.main" : "text.primary",
                                wordBreak: "break-all",
                              }}
                            >
                              {r.email}
                              {!r.email.includes("@student.iuh.edu.vn") && r.email.includes("@library.local") && (
                                <Typography variant="caption" sx={{ color: "primary.main", display: "block" }}>
                                  (tự sinh)
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ color: hasPhoneErr ? "error.main" : "inherit" }}>
                              {r.phone || "—"}
                            </TableCell>
                            <TableCell>{r.identity_number || "—"}</TableCell>
                            <TableCell>
                              <Typography variant="body2">{r.membership_expiry}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              {isError ? (
                                <Tooltip
                                  title={
                                    <Box sx={{ p: 0.5 }}>
                                      <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
                                        Lý do lỗi dòng {r.row}:
                                      </Typography>
                                      {r.errors.map((e, ei) => (
                                        <Typography key={ei} variant="caption" sx={{ display: "block" }}>
                                          • {ERROR_LABELS[e] || e}
                                        </Typography>
                                      ))}
                                    </Box>
                                  }
                                  arrow
                                >
                                  <Chip
                                    size="small"
                                    icon={<ErrorOutlineIcon />}
                                    label="Lỗi"
                                    color="error"
                                    sx={{ fontWeight: 700, fontSize: "0.75rem", cursor: "help" }}
                                  />
                                </Tooltip>
                              ) : isExists ? (
                                <Tooltip title="Độc giả đã có sẵn trong cơ sở dữ liệu" arrow>
                                  <Chip
                                    size="small"
                                    icon={<WarningAmberIcon />}
                                    label="Đã có"
                                    color="warning"
                                    sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                                  />
                                </Tooltip>
                              ) : (
                                <Chip
                                  size="small"
                                  icon={<CheckCircleRoundedIcon />}
                                  label="Mới"
                                  color="success"
                                  sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* TABLE PAGINATION */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" color="text.secondary">
                  Hiển thị {filteredPreviewRows.length} trên tổng {previewData.preview.length} dòng xem trước
                </Typography>
                <TablePagination
                  component="div"
                  count={filteredPreviewRows.length}
                  page={page}
                  onPageChange={(_, p) => setPage(p)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  labelRowsPerPage="Số dòng/trang:"
                  labelDisplayedRows={({ from, to, count }) => `${from}–${to} trên ${count}`}
                  sx={{ border: "none" }}
                />
              </Box>

              {/* Notice helper */}
              {previewData.summary.error > 0 && (
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  Có <b>{previewData.summary.error}</b> dòng gặp lỗi định dạng hoặc trùng lặp. Các dòng này sẽ được{" "}
                  <b>tự động bỏ qua</b> khi thực hiện import để bảo đảm toàn vẹn dữ liệu hệ thống.
                </Alert>
              )}
            </Stack>
          </Fade>
        )}

        {/* ── STEP 2: KẾT QUẢ IMPORT ─────────────────────────────────────────── */}
        {activeStep === 2 && result && (
          <Fade in timeout={300}>
            <Stack spacing={3}>
              {/* Hero Status Alert */}
              <Box
                sx={{
                  p: 3,
                  borderRadius: 3,
                  textAlign: "center",
                  background:
                    result.errors.length === 0
                      ? alpha(theme.palette.success.main, 0.08)
                      : result.imported > 0
                      ? alpha(theme.palette.warning.main, 0.08)
                      : alpha(theme.palette.error.main, 0.08),
                  border: `1px solid ${
                    result.errors.length === 0
                      ? alpha(theme.palette.success.main, 0.3)
                      : result.imported > 0
                      ? alpha(theme.palette.warning.main, 0.3)
                      : alpha(theme.palette.error.main, 0.3)
                  }`,
                }}
              >
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    mx: "auto",
                    mb: 1.5,
                    bgcolor:
                      result.errors.length === 0
                        ? "success.main"
                        : result.imported > 0
                        ? "warning.main"
                        : "error.main",
                    color: "#fff",
                  }}
                >
                  <CheckCircleRoundedIcon sx={{ fontSize: 36 }} />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Hoàn tất quá trình import dữ liệu!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Dữ liệu đã được nạp và phân bổ tài khoản vào cơ sở dữ liệu thư viện thành công
                </Typography>
              </Box>

              {/* 4 Summary Result Cards */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr 1fr" },
                  gap: 1.5,
                }}
              >
                <Card variant="outlined" sx={{ p: 2, textAlign: "center", borderRadius: 2.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    TỔNG DÒNG XỬ LÝ
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                    {result.total_rows}
                  </Typography>
                </Card>

                <Card
                  variant="outlined"
                  sx={{
                    p: 2,
                    textAlign: "center",
                    borderRadius: 2.5,
                    bgcolor: alpha(theme.palette.success.main, 0.06),
                    borderColor: alpha(theme.palette.success.main, 0.3),
                  }}
                >
                  <Typography variant="caption" sx={{ color: "success.dark", fontWeight: 700 }}>
                    THÊM MỚI THÀNH CÔNG
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "success.main", mt: 0.5 }}>
                    {result.imported}
                  </Typography>
                </Card>

                <Card
                  variant="outlined"
                  sx={{
                    p: 2,
                    textAlign: "center",
                    borderRadius: 2.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                  }}
                >
                  <Typography variant="caption" sx={{ color: "primary.dark", fontWeight: 700 }}>
                    ĐÃ CẬP NHẬT
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "primary.main", mt: 0.5 }}>
                    {result.updated}
                  </Typography>
                </Card>

                <Card
                  variant="outlined"
                  sx={{
                    p: 2,
                    textAlign: "center",
                    borderRadius: 2.5,
                    bgcolor: result.errors.length > 0 ? alpha(theme.palette.error.main, 0.06) : undefined,
                    borderColor: result.errors.length > 0 ? alpha(theme.palette.error.main, 0.3) : undefined,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: result.errors.length > 0 ? "error.dark" : "text.secondary", fontWeight: 700 }}
                  >
                    BỎ QUA / LỖI
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      color: result.errors.length > 0 ? "error.main" : "text.primary",
                      mt: 0.5,
                    }}
                  >
                    {result.skipped + result.errors.length}
                  </Typography>
                </Card>
              </Box>

              {/* Errors Breakdown Table (if any) */}
              {result.errors.length > 0 && (
                <Stack spacing={1.5}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "error.main" }}>
                      Chi tiết các dòng không thể nạp ({result.errors.length} dòng):
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      startIcon={copiedErrors ? <CheckIcon /> : <ContentCopyIcon />}
                      onClick={handleCopyErrors}
                      sx={{ textTransform: "none", borderRadius: 1.5 }}
                    >
                      {copiedErrors ? "Đã chép vào clipboard" : "Sao chép danh sách lỗi"}
                    </Button>
                  </Stack>

                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ maxHeight: 220, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell width={80} align="center" sx={{ fontWeight: 700 }}>
                            Dòng Excel
                          </TableCell>
                          <TableCell width={140} sx={{ fontWeight: 700 }}>
                            Mã Sinh Viên
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Nguyên nhân lỗi</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {result.errors.map((err, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>
                              {err.row}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "text.primary" }}>
                              {err.student_code || "—"}
                            </TableCell>
                            <TableCell sx={{ color: "error.main" }}>
                              {ERROR_LABELS[err.code] || err.message}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Stack>
              )}
            </Stack>
          </Fade>
        )}
      </DialogContent>

      {/* DIALOG FOOTER ACTIONS */}
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          bgcolor: theme.palette.mode === "dark" ? "background.default" : alpha(theme.palette.grey[50], 0.8),
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        {activeStep === 0 && (
          <>
            <Button onClick={handleClose} color="inherit" sx={{ fontWeight: 600, px: 2.5 }}>
              Hủy
            </Button>
            <Button
              variant="contained"
              disabled={!file || loading}
              onClick={handleProceedToPreview}
              endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ArrowForwardIcon />}
              sx={{
                borderRadius: 2,
                px: 3.5,
                py: 1,
                fontWeight: 700,
                boxShadow: "0 2px 8px rgba(139,0,0,0.25)",
              }}
            >
              {loading ? "Đang đọc file..." : "Xem trước dữ liệu"}
            </Button>
          </>
        )}

        {activeStep === 1 && (
          <>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => setActiveStep(0)}
              disabled={loading}
              color="inherit"
              sx={{ fontWeight: 600, px: 2.5 }}
            >
              Chọn lại file
            </Button>
            <Button
              variant="contained"
              disabled={loading || !previewData || previewData.summary.new + previewData.summary.exists === 0}
              onClick={handleExecuteImport}
              endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <CheckCircleRoundedIcon />}
              sx={{
                borderRadius: 2,
                px: 3.5,
                py: 1,
                fontWeight: 700,
                boxShadow: "0 2px 8px rgba(139,0,0,0.25)",
              }}
            >
              {loading
                ? "Đang xử lý import..."
                : `Xác nhận Import (${mode === "update" ? "Tạo mới & Cập nhật" : "Chỉ tạo mới"})`}
            </Button>
          </>
        )}

        {activeStep === 2 && (
          <Button
            variant="contained"
            onClick={handleClose}
            sx={{
              borderRadius: 2,
              px: 4,
              py: 1,
              fontWeight: 700,
            }}
          >
            Đóng
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
