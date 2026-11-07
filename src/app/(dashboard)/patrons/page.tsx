"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
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
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import PeopleIcon from "@mui/icons-material/PeopleOutlined";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import UpdateIcon from "@mui/icons-material/UpdateOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import { usePermission, getPermissionDeniedReason } from "@/lib/permission-context";
import { initials } from "@/lib/utils";
import { useToast } from "@/lib/toast-context";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import ConfirmDialog from "@/app/(dashboard)/_components/ui/ConfirmDialog";
import PatronStatCards from "@/app/(dashboard)/_components/ui/PatronStatCards";
import PatronToolbar from "@/app/(dashboard)/_components/ui/PatronToolbar";
import PatronListView from "@/app/(dashboard)/_components/ui/PatronListView";
import PatronImportWizard from "@/app/(dashboard)/_components/ui/PatronImportWizard";
import CreatePatronDialog from "@/app/(dashboard)/_components/ui/CreatePatronDialog";
import type { PatronCreate, PatronPublic, PatronUpdate } from "@/lib/types";

export type FilterValue = "all" | "active" | "inactive" | "expired" | "has_face" | "no_face" | "deleted";

const STAT_GRADIENT = {
  total: "linear-gradient(135deg, #0A2540 0%, #0F3C5C 100%)",
  active: "linear-gradient(135deg, #059669 0%, #047857 100%)",
  expired: "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
  face: "linear-gradient(135deg, #8B0000 0%, #700000 100%)",
};

export default function PatronsPage() {
  const router = useRouter();
  const { can } = usePermission();
  const { toast } = useToast();
  const canCreatePatron = can("patrons", "create");
  const canUpdatePatron = can("patrons", "update");
  const canDeletePatron = can("patrons", "delete");

  const [patrons, setPatrons] = useState<PatronPublic[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [editTarget, setEditTarget] = useState<PatronPublic | null>(null);
  const [editForm, setEditForm] = useState<PatronUpdate>({});
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PatronPublic | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [restoreTarget, setRestoreTarget] = useState<PatronPublic | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");

  const [renewTarget, setRenewTarget] = useState<PatronPublic | null>(null);
  const [renewMonths, setRenewMonths] = useState(12);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await api.searchPatrons(debouncedQuery || undefined, undefined, 0, 1000);
      setPatrons(items);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Không thể tải danh sách độc giả");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = patrons;
    if (filter === "active") list = list.filter((p) => p.status === "active");
    else if (filter === "inactive") list = list.filter((p) => p.status === "inactive");
    else if (filter === "expired") list = list.filter((p) => !!p.membership_expiry && new Date(p.membership_expiry) < new Date());
    else if (filter === "deleted") list = list.filter((p) => p.status === "deleted");
    else if (filter === "has_face") list = list.filter((p) => p.has_face);
    else if (filter === "no_face") list = list.filter((p) => !p.has_face);
    return list;
  }, [patrons, filter]);

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
      toast.success("Đã cập nhật độc giả");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Cập nhật thất bại");
    } finally {
      setEditSaving(false);
    }
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
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Đã tải xuống biểu mẫu Excel.");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Không thể tải biểu mẫu Excel");
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
      toast.success(`Đã gia hạn thẻ ${renewTarget.full_name} ${renewMonths} tháng`);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Gia hạn thất bại");
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
      toast.success(`Đã xóa độc giả ${target.full_name}`);
    } catch (err: any) {
      if (err?.response?.status === 404) toast.info("Độc giả đã bị xóa trước đó");
      else { toast.error(getErrorMessage(err) || "Xóa thất bại"); await load(); }
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
      toast.success(`Đã khôi phục độc giả ${target.full_name}`);
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Khôi phục thất bại");
      await load();
    }
  };

  const statBadges = `${patrons.length} độc giả · ${patrons.filter((p) => p.status === "active").length} đang hoạt động · ${patrons.filter((p) => p.has_face).length} đã đăng ký khuôn mặt`;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Quản lý Độc giả"
        icon={PeopleIcon}
        statBadges={statBadges}
        onRefresh={load}
        actions={
          canCreatePatron ? (
            <Button
              variant="contained"
              size="small"
              startIcon={<PersonAddOutlinedIcon />}
              onClick={() => setShowCreate(true)}
              sx={{
                bgcolor: "#8B0000",
                fontWeight: 700,
                borderRadius: 2,
                textTransform: "none",
                boxShadow: "0 2px 8px rgba(139, 0, 0, 0.25)",
                "&:hover": { bgcolor: "#700000" },
              }}
            >
              Thêm độc giả
            </Button>
          ) : null
        }
      />

      <PatronStatCards
        patrons={patrons}
        selectedFilter={filter}
        onSelectFilter={setFilter}
      />

      <PatronToolbar
        query={query}
        onQueryChange={setQuery}
        filter={filter}
        onFilterChange={setFilter}
        onImportExcel={() => setShowImport(true)}
        onDownloadTemplate={handleDownloadTemplate}
        onCreatePatron={() => setShowCreate(true)}
      />

      {loading && filtered.length === 0 ? (
        <LoadingOverlay loading message="Đang tải danh sách độc giả..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<PeopleIcon sx={{ fontSize: 32 }} />}
          title="Không tìm thấy độc giả nào"
          action={<Button size="small" sx={{ textTransform: "none" }} onClick={() => { setQuery(""); setFilter("all"); }}>Xóa bộ lọc</Button>}
        />
      ) : (
        <PatronListView
          patrons={filtered}
          onEdit={openEdit}
          onRenew={(p) => { setRenewTarget(p); setRenewMonths(12); }}
          onDelete={(p) => { setDeleteTarget(p); setDeleteConfirmText(""); }}
          onRestore={(p) => { setRestoreTarget(p); setRestoreConfirmText(""); }}
        />
      )}

      <PatronImportWizard open={showImport} onClose={() => setShowImport(false)} onSuccess={load} />
      <CreatePatronDialog open={showCreate} onClose={() => setShowCreate(false)} onSuccess={load} />

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
                <Avatar sx={{ width: 48, height: 48, bgcolor: STAT_GRADIENT.total, fontWeight: 700 }}>
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
              </TextField>
            </Stack>
          ) : null}

          <Stack direction="row" spacing={1.5} sx={{ px: 2.5, py: 2, borderTop: 1, borderColor: "divider" }}>
            <Button fullWidth variant="outlined" onClick={() => setEditTarget(null)} disabled={editSaving}>Hủy</Button>
            <Tooltip title={!canUpdatePatron ? getPermissionDeniedReason("patrons", "update") : ""}>
              <span style={{ width: "100%" }}>
                <Button fullWidth variant="contained" onClick={handleEdit} disabled={editSaving || !canUpdatePatron}>
                  {editSaving ? <CircularProgress size={20} /> : "Lưu thay đổi"}
                </Button>
              </span>
            </Tooltip>
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
          <Tooltip title={!canUpdatePatron ? getPermissionDeniedReason("patrons", "update") : ""}>
            <span>
              <Button variant="contained" onClick={handleRenew} disabled={!canUpdatePatron}>Gia hạn</Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}>
        <DialogTitle>Xóa độc giả?</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography>
              Xóa <strong>{deleteTarget?.full_name}</strong>? Thao tác này sẽ xóa dữ liệu liên quan và không thể hoàn tác từ giao diện.
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
          <Tooltip title={!canDeletePatron ? getPermissionDeniedReason("patrons", "delete") : ""}>
            <span>
              <Button color="error" variant="contained" onClick={handleDelete} disabled={deleteConfirmText !== "XÓA" || !canDeletePatron}>
                Xóa vĩnh viễn
              </Button>
            </span>
          </Tooltip>
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
          <Tooltip title={!canUpdatePatron ? getPermissionDeniedReason("patrons", "update") : ""}>
            <span>
              <Button color="success" variant="contained" onClick={handleRestore} disabled={restoreConfirmText !== "KHÔI PHỤC" || !canUpdatePatron}>
                Khôi phục
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
