"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Box,
  Alert,
  Autocomplete,
  Avatar,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import FaceOutlinedIcon from "@mui/icons-material/FaceOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import PersonSearchOutlinedIcon from "@mui/icons-material/PersonSearchOutlined";
import PersonIcon from "@mui/icons-material/PersonOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import FaceRetouchingNaturalOutlinedIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import ClearIcon from "@mui/icons-material/Clear";
import api, { getErrorMessage } from "@/lib/api-client";
import { useTaskSSE } from "@/lib/hooks/useTaskSSE";
import MultiAngleCapture, { type CaptureAngle } from "@/app/(dashboard)/_components/MultiAngleCapture";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import { useToast } from "@/lib/toast-context";
import type { PatronPublic } from "@/lib/types";

export default function EnrollPage() {
  const { toast } = useToast();
  const [consent, setConsent] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const { state: sseState, start: startSSE, reset: resetSSE } = useTaskSSE();

  // Patron selection for counter enrollment
  const [selectedPatron, setSelectedPatron] = useState<PatronPublic | null>(null);
  const [patronSearchInput, setPatronSearchInput] = useState("");
  const [patronOptions, setPatronOptions] = useState<PatronPublic[]>([]);
  const [searchingPatrons, setSearchingPatrons] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced patron search
  const handleSearchPatrons = useCallback((keyword: string) => {
    setPatronSearchInput(keyword);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!keyword.trim()) {
      setPatronOptions([]);
      setSearchingPatrons(false);
      return;
    }
    setSearchingPatrons(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.searchPatrons(keyword.trim(), undefined, 0, 15);
        setPatronOptions(res.items || []);
      } catch {
        setPatronOptions([]);
      } finally {
        setSearchingPatrons(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      resetSSE();
    };
  }, [resetSSE]);

  useEffect(() => {
    if (sseState.status === "SUCCESS") {
      const inner = sseState.result as Record<string, any> | null;
      if (inner?.status === "error") {
        const msg = String(inner.error) || "Đăng ký thất bại.";
        setError(msg);
        toast.error(msg);
      } else {
        const targetName = selectedPatron ? `${selectedPatron.full_name} (${selectedPatron.student_code})` : "Tài khoản hiện tại";
        toast.success(`Đăng ký khuôn mặt thành công cho ${targetName}!`);
        if (selectedPatron) {
          setSelectedPatron({ ...selectedPatron, has_face: true });
        }
      }
      setResult(inner || { status: "success" });
      setIsLoading(false);
      resetSSE();
    } else if (sseState.status === "FAILURE" || sseState.status === "ERROR" || sseState.status === "TIMEOUT") {
      const msg = sseState.error || "Không thể lấy trạng thái tác vụ.";
      const res = (sseState.result as Record<string, any> | null) || {
        status: "error",
        error: msg,
      };
      setError(msg);
      toast.error(msg);
      setResult(res);
      setIsLoading(false);
      resetSSE();
    }
  }, [sseState.status, sseState.result, sseState.error, toast, selectedPatron, resetSSE]);

  const handleFilesReady = async (files: Record<CaptureAngle, File>) => {
    setError("");
    setIsLoading(true);
    setJobId(null);
    setResult(null);
    try {
      if (selectedPatron) {
        // Enrolling face for the selected patron at library counter
        const data = await api.enrollPatronFaceBatch(
          selectedPatron.id,
          {
            frontal: files.frontal,
            right: files.right,
            left: files.left,
            down: files.down,
          },
          consent
        );
        setJobId(data.job_id);
        startSSE(data.job_id);
      } else {
        // Enrolling face for the currently authenticated user
        const data = await api.enrollBatch(files, consent);
        setJobId(data.job_id);
        startSSE(data.job_id);
      }
    } catch (err: any) {
      const msg = getErrorMessage(err) || "Đăng ký nhiều góc thất bại.";
      setError(msg);
      toast.error(msg);
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setJobId(null);
    setResult(null);
    setError("");
    setIsLoading(false);
    resetSSE();
  };

  const failedCount = result?.results?.filter((item: any) => item.status !== "success").length || 0;
  const success = result && result.status !== "error";

  return (
    <Stack spacing={3} sx={{ maxWidth: 960, mx: "auto" }}>
      <Box sx={staggerSx(0)}>
        <PageHeader
          title="Đăng ký khuôn mặt"
          subtitle="Chụp 4 góc khuôn mặt (nhìn thẳng, quay phải, quay trái, cúi nhẹ) để nhận diện tại Cổng Kiosk và Quầy mượn trả."
          icon={FaceOutlinedIcon}
        />
      </Box>

      {/* Patron Selector for Counter Staff */}
      <Box sx={staggerSx(1)}>
        <DashboardCard>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <PersonSearchOutlinedIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Đối tượng đăng ký tại quầy
              </Typography>
            </Stack>

            <Autocomplete
              options={patronOptions}
              getOptionLabel={(option) => `${option.full_name} (${option.student_code || "Không có MSSV"})`}
              value={selectedPatron}
              onChange={(_, newValue) => {
                setSelectedPatron(newValue);
                handleReset();
              }}
              inputValue={patronSearchInput}
              onInputChange={(_, newInputValue) => handleSearchPatrons(newInputValue)}
              loading={searchingPatrons}
              noOptionsText={patronSearchInput ? "Không tìm thấy độc giả phù hợp" : "Gõ tên hoặc MSSV để tìm kiếm..."}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <li key={option.id} {...otherProps}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", width: "100%", py: 0.5 }}>
                      <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.light", fontSize: 14 }}>
                        {option.full_name?.charAt(0) || "P"}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {option.full_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          MSSV: {option.student_code} · {option.class_name || "Lớp: N/A"}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        icon={<FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: "14px !important" }} />}
                        label={option.has_face ? "Đã có mặt" : "Chưa có"}
                        color={option.has_face ? "success" : "default"}
                        variant={option.has_face ? "filled" : "outlined"}
                      />
                    </Stack>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Nhập tên hoặc MSSV của sinh viên / bạn đọc cần đăng ký khuôn mặt..."
                  label="Tìm kiếm độc giả (Để trống nếu đăng ký cho tài khoản của bạn)"
                  slotProps={{
                    ...params.slotProps,
                    input: {
                      ...params.slotProps?.input,
                      endAdornment: (
                        <>
                          {searchingPatrons ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.slotProps?.input?.endAdornment}
                        </>
                      ),
                    },
                  }}
                />
              )}
            />

            {selectedPatron ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: "action.hover",
                  borderColor: "primary.main",
                  borderRadius: 2,
                }}
              >
                <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                  <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                    <Avatar sx={{ width: 48, height: 48, bgcolor: "primary.main", fontSize: 18, fontWeight: 700 }}>
                      {selectedPatron.full_name?.charAt(0) || "S"}
                    </Avatar>
                    <Box>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                          {selectedPatron.full_name}
                        </Typography>
                        <Chip
                          size="small"
                          color={selectedPatron.has_face ? "warning" : "success"}
                          label={selectedPatron.has_face ? "Cập nhật lại khuôn mặt" : "Đăng ký khuôn mặt mới"}
                          sx={{ fontWeight: 600 }}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        MSSV: <strong>{selectedPatron.student_code}</strong> · Lớp: {selectedPatron.class_name || "-"} · Email: {selectedPatron.email || "-"}
                      </Typography>
                    </Box>
                  </Stack>
                  <Button
                    size="small"
                    color="inherit"
                    startIcon={<ClearIcon />}
                    onClick={() => {
                      setSelectedPatron(null);
                      setPatronSearchInput("");
                    }}
                  >
                    Bỏ chọn
                  </Button>
                </Stack>
              </Paper>
            ) : (
              <Alert severity="info" sx={{ py: 0.5 }}>
                Đang ở chế độ: <strong>Đăng ký cho chính tài khoản đang đăng nhập</strong>. Nếu muốn chụp mặt cho bạn đọc đứng trước quầy, hãy gõ tìm kiếm sinh viên ở trên.
              </Alert>
            )}
          </Stack>
        </DashboardCard>
      </Box>

      {error ? (
        <Box sx={staggerSx(2)}>
          <Alert icon={<ErrorOutlineOutlinedIcon />} severity="error">{error}</Alert>
        </Box>
      ) : null}

      {result ? (
        <Box sx={staggerSx(2)}>
          <DashboardCard>
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                {success ? <CheckCircleOutlineOutlinedIcon color="success" sx={{ fontSize: 44 }} /> : <ErrorOutlineOutlinedIcon color="error" sx={{ fontSize: 44 }} />}
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 850 }}>
                    {success ? "Đăng ký khuôn mặt thành công!" : "Đăng ký thất bại một phần"}
                  </Typography>
                  <Typography color="text.secondary">
                    {success
                      ? `Hệ thống đã mã hóa và lưu trữ 4 vector đặc trưng của ${selectedPatron ? selectedPatron.full_name : "bạn đọc"}.`
                      : `${failedCount} góc ảnh chưa đạt yêu cầu. Toàn bộ đã được rollback an toàn.`}
                  </Typography>
                </Box>
              </Stack>

              {result.results ? (
                <>
                  <Divider />
                  <Stack spacing={1}>
                    <Typography variant="overline" color="text.secondary">Kết quả từng góc</Typography>
                    {result.results.map((item: any, index: number) => {
                      const angleLabels: Record<string, string> = {
                        frontal: "Nhìn thẳng (Chính diện)",
                        right: "Nghiêng phải (~30°)",
                        left: "Nghiêng trái (~30°)",
                        down: "Cúi nhẹ cằm (~15°)",
                      };
                      return (
                        <Stack key={`${item.angle}-${index}`} direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                          <Typography sx={{ fontWeight: 600 }}>{angleLabels[item.angle] || item.angle}</Typography>
                          <Chip
                            size="small"
                            color={item.status === "success" ? "success" : "error"}
                            label={item.status === "success" ? "Đạt chuẩn" : `Lỗi: ${item.error || "Không hợp lệ"}`}
                          />
                        </Stack>
                      );
                    })}
                  </Stack>
                </>
              ) : null}

              <Button variant="contained" startIcon={<RestartAltOutlinedIcon />} onClick={handleReset} sx={{ alignSelf: "flex-start" }}>
                {success ? "Chụp tiếp bạn đọc khác" : "Thử chụp lại"}
              </Button>
            </Stack>
          </DashboardCard>
        </Box>
      ) : (isLoading && jobId) ? (
        <Box sx={staggerSx(2)}>
          <DashboardCard>
            <LoadingOverlay loading message={`Đang phân tích khuôn mặt trên AI Engine... (Mã tác vụ: ${jobId})`} />
          </DashboardCard>
        </Box>
      ) : (
        <Box sx={staggerSx(2)}>
          <DashboardCard>
            <MultiAngleCapture consent={consent} setConsent={setConsent} onFilesReady={handleFilesReady} />
            {isLoading ? <Alert severity="info" sx={{ mt: 2 }}>Đang gửi dữ liệu đăng ký lên máy chủ AI...</Alert> : null}
          </DashboardCard>
        </Box>
      )}
    </Stack>
  );
}
