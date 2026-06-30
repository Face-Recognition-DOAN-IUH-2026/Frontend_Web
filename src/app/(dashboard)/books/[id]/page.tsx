"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Fab,
  Grid,
  IconButton,
  Link,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
  Dialog,
  DialogContent,
  DialogTitle
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackOutlined";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import CalendarTodayIcon from "@mui/icons-material/CalendarTodayOutlined";
import CategoryIcon from "@mui/icons-material/CategoryOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/DescriptionOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import ExpandIcon from "@mui/icons-material/ExpandMoreOutlined";
import GridViewIcon from "@mui/icons-material/GridViewOutlined";
import LanguageIcon from "@mui/icons-material/LanguageOutlined";
import LocationOnIcon from "@mui/icons-material/LocationOnOutlined";
import MenuBookIcon from "@mui/icons-material/MenuBookOutlined";
import StarIcon from "@mui/icons-material/StarOutlined";
import VerifiedIcon from "@mui/icons-material/VerifiedOutlined";
import ViewInArIcon from "@mui/icons-material/ViewInArOutlined";
import api from "@/lib/api-client";
import type { BookWithStats } from "@/lib/types";
import Book3DViewer from "@/components/Book3DViewer";

function StatCard({ label, value, color, icon }: { label: string; value: number; color: "info" | "success" | "warning"; icon: React.ReactNode }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        flex: 1,
        p: 1.5,
        textAlign: "center",
        borderColor: `${color}.main`,
        borderRadius: 2,
        background: color === "info" ? "rgba(2,136,209,0.08)" : color === "success" ? "rgba(46,125,50,0.08)" : "rgba(245,124,0,0.08)",
      }}
    >
      <Box sx={{ color: `${color}.main`, mb: 0.5 }}>{icon}</Box>
      <Typography variant="h5" sx={{ fontWeight: 900, color: `${color}.main` }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </Typography>
    </Paper>
  );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ py: 1.5, px: 0 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
        <Box sx={{ color: "text.secondary", mt: 0.3 }}>{icon}</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
            {label}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: "break-word" }}>
            {value}
          </Typography>
        </Box>
      </Stack>
      <Divider sx={{ mt: 1.5 }} />
    </Box>
  );
}

export default function BookDetailPage() {
  const theme = useTheme();
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;

  const [book, setBook] = useState<BookWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [show3D, setShow3D] = useState(false);
  
  // States cho Form cập nhật
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editSnackbar, setEditSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });

  useEffect(() => {
    if (!bookId) return;
    setLoading(true);
    setError(null);
    api.getBookById(bookId).then(setBook).catch((err) => setError(getErrorMessage(err))).finally(() => setLoading(false));
  }, [bookId]);

  const openEdit = () => {
    if (!book) return;
    setEditErrors({});
    setEditForm({
      title: book.title || "",
      subtitle: book.subtitle || "",
      author: book.author || "",
      publisher: book.publisher || "",
      published_date: book.published_date || "",
      description: book.description || "",
      page_count: book.page_count ?? "",
      categories: book.categories || "",
      average_rating: book.average_rating ?? "",
      language: book.language || "",
      shelf_location: book.shelf_location || "",
      cover_url: book.cover_url || "",
      quantity: book.total_copies ?? 0,
    });
    setEditOpen(true);
  };

  const validateEditForm = () => {
    const errors: Record<string, string> = {};

    if (!editForm.title?.trim()) {
      errors.title = "Tiêu đề không được để trống";
    }

    if (editForm.quantity === "" || editForm.quantity === null || Number(editForm.quantity) < 0) {
      errors.quantity = "Số lượng phải là số từ 0 trở lên";
    }

    if (editForm.page_count !== "" && editForm.page_count !== null && Number(editForm.page_count) < 0) {
      errors.page_count = "Số trang không được âm";
    }

    if (editForm.average_rating !== "" && editForm.average_rating !== null) {
      const rating = Number(editForm.average_rating);
      if (rating < 0 || rating > 5) {
        errors.average_rating = "Đánh giá phải nằm trong khoảng 0 đến 5";
      }
    }

    if (editForm.cover_url?.trim()) {
      try {
        new URL(editForm.cover_url);
      } catch {
        errors.cover_url = "URL hình ảnh không hợp lệ (cần bắt đầu bằng http:// hoặc https://)";
      }
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditChange = (field: string, value: any) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (editErrors[field]) {
      setEditErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleEditSave = async () => {
    if (!validateEditForm()) return;
    if (!book) return;
    
    setEditSaving(true);
    try {
      const quantity = editForm.quantity === "" || editForm.quantity === null ? null : Number(editForm.quantity);
      const metadataPayload: Record<string, any> = {};
      
      for (const [k, v] of Object.entries(editForm)) {
        if (k === "quantity") continue;
        if (k === "page_count" || k === "average_rating") {
          metadataPayload[k] = v === "" || v === null ? null : Number(v);
        } else {
          metadataPayload[k] = v || null;
        }
      }
      
      let updated = await api.updateBook(book.id, metadataPayload);
      
      if (quantity !== null && quantity !== book.total_copies) {
        updated = await api.updateBookQuantity(book.id, quantity);
      }
      
      setBook(updated);
      setEditOpen(false);
      setEditSnackbar({ open: true, message: "Cập nhật sách thành công", severity: "success" });
    } catch (err: any) {
      setEditSnackbar({ open: true, message: err?.response?.data?.error || "Cập nhật sách thất bại", severity: "error" });
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
        <Skeleton variant="text" width={180} height={28} sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <Skeleton variant="rounded" height={340} sx={{ borderRadius: "12px 12px 0 0" }} />
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rounded" width={80} height={60} />
                  ))}
                </Stack>
                <Stack spacing={1}>
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="text" width="80%" />)}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={2}>
              <Skeleton variant="text" height={56} width="70%" />
              <Skeleton variant="text" height={32} width="40%" />
              <Stack direction="row" spacing={1}>
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} variant="rounded" width={90} height={32} />)}
              </Stack>
              <Skeleton variant="rounded" height={120} />
              <Skeleton variant="rounded" height={80} />
            </Stack>
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (error || !book) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mb: 2 }}>
          Quay lại
        </Button>
        <Alert severity="error">{error || "Không tìm thấy sách"}</Alert>
      </Box>
    );
  }

  const borrowed = book.total_copies - book.available_copies;
  const isLongDescription = book.description && book.description.length > 300;

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh", py: 3 }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3 }}>
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link
            component="button"
            underline="hover"
            color="inherit"
            onClick={() => router.push("/books")}
            sx={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 0.5 }}
          >
            <MenuBookIcon fontSize="small" /> Sách
          </Link>
          <Typography color="text.primary" sx={{ fontWeight: 500 }}>
            Chi tiết
          </Typography>
        </Breadcrumbs>

        <Grid container spacing={3}>
          {/* Left Column - Cover & Metadata */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 3,
                overflow: "hidden",
                position: { md: "sticky" },
                top: 80,
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              }}
            >
              {/* Cover Image */}
              <Box
                sx={{
                  position: "relative",
                  height: 340,
                  background: `linear-gradient(135deg, ${theme.palette.grey[900]} 0%, ${theme.palette.grey[800]} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {book.cover_url ? (
                  <Box
                    component="img"
                    src={book.cover_url}
                    alt={book.title}
                    sx={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                      transition: "transform 0.3s ease",
                      "&:hover": { transform: "scale(1.02)" },
                    }}
                  />
                ) : (
                  <Avatar sx={{ width: 140, height: 140, bgcolor: "grey.700" }}>
                    <BookIcon sx={{ fontSize: 72 }} />
                  </Avatar>
                )}
                <Box
                  sx={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    bgcolor: book.is_available ? "success.main" : "error.main",
                    color: "white",
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 5,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {book.is_available ? "Còn hàng" : "Hết hàng"}
                </Box>
                <Button 
                  variant="contained"
                  color="primary"
                  startIcon={<ViewInArIcon />}
                  onClick={() => setShow3D(true)}
                  sx={{ 
                    position: "absolute", 
                    bottom: 16, 
                    left: 16, 
                    right: 16,
                    width: "auto",
                    borderRadius: 2,
                    boxShadow: 3,
                    bgcolor: "rgba(25, 118, 210, 0.9)",
                    backdropFilter: "blur(4px)"
                  }}
                >
                  Góc nhìn 3D
                </Button>
              </Box>

              <CardContent sx={{ p: 2.5 }}>
                {/* Stats Row */}
                <Stack direction="row" spacing={1} sx={{ mb: 2.5 }}>
                  <StatCard label="Tổng" value={book.total_copies} color="info" icon={<GridViewIcon fontSize="small" />} />
                  <StatCard label="Sẵn sàng" value={book.available_copies} color="success" icon={<VerifiedIcon fontSize="small" />} />
                  <StatCard label="Đang mượn" value={borrowed} color="warning" icon={<BookIcon fontSize="small" />} />
                </Stack>

                <Divider sx={{ mb: 1.5 }} />

                {/* Metadata */}
                <Box>
                  <MetaItem
                    icon={<GridViewIcon fontSize="small" />}
                    label="ISBN-13"
                    value={book.isbn13 || book.isbn}
                  />
                  {book.isbn10 && (
                    <MetaItem icon={<GridViewIcon fontSize="small" />} label="ISBN-10" value={book.isbn10} />
                  )}
                  {book.shelf_location && (
                    <MetaItem icon={<LocationOnIcon fontSize="small" />} label="Vị trí" value={book.shelf_location} />
                  )}
                  {book.language && (
                    <MetaItem icon={<LanguageIcon fontSize="small" />} label="Ngôn ngữ" value={book.language} />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Details */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3}>
              {/* Header */}
              <Box>
                <Typography
                  variant="h3"
                  gutterBottom
                  sx={{ fontWeight: 900, lineHeight: 1.2, fontSize: { xs: "1.75rem", md: "2.25rem" } }}
                >
                  {book.title}
                </Typography>
                {book.subtitle && (
                  <Typography variant="h6" color="text.secondary" sx={{ fontStyle: "italic", mb: 1.5 }}>
                    {book.subtitle}
                  </Typography>
                )}
                {book.author && (
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Typography variant="body1" color="text.secondary">
                      Tác giả:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {book.author}
                    </Typography>
                  </Stack>
                )}
              </Box>

              {/* Info Chips */}
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                {book.publisher && (
                  <Chip icon={<MenuBookIcon sx={{ fontSize: 16 }} />} label={book.publisher} size="small" variant="outlined" />
                )}
                {book.published_date && (
                  <Chip
                    icon={<CalendarTodayIcon sx={{ fontSize: 16 }} />}
                    label={book.published_date}
                    size="small"
                    variant="outlined"
                  />
                )}
                {book.page_count && (
                  <Chip
                    icon={<DescriptionIcon sx={{ fontSize: 16 }} />}
                    label={`${book.page_count} trang`}
                    size="small"
                    variant="outlined"
                  />
                )}
                {book.average_rating && (
                  <Chip
                    icon={<StarIcon sx={{ fontSize: 16 }} />}
                    label={`${book.average_rating}/5`}
                    size="small"
                    variant="outlined"
                    color="warning"
                  />
                )}
                {book.categories && (
                  <Chip
                    icon={<CategoryIcon sx={{ fontSize: 16 }} />}
                    label={book.categories}
                    size="small"
                    variant="outlined"
                    sx={{ bgcolor: "primary.main", color: "primary.contrastText", borderColor: "primary.main" }}
                  />
                )}
              </Stack>

              <Divider />

              {/* Description */}
              {book.description && (
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
                    <DescriptionIcon color="action" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Mô tả
                    </Typography>
                  </Stack>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      bgcolor: "grey.900",
                      borderRadius: 2,
                      position: "relative",
                      maxHeight: descExpanded ? "none" : 200,
                      overflow: "hidden",
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8, color: "common.white" }}>
                      {book.description}
                    </Typography>
                    {isLongDescription && (
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: 60,
                          background: descExpanded ? "transparent" : `linear-gradient(transparent, ${theme.palette.grey[900]})`,
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          pb: 1,
                        }}
                      >
                        <Button
                          size="small"
                          onClick={() => setDescExpanded(!descExpanded)}
                          endIcon={descExpanded ? <CloseIcon /> : <ExpandIcon />}
                          sx={{ color: "text.secondary" }}
                        >
                          {descExpanded ? "Thu gọn" : "Xem thêm"}
                        </Button>
                      </Box>
                    )}
                  </Paper>
                </Box>
              )}

              {/* Dates */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 2,
                }}
              >
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Ngày tạo
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                    {book.created_at ? new Date(book.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" }) : "-"}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Ngày cập nhật
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                    {book.updated_at ? new Date(book.updated_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" }) : "-"}
                  </Typography>
                </Paper>
              </Box>

              {/* Action Buttons */}
              <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<BookIcon />}
                  onClick={() => router.push(`/borrow?barcode=${book.isbn}`)}
                  sx={{ flex: 1, py: 1.5, fontWeight: 700 }}
                >
                  Mượn sách
                </Button>
                <Tooltip title="Chỉnh sửa thông tin sách">
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<EditIcon />}
                    onClick={openEdit}
                    sx={{ py: 1.5 }}
                  >
                    Sửa
                  </Button>
                </Tooltip>
              </Stack>
            </Stack>
          </Grid>
        </Grid>

        <Dialog open={show3D} onClose={() => setShow3D(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Góc nhìn 3D</Typography>
            <IconButton onClick={() => setShow3D(false)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0, overflow: 'hidden' }}>
            {show3D && <Book3DViewer coverUrl={book.cover_url || ""} />}
          </DialogContent>
        </Dialog>

        {/* Edit Book Dialog */}
        <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 700 }}>
            Chỉnh sửa thông tin sách
            <IconButton onClick={() => setEditOpen(false)} size="small"><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ pt: 2 }}>
            <Stack spacing={2.5}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField 
                  label="Tiêu đề" 
                  required 
                  fullWidth 
                  value={editForm.title || ""} 
                  onChange={(e) => handleEditChange("title", e.target.value)}
                  error={!!editErrors.title}
                  helperText={editErrors.title}
                />
                <TextField 
                  label="Số lượng tồn kho" 
                  type="number" 
                  fullWidth 
                  value={editForm.quantity ?? 0} 
                  onChange={(e) => handleEditChange("quantity", e.target.value)}
                  error={!!editErrors.quantity}
                  helperText={editErrors.quantity}
                />
              </Stack>
              <TextField 
                label="Phụ đề" 
                fullWidth 
                value={editForm.subtitle || ""} 
                onChange={(e) => handleEditChange("subtitle", e.target.value)} 
              />
              <TextField 
                label="Tác giả" 
                fullWidth 
                value={editForm.author || ""} 
                onChange={(e) => handleEditChange("author", e.target.value)} 
              />
              <TextField 
                label="Nhà xuất bản" 
                fullWidth 
                value={editForm.publisher || ""} 
                onChange={(e) => handleEditChange("publisher", e.target.value)} 
              />
              <TextField 
                label="Ngày xuất bản" 
                fullWidth 
                value={editForm.published_date || ""} 
                onChange={(e) => handleEditChange("published_date", e.target.value)} 
                placeholder="VD: 2024-01-01" 
              />
              <TextField 
                label="Mô tả" 
                fullWidth 
                multiline 
                minRows={4} 
                value={editForm.description || ""} 
                onChange={(e) => handleEditChange("description", e.target.value)} 
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField 
                  label="Số trang" 
                  type="number" 
                  fullWidth 
                  value={editForm.page_count ?? ""} 
                  onChange={(e) => handleEditChange("page_count", e.target.value)}
                  error={!!editErrors.page_count}
                  helperText={editErrors.page_count}
                />
                <TextField 
                  label="Danh mục" 
                  fullWidth 
                  value={editForm.categories || ""} 
                  onChange={(e) => handleEditChange("categories", e.target.value)} 
                />
                <TextField 
                  label="Đánh giá (0-5)" 
                  type="number" 
                  fullWidth 
                  value={editForm.average_rating ?? ""} 
                  onChange={(e) => handleEditChange("average_rating", e.target.value)}
                  error={!!editErrors.average_rating}
                  helperText={editErrors.average_rating}
                />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField 
                  label="Ngôn ngữ" 
                  fullWidth 
                  value={editForm.language || ""} 
                  onChange={(e) => handleEditChange("language", e.target.value)} 
                />
                <TextField 
                  label="Vị trí kệ" 
                  fullWidth 
                  value={editForm.shelf_location || ""} 
                  onChange={(e) => handleEditChange("shelf_location", e.target.value)} 
                />
              </Stack>
              <TextField 
                label="URL ảnh bìa" 
                fullWidth 
                value={editForm.cover_url || ""} 
                onChange={(e) => handleEditChange("cover_url", e.target.value)} 
                placeholder="https://..."
                error={!!editErrors.cover_url}
                helperText={editErrors.cover_url}
              />
            </Stack>
          </DialogContent>
          <Box sx={{ px: 3, py: 2, display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
            <Button onClick={() => setEditOpen(false)} disabled={editSaving}>Hủy</Button>
            <Button 
              variant="contained" 
              onClick={handleEditSave} 
              disabled={editSaving || !editForm.title?.trim()} 
              startIcon={editSaving ? <CircularProgress size={16} /> : null}
            >
              {editSaving ? "Đang lưu..." : "Lưu"}
            </Button>
          </Box>
        </Dialog>

        <Snackbar open={editSnackbar.open} autoHideDuration={3000} onClose={() => setEditSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
          <Alert severity={editSnackbar.severity} variant="filled" onClose={() => setEditSnackbar((s) => ({ ...s, open: false }))}>
            {editSnackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}

function getErrorMessage(err: any): string {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.message) return err.message;
  return "Đã xảy ra lỗi";
}