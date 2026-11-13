"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Typography,
  useTheme,
} from "@mui/material";
import AndroidIcon from "@mui/icons-material/Android";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import SecurityIcon from "@mui/icons-material/Security";
import SystemUpdateIcon from "@mui/icons-material/SystemUpdate";
import { QRCodeSVG } from "qrcode.react";
import { MOBILE_APP } from "@/lib/mobileApp";

/* ─── data ──────────────────────────────────────────────────────────────── */

const perks = [
  "Quét mã vạch để mượn và trả sách nhanh tại quầy",
  "Nhận thông báo nhắc hạn trả và sách đã đặt trước",
  "Tra cứu kho sách, gia hạn và đặt trước mọi lúc",
  "Đăng nhập bằng mã sinh viên hoặc nhận diện khuôn mặt",
];

const installSteps = [
  {
    icon: <DownloadRoundedIcon fontSize="small" />,
    label: "Tải file APK",
    description: `Nhấn nút "Tải APK cho Android". File ${MOBILE_APP.fileName} (${MOBILE_APP.sizeLabel}) sẽ được lưu vào thư mục Tải về.`,
  },
  {
    icon: <FolderOpenIcon fontSize="small" />,
    label: "Mở từ ứng dụng Tệp",
    description:
      'Mở ứng dụng Tệp (Files) → thư mục Tải về → nhấn file APK. Không nhấn trực tiếp trên thanh tải của trình duyệt — Android sẽ báo "định dạng không hỗ trợ".',
  },
  {
    icon: <SecurityIcon fontSize="small" />,
    label: "Cho phép cài từ nguồn không xác định",
    description:
      "Vào Cài đặt → Bảo mật → Cài đặt từ nguồn không xác định, bật cho ứng dụng Tệp hoặc trình duyệt bạn đang dùng. Chỉ cần làm một lần.",
  },
  {
    icon: <SystemUpdateIcon fontSize="small" />,
    label: "Cài đặt và mở",
    description: `Nhấn Cài đặt → Mở. Yêu cầu Android ${MOBILE_APP.minAndroid}+.`,
  },
];

/** Mở thư mục Downloads trên Android */
const ANDROID_DOWNLOADS_INTENT =
  "intent://openDownloads#Intent;scheme=android.intent.action.VIEW;package=com.android.documentsui;end";

/* ─── hooks ─────────────────────────────────────────────────────────────── */

function useIsAndroid() {
  const [v, setV] = useState(false);
  useEffect(() => setV(/Android/i.test(navigator.userAgent)), []);
  return v;
}

/* ─── sub-components ────────────────────────────────────────────────────── */

/** Thẻ thông tin nhỏ: icon + label + giá trị */
function InfoBadge({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <Stack
      spacing={0.5}
      sx={{
        px: 2,
        py: 1.25,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "action.hover",
        minWidth: 90,
        alignItems: "center",
      }}
    >
      <Box sx={{ color: accent, lineHeight: 0 }}>{icon}</Box>
      <Typography variant="caption" sx={{ color: "text.disabled", lineHeight: 1 }}>
        {label}
      </Typography>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1 }}>
        {value}
      </Typography>
    </Stack>
  );
}

/* ─── install guide dialog ──────────────────────────────────────────────── */

function InstallGuideDialog({
  open,
  onClose,
  isAndroid,
  accent,
}: {
  open: boolean;
  onClose: () => void;
  isAndroid: boolean;
  accent: string;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="install-guide-title"
      sx={{ "& .MuiDialog-paper": { borderRadius: 3 } }}
    >
      <DialogTitle
        id="install-guide-title"
        sx={{ fontWeight: 800, pr: 6, pb: 1.5 }}
      >
        Hướng dẫn cài đặt APK trên Android
        <IconButton
          onClick={onClose}
          aria-label="Đóng"
          size="small"
          sx={{ position: "absolute", right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2.5 }}>
        <Stepper orientation="vertical" nonLinear activeStep={-1}>
          {installSteps.map((step) => (
            <Step key={step.label} active>
              <StepLabel
                icon={
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      bgcolor: `${accent}18`,
                      color: accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {step.icon}
                  </Box>
                }
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {step.label}
                </Typography>
              </StepLabel>
              <StepContent>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", lineHeight: 1.65, pb: 1 }}
                >
                  {step.description}
                </Typography>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {isAndroid && (
          <Box sx={{ mt: 2 }}>
            <Button
              component="a"
              href={ANDROID_DOWNLOADS_INTENT}
              variant="outlined"
              size="small"
              startIcon={<FolderOpenIcon />}
              sx={{ fontWeight: 600, textTransform: "none", borderRadius: 2 }}
            >
              Mở thư mục Tải về ngay
            </Button>
          </Box>
        )}
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="contained" sx={{ borderRadius: 2, fontWeight: 700 }}>
          Đã hiểu
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ─── QR panel ──────────────────────────────────────────────────────────── */

function QrPanel({ isDark }: { isDark: boolean }) {
  return (
    <Stack spacing={2.5} sx={{ alignItems: "center" }}>
      {/* QR frame */}
      <Box
        sx={{
          position: "relative",
          p: 0.75,
          borderRadius: 3.5,
          background: isDark
            ? "linear-gradient(135deg,#9CC9E8 0%,#1E6091 100%)"
            : "linear-gradient(135deg,#1E6091 0%,#0A2540 100%)",
          boxShadow: isDark
            ? "0 12px 40px rgba(0,0,0,0.5)"
            : "0 12px 40px rgba(10,37,64,0.18)",
        }}
      >
        <Box
          sx={{
            p: 2,
            bgcolor: "#fff",
            borderRadius: 2.75,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <QRCodeSVG
            value={MOBILE_APP.apkUrl}
            size={168}
            level="M"
            bgColor="#FFFFFF"
            fgColor="#0A2540"
            role="img"
            aria-label="Mã QR tải ứng dụng Thư viện IUH cho Android"
            title="Mã QR tải ứng dụng Thư viện IUH cho Android"
          />
        </Box>
        {/* Android logo badge */}
        <Box
          sx={{
            position: "absolute",
            bottom: -12,
            right: -12,
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: "#3DDC84",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(61,220,132,0.4)",
          }}
        >
          <AndroidIcon sx={{ fontSize: 20, color: "#fff" }} />
        </Box>
      </Box>

      <Stack spacing={0.75} sx={{ textAlign: "center" }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", justifyContent: "center" }}>
          <QrCode2Icon sx={{ fontSize: 16, color: "text.disabled" }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Quét mã để tải ngay
          </Typography>
        </Stack>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Mở camera điện thoại và hướng vào mã QR
        </Typography>
      </Stack>

      {/* Direct link */}
      <Button
        component="a"
        href={MOBILE_APP.releasesUrl}
        target="_blank"
        rel="noopener noreferrer"
        variant="text"
        size="small"
        endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
        sx={{
          fontSize: 12,
          fontWeight: 600,
          textTransform: "none",
          color: "text.secondary",
          "&:hover": { color: "primary.main" },
        }}
      >
        Xem tất cả phiên bản
      </Button>
    </Stack>
  );
}

/* ─── main component ────────────────────────────────────────────────────── */

export default function MobileAppDownload() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isAndroid = useIsAndroid();
  const [guideOpen, setGuideOpen] = useState(false);

  const accent = isDark ? "#9CC9E8" : "#1E6091";

  /* gradient band behind the card */
  const bandBg = isDark
    ? "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(30,96,145,0.18) 0%, transparent 70%)"
    : "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(30,96,145,0.07) 0%, transparent 70%)";

  return (
    <Box
      component="section"
      id="tai-app"
      sx={{
        py: { xs: 8, md: 12 },
        scrollMarginTop: { xs: 72, md: 88 },
        background: bandBg,
      }}
    >
      <Container maxWidth="lg">
        {/* Section label */}
        <Stack sx={{ alignItems: "center", mb: 5 }}>
          <Chip
            icon={<PhoneAndroidIcon sx={{ fontSize: 15 }} />}
            label="ỨNG DỤNG DI ĐỘNG"
            size="small"
            sx={{
              fontWeight: 800,
              letterSpacing: "0.08em",
              bgcolor: isDark ? "rgba(30,96,145,0.18)" : "rgba(30,96,145,0.1)",
              color: accent,
              mb: 2,
            }}
          />
          <Typography
            variant="h4"
            sx={{
              fontWeight: 850,
              letterSpacing: "-0.02em",
              textAlign: "center",
            }}
          >
            Thư Viện IUH Trong Tầm Tay Bạn
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "text.secondary",
              textAlign: "center",
              mt: 1,
              maxWidth: 480,
              lineHeight: 1.7,
            }}
          >
            Ứng dụng Android đồng bộ trực tiếp với hệ thống quản lý thư viện
            thông minh.
          </Typography>
        </Stack>

        {/* Main card */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            border: "1px solid",
            borderColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(30,96,145,0.1)",
            overflow: "hidden",
            boxShadow: isDark
              ? "0 24px 60px rgba(0,0,0,0.35)"
              : "0 24px 60px rgba(10,37,64,0.08)",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1px 320px" },
            }}
          >
            {/* ── Left: perks + download ── */}
            <Stack
              spacing={3.5}
              sx={{
                p: { xs: 3, sm: 4, md: 5 },
                bgcolor: isDark ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.9)",
                backdropFilter: "blur(16px)",
              }}
            >
              {/* Feature list */}
              <Stack spacing={1.5}>
                {perks.map((perk) => (
                  <Stack
                    key={perk}
                    direction="row"
                    spacing={1.5}
                    sx={{ alignItems: "flex-start" }}
                  >
                    <CheckCircleIcon
                      sx={{ fontSize: 18, color: "#059669", mt: "2px", flexShrink: 0 }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", lineHeight: 1.65 }}
                    >
                      {perk}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              <Divider />

              {/* Meta badges */}
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1.5 }}>
                <InfoBadge
                  icon={<AndroidIcon sx={{ fontSize: 18 }} />}
                  label="Nền tảng"
                  value="Android"
                  accent={accent}
                />
                <InfoBadge
                  icon={<SystemUpdateIcon sx={{ fontSize: 18 }} />}
                  label="Phiên bản"
                  value={`v${MOBILE_APP.version}`}
                  accent={accent}
                />
                <InfoBadge
                  icon={<DownloadRoundedIcon sx={{ fontSize: 18 }} />}
                  label="Dung lượng"
                  value={MOBILE_APP.sizeLabel}
                  accent={accent}
                />
                <InfoBadge
                  icon={<PhoneAndroidIcon sx={{ fontSize: 18 }} />}
                  label="Yêu cầu"
                  value={`Android ${MOBILE_APP.minAndroid}+`}
                  accent={accent}
                />
              </Stack>

              <Divider />

              {/* Download CTA */}
              <Stack spacing={2}>
                {/* Primary button */}
                <Button
                  component="a"
                  href={MOBILE_APP.apkDownloadUrl}
                  download={MOBILE_APP.fileName}
                  variant="contained"
                  size="large"
                  startIcon={<DownloadRoundedIcon />}
                  sx={{
                    alignSelf: { xs: "stretch", sm: "flex-start" },
                    px: 4,
                    py: 1.5,
                    borderRadius: 2.5,
                    fontWeight: 700,
                    fontSize: "1rem",
                    background: "linear-gradient(135deg, #1E6091 0%, #0A2540 100%)",
                    boxShadow: "0 6px 20px rgba(30,96,145,0.35)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #1a5580 0%, #081e34 100%)",
                      boxShadow: "0 8px 24px rgba(30,96,145,0.45)",
                      transform: "translateY(-1px)",
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  Tải APK cho Android
                </Button>

                {/* Secondary actions */}
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                  <Button
                    onClick={() => setGuideOpen(true)}
                    variant="outlined"
                    size="medium"
                    sx={{
                      fontWeight: 600,
                      textTransform: "none",
                      borderRadius: 2,
                      borderColor: "divider",
                      color: "text.secondary",
                      "&:hover": { borderColor: accent, color: accent },
                    }}
                  >
                    Hướng dẫn cài đặt
                  </Button>

                  {isAndroid && (
                    <Button
                      component="a"
                      href={ANDROID_DOWNLOADS_INTENT}
                      variant="outlined"
                      size="medium"
                      startIcon={<FolderOpenIcon />}
                      sx={{
                        fontWeight: 600,
                        textTransform: "none",
                        borderRadius: 2,
                        borderColor: "divider",
                        color: "text.secondary",
                        "&:hover": { borderColor: "#059669", color: "#059669" },
                      }}
                    >
                      Mở thư mục Tải về
                    </Button>
                  )}
                </Stack>

                {/* Tip */}
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.disabled",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <SecurityIcon sx={{ fontSize: 13 }} />
                  Sau khi tải, bật &ldquo;Cài đặt từ nguồn không xác định&rdquo; trong
                  Cài đặt Android để hoàn tất.
                </Typography>
              </Stack>
            </Stack>

            {/* ── Divider (desktop only) ── */}
            <Box
              sx={{
                display: { xs: "none", md: "block" },
                bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(30,96,145,0.08)",
              }}
            />

            {/* ── Right: QR code ── */}
            <Stack
              sx={{
                p: { xs: 3, sm: 4, md: 5 },
                alignItems: "center",
                justifyContent: "center",
                bgcolor: isDark
                  ? "rgba(10,18,32,0.5)"
                  : "rgba(248,251,255,0.9)",
                backdropFilter: "blur(16px)",
              }}
            >
              <QrPanel isDark={isDark} />
            </Stack>
          </Box>
        </Paper>
      </Container>

      {/* Install guide dialog */}
      <InstallGuideDialog
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        isAndroid={isAndroid}
        accent={accent}
      />
    </Box>
  );
}
