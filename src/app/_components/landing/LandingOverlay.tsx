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
    color: "#0A2540",
    bg: "rgba(10, 37, 64, 0.08)",
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
    color: "#8B0000",
    bg: "rgba(139, 0, 0, 0.08)",
  },
];

const stats = [
  { value: "15,000+", label: "Độc giả sinh viên & Giảng viên", color: "#0A2540" },
  { value: "20,000+", label: "Đầu sách & Giáo trình số", color: "#D97706" },
  { value: "99.2%", label: "Độ chính xác nhận diện khuôn mặt", color: "#059669" },
  { value: "24/7", label: "Hỗ trợ tra cứu & Đặt mượn sách", color: "#8B0000" },
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
    <Box sx={{ minHeight: "100vh", bgcolor: "transparent", color: "text.primary", display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          bgcolor: isDark ? "rgba(7, 19, 33, 0.78)" : "rgba(255, 255, 255, 0.82)",
          borderBottom: "1px solid",
          borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(30, 96, 145, 0.12)",
          backdropFilter: "blur(16px)",
          boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.35)" : "0 4px 20px rgba(10,37,64,0.04)",
          transition: "all 0.3s ease",
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
              <Box sx={{ borderLeft: "1.5px solid", borderColor: isDark ? "rgba(255,255,255,0.15)" : "divider", pl: 1.5, display: { xs: "none", sm: "block" } }}>
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

              <Button
                component={Link}
                href="/login"
                variant="contained"
                startIcon={<LoginIcon />}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 2.5,
                  boxShadow: "0 4px 14px rgba(30,96,145,0.25)",
                }}
              >
                Đăng nhập
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* ── Hero Section ────────────────────────────────────────────── */}
      <Box
        sx={{
          pt: { xs: 7, md: 11 },
          pb: { xs: 8, md: 13 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          <Stack spacing={4} sx={{ alignItems: "center", textAlign: "center", maxWidth: 880, mx: "auto" }}>
            {/* Top Pill Badge */}
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1.2,
                px: 2,
                py: 0.8,
                borderRadius: 99,
                bgcolor: isDark ? "rgba(56, 189, 248, 0.1)" : "rgba(30, 96, 145, 0.08)",
                border: "1px solid",
                borderColor: isDark ? "rgba(56, 189, 248, 0.3)" : "rgba(30, 96, 145, 0.22)",
                backdropFilter: "blur(12px)",
                boxShadow: isDark
                  ? "0 4px 16px rgba(0,0,0,0.2)"
                  : "0 4px 16px rgba(30, 96, 145, 0.08)",
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: "#059669",
                  boxShadow: "0 0 10px #059669",
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 750,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: isDark ? "#38BDF8" : "#1E6091",
                  fontSize: "0.78rem",
                }}
              >
                Hệ Thống Thư Viện Thông Minh Thế Hệ Mới IUH
              </Typography>
            </Box>

            {/* Main Headline */}
            <Typography
              variant="h2"
              sx={{
                fontWeight: 900,
                fontSize: { xs: "2.3rem", sm: "3.2rem", md: "3.85rem" },
                lineHeight: 1.15,
                letterSpacing: "-0.025em",
              }}
            >
              Không Gian Tri Thức &{" "}
              <Box
                component="span"
                sx={{
                  background: isDark
                    ? "linear-gradient(135deg, #38BDF8 0%, #818CF8 50%, #F59E0B 100%)"
                    : "linear-gradient(135deg, #0A2540 0%, #1E6091 50%, #0284C7 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  display: "inline-block",
                }}
              >
                Công Nghệ Số IUH
              </Box>
            </Typography>

            {/* Subtitle */}
            <Typography
              variant="body1"
              sx={{
                color: "text.secondary",
                fontSize: { xs: "1rem", md: "1.18rem" },
                lineHeight: 1.75,
                maxWidth: 720,
              }}
            >
              Tra cứu tài liệu số, mượn trả tự động, kiểm soát ra vào bằng công nghệ nhận diện khuôn mặt và trợ lý AI thông minh phục vụ học tập, nghiên cứu.
            </Typography>

            {/* Search Bar on Landing Page */}
            <Box
              component="form"
              onSubmit={handleSearch}
              sx={{
                width: "100%",
                maxWidth: 680,
                bgcolor: isDark ? "rgba(15, 23, 42, 0.78)" : "rgba(255, 255, 255, 0.88)",
                backdropFilter: "blur(20px)",
                p: 0.85,
                borderRadius: 3.5,
                boxShadow: isDark
                  ? "0 12px 40px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.1)"
                  : "0 12px 40px rgba(10, 37, 64, 0.12), inset 0 0 0 1px rgba(255, 255, 255, 0.8)",
                border: "1px solid",
                borderColor: isDark ? "rgba(56, 189, 248, 0.25)" : "rgba(30, 96, 145, 0.22)",
                display: "flex",
                gap: 1,
                transition: "all 0.3s ease",
                "&:focus-within": {
                  boxShadow: isDark
                    ? "0 16px 48px rgba(14, 165, 233, 0.3), 0 0 0 2px rgba(56, 189, 248, 0.4)"
                    : "0 16px 48px rgba(30, 96, 145, 0.18), 0 0 0 2px rgba(30, 96, 145, 0.3)",
                  borderColor: "primary.main",
                },
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
                sx={{ input: { py: 1.3, fontSize: "0.98rem" } }}
              />
              <Button
                type="submit"
                variant="contained"
                sx={{
                  px: 3.5,
                  py: 1.2,
                  borderRadius: 2.5,
                  fontWeight: 700,
                  flexShrink: 0,
                  boxShadow: "0 4px 14px rgba(30,96,145,0.3)",
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
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 2.5,
                  fontWeight: 700,
                  fontSize: "1rem",
                  boxShadow: "0 4px 16px rgba(30,96,145,0.3)",
                }}
              >
                Vào trang quản lý
              </Button>
              <Button
                component={Link}
                href="/library/vr-tour"
                variant="outlined"
                size="large"
                startIcon={<ExploreIcon />}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 2.5,
                  fontWeight: 700,
                  fontSize: "1rem",
                  backdropFilter: "blur(8px)",
                  bgcolor: isDark ? "rgba(15, 23, 42, 0.4)" : "rgba(255, 255, 255, 0.5)",
                }}
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
          <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: "0.12em" }}>
            TÍNH NĂNG NỔI BẬT
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 850, letterSpacing: "-0.015em" }}>
            Giải Pháp Thư Viện Toàn Diện & Hiện Đại
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 640, mx: "auto" }}>
            Tích hợp công nghệ AI tiên tiến giúp tối ưu hóa trải nghiệm mượn trả và quản lý tài nguyên.
          </Typography>
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 3 }}>
          {features.map((f) => (
            <Card
              key={f.title}
              sx={{
                p: 3.5,
                borderRadius: 3.5,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                bgcolor: isDark ? "rgba(15, 23, 42, 0.7)" : "rgba(255, 255, 255, 0.78)",
                backdropFilter: "blur(16px)",
                border: "1px solid",
                borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.7)",
                boxShadow: isDark
                  ? "0 8px 30px rgba(0,0,0,0.35)"
                  : "0 8px 30px rgba(10, 37, 64, 0.06)",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
                "&:hover": {
                  transform: "translateY(-6px)",
                  boxShadow: isDark
                    ? `0 20px 40px rgba(0,0,0,0.5), 0 0 20px ${alpha(f.color, 0.25)}`
                    : `0 20px 40px rgba(10,37,64,0.12), 0 0 16px ${alpha(f.color, 0.18)}`,
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
      <Box
        sx={{
          bgcolor: isDark ? "rgba(15, 23, 42, 0.65)" : "rgba(255, 255, 255, 0.72)",
          backdropFilter: "blur(18px)",
          borderTop: "1px solid",
          borderBottom: "1px solid",
          borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(30, 96, 145, 0.1)",
          py: 6,
          boxShadow: isDark ? "inset 0 1px 0 rgba(255,255,255,0.05)" : "inset 0 1px 0 rgba(255,255,255,0.8)",
        }}
      >
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
          <Typography variant="overline" sx={{ color: "secondary.main", fontWeight: 800, letterSpacing: "0.12em" }}>
            QUY TRÌNH TIỆN LỢI
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 850, letterSpacing: "-0.015em" }}>
            Mượn Sách Dễ Dàng Chỉ Với 3 Bước
          </Typography>
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 4 }}>
          {steps.map((st) => (
            <Paper
              key={st.num}
              sx={{
                p: 4,
                borderRadius: 3.5,
                position: "relative",
                bgcolor: isDark ? "rgba(15, 23, 42, 0.7)" : "rgba(255, 255, 255, 0.78)",
                backdropFilter: "blur(16px)",
                border: "1px solid",
                borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.7)",
                boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.3)" : "0 8px 32px rgba(10, 37, 64, 0.05)",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  borderColor: "primary.main",
                  boxShadow: isDark ? "0 16px 36px rgba(0,0,0,0.4)" : "0 16px 36px rgba(10, 37, 64, 0.1)",
                },
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
