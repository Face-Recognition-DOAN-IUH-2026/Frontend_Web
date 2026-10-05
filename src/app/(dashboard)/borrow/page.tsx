"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Paper,
  Slide,
  Snackbar,
  Stack,
  Step,
  StepButton,
  StepLabel,
  Stepper,
  useTheme,
} from "@mui/material";
import BorrowIcon from "@mui/icons-material/AssignmentIndOutlined";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";

import BorrowScannerDialog from "@/app/(dashboard)/_components/BorrowScannerDialog";
import BorrowIPCameraDialog from "@/app/(dashboard)/_components/BorrowIPCameraDialog";
import OverdueGuideModal from "@/app/(dashboard)/_components/OverdueGuideModal";
import api, { getErrorMessage } from "@/lib/api-client";
import { useTaskSSE } from "@/lib/hooks/useTaskSSE";
import { slideInRight } from "@/lib/animations";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import { getAlertSeverity, getAlertTitle } from "@/lib/alert-utils";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";

import {
  BorrowStepPatron,
  BorrowStepScanBooks,
  BorrowStepConfirm,
  BorrowStepSuccess,
  type BorrowCartItem,
} from "@/app/(dashboard)/_components/borrow";

export default function BorrowPage() {
  const theme = useTheme();
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "warning" | "error" | "info";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  const showNotice = useCallback((type: "success" | "warning" | "error" | "info", msg: string) => {
    setSnackbar({
      open: true,
      message: msg,
      severity: type,
    });
  }, []);

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [faceScanning, setFaceScanning] = useState(false);

  const { state: sseState, start: startSSE } = useTaskSSE(30000);
  const [borrowConfig, setBorrowConfig] = useState<{ max_borrow_books: number; max_borrow_days?: number; fine?: any }>({ max_borrow_books: 3 });

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
            showNotice("success", `Đã xác minh: ${data.patron.full_name || data.patron.student_code}`);
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
  }, [sseState.status, sseState.result, sseState.error, patronCode, stopCamera, setPatron, showNotice]);

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
  }, [patronCode, startSSE]);

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
        showNotice("success", "Đã xác nhận độc giả có mặt tại quầy!");
        setError("");
        startWebcam();
      } else {
        showNotice("error", "Không tìm thấy thông tin độc giả");
      }
    } catch (err) {
      showNotice("error", getErrorMessage(err) || "Không thể xác nhận trạng thái có mặt");
    } finally {
      setCheckingIn(false);
    }
  }, [patronCode, showNotice, startWebcam]);

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
    const normRaw = raw.replace(/[-\s]/g, "").toLowerCase();
    if (cartItems.some((item) => {
      const bNorm = item.barcode.replace(/[-\s]/g, "").toLowerCase();
      const cNorm = (item.copy_barcode || "").replace(/[-\s]/g, "").toLowerCase();
      const iNorm = (item.isbn || "").replace(/[-\s]/g, "").toLowerCase();
      return bNorm === normRaw || cNorm === normRaw || iNorm === normRaw;
    })) {
      showNotice("warning", "Sách này đã có trong danh sách mượn.");
      setManualIsbn("");
      return;
    }
    if (cartItems.length >= remaining) {
      showNotice("warning", `Độc giả chỉ được mượn thêm tối đa ${remaining} cuốn.`);
      return;
    }

    setIsLookingUpBook(true);
    setError("");
    try {
      const isCopy = /^LIB/i.test(raw.replace(/[-\s]/g, ""));
      const result = await api.lookupBorrowSlip({
        patron_id: patronId,
        items: [{ barcode: raw, isbn: isCopy ? undefined : raw }],
      });
      const item = result.items[0];
      if (!item) {
        showNotice("error", `Không tìm thấy sách với mã "${raw}"`);
        return;
      }
      if (!item.can_borrow) {
        const msg = item.reason || "Sách không có sẵn để mượn.";
        const title = item.book?.title;
        showNotice("error", title && !msg.includes(title) ? `Không thể mượn "${title}": ${msg}` : msg);
        return;
      }

      if (item.book?.id && cartItems.some((c) => c.book_id === item.book?.id)) {
        showNotice("warning", `Đầu sách "${item.book.title}" đã có trong danh sách mượn.`);
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
          condition: (item.copy as any)?.condition || null,
          status: (item.copy as any)?.status || null,
        },
      ]);
      setManualIsbn("");
      showNotice("success", `Đã thêm "${item.book?.title || raw}" vào phiếu mượn`);
    } catch (err) {
      showNotice("error", getErrorMessage(err) || `Lỗi tra cứu mã ${raw}`);
    } finally {
      setIsLookingUpBook(false);
    }
  }, [patronId, cartItems, remaining, showNotice]);

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
        showNotice("success", "Tạo phiếu mượn thành công!");
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
          actions={
            patronId ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleClearSession}
                sx={{
                  borderRadius: "4px",
                  borderColor: "divider",
                  textTransform: "none",
                }}
              >
                Làm mới phiên
              </Button>
            ) : null
          }
        />
      </Box>

      {/* 3-Step Wizard Navigation */}
      <Box sx={{ px: 1 }}>
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: 2.5,
            bgcolor: "background.paper",
          }}
        >
          <Stepper
            activeStep={slipSuccess ? 3 : currentStep}
            alternativeLabel
            sx={{
              "& .MuiStepIcon-root.Mui-active": { color: "primary.main" },
              "& .MuiStepIcon-root.Mui-completed": { color: "secondary.main" },
              "& .MuiStepLabel-label.Mui-active": { fontWeight: 700, color: "primary.main" },
            }}
          >
            {[
              { label: "Xác minh độc giả", disabled: false },
              { label: "Quét mã vạch sách", disabled: !patronId || !canBorrow },
              { label: "Xác nhận & Hoàn tất", disabled: !patronId || cartItems.length === 0 },
            ].map((stepItem, idx) => (
              <Step key={idx} completed={idx < currentStep || !!slipSuccess}>
                <StepButton
                  onClick={() => setCurrentStep(idx)}
                  disabled={stepItem.disabled}
                >
                  <StepLabel>{stepItem.label}</StepLabel>
                </StepButton>
              </Step>
            ))}
          </Stepper>
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
                  sx={{ textTransform: "none", fontWeight: 700, ml: 1, whiteSpace: "nowrap", borderRadius: "4px" }}
                >
                  {checkingIn ? "Đang xác nhận..." : "Xác nhận có mặt tại quầy"}
                </Button>
              ) : undefined
            }
            sx={{ animation: `${slideInRight} 0.25s ease-out`, borderRadius: "4px", alignItems: "center" }}
          >
            <AlertTitle>{getAlertTitle(error)}</AlertTitle>
            {error}
          </Alert>
        </Slide>
      ) : null}

      {/* STEP 1: XÁC MINH ĐỘC GIẢ (Verify Patron) */}
      {currentStep === 0 && !slipSuccess && (
        <BorrowStepPatron
          patronCode={patronCode}
          setPatronCode={setPatronCode}
          patronId={patronId}
          patronName={patronName}
          activeCount={activeCount}
          overdueCount={overdueCount}
          borrowConfig={borrowConfig}
          remaining={remaining}
          canBorrow={canBorrow}
          faceVerifyDisabled={faceVerifyDisabled}
          handleLookupAndOpenCamera={handleLookupAndOpenCamera}
          startWebcam={startWebcam}
          handleFaceVerify={handleFaceVerify}
          setOverdueGuideOpen={setOverdueGuideOpen}
          setCurrentStep={setCurrentStep}
          videoRef={videoRef}
          cameraStarted={cameraStarted}
          cameraLoading={cameraLoading}
          cameraReady={cameraReady}
          cameraError={cameraError}
          faceScanning={faceScanning}
        />
      )}

      {/* STEP 2: QUÉT MÃ VẠCH SÁCH (Scan Books) */}
      {currentStep === 1 && !slipSuccess && (
        <BorrowStepScanBooks
          manualIsbn={manualIsbn}
          setManualIsbn={setManualIsbn}
          isLookingUpBook={isLookingUpBook}
          cartItems={cartItems}
          remaining={remaining}
          handleAddBookToCart={handleAddBookToCart}
          handleRemoveFromCart={handleRemoveFromCart}
          setWebcamScannerOpen={setWebcamScannerOpen}
          setIpScannerOpen={setIpScannerOpen}
          borrowCamUrl={borrowCamUrl}
          setCurrentStep={setCurrentStep}
          patronCode={patronCode}
        />
      )}

      {/* STEP 3: XÁC NHẬN & HOÀN TẤT (Confirm) */}
      {currentStep === 2 && !slipSuccess && (
        <BorrowStepConfirm
          patronName={patronName}
          patronCode={patronCode}
          borrowDateStr={borrowDateStr}
          dueDateStr={dueDateStr}
          cartItems={cartItems}
          creatingSlip={creatingSlip}
          handleConfirmBorrowSlip={handleConfirmBorrowSlip}
          setCurrentStep={setCurrentStep}
          finePerDay={borrowConfig?.fine?.fine_per_day}
          maxBorrowDays={borrowConfig?.max_borrow_days}
        />
      )}

      {/* SUCCESS SCREEN */}
      {slipSuccess && (
        <BorrowStepSuccess
          slipSuccess={slipSuccess}
          patronName={patronName}
          patronCode={patronCode}
          dueDateStr={dueDateStr}
          handleClearSession={handleClearSession}
        />
      )}

      {/* Camera Barcode Scanner Dialogs */}
      <BorrowScannerDialog
        open={webcamScannerOpen}
        patronId={patronId || ""}
        maxItems={Math.max(remaining, 0)}
        initialItems={cartItems}
        onClose={() => setWebcamScannerOpen(false)}
        onSuccess={(result) => {
          setWebcamScannerOpen(false);
          setCartItems([]);
          if (patronCode.trim()) {
            api.getActiveBorrowsByStudentCode(patronCode.trim()).then((data) => {
              setActiveCount(data.total);
              setOverdueCount(data.overdue_count);
            }).catch(() => {});
          }
          setSlipSuccess({ message: result.message, count: result.count });
        }}
      />

      {borrowCamUrl && (
        <BorrowIPCameraDialog
          open={ipScannerOpen}
          patronId={patronId || ""}
          patronName={patronName}
          maxItems={Math.max(remaining, 0)}
          initialItems={cartItems}
          cameraUrl={borrowCamUrl}
          onClose={() => setIpScannerOpen(false)}
          onSuccess={(result) => {
            setIpScannerOpen(false);
            setCartItems([]);
            if (patronCode.trim()) {
              api.getActiveBorrowsByStudentCode(patronCode.trim()).then((data) => {
                setActiveCount(data.total);
                setOverdueCount(data.overdue_count);
              }).catch(() => {});
            }
            setSlipSuccess({ message: result.message, count: result.count });
          }}
        />
      )}

      <OverdueGuideModal
        open={overdueGuideOpen}
        onClose={() => setOverdueGuideOpen(false)}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
