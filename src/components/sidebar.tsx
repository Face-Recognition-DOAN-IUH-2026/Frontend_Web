"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Home,
  UserPlus,
  UserCheck,
  Search,
  Eye,
  Shield,
  LogOut,
  Users,
  BookOpen,
  History,
  BarChart3,
  DoorOpen,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/enroll", label: "Enroll Face", icon: UserPlus },
  { href: "/verify", label: "Verify Face", icon: UserCheck },
  { href: "/identify", label: "Identify Face", icon: Search },
  { href: "/liveness", label: "Liveness Check", icon: Eye },
  { href: "/gate", label: "Gate Kiosk", icon: DoorOpen },
];

const adminItems = [
  { href: "/dashboard/admin", label: "Admin", icon: Shield },
  { href: "/patrons", label: "Patrons", icon: Users },
  { href: "/active", label: "In Library", icon: BookOpen },
  { href: "/history", label: "Access Logs", icon: History },
  { href: "/stats", label: "Statistics", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 min-h-screen bg-white border-r flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold">Face Recognition</h2>
        <p className="text-sm text-gray-500">{user?.email}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}

        {user?.role === "admin" && (
          <>
            <div className="my-4 border-t" />
            {adminItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md hover:bg-accent text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}