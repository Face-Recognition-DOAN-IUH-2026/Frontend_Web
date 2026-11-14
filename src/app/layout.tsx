import type { Metadata } from "next";
import { Space_Grotesk, Source_Sans_3, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/lib/toast-context";
import { MuiThemeProvider } from "@/lib/mui-theme";
import ClientLayout from "@/app/_components/ClientLayout";
import "./globals.css";

// IUH Library Fonts: self-hosted via next/font (no render-blocking network request)
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const sourceSans3 = Source_Sans_3({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

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
    <html
      lang="vi"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${spaceGrotesk.variable} ${sourceSans3.variable} ${jetbrainsMono.variable}`}
    >
      <body suppressHydrationWarning>
        <MuiThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <ClientLayout>{children}</ClientLayout>
            </ToastProvider>
          </AuthProvider>
        </MuiThemeProvider>
      </body>
    </html>
  );
}

