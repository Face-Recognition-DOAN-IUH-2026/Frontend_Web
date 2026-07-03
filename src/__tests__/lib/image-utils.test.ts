import { computeDimensions } from '@/lib/image-utils';

describe('image-utils', () => {
  describe('computeDimensions', () => {
    it('returns original dimensions when within max', () => {
      const result = computeDimensions(800, 600, 1280);
      expect(result).toEqual({ width: 800, height: 600 });
    });

    it('scales down width when width exceeds max', () => {
      const result = computeDimensions(2560, 1440, 1280);
      expect(result.width).toBe(1280);
      expect(result.height).toBe(720);
    });

    it('scales down height when height exceeds max', () => {
      const result = computeDimensions(1440, 2560, 1280);
      expect(result.width).toBe(720);
      expect(result.height).toBe(1280);
    });

    it('scales down proportionally when both exceed max', () => {
      const result = computeDimensions(3840, 2160, 1280);
      expect(result.width).toBe(1280);
      expect(result.height).toBe(720);
    });

    it('handles square images', () => {
      const result = computeDimensions(2000, 2000, 1280);
      expect(result.width).toBe(1280);
      expect(result.height).toBe(1280);
    });

    it('handles small images', () => {
      const result = computeDimensions(100, 100, 1280);
      expect(result).toEqual({ width: 100, height: 100 });
    });

    it('rounds dimensions to integers', () => {
      const result = computeDimensions(1920, 1080, 1280);
      expect(Number.isInteger(result.width)).toBe(true);
      expect(Number.isInteger(result.height)).toBe(true);
    });
  });
});
