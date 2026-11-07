"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControlLabel,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Tab,
  Tabs,
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

import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import { useToast } from "@/lib/toast-context";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api-client";
import type { AIRagDocument } from "@/lib/types";

// Icons
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import MemoryOutlinedIcon from "@mui/icons-material/MemoryOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";

export default function KnowledgeBasePage() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const [documents, setDocuments] = useState<AIRagDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTab, setUploadTab] = useState<0 | 1>(0); // 0: File upload, 1: Direct text

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Direct Text State
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");

  // Common Audience State
  const [audience, setAudience] = useState<"public" | "staff_only">("public");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [audienceFilter, setAudienceFilter] = useState<"all" | "public" | "staff_only">("all");

  // Delete Dialog State
  const [deleteTarget, setDeleteTarget] = useState<AIRagDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Documents List
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getRagDocuments();
      setDocuments(data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || "Không thể tải danh sách tài liệu RAG");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validExts = [".pdf", ".docx", ".doc", ".txt", ".md"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validExts.includes(ext)) {
      toast.warning("Chỉ chấp nhận các định dạng tệp: PDF, DOCX, DOC, TXT, MD");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.warning("Dung lượng tệp vượt quá 20MB. Vui lòng chọn tệp nhỏ hơn.");
      return;
    }
    setSelectedFile(file);
  };

  // Submit Upload File
  const handleUploadFile = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("audience", audience);

      const res = await api.uploadRagDocument(formData);
      toast.success(`Đã nạp "${selectedFile.name}" vào ChromaDB (${res.data?.chunksCount || 0} chunks)!`);

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchDocuments();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || "Tải lên tệp thất bại");
    } finally {
      setUploading(false);
    }
  };

  // Submit Direct Text
  const handleUploadText = async () => {
    const trimmedTitle = docTitle.trim();
    const trimmedContent = docContent.trim();

    if (!trimmedTitle) {
      toast.warning("Vui lòng nhập tên tài liệu / tiêu đề");
      return;
    }
    if (!trimmedContent) {
      toast.warning("Vui lòng nhập nội dung văn bản tri thức");
      return;
    }

    setUploading(true);
    try {
      const res = await api.uploadRagText(trimmedTitle, trimmedContent, audience);
      toast.success(`Đã lưu văn bản "${trimmedTitle}" vào ChromaDB (${res.data?.chunksCount || 0} chunks)!`);

      setDocTitle("");
      setDocContent("");
      await fetchDocuments();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || "Nạp văn bản thất bại");
    } finally {
      setUploading(false);
    }
  };

  // Handle Delete Document
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteRagDocument(deleteTarget.source);
      toast.success(`Đã xóa tài liệu "${deleteTarget.source}" khỏi hệ thống tri thức.`);
      setDocuments((prev) => prev.filter((d) => d.source !== deleteTarget.source));
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || "Xóa tài liệu thất bại");
    } finally {
      setDeleting(false);
    }
  };

  // Metrics
  const totalChunks = useMemo(() => {
    return documents.reduce((acc, curr) => acc + (curr.chunksCount || 0), 0);
  }, [documents]);

  const publicDocsCount = useMemo(() => {
    return documents.filter((d) => d.audience === "public").length;
  }, [documents]);

  const staffDocsCount = useMemo(() => {
    return documents.filter((d) => d.audience === "staff_only").length;
  }, [documents]);

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.docTitle && doc.docTitle.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesAudience =
        audienceFilter === "all" || doc.audience === audienceFilter;

      return matchesSearch && matchesAudience;
    });
  }, [documents, searchQuery, audienceFilter]);

  const renderFileIcon = (source: string) => {
    const s = source.toLowerCase();
    if (s.endsWith(".pdf")) {
      return <PictureAsPdfOutlinedIcon sx={{ color: "#DC2626", fontSize: 26 }} />;
    }
    if (s.endsWith(".docx") || s.endsWith(".doc")) {
      return <DescriptionOutlinedIcon sx={{ color: "#2563EB", fontSize: 26 }} />;
    }
    return <ArticleOutlinedIcon sx={{ color: "#D97706", fontSize: 26 }} />;
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", pb: 5 }}>
      {/* Header */}
      <PageHeader
        title="Quản Lý Kho Tri Thức AI (RAG)"
        subtitle="Nạp tài liệu văn bản, phân đoạn và vector hóa vào ChromaDB để AI trả lời độc giả và thủ thư chính xác theo quy định"
        icon={AutoStoriesOutlinedIcon}
        actions={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<RefreshOutlinedIcon />}
              onClick={fetchDocuments}
              disabled={loading}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              Làm mới
            </Button>
            <Button
              variant="contained"
              startIcon={<SmartToyOutlinedIcon />}
              onClick={() => router.push("/ai-assistant")}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                bgcolor: "#0A2540",
                "&:hover": { bgcolor: "#0F3C5C" },
              }}
            >
              Trợ lý AI Chat
            </Button>
          </Stack>
        }
      />

      {/* KPI Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2.5, mb: 3 }}>
        <DashboardCard sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 3,
                bgcolor: alpha("#0A2540", 0.08),
                color: "#0A2540",
                display: "grid",
                placeItems: "center",
              }}
            >
              <AutoStoriesOutlinedIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                TỔNG SỐ TÀI LIỆU
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#0A2540" }}>
                {documents.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tài liệu tri thức đang hoạt động
              </Typography>
            </Box>
          </Stack>
        </DashboardCard>

        <DashboardCard sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 3,
                bgcolor: alpha("#8B0000", 0.08),
                color: "#8B0000",
                display: "grid",
                placeItems: "center",
              }}
            >
              <MemoryOutlinedIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                TỔNG SỐ VECTOR CHUNKS
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#8B0000" }}>
                {totalChunks}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Đoạn nhúng ngữ nghĩa trong ChromaDB
              </Typography>
            </Box>
          </Stack>
        </DashboardCard>

        <DashboardCard sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 3,
                bgcolor: alpha("#059669", 0.08),
                color: "#059669",
                display: "grid",
                placeItems: "center",
              }}
            >
              <PublicOutlinedIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                PHÂN BỔ TRUY CẬP
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                <Chip
                  size="small"
                  icon={<PublicOutlinedIcon sx={{ fontSize: "14px !important" }} />}
                  label={`${publicDocsCount} Công khai`}
                  sx={{
                    bgcolor: alpha("#059669", 0.12),
                    color: "#059669",
                    fontWeight: 700,
                  }}
                />
                <Chip
                  size="small"
                  icon={<ShieldOutlinedIcon sx={{ fontSize: "14px !important" }} />}
                  label={`${staffDocsCount} Nội bộ`}
                  sx={{
                    bgcolor: alpha("#D97706", 0.12),
                    color: "#D97706",
                    fontWeight: 700,
                  }}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                Bảo vệ dữ liệu nghiệp vụ
              </Typography>
            </Box>
          </Stack>
        </DashboardCard>
      </Box>

      {/* Upload Section (Admin Only) */}
      {isAdmin && (
        <DashboardCard
          title="Nạp Tài Liệu Tri Thức Mới"
          subtitle="Hệ thống tự động trích xuất nội dung, phân đoạn (chunking 700 ký tự) và tạo vector embedding qua NVIDIA NIM"
          sx={{ mb: 3 }}
        >
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs
              value={uploadTab}
              onChange={(_, val) => setUploadTab(val)}
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab
                icon={<UploadFileOutlinedIcon />}
                iconPosition="start"
                label="Tải lên tệp tin (PDF, DOCX, TXT)"
                sx={{ textTransform: "none", fontWeight: 700 }}
              />
              <Tab
                icon={<EditNoteOutlinedIcon />}
                iconPosition="start"
                label="Nhập / Dán văn bản trực tiếp"
                sx={{ textTransform: "none", fontWeight: 700 }}
              />
            </Tabs>
          </Box>

          {/* Tab 0: File Upload */}
          {uploadTab === 0 && (
            <Box>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />

              {!selectedFile ? (
                <Paper
                  variant="outlined"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    p: 4,
                    textAlign: "center",
                    cursor: "pointer",
                    borderRadius: 3,
                    borderStyle: "dashed",
                    borderWidth: 2,
                    borderColor: isDragOver ? "primary.main" : "divider",
                    bgcolor: isDragOver ? alpha(theme.palette.primary.main, 0.04) : "transparent",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: "primary.main",
                      bgcolor: alpha(theme.palette.primary.main, 0.02),
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: "primary.main",
                      display: "grid",
                      placeItems: "center",
                      mx: "auto",
                      mb: 1.5,
                    }}
                  >
                    <CloudUploadOutlinedIcon sx={{ fontSize: 32 }} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Kéo thả file vào đây hoặc nhấn để chọn từ máy tính
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Hỗ trợ định dạng PDF, Word (DOCX/DOC), TXT, Markdown (Tối đa 20MB)
                  </Typography>
                </Paper>
              ) : (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    bgcolor: alpha(theme.palette.success.main, 0.04),
                    borderColor: alpha(theme.palette.success.main, 0.3),
                  }}
                >
                  <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                    {renderFileIcon(selectedFile.name)}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {selectedFile.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Kích thước: {(selectedFile.size / 1024).toFixed(1)} KB • Định dạng:{" "}
                        {selectedFile.name.split(".").pop()?.toUpperCase()}
                      </Typography>
                    </Box>
                  </Stack>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <CloseOutlinedIcon fontSize="small" />
                  </IconButton>
                </Paper>
              )}

              {/* Audience & Action Row */}
              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "divider" }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
                      PHẠM VI TRUY CẬP (AUDIENCE):
                    </Typography>
                    <RadioGroup
                      row
                      value={audience}
                      onChange={(e) => setAudience(e.target.value as "public" | "staff_only")}
                    >
                      <FormControlLabel
                        value="public"
                        control={<Radio size="small" color="success" />}
                        label={
                          <Typography variant="body2">
                            <strong>🌐 Công khai</strong> (Độc giả, sinh viên và nhân viên)
                          </Typography>
                        }
                      />
                      <FormControlLabel
                        value="staff_only"
                        control={<Radio size="small" color="warning" />}
                        label={
                          <Typography variant="body2">
                            <strong>🔒 Nội bộ</strong> (Chỉ Thủ thư & Admin)
                          </Typography>
                        }
                      />
                    </RadioGroup>
                  </Box>

                  <Button
                    variant="contained"
                    startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <CloudUploadOutlinedIcon />}
                    onClick={handleUploadFile}
                    disabled={!selectedFile || uploading}
                    sx={{
                      textTransform: "none",
                      borderRadius: 2,
                      py: 1,
                      px: 3,
                      fontWeight: 700,
                      bgcolor: "#8B0000",
                      "&:hover": { bgcolor: "#700000" },
                    }}
                  >
                    {uploading ? "Đang xử lý & Vector hóa..." : "Nạp vào Knowledge Base"}
                  </Button>
                </Stack>
              </Box>
            </Box>
          )}

          {/* Tab 1: Direct Text */}
          {uploadTab === 1 && (
            <Box>
              <Stack spacing={2.5}>
                <TextField
                  fullWidth
                  size="small"
                  label="Tên tài liệu / Tiêu đề"
                  placeholder="VD: Quy_dinh_muon_tra_sach_2026.txt"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                />

                <TextField
                  fullWidth
                  multiline
                  minRows={6}
                  maxRows={14}
                  label="Nội dung tri thức văn bản"
                  placeholder="Dán hoặc soạn thảo các quy định, thông báo, hướng dẫn sử dụng thư viện, chính sách mượn trả tại đây..."
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                />

                {/* Audience & Action Row */}
                <Box sx={{ pt: 1, borderTop: 1, borderColor: "divider" }}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
                        PHẠM VI TRUY CẬP (AUDIENCE):
                      </Typography>
                      <RadioGroup
                        row
                        value={audience}
                        onChange={(e) => setAudience(e.target.value as "public" | "staff_only")}
                      >
                        <FormControlLabel
                          value="public"
                          control={<Radio size="small" color="success" />}
                          label={
                            <Typography variant="body2">
                              <strong>🌐 Công khai</strong> (Độc giả, sinh viên và nhân viên)
                            </Typography>
                          }
                        />
                        <FormControlLabel
                          value="staff_only"
                          control={<Radio size="small" color="warning" />}
                          label={
                            <Typography variant="body2">
                              <strong>🔒 Nội bộ</strong> (Chỉ Thủ thư & Admin)
                            </Typography>
                          }
                        />
                      </RadioGroup>
                    </Box>

                    <Button
                      variant="contained"
                      startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <CheckCircleOutlineOutlinedIcon />}
                      onClick={handleUploadText}
                      disabled={!docTitle.trim() || !docContent.trim() || uploading}
                      sx={{
                        textTransform: "none",
                        borderRadius: 2,
                        py: 1,
                        px: 3,
                        fontWeight: 700,
                        bgcolor: "#8B0000",
                        "&:hover": { bgcolor: "#700000" },
                      }}
                    >
                      {uploading ? "Đang phân đoạn & nạp..." : "Lưu vào Knowledge Base"}
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </Box>
          )}
        </DashboardCard>
      )}

      {/* Documents Table Section */}
      <DashboardCard
        title="Danh Sách Tri Thức Trong Hệ Thống"
        subtitle={`Hiển thị ${filteredDocuments.length} / ${documents.length} tài liệu đã vector hóa`}
        actions={
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            {/* Audience filter tabs */}
            <Tabs
              value={audienceFilter}
              onChange={(_, val) => setAudienceFilter(val)}
              textColor="primary"
              indicatorColor="primary"
              sx={{ minHeight: 36 }}
            >
              <Tab value="all" label="Tất cả" sx={{ minHeight: 36, py: 0.5, textTransform: "none" }} />
              <Tab value="public" label="Công khai" sx={{ minHeight: 36, py: 0.5, textTransform: "none" }} />
              <Tab value="staff_only" label="Nội bộ" sx={{ minHeight: 36, py: 0.5, textTransform: "none" }} />
            </Tabs>

            {/* Search Input */}
            <TextField
              size="small"
              placeholder="Tìm tài liệu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ width: 220 }}
            />
          </Stack>
        }
      >
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {filteredDocuments.length === 0 && !loading ? (
          <EmptyState
            title="Chưa có tài liệu tri thức nào"
            description={
              searchQuery
                ? "Không tìm thấy tài liệu phù hợp với từ khóa tìm kiếm"
                : "Hãy nạp tài liệu văn bản hoặc tệp PDF/Word đầu tiên để AI có thể hỗ trợ độc giả"
            }
          />
        ) : (
          <TableContainer>
            <Table size="medium">
              <TableHead sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: "35%" }}>Tên tài liệu / Nguồn</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: "20%" }}>Phạm vi truy cập</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: "15%" }}>Số Chunks</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: "15%" }}>Dung lượng</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, width: "15%" }}>
                    Thao tác
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDocuments.map((doc) => {
                  const isPublic = doc.audience === "public";
                  return (
                    <TableRow key={doc.source} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                          {renderFileIcon(doc.source)}
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700, wordBreak: "break-word" }}
                            >
                              {doc.docTitle || doc.source}
                            </Typography>
                            {doc.docTitle && doc.docTitle !== doc.source && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                {doc.source}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          icon={
                            isPublic ? (
                              <PublicOutlinedIcon sx={{ fontSize: "14px !important" }} />
                            ) : (
                              <ShieldOutlinedIcon sx={{ fontSize: "14px !important" }} />
                            )
                          }
                          label={isPublic ? "🌐 Công khai" : "🔒 Nội bộ Staff"}
                          sx={{
                            fontWeight: 700,
                            bgcolor: isPublic ? alpha("#059669", 0.1) : alpha("#D97706", 0.1),
                            color: isPublic ? "#059669" : "#D97706",
                            border: `1px solid ${isPublic ? alpha("#059669", 0.2) : alpha("#D97706", 0.2)}`,
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {doc.chunksCount} đoạn
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {doc.fileSize || "—"}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        {isAdmin ? (
                          <Tooltip title="Xóa tài liệu khỏi ChromaDB">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteTarget(doc)}
                            >
                              <DeleteOutlineOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Chỉ xem
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DashboardCard>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, color: "error.main" }}>
          Xác nhận xóa tài liệu tri thức
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xóa tài liệu <strong>&quot;{deleteTarget?.source}&quot;</strong>?
          </DialogContentText>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Hệ thống sẽ xóa toàn bộ {deleteTarget?.chunksCount || 0} vector chunks liên quan trong ChromaDB. Trợ lý AI sẽ không còn nhớ kiến thức từ tệp này nữa.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            sx={{ textTransform: "none" }}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlineOutlinedIcon />}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {deleting ? "Đang xóa..." : "Xóa vĩnh viễn"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
