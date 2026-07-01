"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type {
  AccessLogPublic,
  BorrowRecord,
  CameraStatus,
  Notification,
  StatsResponse,
  StaffScheduleAssignment,
} from "@/lib/types";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

export interface DashboardData {
  stats: StatsResponse | null;
  recentLogs: AccessLogPublic[];
  hourlyLogs: AccessLogPublic[];
  cameraStatuses: CameraStatus[];
  borrowStats: { total: number; active: number; overdue: number } | null;
  activeBorrows: BorrowRecord[];
  todaySchedule: StaffScheduleAssignment[];
  notifications: Notification[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

export function useDashboardData(): DashboardData {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [recentLogs, setRecentLogs] = useState<AccessLogPublic[]>([]);
  const [hourlyLogs, setHourlyLogs] = useState<AccessLogPublic[]>([]);
  const [cameraStatuses, setCameraStatuses] = useState<CameraStatus[]>([]);
  const [borrowStats, setBorrowStats] = useState<{ total: number; active: number; overdue: number } | null>(null);
  const [activeBorrows, setActiveBorrows] = useState<BorrowRecord[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<StaffScheduleAssignment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setError("");
      const today = toDateStr(new Date());

      const [statsResult, recentResult, hourlyResult, cameraResult, borrowStatsResult, borrowsResult, scheduleResult, notifResult] = await Promise.allSettled([
        api.getStats(),
        api.getRecentLogs(),
        api.getAccessLogs({ dateFrom: today, limit: 200 }),
        api.getCameraStatus(),
        api.getBorrowStats(),
        api.getAllActiveBorrows(),
        api.getScheduleAssignments({ from: today, to: today }),
        api.getNotifications({ limit: 5 }),
      ]);

      if (statsResult.status === "fulfilled") setStats(statsResult.value);
      if (recentResult.status === "fulfilled") setRecentLogs(recentResult.value.items.slice(0, 6));
      if (hourlyResult.status === "fulfilled") setHourlyLogs(hourlyResult.value.items);
      if (cameraResult.status === "fulfilled") setCameraStatuses(cameraResult.value);
      if (borrowStatsResult.status === "fulfilled") setBorrowStats(borrowStatsResult.value);
      if (borrowsResult.status === "fulfilled") setActiveBorrows(borrowsResult.value);
      if (scheduleResult.status === "fulfilled") setTodaySchedule(scheduleResult.value.items);
      if (notifResult.status === "fulfilled") setNotifications(notifResult.value.items);
    } catch {
      setError("Không thể tải dữ liệu tổng quan.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refresh]);

  return {
    stats,
    recentLogs,
    hourlyLogs,
    cameraStatuses,
    borrowStats,
    activeBorrows,
    todaySchedule,
    notifications,
    loading,
    error,
    refresh,
  };
}
