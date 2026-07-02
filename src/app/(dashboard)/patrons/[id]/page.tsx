"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import FaceRetouchingNaturalOutlinedIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import UpdateOutlinedIcon from "@mui/icons-material/UpdateOutlined";
import PersonIcon from "@mui/icons-material/PersonOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import MultiAngleCapture from "@/app/(dashboard)/_components/MultiAngleCapture";
import { slideInRight } from "@/lib/animations";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import NoticeSnackbar from "@/app/(dashboard)/_components/ui/NoticeSnackbar";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import type { AccessLogPublic, BorrowRecord, PatronPublic, PatronUpdate } from "@/lib/types";
import type { CaptureAngle } from "@/app/(dashboard)/_components/MultiAngleCapture";

const CAMERA_LABELS: Record<string, string> = {
  entry_gate: "Cổng vào",
  exit_gate: "Cổng ra",
  kiosk: "Kiosk",
  web_login: "Đăng nhập web",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

function statusLabel(status: string) {
  if (status === "active") return "Đang hoạt động";
  if (status === "inactive") return "Tạm khóa";
  if (status === "expired") return "Hết hạn";
  if (status === "deleted") return "Đã xóa";
  return status;
}

function borrowStatus(record: BorrowRecord) {
  const overdue = record.status === "borrowed" && new Date(record.due_at) < new Date();
  if (record.status === "returned") return { label: "Đã trả", color: "default" as const };
  if (overdue) return { label: "Quá hạn", color: "error" as const };
  return { label: "Đang mượn", color: "success" as const };
}

export default function PatronDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [patron, setPatron] = useState<PatronPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AccessLogPublic[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsSkip, setLogsSkip] = useState(0);
  const logsLimit = 20;
  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);

  const [editForm, setEditForm] = useState<PatronUpdate>({});
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showRestore, setShowRestore] = useState(false);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const [showEnroll, setShowEnroll] = useState(false);
  const [consent, setConsent] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [enrollSuccess, setEnrollSuccess] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const loadPatron = useCallback(async () => {
    try {
      const data = await api.getPatron(id);
      setPatron(data);
    } catch {
      setPatron(null);
    }
  }, [id]);

  const loadLogs = useCallback(async () => {
    try {
      const data = await api.getAccessLogs({ patronId: id, skip: logsSkip, limit: logsLimit });
      setLogs(data.items);
      setLogsTotal(data.total);
    } catch {
      setLogs([]);
      setLogsTotal(0);
    }
  }, [id, logsSkip]);

  const loadBorrows = useCallback(async () => {
    try {
      const data = await api.getBorrowHistory({ patronId: id });
      setBorrows(data);
    } catch {
      setBorrows([]);
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadPatron(), loadLogs(), loadBorrows()]);
      setLoading(false);
    })();
  }, [loadPatron, loadLogs, loadBorrows]);

  const openEdit = () => {
    if (!patron) return;
    setEditForm({
      full_name: patron.full_name,
      class_name: patron.class_name || undefined,
      identity_number: patron.identity_number || undefined,
      email: patron.email || undefined,
      phone: patron.phone || undefined,
      membership_expiry: patron.membership_expiry,
      status: patron.status,
      course: patron.course || undefined,
    });
    setShowEdit(true);
  };

  const handleEdit = async () => {
    if (!patron) return;
    await api.updatePatron(patron.id, editForm);
    setShowEdit(false);
    setNotice("Đã cập nhật thông tin độc giả.");
    await loadPatron();
  };

  const handleRenew = async () => {
    if (!patron) return;
    const current = new Date(patron.membership_expiry);
    const next = new Date(current);
    next.setFullYear(next.getFullYear() + 1);
    await api.updatePatron(patron.id, { membership_expiry: next.toISOString().split("T")[0] });
    setNotice("Đã gia hạn thẻ thêm 1 năm.");
    await loadPatron();
  };

  const handleDelete = async () => {
    if (!patron || deleteConfirmText !== "XÓA") return;
    try {
      await api.deletePatron(patron.id);
      router.push("/patrons");
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setNotice("Độc giả không tồn tại hoặc đã bị xóa.");
        router.push("/patrons");
      } else {
        setNotice(`Xóa thất bại: ${getErrorMessage(err) || "Lỗi không xác định"}`);
      }
    }
  };

  const handleRestore = async () => {
    if (!patron || restoreConfirmText !== "KHÔI PHỤC") return;
    try {
      await api.restorePatron(patron.id);
      setShowRestore(false);
      setRestoreConfirmText("");
      setNotice("Đã khôi phục độc giả.");
      await loadPatron();
    } catch (err: any) {
      setNotice(`Khôi phục thất bại: ${getErrorMessage(err) || "Lỗi không xác định"}`);
    }
  };

  const handleEnroll = async (files: Record<CaptureAngle, File>) => {
    if (!patron) return;
    setEnrollLoading(true);
    setEnrollError("");
    setEnrollSuccess("");
    try {
      await api.enrollPatronFaceBatch(patron.id, {
        frontal: files.frontal,
        right: files.right,
        left: files.left,
        down: files.down,
      });
      setEnrollSuccess("Đăng ký khuôn mặt thành công.");
      setShowEnroll(false);
      setConsent(false);
      await loadPatron();
    } catch (err: any) {
      const errCode = err?.response?.data?.error || err?.response?.data?.detail;
      const errorMessages: Record<string, string> = {
        LIVENESS_FAILED: "Ảnh không phải khuôn mặt thật, vui lòng chụp trực tiếp.",
        NO_FACE_DETECTED: "Không tìm thấy khuôn mặt trong ảnh, vui lòng thử lại.",
        MULTIPLE_FACES: "Có nhiều hơn 1 khuôn mặt trong ảnh, vui lòng chụp lại.",
        LOW_QUALITY: "Ảnh quá mờ hoặc thiếu sáng, vui lòng chụp lại với ánh sáng tốt hơn.",
        FACE_DETECTION_FAILED: "Không thể trích xuất khuôn mặt, vui lòng thử lại.",
      };
      setEnrollError(errorMessages[errCode] || getErrorMessage(err) || "Đăng ký thất bại.");
    } finally {
      setEnrollLoading(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(logsTotal / logsLimit));
  const currentPage = Math.floor(logsSkip / logsLimit) + 1;
  const activeBorrowCount = useMemo(() => borrows.filter((item) => item.status === "borrowed").length, [borrows]);
  const overdueCount = useMemo(() => borrows.filter((item) => item.status === "borrowed" && new Date(item.due_at) < new Date()).length, [borrows]);

  const expired = !patron ? false : new Date(patron.membership_expiry) < new Date();

  const headerActions = patron ? (
    patron.status === "deleted" ? (
      <Button variant="contained" color="success" onClick={() => setShowRestore(true)}>
        Khôi phục
      </Button>
    ) : (
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
        <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={openEdit}>
          Sửa thông tin
        </Button>
        <Button variant="outlined" startIcon={<UpdateOutlinedIcon />} onClick={handleRenew}>
          Gia hạn thẻ
        </Button>
        {!patron.has_face ? (
          <Button variant="contained" startIcon={<FaceRetouchingNaturalOutlinedIcon />} onClick={() => setShowEnroll(true)}>
            Đăng ký khuôn mặt
          </Button>
        ) : null}
        <Button color="error" variant="outlined" startIcon={<DeleteOutlineOutlinedIcon />} onClick={() => setShowDelete(true)}>
          Xóa
        </Button>
      </Stack>
    )
  ) : null;

  return (
    <LoadingOverlay loading={loading} message="Đang tải hồ sơ độc giả...">
      {!patron ? (
        <EmptyState
          icon={<PersonIcon sx={{ fontSize: 56 }} />}
          title="Không tìm thấy độc giả"
          description="Độc giả có thể đã bị xóa hoặc ID không hợp lệ."
          action={
            <Button variant="contained" startIcon={<PersonIcon />} onClick={() => router.push("/patrons")}>
              Quay lại danh sách
            </Button>
          }
        />
      ) : (
        <Stack spacing={3}>
          <PageHeader
            backHref="/patrons"
            title={patron.full_name}
            subtitle={`MSSV: ${patron.student_code} · Mã thẻ: ${patron.card_number}`}
            icon={PersonIcon}
            actions={headerActions}
          />

          {patron.status === "deleted" ? (
            <Alert severity="error" sx={{ fontWeight: 600 }}>
              Độc giả này đã bị xóa. Dữ liệu sẽ được giữ lại và có thể khôi phục.
            </Alert>
          ) : null}
          {patron.status === "inactive" ? (
            <Alert severity="warning" sx={{ fontWeight: 600 }}>
              Thẻ độc giả đang bị tạm khóa.
            </Alert>
          ) : null}
          {patron.status === "expired" ? (
            <Alert severity="warning" sx={{ fontWeight: 600 }}>
              Thẻ độc giả đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng.
            </Alert>
          ) : null}

          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Chip
              color={patron.status === "active" ? "success" : patron.status === "deleted" ? "error" : "warning"}
              label={statusLabel(patron.status)}
            />
            <Chip color={patron.has_face ? "success" : "default"} icon={<FaceRetouchingNaturalOutlinedIcon />} label={patron.has_face ? "Đã có khuôn mặt" : "Chưa có khuôn mặt"} />
            <Chip color={expired ? "error" : "primary"} icon={<EventAvailableOutlinedIcon />} label={`Hạn thẻ: ${formatDate(patron.membership_expiry)}`} />
          </Stack>

          {enrollSuccess ? <Alert severity="success">{enrollSuccess}</Alert> : null}

          <Grid container spacing={2}>
            {[
              { label: "Đang mượn", value: activeBorrowCount, icon: <AutoStoriesOutlinedIcon />, color: "primary.main" },
              { label: "Quá hạn", value: overdueCount, icon: <EventAvailableOutlinedIcon />, color: "error.main" },
              { label: "Lượt ra/vào", value: logsTotal, icon: <HistoryOutlinedIcon />, color: "success.main" },
            ].map((item, idx) => (
              <Grid key={item.label} size={{ xs: 12, sm: 4 }} sx={staggerSx(idx)}>
                <DashboardCard>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <Avatar sx={{ bgcolor: "action.hover", color: item.color }}>{item.icon}</Avatar>
                    <Box>
                      <Typography color="text.secondary" variant="body2">{item.label}</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 850 }}>{item.value}</Typography>
                    </Box>
                  </Stack>
                </DashboardCard>
              </Grid>
            ))}
          </Grid>

          <DashboardCard title="Thông tin thẻ">
            <Grid container spacing={2}>
              {[
                ["Họ tên", patron.full_name],
                ["MSSV", patron.student_code],
                ["Lớp", patron.class_name || "-"],
                ["Khóa học", patron.course || "-"],
                ["Mã thẻ", patron.card_number],
                ["CCCD/CMND", patron.identity_number || "-"],
                ["Email", patron.email || "-"],
                ["Số điện thoại", patron.phone || "-"],
                ["HKTT", patron.permanent_address || "-"],
                ["Ngày cấp thẻ", formatDate(patron.issue_date)],
                ["Ngày tạo", formatDateTime(patron.created_at)],
              ].map(([label, value]) => (
                <Grid key={label} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography sx={{ fontWeight: 700, wordBreak: "break-word" }}>{value}</Typography>
                </Grid>
              ))}
            </Grid>
          </DashboardCard>

          <DashboardCard title="Lịch sử mượn sách" subtitle="Các bản ghi mượn/trả của độc giả này" noPadding>
            {borrows.length === 0 ? (
              <Alert severity="info" sx={{ m: 2 }}>Độc giả này chưa mượn cuốn sách nào.</Alert>
            ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
          <Table sx={{ minWidth: 760 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Sách</TableCell>
                      <TableCell>Ngày mượn</TableCell>
                      <TableCell>Hạn trả</TableCell>
                      <TableCell>Ngày trả</TableCell>
                      <TableCell>Tình trạng</TableCell>
                      <TableCell>Trạng thái</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {borrows.map((record, idx) => {
                      const status = borrowStatus(record);
                      return (
                        <TableRow key={record.id} hover sx={{ animation: `${slideInRight} 0.3s ease-out`, animationDelay: `${idx * 0.04}s`, animationFillMode: "both" }}>
                          <TableCell>
                            <Typography sx={{ fontWeight: 750 }}>{record.book?.title || record.book_id}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                              {record.book?.isbn || record.book_id}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatDate(record.borrow_at)}</TableCell>
                          <TableCell sx={{ color: status.color === "error" ? "error.main" : "inherit", fontWeight: status.color === "error" ? 800 : 400 }}>
                            {formatDate(record.due_at)}
                          </TableCell>
                          <TableCell>{formatDate(record.return_at)}</TableCell>
                          <TableCell>
                            {record.status === "returned" && record.note ? (
                              <Chip size="small" variant="outlined" label={record.note} sx={{ fontSize: 11 }} />
                            ) : (
                              <Typography variant="body2" color="text.disabled">-</Typography>
                            )}
                          </TableCell>
                          <TableCell><Chip size="small" color={status.color} label={status.label} /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DashboardCard>

          {showEnroll && !patron.has_face ? (
            <DashboardCard
              title="Đăng ký khuôn mặt 4 góc"
              subtitle="Chụp đủ các góc để tăng độ chính xác khi nhận diện."
              actions={
                <Button onClick={() => { setShowEnroll(false); setEnrollError(""); setConsent(false); }}>
                  Đóng
                </Button>
              }
            >
              <MultiAngleCapture consent={consent} setConsent={setConsent} onFilesReady={handleEnroll} />
              {enrollError ? <Alert severity="error" sx={{ mt: 2 }}>{enrollError}</Alert> : null}
              {enrollLoading ? <Alert severity="info" sx={{ mt: 2 }}>Đang đăng ký khuôn mặt...</Alert> : null}
            </DashboardCard>
          ) : null}

          <DashboardCard title="Lịch sử ra/vào" subtitle="Các lần hệ thống ghi nhận độc giả tại cổng/kiosk" noPadding>
            {logs.length === 0 ? (
              <Alert severity="info" sx={{ m: 2 }}>Chưa có lịch sử ra/vào.</Alert>
            ) : (
              <>
        <TableContainer sx={{ overflowX: "auto" }}>
        <Table sx={{ minWidth: 900 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Thời gian</TableCell>
                        <TableCell>Loại</TableCell>
                        <TableCell>Cổng</TableCell>
                        <TableCell>Phương thức</TableCell>
                        <TableCell>Độ tin cậy</TableCell>
                        <TableCell>Kết quả</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {logs.map((log, idx) => {
                        const confidence = log.confidence == null ? null : Math.round(log.confidence * 100);
                        return (
                          <TableRow key={log.id} hover sx={{ animation: `${slideInRight} 0.3s ease-out`, animationDelay: `${idx * 0.03}s`, animationFillMode: "both" }}>
                            <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(log.access_time)}</TableCell>
                            <TableCell>
                              <Chip size="small" color={log.access_type === "entry" ? "success" : "warning"} label={log.access_type === "entry" ? "Vào" : "Ra"} />
                            </TableCell>
                            <TableCell sx={{ color: "text.secondary" }}>{CAMERA_LABELS[log.camera_id] || log.camera_id}</TableCell>
                            <TableCell sx={{ color: "text.secondary" }}>{log.verify_method}</TableCell>
                            <TableCell sx={{ minWidth: 150 }}>
                              {confidence == null ? (
                                <Typography color="text.secondary">-</Typography>
                              ) : (
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={confidence}
                                    color={confidence >= 80 ? "success" : confidence >= 60 ? "warning" : "error"}
                                    sx={{ width: 84, height: 7, borderRadius: 99 }}
                                  />
                                  <Typography variant="caption" color="text.secondary">{confidence}%</Typography>
                                </Stack>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip size="small" color={["success", "granted"].includes(log.status) ? "success" : "error"} label={["success", "granted"].includes(log.status) ? "Thành công" : "Thất bại"} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                {logsTotal > logsLimit ? (
                  <Stack direction="row" spacing={1} sx={{ p: 2, alignItems: "center", justifyContent: "space-between" }}>
                    <Typography color="text.secondary">Tổng: {logsTotal}</Typography>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Button variant="outlined" disabled={currentPage <= 1} onClick={() => setLogsSkip(0)}>Đầu</Button>
                      <Typography color="text.secondary">Trang {currentPage} / {pageCount}</Typography>
                      <Button variant="outlined" disabled={currentPage >= pageCount} onClick={() => setLogsSkip((pageCount - 1) * logsLimit)}>Cuối</Button>
                    </Stack>
                  </Stack>
                ) : null}
              </>
            )}
          </DashboardCard>

          <Dialog open={showEdit} onClose={() => setShowEdit(false)} fullWidth maxWidth="sm">
            <DialogTitle>Sửa độc giả</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 1 }}>
                <TextField label="Họ tên" value={editForm.full_name || ""} onChange={(event) => setEditForm({ ...editForm, full_name: event.target.value })} fullWidth />
                <TextField label="Lớp" value={editForm.class_name || ""} onChange={(event) => setEditForm({ ...editForm, class_name: event.target.value })} fullWidth />
                <TextField label="CCCD/CMND" value={editForm.identity_number || ""} onChange={(event) => setEditForm({ ...editForm, identity_number: event.target.value })} fullWidth />
                <TextField label="Email" value={editForm.email || ""} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} fullWidth />
                <TextField label="Số điện thoại" value={editForm.phone || ""} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} fullWidth />
                <TextField label="Khóa học" value={editForm.course || ""} onChange={(event) => setEditForm({ ...editForm, course: event.target.value })} fullWidth />
                <TextField
                  label="Hạn thẻ"
                  type="date"
                  value={editForm.membership_expiry || ""}
                  onChange={(event) => setEditForm({ ...editForm, membership_expiry: event.target.value })}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField select label="Trạng thái" value={editForm.status || "active"} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })} fullWidth>
                  <MenuItem value="active">Đang hoạt động</MenuItem>
                  <MenuItem value="inactive">Tạm khóa</MenuItem>
                  <MenuItem value="expired">Hết hạn</MenuItem>
                </TextField>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowEdit(false)}>Hủy</Button>
              <Button variant="contained" onClick={handleEdit}>Lưu</Button>
            </DialogActions>
          </Dialog>

          <Dialog open={showDelete} onClose={() => { setShowDelete(false); setDeleteConfirmText(""); }} fullWidth maxWidth="xs">
            <DialogTitle>Xóa độc giả?</DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Typography color="text.secondary">
                  Hồ sơ <strong>{patron.full_name}</strong> sẽ bị xóa khỏi danh sách độc giả. Dữ liệu liên quan (thông báo, lịch trực) cũng sẽ bị xóa.
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
              <Button onClick={() => { setShowDelete(false); setDeleteConfirmText(""); }}>Hủy</Button>
              <Button color="error" variant="contained" onClick={handleDelete} disabled={deleteConfirmText !== "XÓA"}>
                Xóa vĩnh viễn
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog open={showRestore} onClose={() => { setShowRestore(false); setRestoreConfirmText(""); }} fullWidth maxWidth="xs">
            <DialogTitle>Khôi phục độc giả?</DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Typography color="text.secondary">
                  Khôi phục hồ sơ <strong>{patron.full_name}</strong>? Nếu thẻ đã hết hạn, hạn thẻ sẽ được tự động gia hạn 1 năm.
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
              <Button onClick={() => { setShowRestore(false); setRestoreConfirmText(""); }}>Hủy</Button>
              <Button color="success" variant="contained" onClick={handleRestore} disabled={restoreConfirmText !== "KHÔI PHỤC"}>
                Khôi phục
              </Button>
            </DialogActions>
          </Dialog>

          <NoticeSnackbar open={Boolean(notice)} message={notice || ""} severity="success" onClose={() => setNotice("")} />
        </Stack>
      )}
    </LoadingOverlay>
  );
}
