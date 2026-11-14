import { renderHook, waitFor } from "@testing-library/react";
import { fetchDashboardData, useDashboardData } from "@/hooks/useDashboardData";
import api from "@/lib/api-client";

jest.mock("@/lib/api-client");
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { id: "user-1", email: "admin@iuh.edu.vn", role: "admin" },
  }),
}));

describe("useDashboardData & fetchDashboardData", () => {
  const mockStats = { total_patrons: 100, active_patrons: 10, today_entries: 50, today_exits: 40 };
  const mockBorrowStats = { total: 20, active: 5, overdue: 1 };
  const mockRecentLogs = { items: [{ id: "l1", patron_id: "p1", access_time: "2026-11-14T08:00:00Z" }], total: 1 };
  const mockHourlyLogs = { items: [{ id: "l1", access_time: "2026-11-14T08:00:00Z" }], total: 1 };
  const mockCameras = [{ camera_id: "cam1", connected: true, running: true }];
  const mockBorrows = [{ id: "b1", book_id: "bk1" }];
  const mockSchedule = { items: [{ id: "s1", staff_id: "st1" }], total: 1 };
  const mockNotifs = { items: [{ id: "n1", title: "Test" }], total: 1 };

  beforeEach(() => {
    jest.clearAllMocks();
    (api.getStats as jest.Mock).mockResolvedValue(mockStats);
    (api.getBorrowStats as jest.Mock).mockResolvedValue(mockBorrowStats);
    (api.getRecentLogs as jest.Mock).mockResolvedValue(mockRecentLogs);
    (api.getAccessLogs as jest.Mock).mockResolvedValue(mockHourlyLogs);
    (api.getCameraStatus as jest.Mock).mockResolvedValue(mockCameras);
    (api.getAllActiveBorrows as jest.Mock).mockResolvedValue(mockBorrows);
    (api.getScheduleAssignments as jest.Mock).mockResolvedValue(mockSchedule);
    (api.getNotifications as jest.Mock).mockResolvedValue(mockNotifs);
  });

  describe("fetchDashboardData", () => {
    it("fetches all dashboard data and formats snapshot correctly", async () => {
      const snap = await fetchDashboardData();
      expect(snap.stats).toEqual(mockStats);
      expect(snap.borrowStats).toEqual(mockBorrowStats);
      expect(snap.cameraStatuses).toEqual(mockCameras);
      expect(snap.activeBorrows).toEqual(mockBorrows);
      expect(snap.recentLogs).toHaveLength(1);
      expect(snap.todaySchedule).toHaveLength(1);
    });

    it("handles partial endpoint failures gracefully", async () => {
      (api.getCameraStatus as jest.Mock).mockRejectedValue(new Error("Camera service offline"));
      const snap = await fetchDashboardData();
      expect(snap.stats).toEqual(mockStats);
      expect(snap.cameraStatuses).toEqual([]);
    });
  });

  describe("useDashboardData hook", () => {
    it("returns data and granular loading flags once resolved", async () => {
      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.stats).toEqual(mockStats);
      });

      expect(result.current.borrowStats).toEqual(mockBorrowStats);
      expect(result.current.loading).toBe(false);
      expect(result.current.logsLoading).toBe(false);
      expect(result.current.camerasLoading).toBe(false);
    });
  });
});

