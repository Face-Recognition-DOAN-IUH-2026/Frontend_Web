"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
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
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import FaceIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import UpdateIcon from "@mui/icons-material/UpdateOutlined";
import PeopleIcon from "@mui/icons-material/PeopleOutlined";
import PersonIcon from "@mui/icons-material/PersonOutlined";
import BadgeIcon from "@mui/icons-material/BadgeOutlined";
import SchoolIcon from "@mui/icons-material/SchoolOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import { initials, statusLabel, statusColor } from "@/lib/utils";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import PageHeader from "@/components/ui/PageHeader";
import DashboardCard from "@/components/ui/DashboardCard";
import MuiStatCard from "@/components/ui/MuiStatCard";
import EmptyState from "@/components/ui/EmptyState";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import NoticeSnackbar from "@/components/ui/NoticeSnackbar";
import SearchField from "@/components/ui/SearchField";
import type { CaptureAngle } from "@/components/MultiAngleCapture";
import MultiAngleCapture from "@/components/MultiAngleCapture";
import StudentCardScanner, { type ScannedCardData } from "@/components/StudentCardScanner";
import type { PatronCreate, PatronPublic, PatronUpdate } from "@/lib/types";

type FilterValue = "all" | "active" | "inactive" | "expired" | "has_face" | "no_face" | "deleted";
type Notice = { severity: "success" | "error" | "warning" | "info"; message: string } | null;

const RAW_CAM_URL = process.env.NEXT_PUBLIC_BORROW_CAM_URL || "http://192.168.1.6:8080/video";
const CARD_CAM_URL = `/api/camera/proxy?url=${encodeURIComponent(RAW_CAM_URL)}`;

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
    identity_number: "",
    email: "",
    phone: "",
  };
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
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [restoreTarget, setRestoreTarget] = useState<PatronPublic | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");

  const [renewTarget, setRenewTarget] = useState<PatronPublic | null>(null);
  const [renewMonths, setRenewMonths] = useState(12);

  const [notice, setNotice] = useState<Notice>(null);

  const showNotice = (severity: NonNullable<Notice>["severity"], message: string) => setNotice({ severity, message });

  useEffect(() => {
    if (createStep === "form") {
      let startYear = 0;
      let endYear = 0;
      
      const courseStr = (createForm.course || "").toString();
      const years = courseStr.match(/\b(20\d{2})\b/g);
      
      if (years && years.length > 0) {
        startYear = parseInt(years[0]);
        endYear = years.length > 1 ? parseInt(years[1]) : startYear + 4;
      } else if (createForm.student_code && createForm.student_code.match(/^(1[0-9]|2[0-9])/)) {
        const prefix = parseInt(createForm.student_code.substring(0, 2));
        startYear = 2000 + prefix;
        endYear = startYear + 4;
      }
      
      if (startYear > 0 && endYear > 0) {
        const newIssue = `${startYear}-09-01`;
        const newExpiry = `${endYear}-09-01`;
        
        setCreateForm(prev => {
          if (prev.issue_date !== newIssue || prev.membership_expiry !== newExpiry) {
            return { ...prev, issue_date: newIssue, membership_expiry: newExpiry };
          }
          return prev;
        });
      }
    }
  }, [createForm.course, createForm.student_code, createStep]);

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
    else if (filter === "deleted") list = list.filter((p) => p.status === "deleted");
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

  const handleRenew = async () => {
    if (!renewTarget) return;
    const next = new Date(renewTarget.membership_expiry);
    if (next < new Date()) next.setTime(Date.now());
    next.setMonth(next.getMonth() + renewMonths);
    try {
      await api.updatePatron(renewTarget.id, { membership_expiry: next.toISOString().split("T")[0] });
      setRenewTarget(null);
      setRenewMonths(12);
      await load();
      showNotice("success", `Đã gia hạn thẻ ${renewTarget.full_name} ${renewMonths} tháng`);
    } catch (err) {
      showNotice("error", getErrorMessage(err) || "Gia hạn thất bại");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirmText !== "XÓA") return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setDeleteConfirmText("");
    setPatrons((prev) => prev.filter((p) => p.id !== target.id));
    try {
      await api.deletePatron(target.id);
      showNotice("success", `Đã xóa độc giả ${target.full_name}`);
    } catch (err: any) {
      if (err?.response?.status === 404) showNotice("info", "Độc giả đã bị xóa trước đó");
      else { showNotice("error", getErrorMessage(err) || "Xóa thất bại"); await load(); }
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget || restoreConfirmText !== "KHÔI PHỤC") return;
    const target = restoreTarget;
    setRestoreTarget(null);
    setRestoreConfirmText("");
    setPatrons((prev) => prev.filter((p) => p.id !== target.id));
    try {
      await api.restorePatron(target.id);
      showNotice("success", `Đã khôi phục độc giả ${target.full_name}`);
    } catch (err: any) {
      showNotice("error", getErrorMessage(err) || "Khôi phục thất bại");
      await load();
    }
  };

  const activeCount  = patrons.filter((p) => p.status === "active").length;
  const expiredCount = patrons.filter((p) => p.status === "expired" || p.status === "inactive").length;
  const faceCount    = patrons.filter((p) => p.has_face).length;

  const STAT_GRADIENT = {
    total: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
    active: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    expired: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    face: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
  };

  const FILTERS: { value: FilterValue; label: string }[] = [
    { value: "all",      label: "Tất cả" },
    { value: "active",   label: "Hoạt động" },
    { value: "inactive", label: "Tạm khóa" },
    { value: "expired",  label: "Hết hạn" },
    { value: "has_face", label: "Có khuôn mặt" },
    { value: "no_face",  label: "Chưa có khuôn mặt" },
    { value: "deleted",  label: "Đã xóa" },
  ];

  const statItems = [
    { label: "Tổng độc giả", value: patrons.length, gradient: STAT_GRADIENT.total, icon: PeopleIcon, pct: 100 },
    { label: "Hoạt động", value: activeCount, gradient: STAT_GRADIENT.active, icon: PersonIcon, pct: patrons.length ? Math.round((activeCount / patrons.length) * 100) : 0 },
    { label: "Hết hạn / Khóa", value: expiredCount, gradient: STAT_GRADIENT.expired, icon: UpdateIcon, pct: patrons.length ? Math.round((expiredCount / patrons.length) * 100) : 0 },
    { label: "Có khuôn mặt", value: faceCount, gradient: STAT_GRADIENT.face, icon: FaceIcon, pct: patrons.length ? Math.round((faceCount / patrons.length) * 100) : 0 },
  ];

  const statBadges = `${patrons.length} độc giả · ${activeCount} đang hoạt động · ${faceCount} đã đăng ký khuôn mặt`;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Quản lý Độc giả"
        icon={PeopleIcon}
        gradient="linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)"
        statBadges={statBadges}
        onRefresh={load}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setCreateScan(true); setShowCreate(true); }}
            sx={{ background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", borderRadius: 2, fontWeight: 700, textTransform: "none", boxShadow: "0 4px 14px rgba(99,102,241,0.4)", "&:hover": { background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)" } }}>
            Thêm độc giả
          </Button>
        }
      />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2 }}>
        {statItems.map((item, idx) => (
          <MuiStatCard
            key={item.label}
            label={item.label}
            value={item.value}
            icon={item.icon}
            gradient={item.gradient}
            pct={item.pct}
            index={idx}
          />
        ))}
      </Box>

      <DashboardCard noPadding>
        <Stack spacing={1.5} sx={{ p: 2 }}>
          <SearchField value={query} onChange={setQuery} placeholder="Tìm theo tên, MSSV, mã thẻ..." />
          <ToggleButtonGroup value={filter} onChange={(_, v) => { if (v) setFilter(v); }} size="small" exclusive
            sx={{ display: "flex", flexWrap: "wrap", gap: 0.75,
              "& .MuiToggleButton-root": { border: "1px solid", borderColor: "divider", borderRadius: "20px !important", px: 1.5, py: 0.5, fontSize: "0.75rem", fontWeight: 600, textTransform: "none", color: "text.secondary",
                "&.Mui-selected": { bgcolor: "primary.main", color: "#fff", "&:hover": { bgcolor: "primary.dark" } } } }}>
            {FILTERS.map((f) => (<ToggleButton key={f.value} value={f.value}>{f.label}</ToggleButton>))}
          </ToggleButtonGroup>
        </Stack>
      </DashboardCard>

      {loading && filtered.length === 0 ? (
        <LoadingOverlay loading message="Đang tải danh sách độc giả..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<PersonIcon sx={{ fontSize: 32 }} />}
          title="Không tìm thấy độc giả nào"
          action={<Button size="small" sx={{ textTransform: "none" }} onClick={() => { setQuery(""); setFilter("all"); }}>Xóa bộ lọc</Button>}
        />
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 2 }}>
          {filtered.map((patron, idx) => {
            const isExpired = new Date(patron.membership_expiry) < new Date();
            const isSoonExp = !isExpired && (new Date(patron.membership_expiry).getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;
            return (
              <Paper key={patron.id} variant="outlined"
                onClick={() => router.push(`/patrons/${patron.id}`)}
                sx={{ borderRadius: 3, p: 0, cursor: "pointer", transition: "all 0.25s ease", overflow: "hidden",
                  ...staggerSx(idx, 0.05),
                  "&:hover": { transform: "translateY(-2px)", boxShadow: 4, borderColor: "primary.main" } }}>
                <Box sx={{ height: 4, background: patron.status === "active" ? STAT_GRADIENT.active : patron.status === "expired" ? STAT_GRADIENT.expired : "linear-gradient(135deg, #64748b 0%, #475569 100%)" }} />
                <Box sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", mb: 2 }}>
                    <Avatar sx={{ width: 44, height: 44, bgcolor: patron.status === "active" ? "rgba(16,185,129,0.15)" : patron.status === "expired" ? "rgba(245,158,11,0.15)" : "rgba(100,116,139,0.15)", color: patron.status === "active" ? "success.main" : patron.status === "expired" ? "warning.main" : "text.secondary", fontWeight: 700, fontSize: 16 }}>
                      {initials(patron.full_name)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{patron.full_name}</Typography>
                      <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>{patron.student_code}</Typography>
                    </Box>
                    <Chip label={statusLabel(patron.status)} color={statusColor(patron.status)} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: "0.7rem", height: 24 }} />
                  </Stack>
                  <Stack spacing={0.75} sx={{ mb: 2 }}>
                    {patron.course ? (
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <SchoolIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                        <Typography variant="caption" color="text.secondary">{patron.course}</Typography>
                      </Stack>
                    ) : null}
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <FaceIcon sx={{ fontSize: 14, color: patron.has_face ? "primary.main" : "action.disabled" }} />
                      <Typography variant="caption" color={patron.has_face ? "primary.main" : "text.secondary"}>
                        {patron.has_face ? "Đã đăng ký khuôn mặt" : "Chưa có khuôn mặt"}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <BadgeIcon sx={{ fontSize: 14, color: isExpired ? "error.main" : isSoonExp ? "warning.main" : "text.secondary" }} />
                      <Typography variant="caption" color={isExpired ? "error.main" : isSoonExp ? "warning.main" : "text.secondary"}>
                        Hạn thẻ: {patron.membership_expiry}{isExpired ? " — Hết hạn" : isSoonExp ? " — Sắp hết hạn" : ""}
                      </Typography>
                    </Stack>
                  </Stack>
                  <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end", pt: 1.5, borderTop: 1, borderColor: "divider" }} onClick={(e) => e.stopPropagation()}>
                    {patron.status === "deleted" ? (
                      <>
                        <Button size="small" variant="outlined" color="success" onClick={() => { setRestoreTarget(patron); setRestoreConfirmText(""); }} sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.75rem" }}>Khôi phục</Button>
                        <IconButton size="small" color="error" onClick={() => { setDeleteTarget(patron); setDeleteConfirmText(""); }} title="Xóa vĩnh viễn"><DeleteIcon fontSize="small" /></IconButton>
                      </>
                    ) : (
                      <>
                        <Tooltip title="Chỉnh sửa"><IconButton size="small" onClick={() => openEdit(patron)} sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Gia hạn thẻ"><IconButton size="small" onClick={() => { setRenewTarget(patron); setRenewMonths(12); }} sx={{ color: "text.secondary", "&:hover": { color: "success.main" } }}><UpdateIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Xóa"><IconButton size="small" onClick={() => { setDeleteTarget(patron); setDeleteConfirmText(""); }} sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Xem chi tiết"><IconButton size="small" onClick={() => router.push(`/patrons/${patron.id}`)} sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}><ChevronRightIcon fontSize="small" /></IconButton></Tooltip>
                      </>
                    )}
                  </Stack>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}

      <Dialog open={showCreate} onClose={closeCreate} fullScreen>
        <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", bgcolor: "background.default" }}>
          <Box sx={{ px: 3, py: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Cấp phát thẻ độc giả mới</Typography>
            <IconButton onClick={closeCreate} sx={{ bgcolor: "action.hover" }}><CloseIcon /></IconButton>
          </Box>
          
          <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <Box sx={{ flex: 1, bgcolor: "grey.50", display: { xs: "none", md: "flex" }, alignItems: "center", justifyContent: "center", p: 4, borderRight: 1, borderColor: "divider", position: "relative" }}>
              <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.4, backgroundImage: "radial-gradient(#1976d2 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
              
              <Box sx={{ 
                width: 420, 
                aspectRatio: "1.586", 
                borderRadius: 4, 
                bgcolor: "primary.main", 
                color: "white", 
                p: 4, 
                boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                position: "relative",
                overflow: "hidden",
                background: "linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)",
                zIndex: 1,
                transition: "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                "&:hover": { transform: "scale(1.02)" }
              }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 4 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 2 }}>THẺ THƯ VIỆN</Typography>
                  <SchoolIcon sx={{ opacity: 0.5 }} />
                </Box>
                <Stack direction="row" spacing={3} sx={{ alignItems: "center" }}>
                  <Avatar sx={{ width: 80, height: 80, bgcolor: "rgba(255,255,255,0.2)", fontSize: 32, fontWeight: 700, border: "2px solid rgba(255,255,255,0.4)" }}>
                    {initials(createForm.full_name || "?")}
                  </Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>{createForm.full_name || "HỌ VÀ TÊN"}</Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9, fontFamily: "monospace", fontSize: "1.1rem", mt: 0.5 }}>{createForm.student_code || "MSSV"}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.5 }}>{createForm.class_name || "Lớp"}</Typography>
                  </Box>
                </Stack>
                <Box sx={{ position: "absolute", bottom: -20, right: -20, opacity: 0.1 }}>
                  <SchoolIcon sx={{ fontSize: 160 }} />
                </Box>
              </Box>
            </Box>

            <Box sx={{ flex: { xs: 1, md: "0 0 500px" }, display: "flex", flexDirection: "column", bgcolor: "background.paper", boxShadow: "-4px 0 24px rgba(0,0,0,0.02)", zIndex: 2 }}>
              <Box sx={{ p: 4, borderBottom: 1, borderColor: "divider", bgcolor: "background.default" }}>
                <Stepper activeStep={createStep === "scan" ? 0 : createStep === "form" ? 1 : 2} alternativeLabel>
                  <Step><StepLabel>Quét thẻ</StepLabel></Step>
                  <Step><StepLabel>Thông tin</StepLabel></Step>
                  <Step><StepLabel>Khuôn mặt</StepLabel></Step>
                </Stepper>
              </Box>
              <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 3, md: 5 } }}>
                {createStep === "scan" ? (
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Quét thẻ sinh viên</Typography>
                      <Typography variant="body2" color="text.secondary">Đặt thẻ sinh viên vào camera để hệ thống tự động trích xuất thông tin một cách nhanh chóng.</Typography>
                    </Box>
                    <Box sx={{ borderRadius: 3, overflow: "hidden", border: "2px dashed", borderColor: "divider", bgcolor: "grey.50" }}>
                      <StudentCardScanner
                        onScanned={handleCardScanned}
                        onError={(msg) => setCreateError(msg)}
                        onSkip={() => { setCreateScan(false); setCreateStep("form"); }}
                        videoSource="ipcamera"
                        ipCameraUrl={CARD_CAM_URL}
                      />
                    </Box>
                    {createError ? <Alert severity="error" sx={{ borderRadius: 2 }}>{createError}</Alert> : null}
                  </Stack>
                ) : null}
                {createStep === "form" ? (
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Thông tin cá nhân</Typography>
                      {scannedFromCard ? (
                        <Alert severity="success" sx={{ borderRadius: 2 }}>Đã trích xuất thông tin thành công từ thẻ sinh viên.</Alert>
                      ) : (
                        <Typography variant="body2" color="text.secondary">Vui lòng điền thông tin chi tiết của độc giả mới.</Typography>
                      )}
                    </Box>
                    
                    <Stack spacing={2.5}>
                      <TextField label="Họ tên" value={createForm.full_name} onChange={(e) => { setCreateForm({ ...createForm, full_name: e.target.value }); setCreateError(""); }} required fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
                      <TextField label="MSSV" value={createForm.student_code} onChange={(e) => { setCreateForm({ ...createForm, student_code: e.target.value }); setCreateError(""); }} required fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
                      
                      <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
                        <Box sx={{ flex: 1 }}><TextField label="Lớp" value={createForm.class_name || ""} onChange={(e) => setCreateForm({ ...createForm, class_name: e.target.value })} fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} /></Box>
                        <Box sx={{ flex: 1 }}><TextField label="Khóa học" value={createForm.course || ""} onChange={(e) => setCreateForm({ ...createForm, course: e.target.value })} fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} /></Box>
                      </Box>
                      
                      <TextField label="CMND/CCCD" value={createForm.identity_number || ""} onChange={(e) => setCreateForm({ ...createForm, identity_number: e.target.value })} fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
                      <TextField label="Email" type="email" value={createForm.email || ""} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
                      <TextField label="Số điện thoại" value={createForm.phone || ""} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
                      <TextField label="Hộ khẩu thường trú" value={createForm.permanent_address || ""} onChange={(e) => setCreateForm({ ...createForm, permanent_address: e.target.value })} fullWidth multiline rows={2} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
                      
                      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                        <TextField label="Ngày cấp thẻ" type="date" value={createForm.issue_date} onChange={(e) => setCreateForm({ ...createForm, issue_date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} helperText={createForm.course ? "Tự động tính theo khóa" : ""} />
                        <TextField label="Hạn thẻ" type="date" value={createForm.membership_expiry} onChange={(e) => setCreateForm({ ...createForm, membership_expiry: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} helperText={createForm.course ? "Tự động tính theo khóa" : ""} />
                      </Box>
                    </Stack>
                    {createError ? <Alert severity="error" sx={{ borderRadius: 2 }}>{createError}</Alert> : null}
                  </Stack>
                ) : null}
                {createStep === "face" ? (
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Bảo mật khuôn mặt</Typography>
                      <Typography variant="body2" color="text.secondary">Vui lòng hướng mặt về phía camera để hệ thống thu thập dữ liệu sinh trắc học dùng cho cổng an ninh.</Typography>
                    </Box>
                    <Box sx={{ borderRadius: 3, overflow: "hidden", border: 1, borderColor: "divider", p: 2, bgcolor: "grey.50" }}>
                      <MultiAngleCapture consent={true} onFilesReady={handleFaceReady} />
                    </Box>
                    {createError ? <Alert severity="error" sx={{ borderRadius: 2 }}>{createError}</Alert> : null}
                  </Stack>
                ) : null}
              </Box>
              
              <Box sx={{ p: { xs: 3, md: 4 }, borderTop: 1, borderColor: "divider", bgcolor: "background.default" }}>
                {createStep === "scan" ? (
                  <Button variant="contained" fullWidth size="large" onClick={() => { setCreateScan(false); setCreateStep("form"); }} sx={{ borderRadius: 2, py: 1.5, fontWeight: 700 }}>Nhập thông tin thủ công</Button>
                ) : null}
                {createStep === "form" ? (
                  <Stack direction="row" spacing={2}>
                    <Button variant="outlined" fullWidth onClick={() => setCreateStep("scan")} sx={{ borderRadius: 2, py: 1.5, fontWeight: 700 }}>Quét lại thẻ</Button>
                    <Button variant="contained" fullWidth onClick={handleFormNext} sx={{ borderRadius: 2, py: 1.5, fontWeight: 700 }}>Tiếp tục</Button>
                  </Stack>
                ) : null}
                {createStep === "face" ? (
                  <Stack direction="row" spacing={2}>
                    <Button variant="outlined" fullWidth onClick={() => setCreateStep("form")} disabled={submitting} sx={{ borderRadius: 2, py: 1.5, fontWeight: 700 }}>Quay lại</Button>
                    <Button variant="contained" fullWidth onClick={handleSkipFace} disabled={submitting} sx={{ borderRadius: 2, py: 1.5, fontWeight: 700 }}>
                      {submitting ? <CircularProgress size={24} color="inherit" /> : "Tạo (Bỏ qua Face)"}
                    </Button>
                  </Stack>
                ) : null}
              </Box>
            </Box>
          </Box>
        </Box>
      </Dialog>

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

          {editTarget ? (
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
          ) : null}

          <Stack direction="row" spacing={1.5} sx={{ px: 2.5, py: 2, borderTop: 1, borderColor: "divider" }}>
            <Button fullWidth variant="outlined" onClick={() => setEditTarget(null)} disabled={editSaving}>Hủy</Button>
            <Button fullWidth variant="contained" onClick={handleEdit} disabled={editSaving}>
              {editSaving ? <CircularProgress size={20} /> : "Lưu thay đổi"}
            </Button>
          </Stack>
        </Box>
      </Drawer>

      <Dialog open={!!renewTarget} onClose={() => { setRenewTarget(null); setRenewMonths(12); }}>
        <DialogTitle>Gia hạn thẻ độc giả</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography>
              Gia hạn thẻ cho <strong>{renewTarget?.full_name}</strong> ({renewTarget?.student_code})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Hạn hiện tại: {renewTarget?.membership_expiry}
            </Typography>
            <TextField
              select
              label="Gia hạn thêm"
              value={renewMonths}
              onChange={(e) => setRenewMonths(Number(e.target.value))}
              fullWidth
            >
              <MenuItem value={1}>1 tháng</MenuItem>
              <MenuItem value={3}>3 tháng</MenuItem>
              <MenuItem value={6}>6 tháng</MenuItem>
              <MenuItem value={12}>1 năm</MenuItem>
              <MenuItem value={24}>2 năm</MenuItem>
            </TextField>
            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
              Hạn mới: {(() => {
                const d = new Date(renewTarget?.membership_expiry || Date.now());
                if (d < new Date()) d.setTime(Date.now());
                d.setMonth(d.getMonth() + renewMonths);
                return d.toISOString().split("T")[0];
              })()}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRenewTarget(null); setRenewMonths(12); }} color="inherit">Hủy</Button>
          <Button variant="contained" onClick={handleRenew}>Gia hạn</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}>
        <DialogTitle>Xóa độc giả?</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography>
              Xóa <strong>{deleteTarget?.full_name}</strong>? Thao tác này sẽ xóa dữ liệu liên quan (thông báo, lịch trực) và không thể hoàn tác từ giao diện.
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
        <DialogActions>
          <Button onClick={() => { setDeleteTarget(null); setDeleteConfirmText(""); }} color="inherit">Hủy</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleteConfirmText !== "XÓA"}>
            Xóa vĩnh viễn
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!restoreTarget} onClose={() => { setRestoreTarget(null); setRestoreConfirmText(""); }}>
        <DialogTitle>Khôi phục độc giả?</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography>
              Khôi phục <strong>{restoreTarget?.full_name}</strong>? Nếu thẻ đã hết hạn, hạn thẻ sẽ được tự động gia hạn 1 năm.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Nhập <strong>KHÔI PHỤC</strong> để xác nhận:
            </Typography>
            <TextField
              value={restoreConfirmText}
              onChange={(e) => setRestoreConfirmText(e.target.value)}
              placeholder="Nhập KHÔI PHỤC"
              size="small"
              autoFocus
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRestoreTarget(null); setRestoreConfirmText(""); }} color="inherit">Hủy</Button>
          <Button color="success" variant="contained" onClick={handleRestore} disabled={restoreConfirmText !== "KHÔI PHỤC"}>
            Khôi phục
          </Button>
        </DialogActions>
      </Dialog>

      <NoticeSnackbar
        open={!!notice}
        message={notice?.message || ""}
        severity={notice?.severity || "success"}
        onClose={() => setNotice(null)}
      />
    </Stack>
  );
}
