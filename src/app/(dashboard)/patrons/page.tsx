"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  alpha,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import FaceIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import UpdateIcon from "@mui/icons-material/UpdateOutlined";
import PersonIcon from "@mui/icons-material/PersonOutlined";
import SchoolIcon from "@mui/icons-material/SchoolOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type { CaptureAngle } from "@/components/MultiAngleCapture";
import MultiAngleCapture from "@/components/MultiAngleCapture";
import StudentCardScanner, { type ScannedCardData } from "@/components/StudentCardScanner";
import type { PatronCreate, PatronPublic, PatronUpdate } from "@/lib/types";

type FilterValue = "all" | "active" | "inactive" | "expired" | "has_face" | "no_face";
type Notice = { severity: "success" | "error" | "warning" | "info"; message: string } | null;

const defaultIssueDate = new Date().toISOString().split("T")[0];
const defaultExpiry = new Date();
defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);
const defaultExpiryStr = defaultExpiry.toISOString().split("T")[0];

function emptyCreateForm(): PatronCreate {
  return {
    full_name: "",
    student_code: "",
    class_name: "",
    issue_date: defaultIssueDate,
    membership_expiry: defaultExpiryStr,
    course: "",
    permanent_address: "",
  };
}

function statusLabel(status: string) {
  if (status === "active") return "Hoạt động";
  if (status === "inactive") return "Tạm khóa";
  if (status === "expired") return "Hết hạn";
  return status;
}

function statusColor(status: string) {
  if (status === "active") return "success" as const;
  if (status === "inactive") return "warning" as const;
  if (status === "expired") return "error" as const;
  return "default" as const;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export default function PatronsPage() {
  const router = useRouter();
  const [patrons, setPatrons] = useState<PatronPublic[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createScan, setCreateScan] = useState(true);
  const [createForm, setCreateForm] = useState<PatronCreate>(emptyCreateForm());
  const [createError, setCreateError] = useState("");
  const [scannedFromCard, setScannedFromCard] = useState(false);
  const [createStep, setCreateStep] = useState<"scan" | "form" | "face" | "done">("scan");
  const [submitting, setSubmitting] = useState(false);

  const [editTarget, setEditTarget] = useState<PatronPublic | null>(null);
  const [editForm, setEditForm] = useState<PatronUpdate>({});
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PatronPublic | null>(null);

  const [notice, setNotice] = useState<Notice>(null);

  const showNotice = (severity: NonNullable<Notice>["severity"], message: string) => setNotice({ severity, message });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPatrons(await api.searchPatrons(query || undefined));
    } catch (err) {
      showNotice("error", getErrorMessage(err) || "Không thể tải danh sách độc giả");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = patrons;
    if (filter === "active") list = list.filter((p) => p.status === "active");
    else if (filter === "inactive") list = list.filter((p) => p.status === "inactive");
    else if (filter === "expired") list = list.filter((p) => p.status === "expired");
    else if (filter === "has_face") list = list.filter((p) => p.has_face);
    else if (filter === "no_face") list = list.filter((p) => !p.has_face);
    return list;
  }, [patrons, filter]);

  const handleCardScanned = (data: ScannedCardData) => {
    setCreateForm((prev) => ({
      ...prev,
      full_name: data.fullName || prev.full_name,
      student_code: data.studentCode || prev.student_code,
      class_name: data.className || prev.class_name,
      course: data.course || prev.course,
      permanent_address: data.permanentAddress || prev.permanent_address,
    }));
    setScannedFromCard(true);
    setCreateStep("form");
  };

  const closeCreate = () => {
    setShowCreate(false);
    setCreateScan(true);
    setCreateStep("scan");
    setCreateForm(emptyCreateForm());
    setCreateError("");
    setScannedFromCard(false);
    setSubmitting(false);
  };

  const handleFormNext = () => {
    if (!createForm.full_name.trim()) { setCreateError("Vui lòng nhập họ tên"); return; }
    if (!createForm.student_code.trim()) { setCreateError("Vui lòng nhập MSSV"); return; }
    setCreateError("");
    setCreateStep("face");
  };

  const handleSkipFace = async () => {
    setSubmitting(true);
    setCreateError("");
    try {
      await api.createPatron(createForm);
      closeCreate();
      await load();
      showNotice("success", "Đã tạo độc giả mới");
    } catch (err: any) {
      if (err?.response?.status === 409) setCreateError("MSSV hoặc mã thẻ đã tồn tại");
      else setCreateError(getErrorMessage(err) || "Tạo độc giả thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFaceReady = async (files: Record<CaptureAngle, File>) => {
    setSubmitting(true);
    setCreateError("");
    try {
      const newPatron = await api.createPatron(createForm);
      await api.enrollPatronFaceBatch(newPatron.id, files);
      closeCreate();
      await load();
      showNotice("success", "Đã tạo độc giả và đăng ký khuôn mặt");
    } catch (err: any) {
      if (err?.response?.status === 409) setCreateError("MSSV hoặc mã thẻ đã tồn tại");
      else setCreateError(getErrorMessage(err) || "Tạo độc giả thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (patron: PatronPublic) => {
    setEditTarget(patron);
    setEditForm({
      full_name: patron.full_name,
      class_name: patron.class_name || undefined,
      identity_number: patron.identity_number || undefined,
      email: patron.email || undefined,
      phone: patron.phone || undefined,
      membership_expiry: patron.membership_expiry,
      status: patron.status,
      course: patron.course || undefined,
      permanent_address: patron.permanent_address || undefined,
    });
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      await api.updatePatron(editTarget.id, editForm);
      setEditTarget(null);
      setEditForm({});
      await load();
      showNotice("success", "Đã cập nhật độc giả");
    } catch (err) {
      showNotice("error", getErrorMessage(err) || "Cập nhật thất bại");
    } finally {
      setEditSaving(false);
    }
  };

  const handleRenew = async (patron: PatronPublic) => {
    const next = new Date(patron.membership_expiry);
    next.setFullYear(next.getFullYear() + 1);
    try {
      await api.updatePatron(patron.id, { membership_expiry: next.toISOString().split("T")[0] });
      await load();
      showNotice("success", `Đã gia hạn thẻ ${patron.full_name} thêm 1 năm`);
    } catch (err) {
      showNotice("error", getErrorMessage(err) || "Gia hạn thất bại");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setPatrons((prev) => prev.filter((p) => p.id !== target.id));
    try {
      await api.deletePatron(target.id);
      showNotice("success", `Đã xóa độc giả ${target.full_name}`);
    } catch (err: any) {
      if (err?.response?.status === 404) showNotice("info", "Độc giả đã bị xóa trước đó");
      else { showNotice("error", getErrorMessage(err) || "Xóa thất bại"); await load(); }
    }
  };

  return (
    <Stack spacing={2.5}>
      {/* Header */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}
        sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Độc giả</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} size="small">
            Tải lại
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setCreateScan(true); setShowCreate(true); }}>
            Thêm độc giả
          </Button>
        </Stack>
      </Stack>

      {/* Search + Filters */}
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack spacing={1.5}>
          <TextField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Tìm theo tên, MSSV, mã thẻ..."
            size="small"
            fullWidth
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              },
            }}
          />
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_, val) => val && setFilter(val)}
            size="small"
            sx={{ flexWrap: "wrap", gap: 0.5, "& .MuiToggleButton-root": { px: 1.5, py: 0.4, borderRadius: "20px!important", border: "1px solid", borderColor: "divider", textTransform: "none", fontWeight: 600, fontSize: "0.8rem" } }}
          >
            <ToggleButton value="all">Tất cả</ToggleButton>
            <ToggleButton value="active">
              <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "success.main", mr: 0.6, flexShrink: 0 }} />
              Hoạt động
            </ToggleButton>
            <ToggleButton value="inactive">Tạm khóa</ToggleButton>
            <ToggleButton value="expired">Hết hạn</ToggleButton>
            <ToggleButton value="has_face">
              <FaceIcon sx={{ fontSize: 14, mr: 0.4 }} />
              Có khuôn mặt
            </ToggleButton>
            <ToggleButton value="no_face">Chưa có khuôn mặt</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {/* Card Grid */}
      {loading && filtered.length === 0 ? (
        <Stack sx={{ alignItems: "center", py: 8 }}><CircularProgress /></Stack>
      ) : filtered.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 5, textAlign: "center" }}>
          <PersonIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography color="text.secondary">Không tìm thấy độc giả nào</Typography>
          <Button variant="outlined" size="small" sx={{ mt: 1.5 }} onClick={() => { setQuery(""); setFilter("all"); }}>
            Xóa bộ lọc
          </Button>
        </Paper>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" }, gap: 2 }}>
          {filtered.map((patron) => (
            <Paper
              key={patron.id}
              variant="outlined"
              sx={{
                p: 2,
                cursor: "pointer",
                transition: "box-shadow .15s, border-color .15s",
                "&:hover": { borderColor: "primary.main", boxShadow: (t) => `0 0 0 1px ${alpha(t.palette.primary.main, 0.3)}` },
              }}
              onClick={() => router.push(`/patrons/${patron.id}`)}
            >
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: "primary.main", fontWeight: 700, fontSize: 15 }}>
                      {initials(patron.full_name)}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{patron.full_name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                        {patron.student_code}
                      </Typography>
                    </Box>
                  </Stack>
                  <Chip size="small" color={statusColor(patron.status)} label={statusLabel(patron.status)} sx={{ fontWeight: 700, fontSize: 11, height: 22 }} />
                </Stack>

                <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
                  {patron.course && (
                    <Typography variant="caption" color="text.secondary">
                      <SchoolIcon sx={{ fontSize: 12, mr: 0.3, verticalAlign: "text-top" }} />
                      {patron.course}
                    </Typography>
                  )}
                  <Typography variant="caption" color={patron.has_face ? "success.main" : "text.disabled"}>
                    <FaceIcon sx={{ fontSize: 12, mr: 0.3, verticalAlign: "text-top" }} />
                    {patron.has_face ? "Đã có khuôn mặt" : "Chưa có"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Hạn: {patron.membership_expiry}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                  <IconButton size="small" title="Sửa" onClick={() => openEdit(patron)} sx={{ color: "text.secondary" }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" title="Gia hạn" onClick={() => handleRenew(patron)} sx={{ color: "success.main" }}>
                    <UpdateIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" title="Chi tiết" onClick={() => router.push(`/patrons/${patron.id}`)} sx={{ color: "text.secondary" }}>
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Box>
      )}

      {/* ─── CREATE DIALOG (full-screen scan-first) ─── */}
      <Dialog open={showCreate} onClose={closeCreate} fullWidth maxWidth={createStep === "scan" ? "lg" : "sm"}>
        {createStep === "scan" ? (
          <>
            <DialogTitle sx={{ pb: 0 }}>
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Quét thẻ sinh viên</Typography>
                <IconButton onClick={closeCreate}><CloseIcon /></IconButton>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Đặt thẻ sinh viên vào khung hình để tự động nhận dạng thông tin
              </Typography>
            </DialogTitle>
            <DialogContent sx={{ display: "flex", flexDirection: "column", pb: 2 }}>
              <StudentCardScanner
                onScanned={handleCardScanned}
                onError={(msg) => setCreateError(msg)}
                onSkip={() => { setCreateScan(false); setCreateStep("form"); }}
              />
              {createError && <Alert severity="error" sx={{ mt: 2 }}>{createError}</Alert>}
            </DialogContent>
          </>
        ) : createStep === "form" ? (
          <>
            <DialogTitle>
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Thông tin độc giả</Typography>
                <IconButton onClick={closeCreate}><CloseIcon /></IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {scannedFromCard && (
                  <Alert severity="info" sx={{ fontSize: "0.8rem" }}>Đã điền thông tin từ thẻ sinh viên</Alert>
                )}
                {createScan && (
                  <Button variant="outlined" startIcon={<CameraAltIcon />} onClick={() => setCreateStep("scan")} fullWidth size="small">
                    Quét lại thẻ
                  </Button>
                )}
                <TextField label="Họ tên" value={createForm.full_name} onChange={(e) => { setCreateForm({ ...createForm, full_name: e.target.value }); setCreateError(""); }} required fullWidth />
                <TextField label="MSSV" value={createForm.student_code} onChange={(e) => { setCreateForm({ ...createForm, student_code: e.target.value }); setCreateError(""); }} required fullWidth />
                <TextField label="Lớp" value={createForm.class_name || ""} onChange={(e) => setCreateForm({ ...createForm, class_name: e.target.value })} fullWidth />
                <TextField label="Khóa học" value={createForm.course || ""} onChange={(e) => setCreateForm({ ...createForm, course: e.target.value })} fullWidth />
                <TextField label="HKTT" value={createForm.permanent_address || ""} onChange={(e) => setCreateForm({ ...createForm, permanent_address: e.target.value })} fullWidth multiline rows={2} />
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                  <TextField label="Ngày cấp thẻ" type="date" value={createForm.issue_date} onChange={(e) => setCreateForm({ ...createForm, issue_date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                  <TextField label="Hạn thẻ" type="date" value={createForm.membership_expiry} onChange={(e) => setCreateForm({ ...createForm, membership_expiry: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                </Box>
                {createError && <Alert severity="error">{createError}</Alert>}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={closeCreate} color="inherit">Hủy</Button>
              <Button variant="outlined" onClick={handleSkipFace} disabled={submitting}>
                {submitting ? <CircularProgress size={18} /> : "Tạo (bỏ qua khuôn mặt)"}
              </Button>
              <Button variant="contained" onClick={handleFormNext}>
                Tiếp tục → Đăng ký khuôn mặt
              </Button>
            </DialogActions>
          </>
        ) : (
          <>
            <DialogTitle>
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Đăng ký khuôn mặt</Typography>
                <IconButton onClick={closeCreate}><CloseIcon /></IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Alert severity="info">Chụp khuôn mặt từ 4 góc để nhận diện tại cổng.</Alert>
                <MultiAngleCapture consent={true} onFilesReady={handleFaceReady} />
                {createError && <Alert severity="error">{createError}</Alert>}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setCreateStep("form")} color="inherit">Quay lại</Button>
              <Button variant="contained" onClick={handleSkipFace} disabled={submitting}>
                {submitting ? <CircularProgress size={18} /> : "Bỏ qua + Tạo"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ─── EDIT DRAWER (slide panel) ─── */}
      <Drawer
        anchor="right"
        open={!!editTarget}
        onClose={() => { if (!editSaving) setEditTarget(null); }}
        slotProps={{ backdrop: { invisible: true } }}
      >
        <Box sx={{ width: { xs: "100vw", sm: 440 }, display: "flex", flexDirection: "column", height: "100%" }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2.5, py: 2, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Sửa độc giả</Typography>
            <IconButton onClick={() => setEditTarget(null)}><CloseIcon /></IconButton>
          </Stack>

          {editTarget && (
            <Stack spacing={2.5} sx={{ flex: 1, overflow: "auto", px: 2.5, py: 2.5 }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                <Avatar sx={{ width: 48, height: 48, bgcolor: "primary.main", fontWeight: 700 }}>
                  {initials(editTarget.full_name)}
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{editTarget.full_name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                    {editTarget.student_code}
                  </Typography>
                </Box>
              </Stack>

              <TextField label="Họ tên" value={editForm.full_name || ""} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} fullWidth />
              <TextField label="Lớp" value={editForm.class_name || ""} onChange={(e) => setEditForm({ ...editForm, class_name: e.target.value })} fullWidth />
              <TextField label="Khóa học" value={editForm.course || ""} onChange={(e) => setEditForm({ ...editForm, course: e.target.value })} fullWidth />
              <TextField label="HKTT" value={editForm.permanent_address || ""} onChange={(e) => setEditForm({ ...editForm, permanent_address: e.target.value })} fullWidth multiline rows={2} />
              <TextField label="CMND/CCCD" value={editForm.identity_number || ""} onChange={(e) => setEditForm({ ...editForm, identity_number: e.target.value })} fullWidth />
              <TextField label="Email" value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} fullWidth />
              <TextField label="SĐT" value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} fullWidth />
              <TextField label="Hạn thẻ" type="date" value={editForm.membership_expiry || ""} onChange={(e) => setEditForm({ ...editForm, membership_expiry: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              <TextField select label="Trạng thái" value={editForm.status || "active"} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} fullWidth>
                <MenuItem value="active">Hoạt động</MenuItem>
                <MenuItem value="inactive">Tạm khóa</MenuItem>
                <MenuItem value="expired">Hết hạn</MenuItem>
              </TextField>
            </Stack>
          )}

          <Stack direction="row" spacing={1.5} sx={{ px: 2.5, py: 2, borderTop: 1, borderColor: "divider" }}>
            <Button fullWidth variant="outlined" onClick={() => setEditTarget(null)} disabled={editSaving}>Hủy</Button>
            <Button fullWidth variant="contained" onClick={handleEdit} disabled={editSaving}>
              {editSaving ? <CircularProgress size={20} /> : "Lưu thay đổi"}
            </Button>
          </Stack>
        </Box>
      </Drawer>

      {/* ─── DELETE CONFIRM ─── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Xóa độc giả?</DialogTitle>
        <DialogContent>
          <Typography>Xóa <strong>{deleteTarget?.full_name}</strong>? Thao tác này không thể hoàn tác từ giao diện.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} color="inherit">Hủy</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Xóa</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!notice} autoHideDuration={3500} onClose={() => setNotice(null)}>
        {notice ? <Alert severity={notice.severity} onClose={() => setNotice(null)}>{notice.message}</Alert> : undefined}
      </Snackbar>
    </Stack>
  );
}
