import { startOfWeek, getWeekDays, toDateInput, formatDateRange } from "@/hooks/useScheduleData";

describe("useScheduleData utilities", () => {
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
});
