"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  History,
  BookMarked,
  ScanFace,
  UserCheck,
  Search,
  Eye,
  Shield,
  BarChart3,
  ChevronDown,
  DoorOpen,
  LogOut,
  Library,
  CalendarDays,
} from "lucide-react";

const libraryItems = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/patrons", label: "Độc giả", icon: Users },
  { href: "/active", label: "Đang hiện diện", icon: BookOpen },
  { href: "/gate", label: "Cổng ra vào", icon: DoorOpen },
  { href: "/history", label: "Lịch sử ra vào", icon: History },
];

const circulationItems = [
  { href: "/return", label: "Trả sách", icon: BookMarked },
  { href: "/books", label: "Kho sách", icon: Library },
];

const staffItems = [
  { href: "/staff-schedules", label: "Lich truc", icon: CalendarDays },
];

const aiItems = [
  { href: "/enroll", label: "Đăng ký khuôn mặt", icon: ScanFace },
  { href: "/verify", label: "Xác thực khuôn mặt", icon: UserCheck },
  { href: "/identify", label: "Nhận diện", icon: Search },
  { href: "/liveness", label: "Kiểm tra sống", icon: Eye },
];

const adminItems = [
  { href: "/dashboard/admin", label: "Quản trị", icon: Shield },
  { href: "/stats", label: "Thống kê", icon: BarChart3 },
];

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: any;
  label: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`nav-item ${active ? "nav-item-active" : ""}`}
    >
      <Icon size={18} className={`shrink-0 ${active ? "text-primary" : "text-text-2"}`} />
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-caption font-medium min-w-[20px] text-center">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

function SectionLabel({ children, collapsible, open, onToggle }: {
  children: React.ReactNode;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  if (collapsible) {
    return (
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 mb-1 text-body-sm text-text-2 hover:text-text transition-colors"
      >
        <span>{children}</span>
        <ChevronDown
          size={12}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
    );
  }
  return (
    <p className="px-3 mb-1 text-body-sm text-text-2">{children}</p>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [aiOpen, setAiOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(true);

  const role = user?.role || "staff";

  return (
    <aside className="w-64 min-h-screen bg-surface border-r border-border flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <Library size={22} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-heading-md text-text">THƯ VIỆN IUH</h2>
            <p className="text-caption text-text-3">Hệ thống quản lý</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {/* Library section */}
        <div>
          <SectionLabel>Thư viện</SectionLabel>
          <div className="space-y-0.5">
            {libraryItems.map((item) => (
              <NavItem key={item.href} {...item} active={pathname === item.href} />
            ))}
          </div>
        </div>

        {/* Circulation */}
        {role === "admin" || role === "staff" ? (
          <div>
            <SectionLabel>Mượn / Trả</SectionLabel>
            <div className="space-y-0.5">
              {circulationItems.map((item) => (
                <NavItem key={item.href} {...item} active={pathname === item.href} />
              ))}
            </div>
          </div>
        ) : null}

        {role === "admin" || role === "staff" ? (
          <div>
            <SectionLabel>Nhan su</SectionLabel>
            <div className="space-y-0.5">
              {staffItems.map((item) => (
                <NavItem key={item.href} {...item} active={pathname === item.href} />
              ))}
            </div>
          </div>
        ) : null}

        {/* AI Diagnostics — collapsible */}
        {role === "admin" ? (
          <div>
            <SectionLabel collapsible open={aiOpen} onToggle={() => setAiOpen((v) => !v)}>
              Chẩn đoán AI
            </SectionLabel>
            {aiOpen && (
              <div className="space-y-0.5">
                {aiItems.map((item) => (
                  <NavItem key={item.href} {...item} active={pathname === item.href} />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Admin */}
        {role === "admin" ? (
          <div>
            <SectionLabel collapsible open={adminOpen} onToggle={() => setAdminOpen((v) => !v)}>
              Quản trị
            </SectionLabel>
            {adminOpen && (
              <div className="space-y-0.5">
                {adminItems.map((item) => (
                  <NavItem key={item.href} {...item} active={pathname === item.href} />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-2 transition-colors">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
            {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-body-sm font-medium text-text truncate">
              {user?.full_name || user?.email?.split("@")[0] || "Người dùng"}
            </p>
            <p className="text-caption text-text-2 capitalize">{role === "admin" ? "Quản trị viên" : "Nhân viên"}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-md text-text-2 hover:text-error hover:bg-error/10 transition-colors shrink-0"
            title="Đăng xuất"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
