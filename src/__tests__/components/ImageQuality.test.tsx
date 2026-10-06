import {
  varianceOfLaplacian,
  meanBrightness,
  assessCaptureQuality,
  QUALITY_THRESHOLDS,
} from "@/lib/image-quality";

describe("image-quality (cổng kiểm tra ảnh từng góc)", () => {
  describe("varianceOfLaplacian", () => {
    it("ảnh nét (biên rõ) cho điểm cao", () => {
      // Checkerboard 8x8: biên mạnh mọi nơi
      const w = 8;
      const h = 8;
      const gray: number[] = [];
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) gray.push((x + y) % 2 === 0 ? 0 : 255);
      expect(varianceOfLaplacian(gray, w, h)).toBeGreaterThan(QUALITY_THRESHOLDS.blur);
    });

    it("ảnh mờ (màu phẳng) cho điểm thấp", () => {
      const gray = new Array(8 * 8).fill(128);
      expect(varianceOfLaplacian(gray, 8, 8)).toBeLessThan(QUALITY_THRESHOLDS.blur);
    });

    it("gradient mượt (mờ nhòe) cho điểm thấp", () => {
      const w = 16;
      const h = 16;
      const gray: number[] = [];
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) gray.push(Math.round(((x + y) / (w + h)) * 255));
      expect(varianceOfLaplacian(gray, w, h)).toBeLessThan(QUALITY_THRESHOLDS.blur);
    });
  });

  describe("meanBrightness", () => {
    it("tính đúng độ sáng trung bình", () => {
      expect(meanBrightness([0, 0, 0, 0], 2, 2)).toBe(0);
      expect(meanBrightness([255, 255, 255, 255], 2, 2)).toBe(255);
      expect(meanBrightness([0, 100, 100, 200], 2, 2)).toBe(100);
    });
  });

  describe("assessCaptureQuality", () => {
    it("đạt khi nét và đủ sáng", () => {
      expect(
        assessCaptureQuality({ blurVariance: QUALITY_THRESHOLDS.blur + 50, brightness: 120 }).ok
      ).toBe(true);
    });

    it("rớt khi mờ kèm lý do tiếng Việt", () => {
      const r = assessCaptureQuality({ blurVariance: 5, brightness: 120 });
      expect(r.ok).toBe(false);
      expect(r.reason).toMatch(/mờ/);
    });

    it("rớt khi quá tối hoặc quá sáng", () => {
      expect(assessCaptureQuality({ blurVariance: 500, brightness: 10 }).ok).toBe(false);
      expect(assessCaptureQuality({ blurVariance: 500, brightness: 250 }).ok).toBe(false);
      expect(
        assessCaptureQuality({ blurVariance: 500, brightness: 10 }).reason
      ).toMatch(/tối/);
    });
  });
});
