"use client";

import Link from "next/link";
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import LibraryIcon from "@mui/icons-material/LibraryBooks";
import UsersIcon from "@mui/icons-material/People";
import BookOpenIcon from "@mui/icons-material/MenuBook";
import ScanFaceIcon from "@mui/icons-material/Face";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ExploreIcon from "@mui/icons-material/Explore";
import { motion } from "framer-motion";

const features = [
  {
    Icon: UsersIcon,
    title: "Quản lý độc giả",
    desc: "Đăng ký, gia hạn thẻ, tra cứu thông tin bạn đọc toàn thư viện.",
    gradient: "linear-gradient(135deg, rgba(25,118,210,0.15) 0%, rgba(25,118,210,0.08) 100%)",
    iconColor: "primary.light",
  },
  {
    Icon: BookOpenIcon,
    title: "Mượn / Trả sách",
    desc: "Quét mã vạch, mượn trả nhanh chóng. Hệ thống theo dõi hạn trả và nhắc nhở tự động.",
    gradient: "linear-gradient(135deg, rgba(46,125,50,0.15) 0%, rgba(46,125,50,0.08) 100%)",
    iconColor: "success.light",
  },
  {
    Icon: ScanFaceIcon,
    title: "Cửa ra vào thông minh",
    desc: "Nhận diện khuôn mặt, kiểm soát ra vào, chống giả mạo và thống kê tần suất.",
    gradient: "linear-gradient(135deg, rgba(103,58,183,0.15) 0%, rgba(103,58,183,0.08) 100%)",
    iconColor: "secondary.light",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

export default function LandingOverlay() {
  return (
    <Box sx={{ position: "relative", zIndex: 10, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: 1,
          borderColor: "rgba(255,255,255,0.1)",
          bgcolor: "rgba(15,23,42,0.7)",
          backdropFilter: "blur(16px)",
        }}
      >
        <Container maxWidth="lg" sx={{ py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LibraryIcon sx={{ color: "common.white", fontSize: 22 }} />
            </Box>
            <Typography variant="subtitle1" color="common.white" sx={{ fontWeight: 700 }}>
              Thư Viện
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box component="main" sx={{ flex: 1 }}>
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <Container maxWidth="lg" sx={{ pt: 15, pb: 12, textAlign: "center" }}>
            {/* Badge */}
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.5,
                py: 0.5,
                borderRadius: 10,
                bgcolor: "rgba(25,118,210,0.1)",
                border: 1,
                borderColor: "rgba(25,118,210,0.3)",
                color: "primary.light",
                fontSize: "0.75rem",
                fontWeight: 500,
                mb: 3,
              }}
            >
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "primary.main" }} />
              Hệ thống quản lý thư viện thông minh
            </Box>

            {/* Title */}
            <Typography
              variant="h2"
              color="common.white"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "2rem", sm: "2.5rem", lg: "3rem" },
                lineHeight: 1.2,
                letterSpacing: -0.02,
              }}
            >
              Chào mừng đến với{" "}
              <Box
                component="span"
                sx={{
                  background: "linear-gradient(90deg, #1A73E8, #4DA3FF)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Thư Viện
              </Box>
            </Typography>

            <Typography sx={{ mt: 2, color: "rgba(255,255,255,0.5)", maxWidth: 560, mx: "auto", lineHeight: 1.7 }}>
              Nền tảng quản lý thư viện toàn diện — quản lý độc giả, theo dõi mượn trả, và kiểm soát cửa ra vào bằng công nghệ nhận diện khuôn mặt.
            </Typography>

            {/* CTAs */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "center", mt: 4 }}>
              <Button
                component={Link}
                href="/login"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  textTransform: "none",
                  px: 4,
                  boxShadow: "0 4px 20px rgba(26,115,232,0.35)",
                  "&:hover": { boxShadow: "0 4px 24px rgba(26,115,232,0.5)" },
                }}
              >
                Truy cập hệ thống
              </Button>
              <Button
                component={Link}
                href="/library/vr-tour"
                variant="outlined"
                size="large"
                startIcon={<ExploreIcon />}
                sx={{
                  textTransform: "none",
                  px: 4,
                  color: "common.white",
                  borderColor: "rgba(255,255,255,0.2)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  "&:hover": { borderColor: "rgba(255,255,255,0.4)", bgcolor: "rgba(255,255,255,0.05)" },
                }}
              >
                Tham quan 3D
              </Button>
            </Stack>
          </Container>
        </motion.section>

        {/* Feature Cards */}
        <motion.section variants={container} initial="hidden" animate="show">
          <Container maxWidth="lg" sx={{ pb: 12 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
              {features.map((f) => (
                <motion.div key={f.title} variants={item} style={{ flex: 1 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 3,
                      height: "100%",
                      bgcolor: "rgba(255,255,255,0.04)",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: 2,
                      transition: "all 0.3s",
                      "&:hover": {
                        bgcolor: "rgba(255,255,255,0.08)",
                        borderColor: "rgba(255,255,255,0.2)",
                        boxShadow: "0 8px 32px rgba(26,115,232,0.08)",
                        transform: "translateY(-4px)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        mb: 2,
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        background: f.gradient,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        "&:hover": { transform: "scale(1.1)" },
                        transition: "transform 0.2s",
                      }}
                    >
                      <f.Icon sx={{ fontSize: 26, color: f.iconColor }} />
                    </Box>
                    <Typography variant="subtitle1" color="common.white" sx={{ fontWeight: 600 }}>
                      {f.title}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                      {f.desc}
                    </Typography>
                  </Paper>
                </motion.div>
              ))}
            </Stack>
          </Container>
        </motion.section>

        {/* Stats Section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <Container maxWidth="lg" sx={{ pb: 12 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              {[
                { label: "Độc giả", value: "1,200+", color: "primary.light" },
                { label: "Đầu sách", value: "10,000+", color: "warning.main" },
                { label: "Lượt mượn", value: "25,000+", color: "success.main" },
                { label: "Lượt ra vào", value: "50,000+", color: "secondary.light" },
              ].map((stat) => (
                <Paper
                  key={stat.label}
                  variant="outlined"
                  sx={{
                    flex: 1,
                    textAlign: "center",
                    p: 2.5,
                    borderRadius: 2,
                    borderColor: "rgba(255,255,255,0.06)",
                    bgcolor: "rgba(255,255,255,0.02)",
                  }}
                >
                  <Typography variant="h5" color={stat.color} sx={{ fontWeight: 700 }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1 }}>
                    {stat.label}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Container>
        </motion.section>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          borderTop: 1,
          borderColor: "rgba(255,255,255,0.06)",
          bgcolor: "rgba(15,23,42,0.5)",
        }}
      >
        <Container maxWidth="lg" sx={{ py: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.2)" }}>
            © {new Date().getFullYear()} Thư Viện. All rights reserved.
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.2)" }}>
            Phiên bản 1.0
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
