"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import AddAPhotoOutlinedIcon from "@mui/icons-material/AddAPhotoOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import Webcam from "react-webcam";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import {
  varianceOfLaplacian,
  meanBrightness,
  assessCaptureQuality,
} from "@/lib/image-quality";

export type CaptureAngle = "frontal" | "right" | "left" | "down";
export type MultiAngleCaptureStatus = "pending" | "capturing" | "done";

export interface AngleConfig {
  angle: CaptureAngle;
  instruction: string;
  tip: string;
  requirements: { yaw: [number, number]; pitch: [number, number] };
}

export interface CapturedAngle {
  angle: CaptureAngle;
  status: MultiAngleCaptureStatus;
  file: File | null;
  dataUrl: string | null;
}

export interface MultiAngleCaptureProps {
  consent: boolean;
  setConsent?: (v: boolean) => void;
  onFilesReady: (files: Record<CaptureAngle, File>) => Promise<void> | void;
  className?: string;
}

const DEFAULT_ANGLES: AngleConfig[] = [
  { angle: "frontal", instruction: "Nhìn thẳng", tip: "Mắt nhìn thẳng vào camera", requirements: { yaw: [-12, 12], pitch: [-12, 12] } },
  { angle: "right", instruction: "Quay mặt sang PHẢI", tip: "Xoay mặt sang phải khoảng 30 độ", requirements: { yaw: [20, 50], pitch: [-15, 15] } },
  { angle: "left", instruction: "Quay mặt sang TRÁI", tip: "Xoay mặt sang trái khoảng 30 độ", requirements: { yaw: [-50, -20], pitch: [-15, 15] } },
  { angle: "down", instruction: "Cúi XUỐNG", tip: "Cúi nhẹ cằm xuống", requirements: { yaw: [-15, 15], pitch: [15, 45] } },
];

const ANGLE_LABELS: Record<CaptureAngle, string> = {
  frontal: "Nhìn thẳng",
  right: "Quay phải",
  left: "Quay trái",
  down: "Cúi xuống",
};

// Hàm tiện ích chuyển DataURI sang File
function dataURItoFile(dataURI: string, filename: string): File {
  const byteString = atob(dataURI.split(",")[1]);
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new File([ab], filename, { type: mimeString });
}

export default function MultiAngleCapture({
  consent,
  setConsent,
  onFilesReady,
  className,
}: MultiAngleCaptureProps) {
  const [captures, setCaptures] = useState<CapturedAngle[]>(
    DEFAULT_ANGLES.map((item) => ({ angle: item.angle, status: "pending", file: null, dataUrl: null }))
  );
  
  const [isSequenceRunning, setIsSequenceRunning] = useState(false);
  const [currentAngleIdx, setCurrentAngleIdx] = useState(-1);
  
  // Model state
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const [feedback, setFeedback] = useState<string>("Đang khởi tạo AI...");
  const [isHold, setIsHold] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  
  const webcamRef = useRef<Webcam>(null);
  const requestRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectFaceRef = useRef<() => void>(() => {});
  const poseHoldStartRef = useRef<number>(0);
  const modelLoadingRef = useRef(false);
  // Ref giữ callback mới nhất → submit ổn định identity khi parent truyền arrow inline.
  const onFilesReadyRef = useRef(onFilesReady);
  onFilesReadyRef.current = onFilesReady;
  // Mỗi phiên chụp dùng stream mới để tránh camera đen khi chụp lại
  const [sessionKey, setSessionKey] = useState(0);
  
  const HOLD_DURATION = 1500; // Giữ 1.5 giây

  // --- Đánh giá chất lượng ảnh vừa chụp (blur + sáng) ---
  const assessScreenshot = useCallback((dataUrl: string): Promise<{ ok: boolean; reason: string | null }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) {
            resolve({ ok: true, reason: null });
            return;
          }
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          const gray = new Array<number>(canvas.width * canvas.height);
          for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          }
          resolve(
            assessCaptureQuality({
              blurVariance: varianceOfLaplacian(gray, canvas.width, canvas.height),
              brightness: meanBrightness(gray, canvas.width, canvas.height),
            })
          );
        } catch {
          // Không đọc được pixel (CORS...) thì cho qua, để backend chấm
          resolve({ ok: true, reason: null });
        }
      };
      img.onerror = () => resolve({ ok: true, reason: null });
      img.src = dataUrl;
    });
  }, []);

  // --- Khởi tạo Model (giữ sống suốt vòng đời component, chỉ đóng khi unmount) ---
  const loadModel = async () => {
    if (faceLandmarkerRef.current || modelLoadingRef.current) return;
    modelLoadingRef.current = true;
    try {
      setFeedback("Đang tải model nhận diện khuôn mặt (lần đầu có thể mất vài giây)...");
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
      );
      faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: true,
        runningMode: "VIDEO",
        numFaces: 1,
      });
      setIsModelLoaded(true);
      setFeedback("Camera sẵn sàng. Vui lòng làm theo hướng dẫn.");
    } catch (error) {
      console.error("Failed to load FaceLandmarker:", error);
      setFeedback("Lỗi tải model nhận diện khuôn mặt. Hãy tải lại trang.");
    } finally {
      modelLoadingRef.current = false;
    }
  };

  useEffect(() => {
    if (isSequenceRunning && !isModelLoaded) {
      loadModel();
    }
  }, [isSequenceRunning, isModelLoaded]);

  // Chỉ dọn dẹp khi component unmount (đóng Dialog). Không đóng model
  // mỗi khi sequence dừng, nếu không chụp lại sẽ gặp model đã đóng.
  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
    };
  }, []);

  // --- Bắt đầu chuỗi ---
  const startSequence = useCallback(() => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    setCaptures(DEFAULT_ANGLES.map((item) => ({ angle: item.angle, status: "pending", file: null, dataUrl: null })));
    setCurrentAngleIdx(0);
    setSessionKey((k) => k + 1);
    setIsSequenceRunning(true);
  }, []);

  const retakeAngle = useCallback((idx: number) => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    setCaptures((prev) =>
      prev.map((item, index) => (index === idx ? { ...item, status: "pending", file: null, dataUrl: null } : item))
    );
    setCurrentAngleIdx(idx);
    setSessionKey((k) => k + 1);
    setIsSequenceRunning(true);
  }, []);

  const retakeAll = useCallback(() => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    setCaptures(DEFAULT_ANGLES.map((item) => ({ angle: item.angle, status: "pending", file: null, dataUrl: null })));
    setCurrentAngleIdx(0);
    setSessionKey((k) => k + 1);
    setIsSequenceRunning(true);
  }, []);

  // Hẹn vòng detect tiếp theo sau khi chụp rớt quality (giữ nguyên góc hiện tại)
  const restartLoopSoon = useCallback(() => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    retryTimeoutRef.current = setTimeout(() => {
      requestRef.current = requestAnimationFrame(detectFaceRef.current);
    }, 700);
  }, []);

  // --- Logic Auto Capture (có cổng kiểm tra chất lượng từng góc) ---
  const captureCurrentPose = useCallback(async () => {
    const dataUrl = webcamRef.current?.getScreenshot();
    if (!dataUrl) {
      restartLoopSoon();
      return;
    }
    // Cổng quality: ảnh mờ/thiếu sáng thì ở yên góc này, không cho qua bước
    const verdict = await assessScreenshot(dataUrl);
    if (!verdict.ok) {
      setFeedback(`${verdict.reason} — giữ nguyên tư thế, đang chụp lại...`);
      setIsHold(false);
      setHoldProgress(0);
      poseHoldStartRef.current = 0;
      restartLoopSoon();
      return;
    }
    if (webcamRef.current) {
        const file = dataURItoFile(dataUrl, `face_${DEFAULT_ANGLES[currentAngleIdx].angle}.jpg`);
        setCaptures((prev) =>
          prev.map((item, index) => (index === currentAngleIdx ? { ...item, status: "done", file, dataUrl } : item))
        );
        
        // Find next pending angle
        setCaptures((currentCaptures) => {
          let nextIdx = -1;
          for (let i = 0; i < currentCaptures.length; i++) {
            if (currentCaptures[i].status !== "done" && i !== currentAngleIdx) {
              nextIdx = i;
              break;
            }
          }
          
          if (nextIdx === -1) {
            // Done all
            setIsSequenceRunning(false);
            setCurrentAngleIdx(-1);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
          } else {
            setCurrentAngleIdx(nextIdx);
          }
          return currentCaptures;
        });
    }
  }, [currentAngleIdx, assessScreenshot, restartLoopSoon]);

  const detectFace = useCallback(() => {
    if (!faceLandmarkerRef.current || !webcamRef.current?.video || currentAngleIdx < 0) return;
    
    const video = webcamRef.current.video;
    if (video.readyState !== 4) {
      requestRef.current = requestAnimationFrame(detectFace);
      return;
    }

    try {
      const startTimeMs = performance.now();
      const results = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);

      if (results.faceLandmarks.length === 0) {
        setFeedback("Không tìm thấy khuôn mặt trong khung hình");
        setIsHold(false);
        setHoldProgress(0);
        poseHoldStartRef.current = 0;
      } else if (results.faceLandmarks.length > 1) {
        setFeedback("Chỉ cho phép 1 khuôn mặt trong khung hình");
        setIsHold(false);
        setHoldProgress(0);
        poseHoldStartRef.current = 0;
      } else {
        // Compute yaw, pitch from matrix
        const matrix = results.facialTransformationMatrixes?.[0];
        if (matrix) {
          // matrix is 4x4, row-major (16 elements)
          // Rotation extraction
          const pitch = -Math.asin(matrix.data[9]) * (180 / Math.PI); 
          const yaw = Math.atan2(matrix.data[8], matrix.data[10]) * (180 / Math.PI);

          const req = DEFAULT_ANGLES[currentAngleIdx].requirements;
          const isYawOk = yaw >= req.yaw[0] && yaw <= req.yaw[1];
          const isPitchOk = pitch >= req.pitch[0] && pitch <= req.pitch[1];

          if (isYawOk && isPitchOk) {
            setFeedback("Tuyệt vời! Giữ nguyên tư thế...");
            setIsHold(true);
            
            if (poseHoldStartRef.current === 0) {
              poseHoldStartRef.current = performance.now();
            } else {
              const elapsed = performance.now() - poseHoldStartRef.current;
              const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
              setHoldProgress(progress);
              
              if (elapsed >= HOLD_DURATION) {
                captureCurrentPose();
                poseHoldStartRef.current = 0;
                setIsHold(false);
                setHoldProgress(0);
                return; // Ngừng phát hiện để chờ pose tiếp theo
              }
            }
          } else {
            setFeedback(DEFAULT_ANGLES[currentAngleIdx].instruction);
            setIsHold(false);
            setHoldProgress(0);
            poseHoldStartRef.current = 0;
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    
    if (isSequenceRunning) {
      requestRef.current = requestAnimationFrame(detectFace);
    }
  }, [currentAngleIdx, captureCurrentPose, isSequenceRunning]);

  useEffect(() => {
    detectFaceRef.current = detectFace;
    if (isModelLoaded && isSequenceRunning) {
      poseHoldStartRef.current = 0;
      setHoldProgress(0);
      setIsHold(false);
      requestRef.current = requestAnimationFrame(detectFace);
    }
  }, [isModelLoaded, isSequenceRunning, currentAngleIdx, detectFace]);

  const allCaptured = captures.every((item) => item.status === "done" && Boolean(item.file));
  const doneCount = captures.filter((item) => item.status === "done").length;
  
  const capturedFiles = useMemo(() => {
    const result = {} as Record<CaptureAngle, File>;
    for (const item of captures) {
      if (item.status === "done" && item.file) {
        result[item.angle] = item.file;
      }
    }
    return result;
  }, [captures]);

  const submit = useCallback(async () => {
    if (!consent || !allCaptured) return;
    await onFilesReadyRef.current(capturedFiles);
  }, [allCaptured, capturedFiles, consent]);

  const currentConfig = currentAngleIdx >= 0 ? DEFAULT_ANGLES[currentAngleIdx] : null;

  return (
    <Box className={className}>
      {!allCaptured && !isSequenceRunning && currentAngleIdx < 0 && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
          <Stack spacing={2} sx={{ alignItems: "center" }}>
            <Box sx={{ width: 64, height: 64, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: "primary.main", color: "primary.contrastText" }}>
              <PhotoCameraOutlinedIcon fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 850 }}>
                Đăng ký khuôn mặt tự động (eKYC)
              </Typography>
              <Typography color="text.secondary">
                Hệ thống sẽ tự động phát hiện và chụp khi bạn quay đúng góc yêu cầu.
              </Typography>
            </Box>

            <Paper variant="outlined" sx={{ p: 2, width: "100%", bgcolor: "action.hover", textAlign: "left" }}>
              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 850, mb: 1 }}>
                4 góc cần chụp
              </Typography>
              <Stack spacing={0.25}>
                {DEFAULT_ANGLES.map((item, idx) => (
                  <Stack key={item.angle} direction="row" spacing={1.5} sx={{ alignItems: "center", py: 0.5 }}>
                    <Box
                      sx={{
                        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                        display: "grid", placeItems: "center",
                        bgcolor: "primary.main", color: "primary.contrastText",
                        fontSize: 13, fontWeight: 800,
                      }}
                    >
                      {idx + 1}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {item.instruction}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.tip}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, width: "100%", bgcolor: "action.hover", textAlign: "left" }}>
              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 850, mb: 1 }}>
                Lưu ý khi chụp
              </Typography>
              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">- Bỏ kính râm, khẩu trang.</Typography>
                <Typography variant="body2" color="text.secondary">- Ánh sáng rõ, không bị lóa từ phía sau.</Typography>
                <Typography variant="body2" color="text.secondary">- Làm theo hướng dẫn trên màn hình.</Typography>
              </Stack>
            </Paper>

            <Button variant="contained" size="large" startIcon={<PhotoCameraOutlinedIcon />} onClick={startSequence}>
              Bắt đầu quá trình chụp
            </Button>
          </Stack>
        </Paper>
      )}

      {(isSequenceRunning || currentAngleIdx >= 0) && (
        <>
          <Stack spacing={1} sx={{ mb: 1.5 }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
                Góc {Math.min(currentAngleIdx + 1, DEFAULT_ANGLES.length)}/{DEFAULT_ANGLES.length}
                {currentConfig ? ` · ${currentConfig.instruction}` : ""}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {doneCount}/4 hoàn thành
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={(doneCount / DEFAULT_ANGLES.length) * 100}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Stack>
          <Paper variant="outlined" sx={{ position: "relative", aspectRatio: "4 / 3", overflow: "hidden", bgcolor: "black", maxWidth: 640, mx: "auto" }}>
          <Webcam
            key={sessionKey}
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: "user" }}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          
          {/* Hướng dẫn hình Oval */}
          <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Box
              sx={{
                width: "55%", height: "70%",
                border: `4px solid ${isHold ? "#4caf50" : "rgba(255,255,255,0.4)"}`,
                borderRadius: "50%",
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.65)", // Darken background outside oval
                transition: "border-color 0.3s",
                position: "relative"
              }}
            >
              {/* Progress Ring khi Hold */}
              {isHold && (
                <CircularProgress
                  variant="determinate"
                  value={holdProgress}
                  size="100%"
                  sx={{
                    position: "absolute", top: -4, left: -4, right: -4, bottom: -4,
                    color: "#4caf50", zIndex: 1,
                    '& .MuiCircularProgress-svg': { width: 'calc(100% + 8px)', height: 'calc(100% + 8px)' }
                  }}
                  thickness={2}
                />
              )}
            </Box>
          </Box>

          {!isModelLoaded && (
            <Stack spacing={1} sx={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,.8)", color: "common.white" }}>
              <CircularProgress color="primary" size={40} />
              <Typography variant="body2">{feedback}</Typography>
            </Stack>
          )}

          {isModelLoaded && currentConfig && (
            <Stack spacing={1} sx={{ position: "absolute", top: 16, left: 0, right: 0, alignItems: "center" }}>
              <Paper sx={{ px: 3, py: 1.5, borderRadius: 10, bgcolor: isHold ? "success.main" : "rgba(0,0,0,0.6)", color: "white", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", gap: 1 }}>
                {isHold ? <CheckCircleOutlineOutlinedIcon /> : <WarningAmberOutlinedIcon color="warning" />}
                <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                  {feedback}
                </Typography>
              </Paper>
            </Stack>
          )}

          {/* Dots Indicator */}
          <Stack direction="row" spacing={1} sx={{ position: "absolute", bottom: 20, left: 0, right: 0, justifyContent: "center" }}>
            {DEFAULT_ANGLES.map((item, index) => (
              <Box
                key={item.angle}
                sx={{
                  width: 12, height: 12, borderRadius: "50%",
                  bgcolor: captures[index].status === "done" ? "success.main" : index === currentAngleIdx ? "primary.main" : "grey.600",
                   border: index === currentAngleIdx ? "2px solid white" : "none"
                }}
              />
            ))}
          </Stack>
        </Paper>
        </>
      )}

      {allCaptured && (
        <Stack spacing={2} sx={{ mt: isSequenceRunning ? 2 : 0 }}>
          <Alert severity="success" icon={<CheckCircleOutlineOutlinedIcon />}>
            Đã chụp đủ 4 góc khuôn mặt thành công. Vui lòng xác nhận để hoàn tất.
          </Alert>
          
          <Grid container spacing={1.5}>
            {captures.map((item, index) => (
              <Grid key={item.angle} size={{ xs: 6, sm: 3 }}>
                <Paper variant="outlined" sx={{ position: "relative", aspectRatio: "1 / 1", overflow: "hidden", borderColor: "success.main" }}>
                  {item.dataUrl && (
                    <Box component="img" src={item.dataUrl} alt={item.angle} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                  <Chip size="small" label={ANGLE_LABELS[item.angle]} sx={{ position: "absolute", left: 6, bottom: 6, bgcolor: "rgba(0,0,0,.72)", color: "common.white" }} />
                  <Tooltip title={`Chụp lại góc ${ANGLE_LABELS[item.angle]}`}>
                    <IconButton
                      size="small"
                      aria-label={`Chụp lại ${ANGLE_LABELS[item.angle]}`}
                      onClick={() => retakeAngle(index)}
                      sx={{
                        position: "absolute", top: 6, right: 6,
                        bgcolor: "rgba(0,0,0,.6)", color: "common.white",
                        "&:hover": { bgcolor: "primary.main" },
                      }}
                    >
                      <RestartAltOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: "center" }}>
            <Button variant="outlined" startIcon={<RestartAltOutlinedIcon />} onClick={retakeAll} sx={{ flex: 1 }}>
              Chụp lại tất cả
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
            Bấm vào biểu tượng trên từng ảnh để chụp lại góc đó
          </Typography>

          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "action.hover", display: "flex", alignItems: "center", gap: 1 }}>
            <Checkbox checked={consent} onChange={(event) => setConsent?.(event.target.checked)} disabled={!setConsent} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Tôi đồng ý cho hệ thống xử lý và lưu trữ dữ liệu khuôn mặt để nhận diện tại cổng.
            </Typography>
          </Paper>

          <Button variant="contained" color="success" size="large" startIcon={<AddAPhotoOutlinedIcon />} onClick={submit} disabled={!consent} fullWidth>
            Xác nhận đăng ký khuôn mặt
          </Button>
        </Stack>
      )}
    </Box>
  );
}
