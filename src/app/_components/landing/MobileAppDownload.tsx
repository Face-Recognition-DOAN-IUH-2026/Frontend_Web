"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import AndroidIcon from "@mui/icons-material/Android";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloseIcon from "@mui/icons-material/Close";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import HelpOutlineIcon from "@mui/icons-material/HelpCenter";
import { QRCodeSVG } from "qrcode.react";
import { MOBILE_APP } from "@/lib/mobileApp";

const perks = [
  "Quét mã vạch để mượn và trả sách nhanh tại quầy",
  "Nhận thông báo nhắc hạn trả và sách đã đặt trước",
  "Tra cứu kho sách, gia hạn và đặt trước mọi lúc",
  "Đăng nhập bằng mã sinh viên hoặc nhận diện khuôn mặt",
];

const installSteps = [
  {
    title: "Tải file về máy",
    body: `Bấm "Tải APK về máy". Trình duyệt tự tải file ${MOBILE_APP.fileName} (${MOBILE_APP.sizeLabel}) vào thư mục Tải về.`,
  },
  {
    title: "Mở thư mục Tải về — đừng bấm file trong trình duyệt",
    body: "Mở ứng dụng Tệp (Files) của máy rồi vào thư mục Tải về (Downloads). Bấm file ngay trên thanh tải về của trình duyệt sẽ bị báo \"Định dạng tệp tin không được hỗ trợ\" vì APK cần được cài đặt chứ không phải mở xem.",
  },
  {
    title: "Cho phép cài đặt từ nguồn không xác định (chỉ làm một lần)",
    body: "Vào Cài đặt → Bảo mật → Cài đặt từ nguồn không xác định, rồi bật cho ứng dụng Tệp hoặc trình duyệt bạn dùng.",
  },
  {
    title: "Cài đặt và mở ứng dụng",
    body: `Bấm ${MOBILE_APP.fileName} trong thư mục Tải về → Cài đặt → Mở. Ứng dụng yêu cầu Android ${MOBILE_APP.minAndroid} trở lên.`,
  },
];

/** Mở thẳng thư mục Downloads của Android (chỉ hoạt động trên Android). */
const ANDROID_DOWNLOADS_INTENT =
  "intent://openDownloads#Intent;scheme=android.intent.action.VIEW;package=com.android.documentsui;end";

function useIsAndroid(): boolean {
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    setIsAndroid(/Android/i.test(navigator.userAgent));
  }, []);

  return isAndroid;
}

export default function MobileAppDownload() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isAndroid = useIsAndroid();
  const [guideOpen, setGuideOpen] = useState(false);

  const cardBg = isDark ? "rgba(15, 23, 42, 0.7)" : "rgba(255, 255, 255, 0.78)";
  const cardBorder = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(255, 255, 255, 0.7)";
  const accent = isDark ? "#9CC9E8" : "#1E6091";

  return (
    <Box
      component="section"
      id="tai-app"
      sx={{ py: { xs: 8, md: 12 }, scrollMarginTop: { xs: 72, md: 88 } }}
    >
      <Container maxWidth="lg">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4, md: 5 },
            borderRadius: 3.5,
            bgcolor: cardBg,
            backdropFilter: "blur(16px)",
            border: "1px solid",
            borderColor: cardBorder,
            boxShadow: isDark
              ? "0 8px 32px rgba(0,0,0,0.3)"
              : "0 8px 32px rgba(10, 37, 64, 0.05)",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.15fr 0.85fr" },
            gap: { xs: 4, md: 5 },
            alignItems: "center",
          }}
        >
          {/* Left: copy + download actions */}
          <Stack spacing={2.5}>
            <Box>
              <Chip
                icon={<AndroidIcon sx={{ fontSize: 16 }} />}
                label="ỨNG DỤNG DI ĐỘNG"
                size="small"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  bgcolor: "rgba(30, 96, 145, 0.12)",
                  color: accent,
                }}
              />
            </Box>

            <Typography
              variant="h4"
              sx={{ fontWeight: 850, letterSpacing: "-0.015em" }}
            >
              Thư Viện IUH Trong Tầm Tay Bạn
            </Typography>

            <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
              Ứng dụng Thư viện IUH cho Android, đồng bộ trực tiếp với hệ thống
              quản lý thư viện thông minh.
            </Typography>

            <Stack spacing={1.2} sx={{ pt: 0.5 }}>
              {perks.map((perk) => (
                <Stack key={perk} direction="row" spacing={1.2} sx={{ alignItems: "flex-start" }}>
                  <CheckCircleIcon
                    sx={{ fontSize: 18, color: "#059669", mt: "2px", flexShrink: 0 }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", lineHeight: 1.6 }}
                  >
                    {perk}
                  </Typography>
                </Stack>
              ))}
            </Stack>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ pt: 1, alignItems: { sm: "center" } }}
            >
              <Button
                component="a"
                href={MOBILE_APP.apkUrl}
                download={MOBILE_APP.fileName}
                variant="contained"
                size="large"
                startIcon={<DownloadRoundedIcon />}
                sx={{
                  px: 3,
                  py: 1.25,
                  borderRadius: 2.5,
                  fontWeight: 700,
                  boxShadow: "0 4px 16px rgba(30,96,145,0.3)",
                }}
              >
                Tải APK về máy
              </Button>
              <Button
                onClick={() => setGuideOpen(true)}
                variant="outlined"
                size="large"
                startIcon={<HelpOutlineIcon />}
                sx={{ fontWeight: 600, textTransform: "none" }}
              >
                Hướng dẫn cài đặt
              </Button>
              <Button
                component="a"
                href={MOBILE_APP.releasesUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="text"
                size="large"
                endIcon={<OpenInNewIcon />}
                sx={{ fontWeight: 600, textTransform: "none" }}
              >
                Xem tất cả phiên bản
              </Button>
            </Stack>

            {/* Android: mở thẳng thư mục Tải về để cài, tránh lỗi "định dạng không hỗ trợ" */}
            {isAndroid ? (
              <Button
                component="a"
                href={ANDROID_DOWNLOADS_INTENT}
                variant="text"
                size="small"
                startIcon={<FolderOpenIcon />}
                sx={{ alignSelf: "flex-start", fontWeight: 600, textTransform: "none" }}
              >
                Đã tải xong? Mở thư mục Tải về
              </Button>
            ) : null}

            <Alert severity="warning" sx={{ alignSelf: "flex-start" }}>
              File APK không mở xem được trong trình duyệt. Tải xong, hãy mở
              file từ thư mục <b>Tải về</b> rồi bấm cài đặt.
            </Alert>

            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              v{MOBILE_APP.version} · {MOBILE_APP.sizeLabel} · Android{" "}
              {MOBILE_APP.minAndroid}+
            </Typography>

            <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
              <InfoOutlinedIcon
                sx={{ fontSize: 16, color: "#D97706", mt: "2px", flexShrink: 0 }}
              />
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", lineHeight: 1.5 }}
              >
                Sau khi tải, bật &ldquo;Cài đặt từ nguồn không xác định&rdquo; trong
                phần cài đặt Android để hoàn tất.
              </Typography>
            </Stack>
          </Stack>

          {/* Right: QR code */}
          <Stack spacing={2} sx={{ alignItems: "center" }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: "#FFFFFF",
                border: "1px solid",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.15)"
                  : "rgba(30, 96, 145, 0.12)",
                boxShadow: isDark
                  ? "0 10px 30px rgba(0,0,0,0.35)"
                  : "0 10px 30px rgba(10, 37, 64, 0.08)",
              }}
            >
              <QRCodeSVG
                value={MOBILE_APP.apkUrl}
                size={176}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#0A2540"
                role="img"
                aria-label="Mã QR tải ứng dụng Thư viện IUH cho Android"
                title="Mã QR tải ứng dụng Thư viện IUH cho Android"
              />
            </Paper>

            <Stack spacing={0.5} sx={{ textAlign: "center" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Quét mã bằng camera điện thoại
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Mở bằng trình duyệt trên Android để tải trực tiếp
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      </Container>

      <Dialog
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="install-guide-title"
      >
        <DialogTitle id="install-guide-title" sx={{ fontWeight: 800, pr: 6 }}>
          Cài đặt ứng dụng trên Android
          <IconButton
            onClick={() => setGuideOpen(false)}
            aria-label="Đóng"
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5}>
            <Alert severity="info">
              Trình duyệt không mở được file APK. Nhấn vào file trong thanh tải
              về sẽ báo &ldquo;Định dạng tệp tin không được hỗ trợ&rdquo; — đây là
              hành vi bình thường, không phải lỗi tải.
            </Alert>

            {installSteps.map((step, i) => (
              <Stack key={step.title} direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    bgcolor: "rgba(30, 96, 145, 0.12)",
                    color: accent,
                    fontWeight: 800,
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.65 }}>
                    {step.body}
                  </Typography>
                </Box>
              </Stack>
            ))}

            {isAndroid ? (
              <Button
                component="a"
                href={ANDROID_DOWNLOADS_INTENT}
                variant="outlined"
                startIcon={<FolderOpenIcon />}
                sx={{ alignSelf: "flex-start", fontWeight: 600, textTransform: "none" }}
              >
                Mở thư mục Tải về ngay
              </Button>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setGuideOpen(false)}>Đã hiểu</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
