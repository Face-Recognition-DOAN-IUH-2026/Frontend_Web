import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thư Viện — Hệ thống Quản lý Thư viện Thông minh",
  description: "Nền tảng quản lý thư viện toàn diện — quản lý độc giả, theo dõi mượn trả, và kiểm soát cửa ra vào bằng công nghệ nhận diện khuôn mặt.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}