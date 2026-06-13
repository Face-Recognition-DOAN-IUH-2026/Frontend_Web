"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Home,
  Users,
  BookOpen,
  History,
  BookMarked,
  UserPlus,
  UserCheck,
  Search,
  Eye,
  Shield,
  BarChart3,
  ChevronDown,
  LogOut,
  Library,
} from "lucide-react";

const libraryItems = [
  { href: "/dashboard", label: "Tổng quan", icon: Home },
  { href: "/patrons", label: "Độc giả", icon: Users },
  { href: "/active", label: "Đang hiện diện", icon: BookOpen },
  { href: "/history", label: "Lịch sử ra vào", icon: History },
];

const circulationItems = [
  { href: "/return", label: "Trả sách", icon: BookMarked },
];

const aiItems = [
  { href: "/enroll", label: "Đăng ký khuôn mặt", icon: UserPlus },
  { href: "/verify", label: "Xác thực khuôn mặt", icon: UserCheck },
  { href: "/identify", label: "Nhận diện", icon: Search },
  { href: "/liveness", label: "Kiểm tra sống", icon: Eye },
];

const adminItems = [
  { href: "/dashboard/admin", label: "Quản trị", icon: Shield },
  { href: "/stats", label: "Thống kê", icon: BarChart3 },
];

function NavLink({ href, icon: Icon, label, pathname }: { href: string; icon: any; label: string; pathname: string }) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? "bg-primary text-primary-foreground font-medium"
          : "text-gray-700 hover:bg-accent"
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${active ? "" : "text-gray-400"}`} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 mb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
      {children}
    </p>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <aside className="w-64 min-h-screen bg-white border-r flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Library className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold leading-tight">Thư Viện</h2>
            <p className="text-[11px] text-gray-400">Hệ thống quản lý</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        <div>
          <SectionLabel>Thư viện</SectionLabel>
          <div className="space-y-0.5">
            {libraryItems.map((item) => (
                  <NavLink key={item.href} {...item} pathname={pathname} />
                ))}
          </div>
        </div>

        {(user?.role === "admin" || user?.role === "staff") && (
          <div>
            <SectionLabel>Mượn / Trả</SectionLabel>
            <div className="space-y-0.5">
              {circulationItems.map((item) => (
                  <NavLink key={item.href} {...item} pathname={pathname} />
                ))}
            </div>
          </div>
        )}

        {user?.role === "admin" && (
          <div>
            <button
              onClick={() => setAiOpen((v) => !v)}
              className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors rounded-md"
            >
              <span>Chẩn đoán AI</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  aiOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {aiOpen && (
              <div className="mt-0.5 space-y-0.5">
                {aiItems.map((item) => (
                  <NavLink key={item.href} {...item} pathname={pathname} />
                ))}
              </div>
            )}
          </div>
        )}

        {user?.role === "admin" && (
          <div>
            <SectionLabel>Quản trị</SectionLabel>
            <div className="space-y-0.5">
              {adminItems.map((item) => (
                  <NavLink key={item.href} {...item} pathname={pathname} />
                ))}
            </div>
          </div>
        )}
      </nav>

      <div className="p-3 border-t">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-gray-800">{user?.email}</p>
            <p className="text-[11px] text-gray-400 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-md hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors shrink-0"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}