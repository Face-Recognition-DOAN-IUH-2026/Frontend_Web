"use client";

import { Box, Typography } from "@mui/material";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import FaceRetouchingNaturalOutlinedIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";

export default function LoginBrandHero() {
  const features = [
    { icon: <FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: 18 }} />, text: "Đăng nhập bằng khuôn mặt không cần thẻ" },
    { icon: <AutoStoriesOutlinedIcon sx={{ fontSize: 18 }} />, text: "Theo dõi mượn trả sách thời gian thực" },
    { icon: <ShieldOutlinedIcon sx={{ fontSize: 18 }} />, text: "Kiểm soát ra vào tự động, bảo mật cao" },
  ];

  return (
    <Box
      sx={{
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        justifyContent: "space-between",
        p: { md: 5, lg: 6 },
        background: "linear-gradient(145deg, #0F3C5C 0%, #1E6091 50%, #2980B9 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative geometric shapes */}
      <Box sx={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <Box sx={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)" }} />
        <Box sx={{ position: "absolute", top: 60, right: 60, width: 180, height: 180, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)" }} />
        <Box sx={{ position: "absolute", bottom: 80, left: -60, width: 280, height: 280, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)" }} />
        <Box sx={{ position: "absolute", bottom: -30, right: 100, width: 200, height: 200, borderRadius: "50%", bgcolor: "rgba(217,119,6,0.12)" }} />
        <Box
          sx={{
            position: "absolute",
            top: "40%",
            right: -40,
            width: 200,
            height: 200,
            background: "radial-gradient(circle, rgba(41,128,185,0.4) 0%, transparent 70%)",
          }}
        />
      </Box>

      {/* Logo + Brand */}
      <Box sx={{ position: "relative", zIndex: 1 }}>
        <Box
          component="img"
          src="/logo-white.png"
          alt="IUH Logo"
          sx={{ height: 42, width: "auto", objectFit: "contain" }}
        />
      </Box>

      {/* Main hero content */}
      <Box sx={{ position: "relative", zIndex: 1 }}>
        <Typography
          variant="h2"
          sx={{
            color: "white",
            fontWeight: 800,
            lineHeight: 1.15,
            mb: 2.5,
            fontSize: { md: "2.4rem", lg: "2.8rem" },
            fontFamily: "Space Grotesk, sans-serif",
          }}
        >
          Hệ thống Quản lý<br />
          <Box component="span" sx={{ color: "#FCD34D" }}>Thư viện Thông minh</Box>
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: "1.05rem", lineHeight: 1.7, mb: 4 }}>
          Quản lý độc giả, mượn trả sách và kiểm soát ra vào tự động bằng công nghệ nhận diện khuôn mặt AI.
        </Typography>

        {/* Feature highlights */}
        {features.map((f, i) => (
          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: "rgba(255,255,255,0.12)",
                display: "grid",
                placeItems: "center",
                color: "#FCD34D",
                flexShrink: 0,
              }}
            >
              {f.icon}
            </Box>
            <Typography sx={{ color: "rgba(255,255,255,0.9)", fontSize: "0.9rem" }}>{f.text}</Typography>
          </Box>
        ))}
      </Box>

      {/* Bottom quote */}
      <Box sx={{ position: "relative", zIndex: 1 }}>
        <Box sx={{ borderLeft: "3px solid rgba(252,211,77,0.6)", pl: 2 }}>
          <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.82rem", fontStyle: "italic" }}>
            &ldquo;Tri thức là nền tảng của sự phát triển&rdquo;
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", mt: 0.5 }}>
            — Trường Đại học Công nghiệp TP.HCM
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
