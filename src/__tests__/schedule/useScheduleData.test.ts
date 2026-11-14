import { startOfWeek, getWeekDays, toDateInput, formatDateRange, fetchScheduleData } from "@/hooks/useScheduleData";
import api from "@/lib/api-client";

jest.mock("@/lib/api-client");

describe("useScheduleData utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe("startOfWeek", () => {
    it("returns Monday for a Wednesday", () => {
      const wed = new Date(2026, 6, 1);
      const result = startOfWeek(wed);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(29);
      expect(result.getMonth()).toBe(5);
    });

    it("returns Monday for a Sunday", () => {
      const sun = new Date(2026, 5, 28);
      const result = startOfWeek(sun);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(22);
    });

    it("returns same date when input is Monday", () => {
      const mon = new Date(2026, 5, 29);
      const result = startOfWeek(mon);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(29);
    });
  });

  describe("getWeekDays", () => {
    it("returns 7 days starting from anchor", () => {
      const monday = new Date(2026, 5, 29);
      const days = getWeekDays(monday);
      expect(days).toHaveLength(7);
      expect(days[0].getDay()).toBe(1);
      expect(days[6].getDay()).toBe(0);
      expect(days[6].getDate()).toBe(5);
    });
  });

  describe("toDateInput", () => {
    it("formats date as YYYY-MM-DD", () => {
      const date = new Date(2026, 6, 1);
      expect(toDateInput(date)).toBe("2026-07-01");
    });

    it("pads month and day with zeros", () => {
      const date = new Date(2026, 0, 5);
      expect(toDateInput(date)).toBe("2026-01-05");
    });
  });

  describe("formatDateRange", () => {
    it("formats 7-day range with vietnamese locale", () => {
      const days = getWeekDays(new Date(2026, 5, 29));
      const result = formatDateRange(days);
      expect(result).toContain("—");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("fetchScheduleData", () => {
    it("fetches staff, zones, shifts, and assignments in parallel for admin", async () => {
      (api.getScheduleStaffOptions as jest.Mock).mockResolvedValue([
        { id: "s1", role: "admin" },
        { id: "s2", role: "patron" },
      ]);
      (api.getScheduleZones as jest.Mock).mockResolvedValue([
        { id: "z1", isActive: true },
        { id: "z2", isActive: false },
      ]);
      (api.getScheduleShifts as jest.Mock).mockResolvedValue([
        { id: "sh1", isActive: true },
        { id: "sh2", isActive: false },
      ]);
      (api.getScheduleAssignments as jest.Mock).mockResolvedValue({
        items: [{ id: "a1", staffId: "s1" }],
        total: 1,
      });

      const res = await fetchScheduleData("2026-07-01", "2026-07-07", true);
      expect(res.staff).toHaveLength(1);
      expect(res.staff[0].id).toBe("s1");
      expect(res.zones).toHaveLength(1);
      expect(res.zones[0].id).toBe("z1");
      expect(res.shifts).toHaveLength(1);
      expect(res.shifts[0].id).toBe("sh1");
      expect(res.assignments).toHaveLength(1);
    });
  });
});
