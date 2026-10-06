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
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import CalendarTodayIcon from "@mui/icons-material/CalendarTodayOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import FaceRetouchingNaturalOutlinedIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import MailIcon from "@mui/icons-material/MailOutlined";
import PhoneIcon from "@mui/icons-material/PhoneOutlined";
import SchoolIcon from "@mui/icons-material/SchoolOutlined";
import UpdateOutlinedIcon from "@mui/icons-material/UpdateOutlined";
import PersonIcon from "@mui/icons-material/PersonOutlined";
import LocationOnIcon from "@mui/icons-material/LocationOnOutlined";
import VerifiedIcon from "@mui/icons-material/VerifiedOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import MultiAngleCapture from "@/app/(dashboard)/_components/MultiAngleCapture";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import AvatarUser from "@/app/(dashboard)/_components/ui/AvatarUser";
import { useTaskSSE } from "@/lib/hooks/useTaskSSE";
import { useToast } from "@/lib/toast-context";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import {
  mapEnrollError,
  extractFailedAngles,
  buildAngleErrorMessage,
} from "@/lib/face-enroll-errors";
import { initials, formatDate, formatDateTime, statusLabel, statusColor } from "@/lib/utils";
import type { AccessLogPublic, BorrowRecord, PatronPublic, PatronUpdate } from "@/lib/types";
import type { CaptureAngle } from "@/app/(dashboard)/_components/MultiAngleCapture";

const CAMERA_LABELS: Record<string, string> = {
  entry_gate: "Cổng vào",
  exit_gate: "Cổng ra",
  kiosk: "Kiosk",
  web_login: "Đăng nhập web",
};

function borrowStatus(record: BorrowRecord) {  const overdue = record.status === "borrowed" && new Date(record.due_at) < new Date();
  if (record.status === "returned") return { label: "Đã trả", color: "default" as const };
  if (overdue) return { label: "Quá hạn", color: "error" as const };
  return { label: "Đang mượn", color: "success" as const };
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", py: 1 }}>
      <Box sx={{ color: "text.secondary", mt: 0.3, minWidth: 20 }}>{icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: "break-word" }}>
          {value || "-"}
        </Typography>
      </Box>
    </Stack>
  );
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
  const [tab, setTab] = useState(0);

  const [editForm, setEditForm] = useState<PatronUpdate>({});
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showRestore, setShowRestore] = useState(false);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const [showEnroll, setShowEnroll] = useState(false);
  const { toast } = useToast();
  const enrollTask = useTaskSSE(120000);
  const [consent, setConsent] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [enrollSuccess, setEnrollSuccess] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);

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
    toast.success("Đã cập nhật thông tin độc giả.");
    await loadPatron();
  };

  const handleRenew = async () => {
    if (!patron) return;
    const next = new Date(patron.membership_expiry);
    if (next < new Date()) next.setTime(Date.now());
    next.setFullYear(next.getFullYear() + 1);
    await api.updatePatron(patron.id, { membership_expiry: next.toISOString().split("T")[0] });
    toast.success("Đã gia hạn thẻ thêm 1 năm.");
    await loadPatron();
  };

  const handleDelete = async () => {
    if (!patron || deleteConfirmText !== "XÓA") return;
    try {
      await api.deletePatron(patron.id);
      toast.success(`Đã xóa độc giả ${patron.full_name}`);
      router.push("/patrons");
    } catch (err: any) {
      if (err?.response?.status === 404) {
        toast.error("Độc giả không tồn tại hoặc đã bị xóa.");
        router.push("/patrons");
      } else {
        toast.error(`Xóa thất bại: ${getErrorMessage(err) || "Lỗi không xác định"}`);
      }
    }
  };

  const handleRestore = async () => {
    if (!patron || restoreConfirmText !== "KHÔI PHỤC") return;
    try {
      await api.restorePatron(patron.id);
      setShowRestore(false);
      setRestoreConfirmText("");
      toast.success("Đã khôi phục độc giả.");
      await loadPatron();
    } catch (err: any) {
      toast.error(`Khôi phục thất bại: ${getErrorMessage(err) || "Lỗi không xác định"}`);
    }
  };

  const handleEnroll = async (files: Record<CaptureAngle, File>) => {
    if (!patron) return;
    setEnrollLoading(true);
    setEnrollError("");
    setEnrollSuccess("");
    try {
      const res = await api.enrollPatronFaceBatch(patron.id, {
        frontal: files.frontal,
        right: files.right,
        left: files.left,
        down: files.down,
      });
      // Enroll chạy bất đồng bộ trên worker: chờ job hoàn tất qua SSE rồi mới báo kết quả
      if (res?.job_id) {
        enrollTask.start(res.job_id);
      } else {
        finishEnrollSuccess();
        await loadPatron();
      }
    } catch (err: any) {
      setEnrollLoading(false);
      const message = mapEnrollError(
        err?.response?.data?.error || err?.response?.data?.detail,
        getErrorMessage(err) || "Đăng ký thất bại."
      );
      setEnrollError(message);
      toast(message, "error");
    }
  };

  const finishEnrollSuccess = () => {
    setEnrollSuccess("Đăng ký khuôn mặt thành công.");
    setShowEnroll(false);
    setConsent(false);
    setEnrollLoading(false);
  };

  // Lắng nghe kết quả job enroll từ SSE: thành công mới reload (has_face) và toast
  useEffect(() => {
    const s = enrollTask.state.status;
    if (s === "SUCCESS") {
      enrollTask.reset();
      finishEnrollSuccess();
      toast("Đăng ký khuôn mặt thành công.", "success");
      loadPatron();
    } else if (s === "FAILURE" || s === "ERROR" || s === "TIMEOUT") {
      enrollTask.reset();
      setEnrollLoading(false);
      // Ưu tiên hiện rõ góc nào lỗi để chụp lại, thay vì câu chung "N angle(s) failed"
      const failedAngles = extractFailedAngles(enrollTask.state.result);
      const message =
        failedAngles.length > 0
          ? `${buildAngleErrorMessage(failedAngles, "Đăng ký khuôn mặt thất bại.")} Toàn bộ đã được rollback, vui lòng chụp lại các góc lỗi.`
          : mapEnrollError(enrollTask.state.error, "Đăng ký khuôn mặt thất bại.");
      setEnrollError(message);
      toast(message, "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollTask.state.status]);

  const logsPageCount = Math.max(1, Math.ceil(logsTotal / logsLimit));
  const logsCurrentPage = Math.floor(logsSkip / logsLimit) + 1;
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
          Sửa
        </Button>
        <Button variant="outlined" startIcon={<UpdateOutlinedIcon />} onClick={handleRenew}>
          Gia hạn
        </Button>
        {!patron.has_face ? (
          <Button variant="contained" startIcon={<FaceRetouchingNaturalOutlinedIcon />} onClick={() => setShowEnroll(true)}>
            Đăng ký khuôn mặt
          </Button>
        ) : (
          <Button variant="outlined" startIcon={<FaceRetouchingNaturalOutlinedIcon />} onClick={() => setShowEnroll(true)}>
            Cập nhật khuôn mặt
          </Button>
        )}
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
            subtitle={`MSSV: ${patron.student_code} · Mã thẻ: ${patron.card_number || "-"}`}
            icon={PersonIcon}
            actions={headerActions}
          />

          {patron.status === "deleted" && <Alert severity="error" sx={{ fontWeight: 600 }}>Độc giả này đã bị xóa. Dữ liệu sẽ được giữ lại và có thể khôi phục.</Alert>}
          {patron.status === "inactive" && <Alert severity="warning" sx={{ fontWeight: 600 }}>Thẻ độc giả đang bị tạm khóa.</Alert>}
          {expired && <Alert severity="warning" sx={{ fontWeight: 600 }}>Thẻ độc giả đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng.</Alert>}
          {enrollSuccess && <Alert severity="success">{enrollSuccess}</Alert>}

          <Grid container spacing={3}>
            {/* Left column — Profile card */}
            <Grid size={{ xs: 12, md: 4 }} sx={staggerSx(0)}>
              <DashboardCard noPadding>
                <Box
                  sx={{
                    height: 100,
                    background: patron.status === "active" && !expired
                      ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                      : expired
                        ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                        : "linear-gradient(135deg, #64748b 0%, #475569 100%)",
                  }}
                />
                <Box sx={{ px: 2.5, pb: 2.5, mt: -5, textAlign: "center" }}>
                  <AvatarUser
                    user={patron}
                    role="patron"
                    size={80}
                    border="4px solid rgba(255,255,255,0.9)"
                    sx={{ mx: "auto", boxShadow: 2, fontSize: "1.8rem" }}
                  />

                  <Typography variant="h6" sx={{ fontWeight: 800, mt: 1.5 }}>{patron.full_name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>{patron.student_code}</Typography>

                  <Stack direction="row" spacing={0.75} sx={{ justifyContent: "center", mt: 1.5, flexWrap: "wrap", gap: 0.5 }}>
                    <Chip label={statusLabel(patron.status)} color={statusColor(patron.status)} size="small" sx={{ fontWeight: 600 }} />
                    <Chip
                      icon={<FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: "16px !important" }} />}
                      label={patron.has_face ? "Đã có khuôn mặt" : "Chưa có khuôn mặt"}
                      color={patron.has_face ? "success" : "default"}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Stack spacing={0}>
                    <MetaRow icon={<SchoolIcon fontSize="small" />} label="Khóa học" value={patron.course} />
                    <MetaRow icon={<BadgeOutlinedIcon fontSize="small" />} label="Lớp" value={patron.class_name} />
                    <MetaRow icon={<CalendarTodayIcon fontSize="small" />} label="Hạn thẻ" value={
                      <span style={{ color: expired ? "#d32f2f" : undefined, fontWeight: 700 }}>
                        {formatDate(patron.membership_expiry)}{expired ? " (Hết hạn)" : ""}
                      </span>
                    } />
                    <MetaRow icon={<MailIcon fontSize="small" />} label="Email" value={patron.email} />
                    <MetaRow icon={<PhoneIcon fontSize="small" />} label="Số điện thoại" value={patron.phone} />
                    <MetaRow icon={<LocationOnIcon fontSize="small" />} label="HKTT" value={patron.permanent_address} />
                  </Stack>
                </Box>
              </DashboardCard>
            </Grid>

            {/* Right column — Tabs */}
            <Grid size={{ xs: 12, md: 8 }} sx={staggerSx(1)}>
              <Stack spacing={3}>
                {/* Stats row */}
                <Stack direction="row" spacing={1.5}>
                  {[
                    { label: "Đang mượn", value: activeBorrowCount, color: "info" as const, icon: <AutoStoriesOutlinedIcon fontSize="small" /> },
                    { label: "Quá hạn", value: overdueCount, color: "error" as const, icon: <EventAvailableOutlinedIcon fontSize="small" /> },
                    { label: "Lượt ra/vào", value: logsTotal, color: "success" as const, icon: <HistoryOutlinedIcon fontSize="small" /> },
                  ].map((item, idx) => (
                    <Paper key={item.label} variant="outlined" sx={{
                      flex: 1,
                      p: 1.5,
                      textAlign: "center",
                      borderColor: `${item.color}.main`,
                      borderRadius: 2,
                      background: item.color === "info" ? "rgba(2,136,209,0.08)" : item.color === "error" ? "rgba(211,47,47,0.08)" : "rgba(46,125,50,0.08)",
                      ...staggerSx(idx),
                    }}>
                      <Box sx={{ color: `${item.color}.main`, mb: 0.5 }}>{item.icon}</Box>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: `${item.color}.main` }}>{item.value}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</Typography>
                    </Paper>
                  ))}
                </Stack>

                {/* Tabs */}
                <DashboardCard noPadding>
                  <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2.5 }}>
                    <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                      <Tab label="Thông tin chi tiết" />
                      <Tab label={`Lịch sử mượn (${borrows.length})`} />
                      <Tab label={`Lịch sử ra/vào (${logsTotal})`} />
                    </Tabs>
                  </Box>

                  {/* Tab 0: Info detail */}
                  {tab === 0 && (
                    <Box sx={{ p: 2.5 }}>
                      <Grid container spacing={0.5}>
                        {[
                          { label: "Họ tên", value: patron.full_name, icon: <PersonIcon fontSize="small" /> },
                          { label: "MSSV", value: patron.student_code, icon: <BadgeOutlinedIcon fontSize="small" /> },
                          { label: "Lớp", value: patron.class_name, icon: <SchoolIcon fontSize="small" /> },
                          { label: "Khóa học", value: patron.course, icon: <SchoolIcon fontSize="small" /> },
                          { label: "Mã thẻ", value: patron.card_number, icon: <BadgeOutlinedIcon fontSize="small" /> },
                          { label: "CCCD/CMND", value: patron.identity_number, icon: <BadgeOutlinedIcon fontSize="small" /> },
                          { label: "Email", value: patron.email, icon: <MailIcon fontSize="small" /> },
                          { label: "Số điện thoại", value: patron.phone, icon: <PhoneIcon fontSize="small" /> },
                          { label: "HKTT", value: patron.permanent_address, icon: <LocationOnIcon fontSize="small" /> },
                          { label: "Ngày cấp thẻ", value: formatDate(patron.issue_date), icon: <CalendarTodayIcon fontSize="small" /> },
                          { label: "Ngày tạo", value: formatDateTime(patron.created_at), icon: <CalendarTodayIcon fontSize="small" /> },
                        ].map((item) => (
                          <Grid key={item.label} size={{ xs: 12, sm: 6 }}>
                            <MetaRow icon={item.icon} label={item.label} value={item.value} />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {/* Tab 1: Borrow history */}
                  {tab === 1 && (
                    <Box>
                      {borrows.length === 0 ? (
                        <Alert severity="info" sx={{ m: 2 }}>Độc giả này chưa mượn cuốn sách nào.</Alert>
                      ) : (
                        <TableContainer sx={{ overflowX: "auto" }}>
                          <Table sx={{ minWidth: 700 }} size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Sách</TableCell>
                                <TableCell>Mượn</TableCell>
                                <TableCell>Hạn trả</TableCell>
                                <TableCell>Trả</TableCell>
                                <TableCell>Trạng thái</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {borrows.map((record) => {
                                const status = borrowStatus(record);
                                return (
                                  <TableRow key={record.id} hover>
                                    <TableCell>
                                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{record.book?.title || record.book_id}</Typography>
                                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>{record.book?.isbn || ""}</Typography>
                                    </TableCell>
                                    <TableCell>{formatDate(record.borrow_at)}</TableCell>
                                    <TableCell sx={{ color: status.color === "error" ? "error.main" : "inherit", fontWeight: status.color === "error" ? 800 : 400 }}>
                                      {formatDate(record.due_at)}
                                    </TableCell>
                                    <TableCell>{formatDate(record.return_at)}</TableCell>
                                    <TableCell><Chip size="small" color={status.color} label={status.label} /></TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Box>
                  )}

                  {/* Tab 2: Access logs */}
                  {tab === 2 && (
                    <Box>
                      {logs.length === 0 ? (
                        <Alert severity="info" sx={{ m: 2 }}>Chưa có lịch sử ra/vào.</Alert>
                      ) : (
                        <>
                          <TableContainer sx={{ overflowX: "auto" }}>
                            <Table sx={{ minWidth: 700 }} size="small">
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
                                {logs.map((log) => {
                                  const confidence = log.confidence == null ? null : Math.round(log.confidence * 100);
                                  return (
                                    <TableRow key={log.id} hover>
                                      <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(log.access_time)}</TableCell>
                                      <TableCell>
                                        <Chip size="small" color={log.access_type === "entry" ? "success" : "warning"} label={log.access_type === "entry" ? "Vào" : "Ra"} />
                                      </TableCell>
                                      <TableCell>{CAMERA_LABELS[log.camera_id] || log.camera_id}</TableCell>
                                      <TableCell>{log.verify_method}</TableCell>
                                      <TableCell sx={{ minWidth: 120 }}>
                                        {confidence == null ? (
                                          <Typography color="text.secondary">-</Typography>
                                        ) : (
                                          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                            <LinearProgress
                                              variant="determinate"
                                              value={confidence}
                                              color={confidence >= 80 ? "success" : confidence >= 60 ? "warning" : "error"}
                                              sx={{ width: 60, height: 6, borderRadius: 99 }}
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
                          {logsTotal > logsLimit && (
                            <Stack direction="row" spacing={1} sx={{ p: 2, alignItems: "center", justifyContent: "space-between" }}>
                              <Typography color="text.secondary">Tổng: {logsTotal}</Typography>
                              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                <Button variant="outlined" size="small" disabled={logsCurrentPage <= 1} onClick={() => setLogsSkip(0)}>Đầu</Button>
                                <Typography color="text.secondary" variant="body2">Trang {logsCurrentPage}/{logsPageCount}</Typography>
                                <Button variant="outlined" size="small" disabled={logsCurrentPage >= logsPageCount} onClick={() => setLogsSkip((logsPageCount - 1) * logsLimit)}>Cuối</Button>
                              </Stack>
                            </Stack>
                          )}
                        </>
                      )}
                    </Box>
                  )}
                </DashboardCard>
              </Stack>
            </Grid>
          </Grid>

          {/* Face enrollment dialog */}
          <Dialog open={showEnroll} onClose={() => { setShowEnroll(false); setEnrollError(""); setConsent(false); }} fullWidth maxWidth="md">
            <DialogTitle sx={{ m: 0, px: 3, py: 2 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Avatar sx={{ bgcolor: "primary.main", width: 44, height: 44 }}>
                  <FaceRetouchingNaturalOutlinedIcon />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
                    {patron.has_face ? "Cập nhật khuôn mặt" : "Đăng ký khuôn mặt 4 góc"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {patron.full_name} · MSSV {patron.student_code} · Chụp đủ các góc để tăng độ chính xác khi nhận diện
                  </Typography>
                </Box>
                <IconButton aria-label="Đóng" onClick={() => { setShowEnroll(false); setEnrollError(""); setConsent(false); }}>
                  <CloseIcon />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
              <MultiAngleCapture consent={consent} setConsent={setConsent} onFilesReady={handleEnroll} />
              {enrollError && <Alert severity="error" sx={{ mt: 2 }}>{enrollError}</Alert>}
              {enrollLoading && <Alert severity="info" sx={{ mt: 2 }}>Đang xử lý khuôn mặt trên máy chủ, vui lòng chờ...</Alert>}
            </DialogContent>
          </Dialog>

          {/* Edit dialog */}
          <Dialog open={showEdit} onClose={() => setShowEdit(false)} fullWidth maxWidth="sm">
            <DialogTitle>Sửa độc giả</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 1 }}>
                <TextField label="Họ tên" value={editForm.full_name || ""} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} fullWidth />
                <TextField label="Lớp" value={editForm.class_name || ""} onChange={(e) => setEditForm({ ...editForm, class_name: e.target.value })} fullWidth />
                <TextField label="Khóa học" value={editForm.course || ""} onChange={(e) => setEditForm({ ...editForm, course: e.target.value })} fullWidth />
                <TextField label="CCCD/CMND" value={editForm.identity_number || ""} onChange={(e) => setEditForm({ ...editForm, identity_number: e.target.value })} fullWidth />
                <TextField label="Email" value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} fullWidth />
                <TextField label="Số điện thoại" value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} fullWidth />
                <TextField label="Hạn thẻ" type="date" value={editForm.membership_expiry || ""} onChange={(e) => setEditForm({ ...editForm, membership_expiry: e.target.value })} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
                <TextField select label="Trạng thái" value={editForm.status || "active"} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} fullWidth>
                  <MenuItem value="active">Đang hoạt động</MenuItem>
                  <MenuItem value="inactive">Tạm khóa</MenuItem>
                </TextField>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowEdit(false)}>Hủy</Button>
              <Button variant="contained" onClick={handleEdit}>Lưu</Button>
            </DialogActions>
          </Dialog>

          {/* Delete dialog */}
          <Dialog open={showDelete} onClose={() => { setShowDelete(false); setDeleteConfirmText(""); }} fullWidth maxWidth="xs">
            <DialogTitle>Xóa độc giả?</DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Typography color="text.secondary">
                  Hồ sơ <strong>{patron.full_name}</strong> sẽ bị xóa khỏi danh sách độc giả.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Nhập <strong>XÓA</strong> để xác nhận:
                </Typography>
                <TextField value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="Nhập XÓA" size="small" autoFocus fullWidth />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setShowDelete(false); setDeleteConfirmText(""); }}>Hủy</Button>
              <Button color="error" variant="contained" onClick={handleDelete} disabled={deleteConfirmText !== "XÓA"}>Xóa vĩnh viễn</Button>
            </DialogActions>
          </Dialog>

          {/* Restore dialog */}
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
                <TextField value={restoreConfirmText} onChange={(e) => setRestoreConfirmText(e.target.value)} placeholder="Nhập KHÔI PHỤC" size="small" autoFocus fullWidth />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setShowRestore(false); setRestoreConfirmText(""); }}>Hủy</Button>
              <Button color="success" variant="contained" onClick={handleRestore} disabled={restoreConfirmText !== "KHÔI PHỤC"}>Khôi phục</Button>
            </DialogActions>
          </Dialog>
        </Stack>
      )}
    </LoadingOverlay>
  );
}
