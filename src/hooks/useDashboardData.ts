"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

interface DashboardSnapshot {
  stats: StatsResponse | null;
  recentLogs: AccessLogPublic[];
  hourlyLogs: AccessLogPublic[];
  cameraStatuses: CameraStatus[];
  borrowStats: { total: number; active: number; overdue: number } | null;
  activeBorrows: BorrowRecord[];
  todaySchedule: StaffScheduleAssignment[];
  notifications: Notification[];
}

const CACHE_KEY = "dashboard:data";

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

function applySnapshot(snap: DashboardSnapshot, setters: {
  setStats: (v: StatsResponse | null) => void;
  setRecentLogs: (v: AccessLogPublic[]) => void;
  setHourlyLogs: (v: AccessLogPublic[]) => void;
  setCameraStatuses: (v: CameraStatus[]) => void;
  setBorrowStats: (v: { total: number; active: number; overdue: number } | null) => void;
  setActiveBorrows: (v: BorrowRecord[]) => void;
  setTodaySchedule: (v: StaffScheduleAssignment[]) => void;
  setNotifications: (v: Notification[]) => void;
}) {
  console.log("[Dashboard] applySnapshot:", {
    stats: snap.stats ? `${snap.stats.total_patrons} patrons` : null,
    recentLogs: snap.recentLogs.length,
    hourlyLogs: snap.hourlyLogs.length,
    cameraStatuses: snap.cameraStatuses.length,
    borrowStats: snap.borrowStats,
    activeBorrows: snap.activeBorrows.length,
    todaySchedule: snap.todaySchedule.length,
    notifications: snap.notifications.length,
  });
  setters.setStats(snap.stats);
  setters.setRecentLogs(snap.recentLogs);
  setters.setHourlyLogs(snap.hourlyLogs);
  setters.setCameraStatuses(snap.cameraStatuses);
  setters.setBorrowStats(snap.borrowStats);
  setters.setActiveBorrows(snap.activeBorrows);
  setters.setTodaySchedule(snap.todaySchedule);
  setters.setNotifications(snap.notifications);
}

const fetchDashboardData = async (): Promise<DashboardSnapshot> => {
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
    recentLogs: recentResult.status === "fulfilled" ? recentResult.value.items.slice(0, 6) : [],
    hourlyLogs: hourlyResult.status === "fulfilled" ? hourlyResult.value.items : [],
    cameraStatuses: cameraResult.status === "fulfilled" ? cameraResult.value : [],
    borrowStats: borrowStatsResult.status === "fulfilled" ? borrowStatsResult.value : null,
    activeBorrows: borrowsResult.status === "fulfilled" ? borrowsResult.value : [],
    todaySchedule: scheduleResult.status === "fulfilled" ? scheduleResult.value.items : [],
    notifications: notifResult.status === "fulfilled" ? notifResult.value.items : [],
  };
};

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
  const mountedRef = useRef(true);

  const setters = { setStats, setRecentLogs, setHourlyLogs, setCameraStatuses, setBorrowStats, setActiveBorrows, setTodaySchedule, setNotifications };

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  const { data: cachedData, mutate } = useSWR<DashboardSnapshot>(
    isAuthenticated ? CACHE_KEY : null,
    fetchDashboardData,
    {
      refreshInterval: 30000,
      dedupingInterval: 5000,
      revalidateOnFocus: true,
      onSuccess: (data) => {
        console.log("[Dashboard] SWR onSuccess:", data);
        if (mountedRef.current && data) {
          applySnapshot(data, setters);
          setLoading(false);
        }
      },
      onError: (err) => {
        console.error("[Dashboard] SWR onError:", err);
        if (mountedRef.current) {
          setError("Không thể tải dữ liệu tổng quan.");
          setLoading(false);
        }
      },
    }
  );

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setError("");
      await mutate();
    } catch {
      if (mountedRef.current) setError("Không thể tải dữ liệu tổng quan.");
    }
  }, [isAuthenticated, mutate]);

  return {
    stats, recentLogs, hourlyLogs, cameraStatuses,
    borrowStats, activeBorrows, todaySchedule, notifications,
    loading, error, refresh,
  };
}
