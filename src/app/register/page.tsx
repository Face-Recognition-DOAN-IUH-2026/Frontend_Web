"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Typography, Button, Container, Paper } from "@mui/material";
import LockPersonIcon from "@mui/icons-material/LockPerson";

export default function RegisterDecommissionedPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Container maxWidth="sm" sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          textAlign: "center",
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            bgcolor: "primary.lighter",
            color: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
          }}
        >
          <LockPersonIcon sx={{ fontSize: 36 }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Cổng tự đăng ký đã ngừng hoạt động
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Tài khoản độc giả Thư viện IUH hiện được khởi tạo tập trung theo danh sách sinh viên hoặc trực tiếp tại quầy thư viện. Vui lòng liên hệ thủ thư nếu bạn chưa được cấp tài khoản.
        </Typography>
        <Button variant="contained" onClick={() => router.replace("/login")} sx={{ textTransform: "none", borderRadius: 2 }}>
          Quay lại Đăng nhập
        </Button>
      </Paper>
    </Container>
  );
}
