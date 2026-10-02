"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Breadcrumbs, Typography, useTheme } from "@mui/material";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

const ROUTE_NAME_MAP: Record<string, string> = {
  dashboard: "Tổng quan thư viện",
  books: "Kho sách & Tài liệu",
  patrons: "Quản lý bạn đọc",
  active: "Bạn đọc đang có mặt",
  borrow: "Quầy mượn sách",
  return: "Quầy trả sách",
  gate: "Cổng kiểm soát Kiosk",
  "staff-schedules": "Lịch trực thủ thư",
  history: "Nhật ký vào ra & Mượn trả",
  "vr-tour": "Tham quan 3D Thư viện",
  stats: "Báo cáo & Thống kê",
  admin: "Quản trị người dùng",
  "dynamic-admin": "Phân quyền & Vai trò",
  settings: "Cài đặt hệ thống",
  "ai-assistant": "Trợ lý AI Thủ thư",
  enroll: "Đăng ký khuôn mặt",
  verify: "Xác thực khuôn mặt (1:1)",
  identify: "Nhận diện bạn đọc (1:N)",
  liveness: "Kiểm tra thực thể sống",
  profile: "Hồ sơ & Tài khoản cá nhân",
  notifications: "Trung tâm thông báo",
};

export function BreadcrumbsNav() {
  const pathname = usePathname();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Split pathname into segments
  const segments = pathname.split("/").filter(Boolean);

  // If on root dashboard, don't overwhelm with redundant breadcrumbs
  if (segments.length === 0 || (segments.length === 1 && segments[0] === "dashboard")) {
    return null;
  }

  return (
    <Box sx={{ mb: 2, px: 0.5 }}>
      <Breadcrumbs
        separator={<NavigateNextIcon sx={{ fontSize: 14, color: isDark ? "#64748B" : "#94A3B8" }} />}
        aria-label="breadcrumb"
      >
        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            textDecoration: "none",
            color: isDark ? "#94A3B8" : "#64748B",
            fontSize: "0.8rem",
            fontWeight: 600,
            fontFamily: "'Source Sans 3', sans-serif",
          }}
        >
          <HomeOutlinedIcon sx={{ fontSize: 15 }} />
          <span>Bàn làm việc</span>
        </Link>

        {segments.map((seg, idx) => {
          const isLast = idx === segments.length - 1;
          const href = "/" + segments.slice(0, idx + 1).join("/");
          const title = ROUTE_NAME_MAP[seg] || decodeURIComponent(seg);

          if (isLast) {
            return (
              <Typography
                key={href}
                sx={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: isDark ? "#F8FAFC" : "#0F172A",
                }}
              >
                {title}
              </Typography>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              style={{
                textDecoration: "none",
                color: isDark ? "#94A3B8" : "#64748B",
                fontSize: "0.8rem",
                fontWeight: 600,
                fontFamily: "'Source Sans 3', sans-serif",
              }}
            >
              {title}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
}

export default BreadcrumbsNav;
