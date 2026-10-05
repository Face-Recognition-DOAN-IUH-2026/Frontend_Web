"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import MenuBookIcon from "@mui/icons-material/MenuBookOutlined";
import CalendarTodayIcon from "@mui/icons-material/CalendarTodayOutlined";
import CategoryIcon from "@mui/icons-material/CategoryOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/DescriptionOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import ExpandIcon from "@mui/icons-material/ExpandMoreOutlined";
import GridViewIcon from "@mui/icons-material/GridViewOutlined";
import LanguageIcon from "@mui/icons-material/LanguageOutlined";
import LocationOnIcon from "@mui/icons-material/LocationOnOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlineOutlined";
import StarIcon from "@mui/icons-material/StarOutlined";
import ViewInArIcon from "@mui/icons-material/ViewInArOutlined";
import VerifiedIcon from "@mui/icons-material/VerifiedOutlined";
import PaymentsIcon from "@mui/icons-material/PaymentsOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type { BookCopy, BookWithStats } from "@/lib/types";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import { BookCopiesTable } from "@/app/(dashboard)/_components/books/BookCopiesTable";
import { staggerSx } from "@/lib/useStaggeredAnimation";

const Book3DViewer = dynamic(
  () => import("@/app/(dashboard)/_components/Book3DViewer"),
  { ssr: false, loading: () => <Box sx={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "grey.100", borderRadius: 2 }}><CircularProgress /></Box> }
);

const VRViewer = dynamic(
  () => import("@/app/library/vr-tour/_components/VRViewer"),
  { ssr: false, loading: () => <Box sx={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center" }}><CircularProgress /></Box> }
);

function StatCard({ label, value, color, icon }: { label: string; value: number; color: "primary" | "info" | "success" | "warning"; icon: React.ReactNode }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        flex: 1,
        p: 1.5,
        textAlign: "center",
        borderColor: `${color}.main`,
        borderRadius: 2,
        background:
          color === "primary"
            ? "rgba(139,0,0,0.06)"
            : color === "success"
            ? "rgba(5,150,105,0.08)"
            : color === "warning"
            ? "rgba(217,119,6,0.08)"
            : "rgba(10,37,64,0.06)",
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
  const [notice, setNotice] = useState<{ severity: "success" | "error" | "warning" | "info"; message: string } | null>(null);
  const showNotice = (severity: "success" | "error" | "warning" | "info", message: string) => {
    setNotice({ severity, message });
  };
  const theme = useTheme();
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;

  const [book, setBook] = useState<BookWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [showVR, setShowVR] = useState(false);

  const [copies, setCopies] = useState<BookCopy[]>([]);
  const [copiesLoading, setCopiesLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const fetchCopies = async () => {
    if (!bookId) return;
    setCopiesLoading(true);
    try {
      const data = await api.getBookCopies(bookId);
      const copyList = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.items)
        ? (data as any).items
        : Array.isArray((data as any)?.data)
        ? (data as any).data
        : [];
      setCopies(copyList);
    } catch (err) {
      console.error("Failed to load copies", err);
      setCopies([]);
    } finally {
      setCopiesLoading(false);
    }
  };

  useEffect(() => {
    if (!bookId) return;
    setLoading(true);
    setError(null);
    api.getBookById(bookId).then(setBook).catch((err) => setError(getErrorMessage(err))).finally(() => setLoading(false));
    fetchCopies();
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
      price: book.price ?? "",
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

    if (editForm.price !== "" && editForm.price !== null && Number(editForm.price) < 0) {
      errors.price = "Giá bìa không được âm";
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
        if (k === "page_count" || k === "average_rating" || k === "price") {
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
      showNotice("success", "Cập nhật sách thành công");
    } catch (err: any) {
      showNotice("error", getErrorMessage(err) || "Cập nhật sách thất bại");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!book || deleteConfirmText !== "XÓA") return;
    try {
      await api.bulkDeleteBooks([book.id]);
      router.push("/books");
    } catch (err: any) {
      if (err?.response?.status === 404) {
        showNotice("error", "Sách không tồn tại hoặc đã bị xóa.");
        router.push("/books");
      } else {
        showNotice("error", `Xóa thất bại: ${getErrorMessage(err) || "Lỗi không xác định"}`);
      }
    }
  };

  const headerActions = book ? (
    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
      <Tooltip title="Chỉnh sửa thông tin sách">
        <Button variant="outlined" startIcon={<EditIcon />} onClick={openEdit}>
          Sửa
        </Button>
      </Tooltip>
      <Button color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={() => setShowDelete(true)}>
        Xóa
      </Button>
    </Stack>
  ) : null;

  const borrowed = book ? book.total_copies - book.available_copies : 0;
  const isLongDescription = book?.description ? book.description.length > 300 : false;

  return (
    <LoadingOverlay loading={loading} message="Đang tải thông tin sách...">
      {error || !book ? (
        <EmptyState
          icon={<MenuBookIcon sx={{ fontSize: 56 }} />}
          title={error || "Không tìm thấy sách"}
          description="Sách có thể đã bị xóa hoặc ID không hợp lệ."
          action={
            <Button variant="contained" startIcon={<MenuBookIcon />} onClick={() => router.push("/books")}>
              Quay lại danh sách
            </Button>
          }
        />
      ) : (
        <Stack spacing={3}>
          <PageHeader
            backHref="/books"
            title={book.title}
            subtitle={book.subtitle || book.author || undefined}
            icon={MenuBookIcon}
            actions={headerActions}
          />

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }} sx={staggerSx(0)}>
              <DashboardCard noPadding>
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
                      <MenuBookIcon sx={{ fontSize: 72 }} />
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
                      right: book.shelf_location ? "calc(50% + 4px)" : 16,
                      width: "auto",
                      borderRadius: 2,
                      boxShadow: 3,
                      bgcolor: "rgba(139, 0, 0, 0.9)",
                      backdropFilter: "blur(4px)",
                      "&:hover": { bgcolor: "primary.dark" },
                    }}
                  >
                    Góc nhìn 3D
                  </Button>
                  {book.shelf_location ? (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<LocationOnIcon />}
                      onClick={() => setShowVR(true)}
                      sx={{
                        position: "absolute",
                        bottom: 16,
                        left: "calc(50% + 4px)",
                        right: 16,
                        width: "auto",
                        borderRadius: 2,
                        boxShadow: 3,
                        bgcolor: "rgba(16,185,129,0.9)",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      Chỉ đường đến kệ
                    </Button>
                  ) : null}
                </Box>

                <Box sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1} sx={{ mb: 2.5 }}>
                    <StatCard label="Tổng" value={book.total_copies} color="primary" icon={<GridViewIcon fontSize="small" />} />
                    <StatCard label="Sẵn sàng" value={book.available_copies} color="success" icon={<VerifiedIcon fontSize="small" />} />
                    <StatCard label="Đang mượn" value={borrowed} color="warning" icon={<MenuBookIcon fontSize="small" />} />
                  </Stack>

                  <Divider sx={{ mb: 1.5 }} />

                  <Box>
                    <MetaItem
                      icon={<GridViewIcon fontSize="small" />}
                      label="ISBN-13"
                      value={book.isbn13 || book.isbn}
                    />
                    {book.isbn10 ? (
                      <MetaItem icon={<GridViewIcon fontSize="small" />} label="ISBN-10" value={book.isbn10} />
                    ) : null}
                    {book.shelf_location ? (
                      <MetaItem icon={<LocationOnIcon fontSize="small" />} label="Vị trí" value={book.shelf_location} />
                    ) : null}
                    {book.language ? (
                      <MetaItem icon={<LanguageIcon fontSize="small" />} label="Ngôn ngữ" value={book.language} />
                    ) : null}
                    {book.price != null ? (
                      <MetaItem
                        icon={<PaymentsIcon fontSize="small" />}
                        label="Giá bìa"
                        value={`${Number(book.price).toLocaleString("vi-VN")} đ`}
                      />
                    ) : null}
                  </Box>
                </Box>
              </DashboardCard>
            </Grid>

            <Grid size={{ xs: 12, md: 8 }} sx={staggerSx(1)}>
              <Stack spacing={3}>
                <DashboardCard title="Chi tiết sách">
                  <Stack spacing={2}>
                    {book.author ? (
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Typography variant="body1" color="text.secondary">
                          Tác giả:
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {book.author}
                        </Typography>
                      </Stack>
                    ) : null}

                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                      {book.publisher ? (
                        <Chip icon={<MenuBookIcon sx={{ fontSize: 16 }} />} label={book.publisher} size="small" variant="outlined" />
                      ) : null}
                      {book.published_date ? (
                        <Chip
                          icon={<CalendarTodayIcon sx={{ fontSize: 16 }} />}
                          label={book.published_date}
                          size="small"
                          variant="outlined"
                        />
                      ) : null}
                      {book.page_count ? (
                        <Chip
                          icon={<DescriptionIcon sx={{ fontSize: 16 }} />}
                          label={`${book.page_count} trang`}
                          size="small"
                          variant="outlined"
                        />
                      ) : null}
                      {book.average_rating ? (
                        <Chip
                          icon={<StarIcon sx={{ fontSize: 16 }} />}
                          label={`${book.average_rating}/5`}
                          size="small"
                          variant="outlined"
                          color="warning"
                        />
                      ) : null}
                      {book.categories ? (
                        <Chip
                          icon={<CategoryIcon sx={{ fontSize: 16 }} />}
                          label={book.categories}
                          size="small"
                          variant="outlined"
                          sx={{ bgcolor: "primary.main", color: "primary.contrastText", borderColor: "primary.main" }}
                        />
                      ) : null}
                    </Stack>
                  </Stack>
                </DashboardCard>

                <Box sx={staggerSx(2)}>
                  <BookCopiesTable
                    bookId={book.id}
                    isbn={book.isbn13 || book.isbn}
                    copies={copies}
                    loading={copiesLoading}
                    onRefresh={() => {
                      fetchCopies();
                      api.getBookById(bookId).then(setBook);
                    }}
                    showNotice={showNotice}
                  />
                </Box>

                {book.description ? (
                  <Box sx={staggerSx(2)}>
                    <DashboardCard title="Mô tả">
                    <Box
                      sx={{
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
                      {isLongDescription ? (
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
                      ) : null}
                    </Box>
                  </DashboardCard>
                  </Box>
                ) : null}

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2,
                    ...staggerSx(3),
                  }}
                >
                  <DashboardCard>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Ngày tạo
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                      {book.created_at ? new Date(book.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" }) : "-"}
                    </Typography>
                  </DashboardCard>
                  <DashboardCard>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Ngày cập nhật
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                      {book.updated_at ? new Date(book.updated_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" }) : "-"}
                    </Typography>
                  </DashboardCard>
                </Box>

                <Stack direction="row" spacing={2} sx={{ mt: 1, ...staggerSx(4) }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<MenuBookIcon />}
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
            <DialogTitle sx={{ m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h6">Góc nhìn 3D</Typography>
              <IconButton onClick={() => setShow3D(false)}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0, overflow: "hidden" }}>
              {show3D ? <Book3DViewer coverUrl={book.cover_url || "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/1-2-3-go-book-cover.jpg/2560px-1-2-3-go-book-cover.jpg"} /> : null}
            </DialogContent>
          </Dialog>

          <Dialog open={showVR} onClose={() => setShowVR(false)} maxWidth="lg" fullWidth fullScreen>
            <DialogTitle sx={{ m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#0f172a", color: "white" }}>
              <Typography variant="h6">Chỉ đường đến kệ — {book.shelf_location}</Typography>
              <IconButton onClick={() => setShowVR(false)} sx={{ color: "white" }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0, overflow: "hidden" }}>
              {showVR ? <VRViewer /> : null}
            </DialogContent>
          </Dialog>

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
                  <TextField
                    label="Giá bìa (VNĐ)"
                    type="number"
                    fullWidth
                    value={editForm.price ?? ""}
                    onChange={(e) => handleEditChange("price", e.target.value)}
                    placeholder="VD: 150000"
                    error={!!editErrors.price}
                    helperText={editErrors.price}
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

          <Dialog open={showDelete} onClose={() => { setShowDelete(false); setDeleteConfirmText(""); }} fullWidth maxWidth="xs">
            <DialogTitle>Xóa sách?</DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Typography color="text.secondary">
                  Sách <strong>{book.title}</strong> sẽ bị xóa khỏi hệ thống. Hành động này không thể hoàn tác.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Nhập <strong>XÓA</strong> để xác nhận:
                </Typography>
                <TextField
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Nhập XÓA"
                  size="small"
                  autoFocus
                  fullWidth
                />
              </Stack>
            </DialogContent>
            <Box sx={{ px: 3, py: 2, display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
              <Button onClick={() => { setShowDelete(false); setDeleteConfirmText(""); }}>Hủy</Button>
              <Button color="error" variant="contained" onClick={handleDelete} disabled={deleteConfirmText !== "XÓA"}>
                Xóa vĩnh viễn
              </Button>
            </Box>
          </Dialog>

          <Snackbar
            open={Boolean(notice)}
            autoHideDuration={4000}
            onClose={() => setNotice(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          >
            {notice ? (
              <Alert
                onClose={() => setNotice(null)}
                severity={notice.severity}
                variant="filled"
                sx={{ width: "100%", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}
              >
                {notice.message}
              </Alert>
            ) : undefined}
          </Snackbar>
        </Stack>
      )}
    </LoadingOverlay>
  );
}
