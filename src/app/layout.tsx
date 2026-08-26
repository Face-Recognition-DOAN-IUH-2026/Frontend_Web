import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { MuiThemeProvider } from "@/lib/mui-theme";
import ClientLayout from "@/app/_components/ClientLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thư Viện IUH - Hệ thống Quản lý Thư viện Thông minh",
  description: "Nền tảng quản lý thư viện toàn diện: quản lý độc giả, theo dõi mượn trả và kiểm soát cửa ra vào bằng công nghệ nhận diện khuôn mặt.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Be Vietnam Pro — font tiếng Việt chuyên nghiệp, thay thế Fira Sans/system-ui */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <MuiThemeProvider>
          <AuthProvider>
            <ClientLayout>{children}</ClientLayout>
          </AuthProvider>
        </MuiThemeProvider>
      </body>
    </html>
  );
}

