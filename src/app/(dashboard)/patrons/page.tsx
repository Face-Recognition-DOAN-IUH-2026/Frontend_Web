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
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import PeopleIcon from "@mui/icons-material/PeopleOutlined";
import UpdateIcon from "@mui/icons-material/UpdateOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import { initials } from "@/lib/utils";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import notification from "antd/es/notification";
import ConfirmDialog from "@/app/(dashboard)/_components/ui/ConfirmDialog";
import PatronStatCards from "@/app/(dashboard)/_components/ui/PatronStatCards";
import PatronToolbar from "@/app/(dashboard)/_components/ui/PatronToolbar";
import PatronListView from "@/app/(dashboard)/_components/ui/PatronListView";
import PatronWizard from "@/app/(dashboard)/_components/ui/PatronWizard";
import type { PatronCreate, PatronPublic, PatronUpdate } from "@/lib/types";

export type FilterValue = "all" | "active" | "inactive" | "expired" | "has_face" | "no_face" | "deleted";
type Notice = { severity: "success" | "error" | "warning" | "info"; message: string } | null;

const STAT_GRADIENT = {
  total: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
  active: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  expired: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  face: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
};

export default function PatronsPage() {
  const [apiAnt, contextHolder] = notification.useNotification();
  const router = useRouter();
  const [patrons, setPatrons] = useState<PatronPublic[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [loading, setLoading] = useState(false);

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

  const [notice, setNotice] = useState<Notice>(null);
  const showNotice = (severity: NonNullable<Notice>["severity"], message: string) => {
    if (severity === "success") apiAnt.success({ message, placement: "topRight" });
    else if (severity === "error") apiAnt.error({ message, placement: "topRight" });
    else if (severity === "warning") apiAnt.warning({ message, placement: "topRight" });
    else apiAnt.info({ message, placement: "topRight" });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await api.searchPatrons(query || undefined);
      setPatrons(items);
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

  const statBadges = `${patrons.length} độc giả · ${patrons.filter((p) => p.status === "active").length} đang hoạt động · ${patrons.filter((p) => p.has_face).length} đã đăng ký khuôn mặt`;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Quản lý Độc giả"
        icon={PeopleIcon}
        gradient="linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)"
        statBadges={statBadges}
        onRefresh={load}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowCreate(true)}
            sx={{ background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", borderRadius: 2, fontWeight: 700, textTransform: "none", boxShadow: "0 4px 14px rgba(99,102,241,0.4)", "&:hover": { background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)" } }}>
            Thêm độc giả
          </Button>
        }
      />

      <PatronStatCards patrons={patrons} />

      <PatronToolbar
        query={query}
        onQueryChange={setQuery}
        filter={filter}
        onFilterChange={setFilter}
        onAddPatron={() => setShowCreate(true)}
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

      <PatronWizard open={showCreate} onClose={() => setShowCreate(false)} onComplete={load} />

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

      {contextHolder}
    </Stack>
  );
}
