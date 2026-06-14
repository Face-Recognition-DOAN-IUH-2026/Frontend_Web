"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/sidebar";
import { Bell, User, LogOut, ChevronRight } from "lucide-react";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Tổng quan", subtitle: "Chào mừng bạn quay lại" },
  "/patrons": { title: "Quản lý độc giả", subtitle: "Danh sách và thông tin độc giả" },
  "/books": { title: "Kho sách", subtitle: "Quản lý và nhập kho sách" },
  "/active": { title: "Đang hiện diện", subtitle: "Độc giả đang có mặt trong thư viện" },
  "/gate": { title: "Cổng ra vào", subtitle: "Xác thực khuôn mặt tại cổng" },
  "/history": { title: "Lịch sử ra vào", subtitle: "Nhật ký ra vào cửa thư viện" },
  "/return": { title: "Trả sách", subtitle: "Xử lý trả sách cho độc giả" },
  "/stats": { title: "Thống kê", subtitle: "Báo cáo và biểu đồ hoạt động" },
  "/enroll": { title: "Đăng ký khuôn mặt", subtitle: "Cập nhật thông tin khuôn mặt" },
  "/verify": { title: "Xác thực khuôn mặt", subtitle: "Kiểm tra đối chiếu khuôn mặt" },
  "/identify": { title: "Nhận diện", subtitle: "Tìm kiếm độc giả qua khuôn mặt" },
  "/liveness": { title: "Kiểm tra sống", subtitle: "Xác minh khuôn mặt thật" },
  "/dashboard/admin": { title: "Quản trị hệ thống", subtitle: "Quản lý người dùng và phân quyền" },
};

function Breadcrumb({ pathname }: { pathname: string }) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1.5 text-body-sm text-text-3">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={12} className="text-text-3" />}
          <span className={i === parts.length - 1 ? "text-text-2" : "capitalize"}>
            {PAGE_TITLES[`/${parts.slice(0, i + 1).join("/")}`]?.title || part.replace(/-/g, ' ')}
          </span>
        </span>
      ))}
    </nav>
  );
}

function Topbar({ user }: { user: any }) {
  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {/* Page title injected via page — can be enhanced */}
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-md hover:bg-surface-2 transition-colors">
          <Bell size={18} className="text-text-2" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>
        <div className="flex items-center gap-2.5 pl-3 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <User size={16} className="text-primary" />
          </div>
          <div className="hidden sm:block">
            <p className="text-body-sm font-medium text-text">{user?.full_name || "Admin"}</p>
            <p className="text-caption text-text-3 capitalize">{user?.role || "staff"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-body-sm text-text-3">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const pageInfo = PAGE_TITLES[pathname] || PAGE_TITLES[pathname.split("/").slice(0, 2).join("/")] || { title: "", subtitle: "" };

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar user={user} />
        <div className="p-6">
          {/* Page Header */}
          {pageInfo.title && (
            <div className="mb-6 animate-fade-in">
              <Breadcrumb pathname={pathname} />
              <h1 className="text-display-xl text-text mt-1">{pageInfo.title}</h1>
              {pageInfo.subtitle && (
                <p className="text-body-md text-text-3 mt-0.5">{pageInfo.subtitle}</p>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}