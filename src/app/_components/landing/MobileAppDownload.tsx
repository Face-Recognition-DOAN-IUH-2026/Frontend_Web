"use client";

import {
  Box,
  Button,
  Chip,
  Container,
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
import { QRCodeSVG } from "qrcode.react";
import { MOBILE_APP } from "@/lib/mobileApp";

const perks = [
  "Quét mã vạch để mượn và trả sách nhanh tại quầy",
  "Nhận thông báo nhắc hạn trả và sách đã đặt trước",
  "Tra cứu kho sách, gia hạn và đặt trước mọi lúc",
  "Đăng nhập bằng mã sinh viên hoặc nhận diện khuôn mặt",
];

export default function MobileAppDownload() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

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
                Tải APK cho Android
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
    </Box>
  );
}
