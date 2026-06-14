"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api-client";
import StatCard from "@/components/ui/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Users, UserCheck, LogIn, LogOut, BookOpen, AlertCircle, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

import type { AccessLogPublic } from "@/lib/types";

interface Stats {
  total_patrons: number;
  active_patrons: number;
  today_entries: number;
  today_exits: number;
}

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AccessLogPublic[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchData() {
      try {
        const [statsData, logsData] = await Promise.all([
          api.getStats().catch(() => null),
          api.getRecentLogs().catch(() => null),
        ]);

        if (statsData) {
          setStats({
            total_patrons: statsData.total_patrons || 0,
            active_patrons: statsData.active_patrons || 0,
            today_entries: statsData.today_entries || 0,
            today_exits: statsData.today_exits || 0,
          });
        }

        if (logsData?.items) {
          setRecentLogs(logsData.items.slice(0, 8));
        }
      } catch {
        // silently fail
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-body-sm text-text-3">Đang tải...</p>
        </div>
      </div>
    );
  }

  const role = user?.role || "staff";

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tổng độc giả"
          value={stats?.total_patrons ?? "—"}
          icon={Users}
          accentColor="primary"
          description="Đã đăng ký"
        />
        <StatCard
          label="Đang có mặt"
          value={stats?.active_patrons ?? "—"}
          icon={UserCheck}
          accentColor="success"
          description="Trong thư viện"
        />
        <StatCard
          label="Lượt vào hôm nay"
          value={stats?.today_entries ?? "—"}
          icon={LogIn}
          accentColor="info"
          description="Ra vào cửa"
        />
        <StatCard
          label="Lượt ra hôm nay"
          value={stats?.today_exits ?? "—"}
          icon={LogOut}
          accentColor="warning"
          description="Ra về"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2">
          <Card padding="none">
            <CardHeader className="p-4 border-b border-border">
              <CardTitle>Hoạt động gần đây</CardTitle>
              <Link href="/history" className="text-body-sm text-primary hover:text-primary/80 flex items-center gap-1">
                Xem tất cả <ArrowRight size={14} />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {loadingData ? (
                <div className="p-8 text-center text-text-3 text-body-sm">Đang tải...</div>
              ) : recentLogs.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center mx-auto mb-3 text-text-3">
                    <Clock size={20} />
                  </div>
                  <p className="text-body-sm text-text-3">Chưa có hoạt động nào</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        log.access_type === "entry"
                          ? "bg-success/15 text-success"
                          : "bg-error/15 text-error"
                      }`}>
                        {log.access_type === "entry" ? <LogIn size={16} /> : <LogOut size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-sm font-medium text-text truncate">{log.patron_name || "—"}</p>
                        <p className="text-caption text-text-3">{log.student_code || log.patron_id}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant={log.status === "success" ? "success" : "error"} dot>
                          {log.status === "success" ? "Thành công" : "Thất bại"}
                        </Badge>
                        <p className="text-caption text-text-3 mt-1">
                          {new Date(log.access_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick access */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Thao tác nhanh</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {role === "admin" && (
                <>
                  <QuickAction href="/enroll" icon={<LogIn size={16} />} label="Đăng ký khuôn mặt" color="primary" />
                  <QuickAction href="/patrons" icon={<Users size={16} />} label="Quản lý độc giả" color="info" />
                  <QuickAction href="/return" icon={<BookOpen size={16} />} label="Trả sách" color="warning" />
                  <QuickAction href="/stats" icon={<AlertCircle size={16} />} label="Xem thống kê" color="success" />
                </>
              )}
              <QuickAction href="/active" icon={<UserCheck size={16} />} label="Đang có mặt" color="success" />
              <QuickAction href="/history" icon={<Clock size={16} />} label="Lịch sử ra vào" color="info" />
            </CardContent>
          </Card>

          
        </div>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, label, color }: {
  href: string;
  icon: React.ReactNode;
  label: string;
  color: "primary" | "success" | "error" | "warning" | "info";
}) {
  const colorMap = {
    primary: "text-primary hover:bg-primary/10",
    success: "text-success hover:bg-success/10",
    error: "text-error hover:bg-error/10",
    warning: "text-warning hover:bg-warning/10",
    info: "text-info hover:bg-info/10",
  };

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${colorMap[color]}`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="text-body-sm font-medium">{label}</span>
      <ArrowRight size={14} className="ml-auto shrink-0 opacity-50" />
    </Link>
  );
}