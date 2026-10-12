import {
  calculateEAR,
  estimateHeadPose,
  PassiveMotionDetector,
  type LandmarkPoint,
} from "@/lib/liveness/passive-motion-detector";

// Helper to generate a realistic synthetic 3D face mesh (478 points)
function generateSyntheticFace(options?: {
  eyeOpen?: number; // 0 (closed) to 1 (open)
  yaw?: number;
  pitch?: number;
  roll?: number;
  offsetX?: number;
  offsetY?: number;
}): LandmarkPoint[] {
  const eyeOpen = options?.eyeOpen ?? 0.3;
  const offsetX = options?.offsetX ?? 0;
  const offsetY = options?.offsetY ?? 0;
  const yaw = options?.yaw ?? 0;
  const pitch = options?.pitch ?? 0;

  const points: LandmarkPoint[] = Array.from({ length: 478 }, (_, i) => ({
    x: 0.5 + offsetX + (i % 20) * 0.01,
    y: 0.5 + offsetY + Math.floor(i / 20) * 0.01,
    z: 0.0,
  }));

  // Left eye key landmarks (33, 160, 158, 133, 153, 144)
  points[33] = { x: 0.4 + offsetX, y: 0.4 + offsetY, z: -0.02 };
  points[133] = { x: 0.46 + offsetX, y: 0.4 + offsetY, z: -0.02 };
  points[160] = { x: 0.42 + offsetX, y: 0.4 - eyeOpen * 0.03 + offsetY, z: -0.02 };
  points[158] = { x: 0.44 + offsetX, y: 0.4 - eyeOpen * 0.03 + offsetY, z: -0.02 };
  points[144] = { x: 0.42 + offsetX, y: 0.4 + eyeOpen * 0.03 + offsetY, z: -0.02 };
  points[153] = { x: 0.44 + offsetX, y: 0.4 + eyeOpen * 0.03 + offsetY, z: -0.02 };

  // Right eye key landmarks (362, 385, 387, 263, 373, 380)
  points[362] = { x: 0.54 + offsetX, y: 0.4 + offsetY, z: -0.02 };
  points[263] = { x: 0.6 + offsetX, y: 0.4 + offsetY, z: -0.02 };
  points[385] = { x: 0.56 + offsetX, y: 0.4 - eyeOpen * 0.03 + offsetY, z: -0.02 };
  points[387] = { x: 0.58 + offsetX, y: 0.4 - eyeOpen * 0.03 + offsetY, z: -0.02 };
  points[380] = { x: 0.56 + offsetX, y: 0.4 + eyeOpen * 0.03 + offsetY, z: -0.02 };
  points[373] = { x: 0.58 + offsetX, y: 0.4 + eyeOpen * 0.03 + offsetY, z: -0.02 };

  // Nose tip (4) — sticks out along z-axis for 3D face
  points[4] = {
    x: 0.5 + offsetX + yaw * 0.05,
    y: 0.5 + offsetY + pitch * 0.05,
    z: -0.08,
  };

  // Forehead (10)
  points[10] = { x: 0.5 + offsetX, y: 0.3 + offsetY, z: -0.01 };
  // Chin (152)
  points[152] = { x: 0.5 + offsetX, y: 0.7 + offsetY, z: -0.01 };
  // Left cheek (234)
  points[234] = { x: 0.3 + offsetX, y: 0.5 + offsetY, z: 0.03 };
  // Right cheek (454)
  points[454] = { x: 0.7 + offsetX, y: 0.5 + offsetY, z: 0.03 };

  return points;
}

describe("PassiveMotionDetector & Geometric Liveness Utilities", () => {
  describe("calculateEAR", () => {
    it("tính toán EAR mắt mở cao hơn khi mắt mở to và thấp khi mắt nhắm", () => {
      const openFace = generateSyntheticFace({ eyeOpen: 0.8 });
      const closedFace = generateSyntheticFace({ eyeOpen: 0.05 });

      const earOpen = calculateEAR(openFace);
      const earClosed = calculateEAR(closedFace);

      expect(earOpen).toBeGreaterThan(0.25);
      expect(earClosed).toBeLessThan(0.15);
      expect(earOpen).toBeGreaterThan(earClosed);
    });
  });

  describe("estimateHeadPose", () => {
    it("ước tính góc Yaw và Pitch thay đổi khi đầu xoay", () => {
      const neutralFace = generateSyntheticFace({ yaw: 0, pitch: 0 });
      const turnedFace = generateSyntheticFace({ yaw: 0.5, pitch: -0.2 });

      const poseNeutral = estimateHeadPose(neutralFace);
      const poseTurned = estimateHeadPose(turnedFace);

      expect(poseNeutral).toHaveProperty("yaw");
      expect(poseNeutral).toHaveProperty("pitch");
      expect(poseNeutral).toHaveProperty("roll");
      expect(Math.abs(poseTurned.yaw - poseNeutral.yaw)).toBeGreaterThan(0.01);
    });
  });

  describe("PassiveMotionDetector (Window Evaluation)", () => {
    let detector: PassiveMotionDetector;

    beforeEach(() => {
      detector = new PassiveMotionDetector({
        windowDurationMs: 1000,
        minFramesRequired: 15,
      });
    });

    it("phát hiện ẢNH TĨNH HOÀN TOÀN (Print Attack / Static Photo) -> FAIL", () => {
      const staticFace = generateSyntheticFace();
      const startTime = Date.now();

      // Giả lập 25 frames giống hệt nhau trong 1000ms
      for (let i = 0; i < 25; i++) {
        detector.feedFrame(staticFace, startTime + i * 40);
      }

      const verdict = detector.evaluate();
      expect(verdict.isLive).toBe(false);
      expect(verdict.verdict).toBe("spoof");
      expect(verdict.reasons).toContain("STATIC_PHOTO_DETECTED");
      expect(verdict.confidence).toBeLessThan(0.35);
    });

    it("phát hiện ẢNH MÀN HÌNH ĐIỆN THOẠI DI CHUYỂN PHẲNG 2D (Planar Motion Attack) -> FAIL", () => {
      const startTime = Date.now();

      // Giả lập ảnh bị cầm lắc tay: tất cả điểm dịch chuyển cùng vector 2D, mắt không chớp, không có 3D parallax
      for (let i = 0; i < 25; i++) {
        const offset = Math.sin(i * 0.3) * 0.04;
        const planarFace = generateSyntheticFace({
          eyeOpen: 0.4, // Mắt mở cố định, không chớp
          offsetX: offset,
          offsetY: offset * 0.5,
          yaw: 0,
          pitch: 0,
        });
        detector.feedFrame(planarFace, startTime + i * 40);
      }

      const verdict = detector.evaluate();
      expect(verdict.isLive).toBe(false);
      expect(verdict.verdict).toBe("spoof");
      expect(verdict.reasons).toContain("PLANAR_MOTION_SPOOF_DETECTED");
    });

    it("xác thực NGƯỜI THẬT CÓ CHỚP MẮT TỰ NHIÊN (Natural Blink) -> PASS", () => {
      const startTime = Date.now();

      // Giả lập 25 frames người thật: mắt mở -> chớp nhẹ trong 4 frames -> mở lại
      for (let i = 0; i < 25; i++) {
        let eyeOpen = 0.4;
        if (i >= 10 && i <= 14) {
          eyeOpen = 0.05; // Chớp mắt
        }
        const microJitter = (Math.random() - 0.5) * 0.003;
        const realFace = generateSyntheticFace({
          eyeOpen,
          yaw: Math.sin(i * 0.1) * 0.03 + microJitter,
          pitch: Math.cos(i * 0.1) * 0.02 + microJitter,
        });
        detector.feedFrame(realFace, startTime + i * 40);
      }

      const verdict = detector.evaluate();
      expect(verdict.isLive).toBe(true);
      expect(verdict.verdict).toBe("live");
      expect(verdict.confidence).toBeGreaterThan(0.65);
      expect(verdict.metrics.earVariance).toBeGreaterThan(0.0005);
    });

    it("xác thực NGƯỜI THẬT CÓ VI CHUYỂN ĐỘNG ĐẦU 3D TỰ NHIÊN (3D Parallax & Head Movement) -> PASS", () => {
      const startTime = Date.now();

      // Người thật nhìn vào camera, đầu thở/nghiêng nhẹ tự nhiên
      for (let i = 0; i < 25; i++) {
        const t = i / 25;
        const realFace = generateSyntheticFace({
          eyeOpen: 0.38 + Math.sin(i * 0.5) * 0.04, // Vi rung mí mắt
          yaw: Math.sin(t * Math.PI) * 0.08,        // Xoay nhẹ góc nhìn
          pitch: Math.cos(t * Math.PI) * 0.05,
        });
        detector.feedFrame(realFace, startTime + i * 40);
      }

      const verdict = detector.evaluate();
      expect(verdict.isLive).toBe(true);
      expect(verdict.verdict).toBe("live");
      expect(verdict.confidence).toBeGreaterThan(0.65);
    });

    it("trả về bestFrameIndex hợp lệ", () => {
      const startTime = Date.now();
      for (let i = 0; i < 20; i++) {
        detector.feedFrame(generateSyntheticFace(), startTime + i * 50);
      }
      const verdict = detector.evaluate();
      expect(verdict.bestFrameIndex).toBeGreaterThanOrEqual(0);
      expect(verdict.bestFrameIndex).toBeLessThan(20);
    });
  });
});
