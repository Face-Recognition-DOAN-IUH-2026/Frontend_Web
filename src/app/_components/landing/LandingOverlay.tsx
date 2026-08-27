"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import LibraryBooksIcon from "@mui/icons-material/LocalLibrary";
import SearchIcon from "@mui/icons-material/Search";
import FaceIcon from "@mui/icons-material/FaceRetouchingNatural";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import ExploreIcon from "@mui/icons-material/Explore";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LoginIcon from "@mui/icons-material/Login";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SecurityIcon from "@mui/icons-material/Security";
import DoorFrontIcon from "@mui/icons-material/DoorFront";
import { motion } from "framer-motion";

const features = [
  {
    icon: FaceIcon,
    title: "Kiểm soát Cổng AI",
    desc: "Nhận diện khuôn mặt độc giả tự động tại cổng vào/ra với công nghệ chống giả mạo (Anti-spoofing).",
    badge: "AI Powered",
    color: "#1E6091",
    bg: "rgba(30, 96, 145, 0.08)",
  },
  {
    icon: AutoStoriesIcon,
    title: "Mượn / Trả Sách Nhanh",
    desc: "Quét mã vạch tự động, theo dõi hạn trả theo thời gian thực và tự động gửi nhắc nhở khi đến hạn.",
    badge: "Tiện lợi",
    color: "#059669",
    bg: "rgba(5, 150, 105, 0.08)",
  },
  {
    icon: LibraryBooksIcon,
    title: "Kho Sách & Tài liệu Số",
    desc: "Tra cứu hàng chục nghìn đầu sách giáo trình, tài liệu chuyên ngành, luận văn và sách tham khảo.",
    badge: "10,000+ Sách",
    color: "#D97706",
    bg: "rgba(217, 119, 6, 0.08)",
  },
  {
    icon: SupportAgentIcon,
    title: "Trợ lý AI & Không gian 3D",
    desc: "Trợ lý thông minh giải đáp quy chế 24/7, gợi ý sách theo ngành học và trải nghiệm tham quan ảo 360°.",
    badge: "Công nghệ mới",
    color: "#2563EB",
    bg: "rgba(37, 99, 235, 0.08)",
  },
];

const stats = [
  { value: "15,000+", label: "Độc giả sinh viên & Giảng viên", color: "#1E6091" },
  { value: "20,000+", label: "Đầu sách & Giáo trình số", color: "#D97706" },
  { value: "99.2%", label: "Độ chính xác nhận diện khuôn mặt", color: "#059669" },
  { value: "24/7", label: "Hỗ trợ tra cứu & Đặt mượn sách", color: "#2563EB" },
];

const steps = [
  {
    num: "01",
    title: "Quét thẻ / Nhận diện",
    desc: "Xác thực nhanh chóng tại cổng Kiosk bằng thẻ sinh viên hoặc camera nhận diện khuôn mặt.",
  },
  {
    num: "02",
    title: "Chọn & Quét mã sách",
    desc: "Tìm sách tại kho hoặc tra cứu trên hệ thống, quét mã vạch để tạo phiếu mượn tự động.",
  },
  {
    num: "03",
    title: "Theo dõi & Trả đúng hạn",
    desc: "Nhận thông báo nhắc nhở qua ứng dụng di động và hoàn tất trả sách nhanh tại quầy.",
  },
];

export default function LandingOverlay() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/books?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/books");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary", display: "flex", flexDirection: "column" }}>
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          backdropFilter: "blur(12px)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" sx={{ py: 1.5, alignItems: "center", justifyContent: "space-between" }}>
            {/* Logo */}
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", textDecoration: "none" }} component={Link} href="/">
              <Box
                component="img"
                src={isDark ? "/logo-white.png" : "/logo.png"}
                alt="IUH Logo"
                sx={{
                  height: { xs: 36, sm: 42 },
                  width: "auto",
                  objectFit: "contain",
                }}
              />
              <Box sx={{ borderLeft: "1.5px solid", borderColor: "divider", pl: 1.5, display: { xs: "none", sm: "block" } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "primary.main", lineHeight: 1.1 }}>
                  THƯ VIỆN THÔNG MINH
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", fontWeight: 500 }}>
                  Smart Library System
                </Typography>
              </Box>
            </Stack>

            {/* Nav Links */}
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Button component={Link} href="/library/vr-tour" startIcon={<ExploreIcon />} sx={{ textTransform: "none", fontWeight: 600, display: { xs: "none", md: "inline-flex" } }}>
                Tham quan 3D
              </Button>
              <Button component={Link} href="/gate" startIcon={<DoorFrontIcon />} sx={{ textTransform: "none", fontWeight: 600, display: { xs: "none", sm: "inline-flex" } }}>
                Cổng Kiosk
              </Button>
              <Button component={Link} href="/register" variant="outlined" startIcon={<HowToRegIcon />} sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}>
                Đăng ký thẻ
              </Button>
              <Button component={Link} href="/login" variant="contained" startIcon={<LoginIcon />} sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, px: 2.5 }}>
                Đăng nhập
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* ── Hero Section ────────────────────────────────────────────── */}
      <Box
        sx={{
          background: "linear-gradient(180deg, rgba(30,96,145,0.06) 0%, rgba(255,255,255,0) 100%)",
          pt: { xs: 6, md: 10 },
          pb: { xs: 8, md: 12 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle decorative shapes */}
        <Box sx={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", bgcolor: "rgba(30,96,145,0.04)", pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -60, left: -60, width: 260, height: 260, borderRadius: "50%", bgcolor: "rgba(217,119,6,0.04)", pointerEvents: "none" }} />

        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          <Stack spacing={4} sx={{ alignItems: "center", textAlign: "center", maxWidth: 840, mx: "auto" }}>
            {/* Top Pill Badge */}
            <Chip
              icon={<SecurityIcon sx={{ fontSize: "16px !important", color: "primary.main" }} />}
              label="Hệ thống Quản lý Thư viện Thông minh Thế hệ mới"
              size="small"
              sx={{
                bgcolor: "action.selected",
                color: "primary.main",
                fontWeight: 700,
                border: "1px solid",
                borderColor: "primary.light",
                px: 1,
                py: 2,
                borderRadius: 99,
              }}
            />

            {/* Main Headline */}
            <Typography
              variant="h2"
              sx={{
                fontWeight: 900,
                fontSize: { xs: "2.2rem", sm: "3rem", md: "3.5rem" },
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
              }}
            >
              Không Gian Tri Thức &{" "}
              <Box
                component="span"
                sx={{
                  background: "linear-gradient(135deg, #1E6091 0%, #0F3C5C 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Công Nghệ Số IUH
              </Box>
            </Typography>

            {/* Subtitle */}
            <Typography variant="body1" sx={{ color: "text.secondary", fontSize: { xs: "1rem", md: "1.15rem" }, lineHeight: 1.7, maxWidth: 680 }}>
              Tra cứu tài liệu, mượn trả tự động, kiểm soát ra vào bằng nhận diện khuôn mặt và trợ lý AI thông minh phục vụ học tập, nghiên cứu.
            </Typography>

            {/* Search Bar on Landing Page */}
            <Box
              component="form"
              onSubmit={handleSearch}
              sx={{
                width: "100%",
                maxWidth: 640,
                bgcolor: "background.paper",
                p: 0.75,
                borderRadius: 3,
                boxShadow: "0 8px 30px rgba(30,96,145,0.12)",
                border: "1px solid",
                borderColor: "divider",
                display: "flex",
                gap: 1,
              }}
            >
              <TextField
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập tên sách, tác giả, mã ISBN hoặc chuyên ngành..."
                variant="standard"
                slotProps={{
                  input: {
                    disableUnderline: true,
                    startAdornment: (
                      <InputAdornment position="start" sx={{ pl: 1.5 }}>
                        <SearchIcon sx={{ color: "primary.main" }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ input: { py: 1.2, fontSize: "0.95rem" } }}
              />
              <Button
                type="submit"
                variant="contained"
                sx={{
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  fontWeight: 700,
                  flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(30,96,145,0.25)",
                }}
              >
                Tìm sách
              </Button>
            </Box>

            {/* Quick action buttons */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ pt: 1 }}>
              <Button
                component={Link}
                href="/login"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{ px: 4, py: 1.5, borderRadius: 2.5, fontWeight: 700, fontSize: "1rem" }}
              >
                Vào trang quản lý
              </Button>
              <Button
                component={Link}
                href="/library/vr-tour"
                variant="outlined"
                size="large"
                startIcon={<ExploreIcon />}
                sx={{ px: 4, py: 1.5, borderRadius: 2.5, fontWeight: 700, fontSize: "1rem" }}
              >
                Khám phá 3D Tour
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* ── Key Features Grid ────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Stack spacing={2} sx={{ textAlign: "center", mb: 6 }}>
          <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: "0.1em" }}>
            TÍNH NĂNG NỔI BẬT
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 850, letterSpacing: "-0.01em" }}>
            Giải Pháp Thư Viện Toàn Diện & Hiện Đại
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 600, mx: "auto" }}>
            Tích hợp công nghệ AI tiên tiến giúp tối ưu hóa trải nghiệm mượn trả và quản lý tài nguyên.
          </Typography>
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 3 }}>
          {features.map((f) => (
            <Card
              key={f.title}
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 3,
                transition: "all 0.25s ease",
                bgcolor: "background.paper",
                display: "flex",
                flexDirection: "column",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 12px 30px rgba(30,96,145,0.1)",
                  borderColor: f.color,
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2.5,
                    bgcolor: f.bg,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <f.icon sx={{ color: f.color, fontSize: 26 }} />
                </Box>
                <Chip label={f.badge} size="small" sx={{ fontWeight: 700, fontSize: "0.7rem", bgcolor: f.bg, color: f.color }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, lineHeight: 1.3 }}>
                {f.title}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, flex: 1 }}>
                {f.desc}
              </Typography>
            </Card>
          ))}
        </Box>
      </Container>

      {/* ── Live Stats Strip ────────────────────────────────────────── */}
      <Box sx={{ bgcolor: "background.paper", borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider", py: 6 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 4, textAlign: "center" }}>
            {stats.map((s) => (
              <Box key={s.label}>
                <Typography variant="h3" sx={{ fontWeight: 900, color: s.color, lineHeight: 1.1, mb: 0.5 }}>
                  {s.value}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ── 3-Step Process Guide ────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Stack spacing={2} sx={{ textAlign: "center", mb: 8 }}>
          <Typography variant="overline" sx={{ color: "secondary.main", fontWeight: 800, letterSpacing: "0.1em" }}>
            QUY TRÌNH TIỆN LỢI
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 850, letterSpacing: "-0.01em" }}>
            Mượn Sách Dễ Dàng Chỉ Với 3 Bước
          </Typography>
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 4 }}>
          {steps.map((st) => (
            <Paper
              key={st.num}
              variant="outlined"
              sx={{
                p: 4,
                borderRadius: 3,
                position: "relative",
                bgcolor: "background.paper",
              }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 900,
                  color: "primary.main",
                  opacity: 0.15,
                  position: "absolute",
                  top: 16,
                  right: 20,
                  lineHeight: 1,
                }}
              >
                {st.num}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5, mt: 1 }}>
                {st.title}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
                {st.desc}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Container>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <Box
        component="footer"
        sx={{
          bgcolor: "#0F3C5C",
          color: "#FFFFFF",
          pt: 8,
          pb: 4,
          mt: "auto",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr" }, gap: 6, mb: 6 }}>
            {/* Column 1: School info */}
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "#1E6091", display: "grid", placeItems: "center" }}>
                  <LibraryBooksIcon sx={{ color: "#fff", fontSize: 22 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 850, color: "#FFFFFF" }}>
                    THƯ VIỆN ĐẠI HỌC CÔNG NGHIỆP TP.HCM
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                    Industrial University of Ho Chi Minh City
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.7 }}>
                Trung tâm Thông tin - Thư viện phục vụ nhu cầu nghiên cứu, giảng dạy và học tập của cán bộ, giảng viên và sinh viên trường.
              </Typography>
              <Stack spacing={1} sx={{ pt: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <LocationOnIcon sx={{ fontSize: 18, color: "#D97706" }} />
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)" }}>
                    12 Nguyễn Văn Bảo, Phường 4, Quận Gò Vấp, TP. Hồ Chí Minh
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <PhoneIcon sx={{ fontSize: 18, color: "#D97706" }} />
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)" }}>
                    (028) 38940 390 - Hotline Thư viện
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <EmailIcon sx={{ fontSize: 18, color: "#D97706" }} />
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)" }}>
                    thuvien@iuh.edu.vn
                  </Typography>
                </Stack>
              </Stack>
            </Stack>

            {/* Column 2: Quick Links */}
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#D97706", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Liên kết nhanh
              </Typography>
              <Typography component={Link} href="/books" variant="body2" sx={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", "&:hover": { color: "#FFFFFF" } }}>
                Tra cứu sách & tài liệu
              </Typography>
              <Typography component={Link} href="/gate" variant="body2" sx={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", "&:hover": { color: "#FFFFFF" } }}>
                Cổng Kiosk tự động
              </Typography>
              <Typography component={Link} href="/library/vr-tour" variant="body2" sx={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", "&:hover": { color: "#FFFFFF" } }}>
                Tham quan thực tế ảo 3D
              </Typography>
              <Typography component={Link} href="/register" variant="body2" sx={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", "&:hover": { color: "#FFFFFF" } }}>
                Đăng ký tài khoản độc giả
              </Typography>
            </Stack>

            {/* Column 3: Hours */}
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#D97706", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Giờ mở cửa
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)" }}>
                <strong>Thứ 2 - Thứ 6:</strong> 07:00 - 20:30
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)" }}>
                <strong>Thứ 7:</strong> 07:30 - 17:00
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)" }}>
                <strong>Chủ nhật & Ngày lễ:</strong> Nghỉ
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", pt: 1 }}>
                * Hệ thống trực tuyến và Trợ lý AI hoạt động 24/7.
              </Typography>
            </Stack>
          </Box>

          <Divider sx={{ borderColor: "rgba(255,255,255,0.12)", my: 3 }} />

          <Stack direction={{ xs: "column", sm: "row" }} sx={{ alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
              © {new Date().getFullYear()} Thư viện Đại học Công nghiệp TP.HCM (IUH). Bảo lưu mọi quyền.
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
              Hệ thống Quản lý Thư viện Thông minh v2.0
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
