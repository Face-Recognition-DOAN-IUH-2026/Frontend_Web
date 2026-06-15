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
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import FaceIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import UpdateIcon from "@mui/icons-material/UpdateOutlined";
import UsersIcon from "@mui/icons-material/GroupsOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type { CaptureAngle } from "@/components/MultiAngleCapture";
import MultiAngleCapture from "@/components/MultiAngleCapture";
import type { PatronCreate, PatronPublic, PatronUpdate } from "@/lib/types";

type StepValue = 1 | 2 | 3;
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
  };
}

function formatStatus(status: string) {
  if (status === "active") return "Hoạt động";
  if (status === "inactive") return "Tạm khóa";
  if (status === "expired") return "Hết hạn";
  return status;
}

export default function PatronsPage() {
  const router = useRouter();
  const [patrons, setPatrons] = useState<PatronPublic[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState<StepValue>(1);
  const [createForm, setCreateForm] = useState<PatronCreate>(emptyCreateForm());
  const [createError, setCreateError] = useState("");
  const [enrollFiles, setEnrollFiles] = useState<Record<CaptureAngle, File> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<PatronPublic | null>(null);
  const [editForm, setEditForm] = useState<PatronUpdate>({});
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

  useEffect(() => {
    load();
  }, [load]);

  const closeCreate = () => {
    setShowCreate(false);
    setCreateStep(1);
    setCreateForm(emptyCreateForm());
    setCreateError("");
    setEnrollFiles(null);
  };

  const handleCreateStep1 = () => {
    if (!createForm.full_name.trim()) {
      setCreateError("Vui lòng nhập họ tên");
      return;
    }
    if (!createForm.student_code.trim()) {
      setCreateError("Vui lòng nhập MSSV");
      return;
    }
    setCreateError("");
    setCreateStep(2);
  };

  const handleFilesReady = (files: Record<CaptureAngle, File>) => {
    setEnrollFiles(files);
    setCreateStep(3);
  };

  const handleSubmit = async () => {
    if (!enrollFiles) return;
    setSubmitting(true);
    setCreateError("");
    try {
      const newPatron = await api.createPatron(createForm);
      await api.enrollPatronFaceBatch(newPatron.id, enrollFiles);
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
      identity_number: patron.identity_number || undefined,
      email: patron.email || undefined,
      phone: patron.phone || undefined,
      membership_expiry: patron.membership_expiry,
      status: patron.status,
    });
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    try {
      await api.updatePatron(editTarget.id, editForm);
      setEditTarget(null);
      setEditForm({});
      await load();
      showNotice("success", "Đã cập nhật độc giả");
    } catch (err) {
      showNotice("error", getErrorMessage(err) || "Cập nhật thất bại");
    }
  };

  const handleRenew = async (patron: PatronPublic) => {
    const next = new Date(patron.membership_expiry);
    next.setFullYear(next.getFullYear() + 1);
    try {
      await api.updatePatron(patron.id, { membership_expiry: next.toISOString().split("T")[0] });
      await load();
      showNotice("success", "Đã gia hạn thẻ thêm 1 năm");
    } catch (err) {
      showNotice("error", getErrorMessage(err) || "Gia hạn thất bại");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setPatrons((prev) => prev.filter((patron) => patron.id !== target.id));
    try {
      await api.deletePatron(target.id);
      showNotice("success", "Đã xóa độc giả");
    } catch (err: any) {
      if (err?.response?.status === 404) showNotice("info", "Độc giả đã bị xóa trước đó");
      else {
        showNotice("error", getErrorMessage(err) || "Xóa thất bại");
        await load();
      }
    }
  };

  const cardNumber = useMemo(
    () => createForm.student_code ? `THV-${createForm.student_code}` : "THV-XXXXXXXX",
    [createForm.student_code],
  );

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}>
          <TextField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && load()}
            placeholder="Tìm theo tên, MSSV, mã thẻ..."
            size="small"
            fullWidth
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              },
            }}
          />
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>Tìm</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowCreate(true)}>Thêm độc giả</Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Họ tên</TableCell>
                <TableCell>MSSV</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>SĐT</TableCell>
                <TableCell>Hạn thẻ</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell>Khuôn mặt</TableCell>
                <TableCell align="right">Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && patrons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell>
                </TableRow>
              ) : patrons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">Không có độc giả nào</Typography>
                  </TableCell>
                </TableRow>
              ) : patrons.map((patron) => (
                <TableRow key={patron.id} hover sx={{ cursor: "pointer" }} onClick={() => router.push(`/patrons/${patron.id}`)}>
                  <TableCell>
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                      <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 900 }}>
                        {patron.full_name?.charAt(0).toUpperCase() || "?"}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 900 }}>{patron.full_name}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ fontFamily: "monospace" }}>{patron.student_code}</TableCell>
                  <TableCell>{patron.email || "-"}</TableCell>
                  <TableCell>{patron.phone || "-"}</TableCell>
                  <TableCell>{patron.membership_expiry}</TableCell>
                  <TableCell>
                    <Chip size="small" color={patron.status === "active" ? "success" : "error"} label={formatStatus(patron.status)} />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" color={patron.has_face ? "success" : "default"} icon={<FaceIcon />} label={patron.has_face ? "Đã đăng ký" : "Chưa có"} />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.75} sx={{ justifyContent: "flex-end" }} onClick={(event) => event.stopPropagation()}>
                      <IconButton size="small" title="Sửa" onClick={() => openEdit(patron)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="success" title="Gia hạn" onClick={() => handleRenew(patron)}><UpdateIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" title="Xóa" onClick={() => setDeleteTarget(patron)}><DeleteIcon fontSize="small" /></IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={showCreate} onClose={closeCreate} fullWidth maxWidth="md">
        <DialogTitle>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="h6">Thêm độc giả mới</Typography>
            <IconButton onClick={closeCreate}><CloseIcon /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={createStep - 1} sx={{ mb: 3 }}>
            <Step><StepLabel>Thông tin</StepLabel></Step>
            <Step><StepLabel>Khuôn mặt</StepLabel></Step>
            <Step><StepLabel>Xác nhận</StepLabel></Step>
          </Stepper>

          {createError ? <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert> : null}

          {createStep === 1 ? (
            <Stack spacing={2}>
              <TextField label="Họ tên" value={createForm.full_name} onChange={(event) => { setCreateForm({ ...createForm, full_name: event.target.value }); setCreateError(""); }} required fullWidth />
              <TextField label="MSSV" value={createForm.student_code} onChange={(event) => { setCreateForm({ ...createForm, student_code: event.target.value }); setCreateError(""); }} required fullWidth />
              <TextField label="Lớp" value={createForm.class_name || ""} onChange={(event) => setCreateForm({ ...createForm, class_name: event.target.value })} fullWidth />
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                <TextField label="Ngày cấp thẻ" type="date" value={createForm.issue_date} onChange={(event) => setCreateForm({ ...createForm, issue_date: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                <TextField label="Hạn thẻ" type="date" value={createForm.membership_expiry} onChange={(event) => setCreateForm({ ...createForm, membership_expiry: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              </Box>
            </Stack>
          ) : null}

          {createStep === 2 ? (
            <Stack spacing={2}>
              <Alert severity="info">Chụp khuôn mặt từ 4 góc để đăng ký nhận diện tại cổng.</Alert>
              <MultiAngleCapture consent={true} onFilesReady={handleFilesReady} />
            </Stack>
          ) : null}

          {createStep === 3 && enrollFiles ? (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2 }}>
                  <Avatar sx={{ bgcolor: "primary.main", color: "primary.contrastText" }}><UsersIcon /></Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 900 }}>{createForm.full_name}</Typography>
                    <Typography variant="caption" color="primary" sx={{ fontFamily: "monospace" }}>{cardNumber}</Typography>
                  </Box>
                </Stack>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1 }}>
                  <Typography variant="body2">MSSV: <strong>{createForm.student_code}</strong></Typography>
                  <Typography variant="body2">Lớp: <strong>{createForm.class_name || "-"}</strong></Typography>
                  <Typography variant="body2">Cấp: <strong>{createForm.issue_date}</strong></Typography>
                  <Typography variant="body2">Hạn: <strong>{createForm.membership_expiry}</strong></Typography>
                </Box>
              </Paper>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          {createStep > 1 ? <Button onClick={() => setCreateStep((value) => (value - 1) as StepValue)}>Quay lại</Button> : <Button onClick={closeCreate}>Hủy</Button>}
          {createStep === 1 ? <Button variant="contained" onClick={handleCreateStep1}>Tiếp tục</Button> : null}
          {createStep === 3 ? <Button variant="contained" onClick={handleSubmit} disabled={submitting}>{submitting ? "Đang tạo..." : "Tạo độc giả"}</Button> : null}
        </DialogActions>
      </Dialog>

      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Sửa độc giả</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Họ tên" value={editForm.full_name || ""} onChange={(event) => setEditForm({ ...editForm, full_name: event.target.value })} fullWidth />
            <TextField label="CMND/CCCD" value={editForm.identity_number || ""} onChange={(event) => setEditForm({ ...editForm, identity_number: event.target.value })} fullWidth />
            <TextField label="Email" value={editForm.email || ""} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} fullWidth />
            <TextField label="SĐT" value={editForm.phone || ""} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} fullWidth />
            <TextField label="Hạn thẻ" type="date" value={editForm.membership_expiry || ""} onChange={(event) => setEditForm({ ...editForm, membership_expiry: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
            <TextField label="Trạng thái" value={editForm.status || "active"} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })} select fullWidth>
              <MenuItem value="active">Hoạt động</MenuItem>
              <MenuItem value="inactive">Tạm khóa</MenuItem>
              <MenuItem value="expired">Hết hạn</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)}>Hủy</Button>
          <Button variant="contained" onClick={handleEdit}>Lưu</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Xóa độc giả?</DialogTitle>
        <DialogContent>
          <Typography>
            Xóa độc giả {deleteTarget?.full_name || deleteTarget?.student_code}? Thao tác này không thể hoàn tác từ giao diện.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Hủy</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Xóa</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!notice} autoHideDuration={3500} onClose={() => setNotice(null)}>
        {notice ? <Alert severity={notice.severity} onClose={() => setNotice(null)}>{notice.message}</Alert> : undefined}
      </Snackbar>
    </Stack>
  );
}
