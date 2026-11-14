"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
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
  logsLoading?: boolean;
  hourlyLoading?: boolean;
  camerasLoading?: boolean;
  borrowsLoading?: boolean;
  scheduleLoading?: boolean;
  notifsLoading?: boolean;
  error: string;
  refresh: () => Promise<void>;
}

export interface DashboardSnapshot {
  stats: StatsResponse | null;
  recentLogs: AccessLogPublic[];
  hourlyLogs: AccessLogPublic[];
  cameraStatuses: CameraStatus[];
  borrowStats: { total: number; active: number; overdue: number } | null;
  activeBorrows: BorrowRecord[];
  todaySchedule: StaffScheduleAssignment[];
  notifications: Notification[];
}

export const fetchDashboardData = async (): Promise<DashboardSnapshot> => {
  const today = toDateStr(new Date());

  const [statsResult, recentResult, hourlyResult, cameraResult, borrowStatsResult, borrowsResult, scheduleResult, notifResult] = await Promise.allSettled([
    api.getStats(),
    api.getRecentLogs(),
    api.getAccessLogs({ dateFrom: today, limit: 50 }),
    api.getCameraStatus(),
    api.getBorrowStats(),
    api.getAllActiveBorrows(),
    api.getScheduleAssignments({ from: today, to: today }),
    api.getNotifications({ limit: 5 }),
  ]);

  return {
    stats: statsResult.status === "fulfilled" ? statsResult.value : null,
    recentLogs: recentResult.status === "fulfilled" ? (recentResult.value?.items ? recentResult.value.items.slice(0, 6) : []) : [],
    hourlyLogs: hourlyResult.status === "fulfilled" ? (hourlyResult.value?.items ?? []) : [],
    cameraStatuses: cameraResult.status === "fulfilled" ? (cameraResult.value ?? []) : [],
    borrowStats: borrowStatsResult.status === "fulfilled" ? borrowStatsResult.value : null,
    activeBorrows: borrowsResult.status === "fulfilled" ? (borrowsResult.value ?? []) : [],
    todaySchedule: scheduleResult.status === "fulfilled" ? (scheduleResult.value?.items ?? []) : [],
    notifications: notifResult.status === "fulfilled" ? (notifResult.value?.items ?? []) : [],
  };
};

export function useDashboardData(): DashboardData {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const today = useMemo(() => toDateStr(new Date()), []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  // 1. KPI Stats (fast, <200ms)
  const {
    data: statsData,
    mutate: mutateStats,
    isLoading: isStatsLoading,
  } = useSWR<StatsResponse | null>(
    isAuthenticated ? "dashboard:stats" : null,
    () => api.getStats(),
    {
      refreshInterval: 30000,
      dedupingInterval: 10000,
      revalidateOnFocus: true,
      onError: () => setError("Không thể tải thống kê độc giả."),
    }
  );

  // 2. Borrow Stats (fast, <200ms)
  const {
    data: borrowStatsData,
    mutate: mutateBorrowStats,
    isLoading: isBorrowStatsLoading,
  } = useSWR<{ total: number; active: number; overdue: number } | null>(
    isAuthenticated ? "dashboard:borrow-stats" : null,
    () => api.getBorrowStats(),
    {
      refreshInterval: 30000,
      dedupingInterval: 10000,
      revalidateOnFocus: true,
    }
  );

  // 3. Active Borrows list
  const {
    data: activeBorrowsData,
    mutate: mutateActiveBorrows,
    isLoading: isActiveBorrowsLoading,
  } = useSWR<BorrowRecord[]>(
    isAuthenticated ? "dashboard:active-borrows" : null,
    () => api.getAllActiveBorrows(),
    {
      refreshInterval: 30000,
      dedupingInterval: 10000,
      revalidateOnFocus: true,
    }
  );

  // 4. Recent Access Logs (latest 6)
  const {
    data: recentLogsData,
    mutate: mutateRecentLogs,
    isLoading: isRecentLogsLoading,
  } = useSWR(
    isAuthenticated ? "dashboard:recent-logs" : null,
    () => api.getRecentLogs(),
    {
      refreshInterval: 15000,
      dedupingInterval: 5000,
      revalidateOnFocus: true,
    }
  );

  // 5. Hourly Access Logs for today
  const {
    data: hourlyLogsData,
    mutate: mutateHourlyLogs,
    isLoading: isHourlyLogsLoading,
  } = useSWR(
    isAuthenticated ? ["dashboard:hourly-logs", today] : null,
    () => api.getAccessLogs({ dateFrom: today, limit: 50 }),
    {
      refreshInterval: 30000,
      dedupingInterval: 10000,
      revalidateOnFocus: true,
    }
  );

  // 6. Camera Statuses
  const {
    data: cameraStatusData,
    mutate: mutateCameraStatus,
    isLoading: isCameraStatusLoading,
  } = useSWR<CameraStatus[]>(
    isAuthenticated ? "dashboard:camera-status" : null,
    () => api.getCameraStatus(),
    {
      refreshInterval: 30000,
      dedupingInterval: 15000,
      revalidateOnFocus: true,
    }
  );

  // 7. Today's Staff Schedule
  const {
    data: scheduleData,
    mutate: mutateSchedule,
    isLoading: isScheduleLoading,
  } = useSWR(
    isAuthenticated ? ["dashboard:today-schedule", today] : null,
    () => api.getScheduleAssignments({ from: today, to: today }),
    {
      refreshInterval: 60000,
      dedupingInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  // 8. Notifications
  const {
    data: notifData,
    mutate: mutateNotifs,
    isLoading: isNotifsLoading,
  } = useSWR(
    isAuthenticated ? "dashboard:notifications" : null,
    () => api.getNotifications({ limit: 5 }),
    {
      refreshInterval: 30000,
      dedupingInterval: 10000,
      revalidateOnFocus: true,
    }
  );

  const stats = statsData ?? null;
  const borrowStats = borrowStatsData ?? null;
  const activeBorrows = activeBorrowsData ?? [];
  const recentLogs: AccessLogPublic[] = recentLogsData?.items
    ? recentLogsData.items.slice(0, 6)
    : Array.isArray(recentLogsData)
    ? recentLogsData.slice(0, 6)
    : [];
  const hourlyLogs: AccessLogPublic[] = hourlyLogsData?.items ?? [];
  const cameraStatuses = cameraStatusData ?? [];
  const todaySchedule: StaffScheduleAssignment[] = scheduleData?.items ?? [];
  const notifications: Notification[] = notifData?.items ?? [];

  // Initial loading only while core metrics are still unresolved
  const loading = (isStatsLoading && !statsData) && (isBorrowStatsLoading && !borrowStatsData);

  const logsLoading = isRecentLogsLoading && !recentLogsData;
  const hourlyLoading = isHourlyLogsLoading && !hourlyLogsData;
  const camerasLoading = isCameraStatusLoading && !cameraStatusData;
  const borrowsLoading = (isBorrowStatsLoading && !borrowStatsData) || (isActiveBorrowsLoading && !activeBorrowsData);
  const scheduleLoading = isScheduleLoading && !scheduleData;
  const notifsLoading = isNotifsLoading && !notifData;

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setError("");
      await Promise.allSettled([
        mutateStats(),
        mutateBorrowStats(),
        mutateActiveBorrows(),
        mutateRecentLogs(),
        mutateHourlyLogs(),
        mutateCameraStatus(),
        mutateSchedule(),
        mutateNotifs(),
      ]);
    } catch {
      setError("Không thể tải dữ liệu tổng quan.");
    }
  }, [
    isAuthenticated,
    mutateStats,
    mutateBorrowStats,
    mutateActiveBorrows,
    mutateRecentLogs,
    mutateHourlyLogs,
    mutateCameraStatus,
    mutateSchedule,
    mutateNotifs,
  ]);

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
    logsLoading,
    hourlyLoading,
    camerasLoading,
    borrowsLoading,
    scheduleLoading,
    notifsLoading,
    error,
    refresh,
  };
}
