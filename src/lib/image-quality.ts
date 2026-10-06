/**
 * Kiểm tra chất lượng ảnh chụp từng góc (client-side quality gate).
 * Mục tiêu: ảnh mờ/thiếu sáng bị chặn ngay tại góc đó, không cho qua bước
 * kế tiếp — tránh phải chụp lại hàng loạt ở cuối như trước.
 *
 * Thuật toán:
 * - Độ nét: phương sai Laplacian (variance of Laplacian) trên ảnh xám.
 *   Ảnh nét có nhiều biên → phương sai cao; ảnh mờ/nhòe → thấp.
 * - Độ sáng: giá trị trung bình kênh sáng, chặn quá tối / cháy sáng.
 */

export const QUALITY_THRESHOLDS = {
  /** Phương sai Laplacian tối thiểu (ảnh webcam 640px). Tăng nếu lọt ảnh mờ. */
  blur: 80,
  /** Độ sáng trung bình tối thiểu (0-255). */
  minBrightness: 40,
  /** Độ sáng trung bình tối đa (0-255). */
  maxBrightness: 220,
};

export interface QualityMetrics {
  blurVariance: number;
  brightness: number;
}

export interface QualityVerdict {
  ok: boolean;
  reason: string | null;
}

/**
 * Phương sai của Laplacian (kernel 4-neighbour) trên mảng xám row-major.
 */
export function varianceOfLaplacian(
  gray: ArrayLike<number>,
  width: number,
  height: number
): number {
  if (width < 3 || height < 3 || gray.length < width * height) return 0;
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  const at = (x: number, y: number) => gray[y * width + x];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const lap = 4 * at(x, y) - at(x - 1, y) - at(x + 1, y) - at(x, y - 1) - at(x, y + 1);
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

/** Độ sáng trung bình 0-255. */
export function meanBrightness(
  gray: ArrayLike<number>,
  width: number,
  height: number
): number {
  const total = Math.min(gray.length, width * height);
  if (total === 0) return 0;
  let sum = 0;
  for (let i = 0; i < total; i++) sum += gray[i];
  return sum / total;
}

/** Kết luận đạt/không đạt kèm lý do tiếng Việt cho thủ thư. */
export function assessCaptureQuality(metrics: QualityMetrics): QualityVerdict {
  if (metrics.blurVariance < QUALITY_THRESHOLDS.blur) {
    return {
      ok: false,
      reason: "Ảnh bị mờ, vui lòng giữ yên điện thoại và chụp lại",
    };
  }
  if (metrics.brightness < QUALITY_THRESHOLDS.minBrightness) {
    return {
      ok: false,
      reason: "Ảnh quá tối, vui lòng chụp ở nơi đủ sáng",
    };
  }
  if (metrics.brightness > QUALITY_THRESHOLDS.maxBrightness) {
    return {
      ok: false,
      reason: "Ảnh bị cháy sáng, vui lòng tránh ngược sáng",
    };
  }
  return { ok: true, reason: null };
}
