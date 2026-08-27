"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertTitle,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BadgeIcon from "@mui/icons-material/BadgeOutlined";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import BorrowIcon from "@mui/icons-material/AssignmentIndOutlined";
import CameraAltIcon from "@mui/icons-material/CameraAltOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import FaceIcon from "@mui/icons-material/FaceOutlined";
import LocalLibraryIcon from "@mui/icons-material/LocalLibraryOutlined";
import PrintIcon from "@mui/icons-material/PrintOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScannerOutlined";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";
import VideocamIcon from "@mui/icons-material/VideocamOutlined";
import WarningIcon from "@mui/icons-material/WarningAmberOutlined";
import notification from "antd/es/notification";
import Result from "antd/es/result";
import Steps from "antd/es/steps";
import BorrowScannerDialog from "@/app/(dashboard)/_components/BorrowScannerDialog";
import BorrowIPCameraDialog from "@/app/(dashboard)/_components/BorrowIPCameraDialog";
import OverdueGuideModal from "@/app/(dashboard)/_components/OverdueGuideModal";
import BookRecommendations from "@/app/(dashboard)/_components/BookRecommendations";
import api, { getErrorMessage } from "@/lib/api-client";
import { useTaskSSE } from "@/lib/hooks/useTaskSSE";
import { fadeInUp, slideInRight } from "@/lib/animations";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import { getAlertSeverity, getAlertTitle } from "@/lib/alert-utils";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import type { BookInfo } from "@/lib/types";

interface BorrowCartItem {
  barcode: string;
  isbn: string;
  loading: boolean;
  can_borrow: boolean;
  reason?: string | null;
  book?: BookInfo | null;
  copy_id?: string | null;
  book_id?: string | null;
  copy_barcode?: string | null;
  shelf_location?: string | null;
}

export default function BorrowPage() {
  const [apiAnt, contextHolder] = notification.useNotification();
  const [currentStep, setCurrentStep] = useState<number>(0);

  // Patron state
  const [patronCode, setPatronCode] = useState("");
  const [patronId, setPatronId] = useState<string | null>(null);
  const [patronName, setPatronName] = useState("");
  const [activeCount, setActiveCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [error, setError] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);

  // Cart / Scanned books state (Step 2 & 3)
  const [cartItems, setCartItems] = useState<BorrowCartItem[]>([]);
  const [manualIsbn, setManualIsbn] = useState("");
  const [isLookingUpBook, setIsLookingUpBook] = useState(false);
  const [creatingSlip, setCreatingSlip] = useState(false);
  const [slipSuccess, setSlipSuccess] = useState<{ message: string; count: number } | null>(null);

  // Dialogs
  const [webcamScannerOpen, setWebcamScannerOpen] = useState(false);
  const [ipScannerOpen, setIpScannerOpen] = useState(false);
  const [overdueGuideOpen, setOverdueGuideOpen] = useState(false);

  // Camera & Face verify state
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [faceScanning, setFaceScanning] = useState(false);

  const { state: sseState, start: startSSE } = useTaskSSE(30000);
  const [borrowConfig, setBorrowConfig] = useState<{ max_borrow_books: number }>({ max_borrow_books: 3 });

  const borrowCamUrl = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_BORROW_CAM_URL;
    if (!raw) return null;
    return `/api/camera/proxy?url=${encodeURIComponent(raw)}`;
  }, []);

  useEffect(() => {
    api.getBorrowConfig().then(setBorrowConfig).catch(() => {});
  }, []);

  const remaining = borrowConfig.max_borrow_books - activeCount;
  const canBorrow = remaining > 0 && overdueCount === 0;

  const setPatron = useCallback((code: string, id: string, name: string) => {
    setPatronCode(code);
    setPatronId(id);
    setPatronName(name);
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setCameraStarted(false);
    setCameraLoading(false);
  }, []);

  const startWebcam = useCallback(async () => {
    setCameraError("");
    setCameraStarted(true);
    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
          setCameraLoading(false);
        };
      }
    } catch (err: any) {
      setCameraStarted(false);
      setCameraLoading(false);
      if (err.name === "NotAllowedError") setCameraError("Không có quyền truy cập camera.");
      else if (err.name === "NotFoundError") setCameraError("Không tìm thấy camera.");
      else setCameraError("Không thể khởi động camera.");
    }
  }, []);

  useEffect(() => {
    if (patronId) {
      stopCamera();
    }
    return () => stopCamera();
  }, [patronId, stopCamera]);

  // Handle SSE result for face verification
  useEffect(() => {
    if (sseState.status === "SUCCESS") {
      const taskResult = sseState.result;
      if (taskResult?.verified) {
        api.getActiveBorrowsByStudentCode(patronCode.trim())
          .then((data) => {
            stopCamera();
            setPatron(patronCode.trim(), data.patron.id, data.patron.full_name || data.patron.student_code);
            setActiveCount(data.total);
            setOverdueCount(data.overdue_count);
            apiAnt.success({ title: `Đã xác minh: ${data.patron.full_name || data.patron.student_code}`, placement: "topRight" });
            setFaceScanning(false);
          })
          .catch((err: any) => {
            const status = err?.response?.status || err?.status;
            if (status === 403) {
              setError("Độc giả chưa ở trong thư viện hoặc thẻ đã bị khóa.");
            } else {
              setError(getErrorMessage(err) || "Không thể kiểm tra thông tin độc giả");
            }
            setFaceScanning(false);
          });
      } else {
        setError("Khuôn mặt không khớp với độc giả này");
        setFaceScanning(false);
      }
    } else if (sseState.status === "FAILURE" || sseState.status === "ERROR" || sseState.status === "TIMEOUT") {
      setError(sseState.error || "Xác minh thất bại");
      setFaceScanning(false);
    }
  }, [sseState.status, sseState.result, sseState.error, patronCode, stopCamera, setPatron, apiAnt]);

  const handleFaceVerify = useCallback(async () => {
    if (!videoRef.current || !patronCode.trim()) return;
    setFaceScanning(true);
    setError("");

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setError("Canvas context error"); setFaceScanning(false); return; }
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => { if (b) resolve(b); else reject(new Error("toBlob failed")); }, "image/jpeg", 0.85);
      });
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

      const lookupResult = await api.lookupPatron(patronCode.trim());
      if (!lookupResult.exists || !lookupResult.patron) {
        setError("Không tìm thấy độc giả"); setFaceScanning(false); return;
      }
      if (lookupResult.is_expired) {
        setError("Thẻ độc giả đã hết hạn"); setFaceScanning(false); return;
      }
      const verifyResult = await api.verifyFace(file, lookupResult.patron.id, true);

      startSSE(verifyResult.job_id);
    } catch (err) {
      setError(getErrorMessage(err) || "Lỗi xác minh khuôn mặt");
      setFaceScanning(false);
    }
  }, [patronCode, stopCamera, setPatron, startSSE]);

  const handleClearSession = useCallback(() => {
    setPatronId(null);
    setPatronName("");
    setActiveCount(0);
    setOverdueCount(0);
    setPatronCode("");
    setCartItems([]);
    setSlipSuccess(null);
    setCurrentStep(0);
    setError("");
    stopCamera();
  }, [stopCamera]);

  const handleManualPresenceCheckIn = useCallback(async () => {
    if (!patronCode.trim()) return;
    setCheckingIn(true);
    try {
      const lookup = await api.lookupPatron(patronCode.trim());
      if (lookup.patron?.id) {
        await api.kioskPresence(lookup.patron.id, patronCode.trim(), "staff-desk");
        apiAnt.success({ title: "Đã xác nhận độc giả có mặt tại quầy!", placement: "topRight" });
        setError("");
        startWebcam();
      } else {
        apiAnt.error({ title: "Không tìm thấy thông tin độc giả", placement: "topRight" });
      }
    } catch (err) {
      apiAnt.error({ title: getErrorMessage(err) || "Không thể xác nhận trạng thái có mặt", placement: "topRight" });
    } finally {
      setCheckingIn(false);
    }
  }, [patronCode, apiAnt, startWebcam]);

  const handleLookupAndOpenCamera = useCallback(async () => {
    if (!patronCode.trim()) return;
    setError("");
    try {
      const result = await api.lookupPatron(patronCode.trim());
      if (!result.exists) {
        setError("Không tìm thấy độc giả với MSSV này.");
        return;
      }
      if (result.is_expired) {
        setError("Thẻ độc giả đã hết hạn. Vui lòng gia hạn thẻ.");
        return;
      }
      if (result.is_locked) {
        setError("Thẻ độc giả đang bị khóa. Liên hệ quản trị viên.");
        return;
      }
      if (result.patron?.status === "deleted") {
        setError("Độc giả đã bị xóa. Không thể mượn sách.");
        return;
      }
      if (result.patron?.status === "inactive") {
        setError("Thẻ độc giả đang bị tạm khóa. Liên hệ quản trị viên.");
        return;
      }
      startWebcam();
    } catch (err: any) {
      setError(getErrorMessage(err) || "Lỗi kiểm tra thông tin độc giả.");
    }
  }, [patronCode, startWebcam]);

  // Lookup single book item and add to cart
  const handleAddBookToCart = useCallback(async (barcodeOrIsbn: string) => {
    const raw = barcodeOrIsbn.trim();
    if (!raw) return;
    if (!patronId) {
      setError("Vui lòng xác minh độc giả trước khi quét sách.");
      return;
    }
    if (cartItems.some((item) => item.barcode === raw || item.isbn === raw)) {
      apiAnt.warning({ title: "Sách này đã có trong danh sách mượn.", placement: "topRight" });
      setManualIsbn("");
      return;
    }
    if (cartItems.length >= remaining) {
      apiAnt.warning({ title: `Độc giả chỉ được mượn thêm tối đa ${remaining} cuốn.`, placement: "topRight" });
      return;
    }

    setIsLookingUpBook(true);
    setError("");
    try {
      const result = await api.lookupBorrowSlip({
        patron_id: patronId,
        items: [{ barcode: raw, isbn: raw }],
      });
      const item = result.items[0];
      if (!item) {
        apiAnt.error({ title: `Không tìm thấy sách với mã "${raw}"`, placement: "topRight" });
        return;
      }
      if (!item.can_borrow) {
        apiAnt.error({
          title: `Không thể mượn "${item.book?.title || raw}"`,
          description: item.reason || "Sách không có sẵn để mượn.",
          placement: "topRight",
        });
        return;
      }

      setCartItems((prev) => [
        ...prev,
        {
          barcode: item.barcode,
          isbn: item.isbn || raw,
          loading: false,
          can_borrow: item.can_borrow,
          reason: item.reason,
          book: (item.book as any) || null,
          copy_id: item.copy?.id || null,
          book_id: item.book?.id || null,
          copy_barcode: item.copy?.barcode || null,
          shelf_location: item.copy?.shelf_location || null,
        },
      ]);
      setManualIsbn("");
      apiAnt.success({ title: `Đã thêm "${item.book?.title || raw}" vào phiếu mượn`, placement: "topRight" });
    } catch (err) {
      apiAnt.error({ title: getErrorMessage(err) || `Lỗi tra cứu mã ${raw}`, placement: "topRight" });
    } finally {
      setIsLookingUpBook(false);
    }
  }, [patronId, cartItems, remaining, apiAnt]);

  const handleRemoveFromCart = (barcode: string) => {
    setCartItems((prev) => prev.filter((item) => item.barcode !== barcode));
  };

  // Confirm and create slip in Step 3
  const handleConfirmBorrowSlip = async () => {
    const validItems = cartItems.filter((i) => i.can_borrow && i.book_id && i.copy_id);
    if (!patronId || validItems.length === 0) return;
    setCreatingSlip(true);
    setError("");
    try {
      const confirmResult = await api.confirmBorrowSlip({
        patron_id: patronId,
        items: validItems.map((item) => ({
          barcode: item.copy_barcode || item.barcode,
          isbn: item.isbn,
          book_id: item.book_id!,
          copy_id: item.copy_id!,
        })),
      });
      if (confirmResult.status === "success") {
        setSlipSuccess({
          message: confirmResult.message || "Tạo phiếu mượn thành công!",
          count: validItems.length,
        });
        apiAnt.success({ title: "Tạo phiếu mượn thành công!", placement: "topRight" });
      }
    } catch (err) {
      setError(getErrorMessage(err) || "Không thể hoàn tất tạo phiếu mượn.");
    } finally {
      setCreatingSlip(false);
    }
  };

  const faceVerifyDisabled = faceScanning || !patronCode.trim() || !!patronId;

  // Date summaries for Step 3
  const borrowDateStr = useMemo(() => new Date().toLocaleDateString("vi-VN"), []);
  const dueDateStr = useMemo(() => {
    const due = new Date();
    due.setDate(due.getDate() + 14);
    return due.toLocaleDateString("vi-VN");
  }, []);

  return (
    <Stack spacing={3} sx={{ height: "calc(100vh - 120px)" }}>
      <Box sx={staggerSx(0)}>
        <PageHeader
          title="Mượn sách"
          subtitle={
            patronId
              ? `Đang phục vụ độc giả: ${patronName} (${patronCode}) — Đang mượn ${activeCount}/${borrowConfig.max_borrow_books} sách`
              : "Quy trình lập phiếu mượn sách 3 bước trực quan cho Thủ thư"
          }
          icon={BorrowIcon}
          gradient="linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)"
          actions={
            patronId ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleClearSession}
                sx={{
                  color: "#a5b4fc",
                  borderColor: "rgba(165,180,252,0.4)",
                  "&:hover": { borderColor: "#a5b4fc", bgcolor: "rgba(165,180,252,0.08)" },
                }}
              >
                Làm mới phiên
              </Button>
            ) : null
          }
        />
      </Box>

      {/* Modern 3-Step Wizard Navigation */}
      <Box sx={{ px: 1 }}>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(19, 34, 50, 0.7)" : "#ffffff"),
            backdropFilter: "blur(12px)",
          }}
        >
          <Steps
            current={slipSuccess ? 3 : currentStep}
            onChange={(step) => {
              if (step === 0) setCurrentStep(0);
              else if (step === 1 && patronId && canBorrow) setCurrentStep(1);
              else if (step === 2 && patronId && cartItems.length > 0) setCurrentStep(2);
            }}
            items={[
              {
                title: "Bước 1",
                description: "Xác minh độc giả",
                disabled: false,
              },
              {
                title: "Bước 2",
                description: "Quét mã vạch sách",
                disabled: !patronId || !canBorrow,
              },
              {
                title: "Bước 3",
                description: "Xác nhận & Hoàn tất",
                disabled: !patronId || cartItems.length === 0,
              },
            ]}
          />
        </Paper>
      </Box>

      {/* Global Notice / Error Alert */}
      {error ? (
        <Slide direction="down" in={!!error} timeout={250}>
          <Alert
            severity={getAlertSeverity(error)}
            onClose={() => setError("")}
            action={
              error.includes("chưa vào thư viện") ? (
                <Button
                  color="inherit"
                  size="small"
                  variant="outlined"
                  disabled={checkingIn}
                  onClick={handleManualPresenceCheckIn}
                  sx={{ textTransform: "none", fontWeight: 700, ml: 1, whiteSpace: "nowrap" }}
                >
                  {checkingIn ? "Đang xác nhận..." : "Xác nhận có mặt tại quầy"}
                </Button>
              ) : undefined
            }
            sx={{ animation: `${slideInRight} 0.25s ease-out`, borderRadius: 2, alignItems: "center" }}
          >
            <AlertTitle>{getAlertTitle(error)}</AlertTitle>
            {error}
          </Alert>
        </Slide>
      ) : null}

      {/* ========================================================================= */}
      {/* STEP 1: XÁC MINH ĐỘC GIẢ (Verify Patron) */}
      {/* ========================================================================= */}
      {currentStep === 0 && !slipSuccess && (
        <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
          <Grid size={{ xs: 12, md: 5, lg: 4 }} sx={{ display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", minHeight: 0 }}>
            <Box sx={staggerSx(1)}>
              <DashboardCard
                title="Xác minh độc giả"
                actions={
                  <Avatar sx={{ bgcolor: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", width: 32, height: 32 }}>
                    <BadgeIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                }
              >
                <Stack spacing={2}>
                  <TextField
                    value={patronCode}
                    onChange={(e) => setPatronCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLookupAndOpenCamera();
                    }}
                    placeholder="Nhập mã số sinh viên (MSSV)..."
                    size="small"
                    fullWidth
                    disabled={!!patronId}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        bgcolor: "background.paper",
                        "&:hover": { "& fieldset": { borderColor: "primary.main" } },
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleLookupAndOpenCamera}
                    disabled={faceVerifyDisabled}
                    startIcon={<FaceIcon />}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 700,
                      textTransform: "none",
                      py: 1.2,
                      background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
                      "&:hover": { background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)" },
                    }}
                  >
                    Kiểm tra & Bật camera
                  </Button>
                </Stack>
              </DashboardCard>
            </Box>

            {patronId ? (
              <Box sx={{ ...staggerSx(2), animation: `${fadeInUp} 0.4s ease-out` }}>
                <DashboardCard noPadding>
                  <Box
                    sx={{
                      px: 2.5,
                      pt: 2,
                      pb: 2.5,
                      borderLeft: 4,
                      borderLeftColor: overdueCount > 0 ? "error.main" : "success.main",
                    }}
                  >
                    <Stack spacing={2}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Avatar
                          sx={{
                            width: 48,
                            height: 48,
                            background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
                            boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
                          }}
                        >
                          {patronName?.[0]?.toUpperCase() || "?"}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800 }} noWrap>
                            {patronName || patronId}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                            MSSV: {patronCode}
                          </Typography>
                        </Box>
                        <Chip size="small" color="success" label="Đã xác minh" icon={<CheckCircleIcon />} sx={{ fontWeight: 600 }} />
                      </Box>
                      <Divider />
                      <Stack spacing={1}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Số sách đã mượn
                          </Typography>
                          <Chip
                            size="small"
                            color={activeCount >= borrowConfig.max_borrow_books ? "error" : "primary"}
                            label={`${activeCount}/${borrowConfig.max_borrow_books}`}
                            sx={{ fontWeight: 700 }}
                          />
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={(activeCount / borrowConfig.max_borrow_books) * 100}
                          color={activeCount >= borrowConfig.max_borrow_books ? "error" : "primary"}
                          sx={{ borderRadius: 2, height: 6, bgcolor: "action.hover" }}
                        />
                        {overdueCount > 0 ? (
                          <>
                            <Alert severity="error" sx={{ py: 0.5, borderRadius: 2 }}>
                              <WarningIcon fontSize="small" sx={{ mr: 0.5 }} />
                              Có {overdueCount} cuốn sách quá hạn
                            </Alert>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => setOverdueGuideOpen(true)}
                              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
                            >
                              Xem hướng dẫn xử lý
                            </Button>
                          </>
                        ) : null}
                        <Typography variant="body2" color={remaining > 0 ? "text.secondary" : "error"} sx={{ fontWeight: 600 }}>
                          {remaining > 0 ? `Được phép mượn thêm ${remaining} cuốn` : "Đã đạt giới hạn số lượng mượn"}
                        </Typography>
                      </Stack>
                      <Divider />
                      <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        endIcon={<ArrowForwardIcon />}
                        disabled={!canBorrow}
                        onClick={() => setCurrentStep(1)}
                        sx={{
                          borderRadius: 2,
                          fontWeight: 700,
                          textTransform: "none",
                          py: 1.4,
                          background: canBorrow ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : undefined,
                        }}
                      >
                        {canBorrow ? "Tiếp tục: Quét mã vạch sách" : overdueCount > 0 ? "Cần trả sách quá hạn" : "Đã đạt giới hạn mượn"}
                      </Button>
                    </Stack>
                  </Box>
                </DashboardCard>
              </Box>
            ) : (
              <Box sx={staggerSx(2)}>
                <DashboardCard>
                  <Stack spacing={1.5} sx={{ alignItems: "center", color: "text.secondary", minHeight: 200, justifyContent: "center" }}>
                    <BadgeIcon sx={{ fontSize: 56, opacity: 0.2 }} />
                    <Typography variant="body1" sx={{ fontWeight: 700, textAlign: "center" }}>
                      Nhập MSSV hoặc quét khuôn mặt<br />để xác minh độc giả
                    </Typography>
                  </Stack>
                </DashboardCard>
              </Box>
            )}
          </Grid>

          <Grid size={{ xs: 12, md: 7, lg: 8 }} sx={{ display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", minHeight: 0 }}>
            <Box sx={staggerSx(1)}>
              <DashboardCard title="Camera nhận diện khuôn mặt" actions={<VideocamIcon color="primary" />} noPadding>
                <Box
                  sx={{
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 3,
                    overflow: "hidden",
                    position: "relative",
                    minHeight: 400,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {cameraError ? (
                    <Stack spacing={1.5} sx={{ alignItems: "center", justifyContent: "center", height: "100%", color: "grey.300", p: 3 }}>
                      <VideocamIcon sx={{ fontSize: 48, color: "error.main" }} />
                      <Typography sx={{ textAlign: "center", color: "text.primary" }}>{cameraError}</Typography>
                      <Button size="small" variant="outlined" color="primary" onClick={startWebcam}>
                        Thử lại
                      </Button>
                    </Stack>
                  ) : !cameraStarted ? (
                    <Stack spacing={2} sx={{ alignItems: "center", justifyContent: "center", p: 4, textAlign: "center" }}>
                      <Box
                        sx={{
                          width: 68,
                          height: 68,
                          borderRadius: "50%",
                          bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <VideocamIcon sx={{ fontSize: 36, color: "text.secondary" }} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          Camera xác minh đang ở chế độ chờ
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 340 }}>
                          Bấm nút bên dưới hoặc nhập MSSV để bật camera nhận diện độc giả
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        size="medium"
                        startIcon={<VideocamIcon />}
                        onClick={startWebcam}
                        sx={{
                          borderRadius: 2,
                          textTransform: "none",
                          fontWeight: 700,
                          px: 3,
                          background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
                        }}
                      >
                        Mở camera
                      </Button>
                    </Stack>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", transform: "scaleX(-1)" }}
                      />
                      {cameraLoading && !cameraReady ? (
                        <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.65)", color: "common.white", alignItems: "center", justifyContent: "center" }} spacing={1.5}>
                          <CircularProgress size={32} color="inherit" />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>Đang kết nối camera...</Typography>
                        </Stack>
                      ) : null}
                      {faceScanning && cameraReady ? (
                        <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.65)", color: "common.white", alignItems: "center", justifyContent: "center" }} spacing={1.5}>
                          <CircularProgress size={32} color="inherit" />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>Đang xác minh khuôn mặt...</Typography>
                        </Stack>
                      ) : null}
                      <Stack direction="row" spacing={1} sx={{ position: "absolute", bottom: 12, left: 12, right: 12, justifyContent: "center" }}>
                        <Button
                          variant="contained"
                          size="large"
                          startIcon={<FaceIcon />}
                          onClick={handleFaceVerify}
                          disabled={!cameraReady || faceScanning || !patronCode.trim()}
                          sx={{ display: cameraReady ? undefined : "none", minWidth: 200, borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                        >
                          {faceScanning ? "Đang xác minh..." : "Xác minh khuôn mặt"}
                        </Button>
                      </Stack>
                    </>
                  )}
                </Box>
              </DashboardCard>
            </Box>
          </Grid>
        </Grid>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: QUÉT MÃ VẠCH SÁCH (Scan Books to Borrow) */}
      {/* ========================================================================= */}
      {currentStep === 1 && !slipSuccess && (
        <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
          {/* Left Column: Scanner Tools & Manual Input */}
          <Grid size={{ xs: 12, md: 5 }} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <DashboardCard
              title="Phương thức quét sách"
              actions={<QrCodeScannerIcon color="primary" />}
            >
              <Stack spacing={2.5}>
                {/* Manual Barcode / ISBN Entry */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Nhập mã ISBN hoặc Barcode gáy sách:
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Nhập 10-13 chữ số ISBN..."
                      value={manualIsbn}
                      onChange={(e) => setManualIsbn(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddBookToCart(manualIsbn);
                      }}
                      disabled={isLookingUpBook || cartItems.length >= remaining}
                    />
                    <Button
                      variant="contained"
                      onClick={() => handleAddBookToCart(manualIsbn)}
                      disabled={isLookingUpBook || !manualIsbn.trim() || cartItems.length >= remaining}
                      sx={{ textTransform: "none", fontWeight: 700, whiteSpace: "nowrap" }}
                    >
                      {isLookingUpBook ? <CircularProgress size={20} color="inherit" /> : "Thêm"}
                    </Button>
                  </Stack>
                </Box>

                <Divider>
                  <Typography variant="caption" color="text.secondary">HOẶC DÙNG CAMERA QUÉT</Typography>
                </Divider>

                {/* Camera Scanner Buttons */}
                <Stack spacing={1.5}>
                  <Button
                    variant="outlined"
                    size="large"
                    fullWidth
                    startIcon={<CameraAltIcon />}
                    onClick={() => setWebcamScannerOpen(true)}
                    disabled={cartItems.length >= remaining}
                    sx={{ py: 1.5, borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                  >
                    Quét qua Camera máy tính / Tablet
                  </Button>

                  {borrowCamUrl && (
                    <Button
                      variant="outlined"
                      size="large"
                      fullWidth
                      color="secondary"
                      startIcon={<QrCodeScannerIcon />}
                      onClick={() => setIpScannerOpen(true)}
                      disabled={cartItems.length >= remaining}
                      sx={{ py: 1.5, borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                    >
                      Quét qua Camera IP Quầy thủ thư
                    </Button>
                  )}
                </Stack>
              </Stack>
            </DashboardCard>

            {/* Patron Mini Summary Card */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Avatar sx={{ bgcolor: "primary.main", width: 40, height: 40 }}>
                  {patronName?.[0]?.toUpperCase() || "?"}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                    {patronName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    MSSV: {patronCode} • Được mượn thêm: <strong>{remaining - cartItems.length}</strong> cuốn
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Right Column: Scanned Books List in Cart */}
          <Grid size={{ xs: 12, md: 7 }} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <DashboardCard
              title={`Danh sách sách đã quét (${cartItems.length}/${remaining} cuốn)`}
              actions={
                <Chip
                  color={cartItems.length > 0 ? "success" : "default"}
                  label={`${cartItems.length} cuốn đã chọn`}
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              }
            >
              {cartItems.length === 0 ? (
                <Box sx={{ py: 8, textAlign: "center", color: "text.secondary" }}>
                  <BookIcon sx={{ fontSize: 64, opacity: 0.25, mb: 1 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Chưa có cuốn sách nào được chọn
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Hãy quét mã vạch trên bìa sách hoặc nhập ISBN ở khung bên trái
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1.5} sx={{ maxHeight: 380, overflowY: "auto", pr: 0.5 }}>
                  {cartItems.map((item, idx) => (
                    <Paper
                      key={item.barcode}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"),
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <Avatar
                        variant="rounded"
                        src={item.book?.cover_url || undefined}
                        sx={{ width: 44, height: 60, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}
                      >
                        <BookIcon />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                          {idx + 1}. {item.book?.title || item.isbn}
                        </Typography>
                        {item.book?.author && (
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                            Tác giả: {item.book.author}
                          </Typography>
                        )}
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5, alignItems: "center" }}>
                          <Chip size="small" variant="outlined" label={`ISBN: ${item.isbn}`} sx={{ fontFamily: "monospace", fontSize: "0.72rem" }} />
                          {item.shelf_location && (
                            <Chip size="small" color="info" variant="outlined" label={`Vị trí: ${item.shelf_location}`} sx={{ fontSize: "0.72rem" }} />
                          )}
                        </Stack>
                      </Box>
                      <IconButton size="small" color="error" onClick={() => handleRemoveFromCart(item.barcode)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  ))}
                </Stack>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Navigation Buttons */}
              <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between" }}>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => setCurrentStep(0)}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Quay lại Bước 1
                </Button>
                <Button
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  disabled={cartItems.length === 0}
                  onClick={() => setCurrentStep(2)}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    px: 3,
                    background: cartItems.length > 0 ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : undefined,
                  }}
                >
                  Tiếp tục: Xác nhận phiếu ({cartItems.length} cuốn)
                </Button>
              </Stack>
            </DashboardCard>
          </Grid>
        </Grid>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: XÁC NHẬN & HOÀN TẤT (Confirm Borrow Slip) */}
      {/* ========================================================================= */}
      {currentStep === 2 && !slipSuccess && (
        <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
          {/* Left Column: Summary of Patron & Books */}
          <Grid size={{ xs: 12, md: 7 }} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <DashboardCard title="Chi tiết phiếu mượn sách" actions={<LocalLibraryIcon color="primary" />}>
              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)" }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Họ tên độc giả:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{patronName}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Mã số sinh viên (MSSV):</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: "monospace" }}>{patronCode}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Ngày mượn sách:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>{borrowDateStr}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Hạn trả quy định (+14 ngày):</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: "error.main" }}>{dueDateStr}</Typography>
                    </Grid>
                  </Grid>
                </Paper>

                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Danh sách {cartItems.length} cuốn sách sẽ mượn:
                </Typography>

                <Stack spacing={1} sx={{ maxHeight: 260, overflowY: "auto" }}>
                  {cartItems.map((item, idx) => (
                    <Box
                      key={item.barcode}
                      sx={{
                        p: 1.2,
                        borderRadius: 1.5,
                        border: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 800, color: "text.secondary", width: 24 }}>
                        #{idx + 1}
                      </Typography>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                          {item.book?.title || item.isbn}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Mã bản sao: {item.copy_barcode || item.barcode} • Kệ: {item.shelf_location || "Chung"}
                        </Typography>
                      </Box>
                      <Chip size="small" color="success" variant="outlined" label="Hợp lệ" sx={{ fontWeight: 600 }} />
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </DashboardCard>
          </Grid>

          {/* Right Column: Regulations & Confirm Action */}
          <Grid size={{ xs: 12, md: 5 }} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <DashboardCard title="Quy định & Hoàn tất" actions={<CheckCircleIcon color="success" />}>
              <Stack spacing={2.5}>
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Lưu ý mượn trả:</Typography>
                  <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                    • Thời hạn mượn sách tiêu chuẩn: <strong>14 ngày</strong>.<br />
                    • Phí phạt quá hạn: <strong>5.000 đ/ngày/cuốn</strong>.<br />
                    • Độc giả có trách nhiệm bảo quản sách nguyên vẹn khi hoàn trả.
                  </Typography>
                </Alert>

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={creatingSlip || cartItems.length === 0}
                  onClick={handleConfirmBorrowSlip}
                  sx={{
                    py: 1.8,
                    borderRadius: 2,
                    fontWeight: 800,
                    fontSize: "1.05rem",
                    textTransform: "none",
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    "&:hover": { background: "linear-gradient(135deg, #059669 0%, #047857 100%)" },
                  }}
                >
                  {creatingSlip ? (
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <CircularProgress size={22} color="inherit" />
                      <span>Đang tạo phiếu mượn...</span>
                    </Stack>
                  ) : (
                    `Xác nhận tạo phiếu (${cartItems.length} cuốn)`
                  )}
                </Button>

                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<ArrowBackIcon />}
                  onClick={() => setCurrentStep(1)}
                  disabled={creatingSlip}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Quay lại chọn thêm sách
                </Button>
              </Stack>
            </DashboardCard>
          </Grid>
        </Grid>
      )}

      {/* ========================================================================= */}
      {/* SUCCESS SCREEN (After Borrow Slip Created) */}
      {/* ========================================================================= */}
      {slipSuccess && (
        <Stack spacing={3} sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <DashboardCard>
            <Result
              status="success"
              title="Lập phiếu mượn sách thành công!"
              subTitle={`Đã mượn thành công ${slipSuccess.count} cuốn sách cho độc giả ${patronName} (MSSV: ${patronCode}). Hạn trả: ${dueDateStr}.`}
              extra={[
                <Button
                  key="new"
                  variant="contained"
                  size="large"
                  startIcon={<RefreshIcon />}
                  onClick={handleClearSession}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: "none",
                    px: 3,
                    background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
                  }}
                >
                  Tạo lượt mượn mới
                </Button>,
                <Button
                  key="print"
                  variant="outlined"
                  size="large"
                  startIcon={<PrintIcon />}
                  onClick={() => window.print()}
                  sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none", ml: 1 }}
                >
                  In biên nhận
                </Button>,
              ]}
            />
          </DashboardCard>

          {/* AI Book Recommendations for this Patron */}
          {patronCode.trim() && (
            <Box sx={{ ...staggerSx(2), animation: `${fadeInUp} 0.4s ease-out` }}>
              <BookRecommendations studentCode={patronCode.trim()} />
            </Box>
          )}
        </Stack>
      )}

      {/* Camera Barcode Scanner Dialogs */}
      <BorrowScannerDialog
        open={webcamScannerOpen}
        patronId={patronId || ""}
        maxItems={remaining - cartItems.length > 0 ? remaining - cartItems.length : undefined}
        onClose={() => setWebcamScannerOpen(false)}
        onSuccess={() => {
          setWebcamScannerOpen(false);
          // Refetch active borrows
          if (patronCode.trim()) {
            api.getActiveBorrowsByStudentCode(patronCode.trim()).then((data) => {
              setActiveCount(data.total);
              setOverdueCount(data.overdue_count);
            }).catch(() => {});
          }
          setSlipSuccess({ message: "Mượn sách thành công", count: remaining });
        }}
      />

      {borrowCamUrl && (
        <BorrowIPCameraDialog
          open={ipScannerOpen}
          patronId={patronId || ""}
          patronName={patronName}
          maxItems={remaining - cartItems.length > 0 ? remaining - cartItems.length : undefined}
          cameraUrl={borrowCamUrl}
          onClose={() => setIpScannerOpen(false)}
          onSuccess={() => {
            setIpScannerOpen(false);
            if (patronCode.trim()) {
              api.getActiveBorrowsByStudentCode(patronCode.trim()).then((data) => {
                setActiveCount(data.total);
                setOverdueCount(data.overdue_count);
              }).catch(() => {});
            }
            setSlipSuccess({ message: "Mượn sách thành công", count: remaining });
          }}
        />
      )}

      <OverdueGuideModal
        open={overdueGuideOpen}
        onClose={() => setOverdueGuideOpen(false)}
      />

      {contextHolder}
    </Stack>
  );
}
