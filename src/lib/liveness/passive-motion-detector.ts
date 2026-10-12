/**
 * Passive Motion & 3D Depth Liveness Detector
 *
 * Runs client-side on Kiosk webcam stream (0-cost for server).
 * Analyzes sliding 1000ms window (~30 frames) for:
 * 1. Eye Aspect Ratio (EAR) variance (blinks & micro-twitches)
 * 2. 3D Head Pose dynamics (Yaw, Pitch, Roll variance)
 * 3. 3D Depth Parallax ratio (distinguishing 3D face curvature from flat 2D screen/print photos)
 */

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export interface HeadPose {
  yaw: number;
  pitch: number;
  roll: number;
}

export interface FrameMetrics {
  timestamp: number;
  landmarks: LandmarkPoint[];
  ear: number;
  pose: HeadPose;
  center: { x: number; y: number };
  noseZ: number;
  cheekDistance: number;
}

export interface LivenessVerdict {
  isLive: boolean;
  verdict: "live" | "spoof" | "inconclusive";
  confidence: number;
  reasons: string[];
  bestFrameIndex: number;
  metrics: {
    frameCount: number;
    earVariance: number;
    poseVariance: number;
    displacement: number;
    depthParallaxVariance: number;
  };
}

export interface PassiveDetectorOptions {
  windowDurationMs?: number;
  minFramesRequired?: number;
  earBlinkVarianceThreshold?: number;
  poseVarianceThreshold?: number;
  minPlanarDisplacement?: number;
  minDepthParallaxVariance?: number;
}

function dist2D(p1: LandmarkPoint, p2: LandmarkPoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates Eye Aspect Ratio (EAR) averaged across both eyes.
 * Landmarks (MediaPipe 468/478 index):
 * Left: 33 (corner), 133 (corner), 160, 158 (top), 144, 153 (bottom)
 * Right: 362 (corner), 263 (corner), 385, 387 (top), 380, 373 (bottom)
 */
export function calculateEAR(landmarks: LandmarkPoint[]): number {
  if (!landmarks || landmarks.length < 400) return 0.3;

  const leftWidth = dist2D(landmarks[33], landmarks[133]);
  const leftH1 = dist2D(landmarks[160], landmarks[144]);
  const leftH2 = dist2D(landmarks[158], landmarks[153]);
  const leftEAR = leftWidth > 0 ? (leftH1 + leftH2) / (2 * leftWidth) : 0.3;

  const rightWidth = dist2D(landmarks[362], landmarks[263]);
  const rightH1 = dist2D(landmarks[385], landmarks[380]);
  const rightH2 = dist2D(landmarks[387], landmarks[373]);
  const rightEAR = rightWidth > 0 ? (rightH1 + rightH2) / (2 * rightWidth) : 0.3;

  return (leftEAR + rightEAR) / 2;
}

/**
 * Estimates 3D head pose (Yaw, Pitch, Roll) using key landmarks:
 * Nose tip: 4, Forehead: 10, Chin: 152, Left cheek: 234, Right cheek: 454
 */
export function estimateHeadPose(landmarks: LandmarkPoint[]): HeadPose {
  if (!landmarks || landmarks.length < 455) {
    return { yaw: 0, pitch: 0, roll: 0 };
  }

  const nose = landmarks[4];
  const forehead = landmarks[10];
  const chin = landmarks[152];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];

  // Cheek span & face height
  const cheekSpan = dist2D(leftCheek, rightCheek) || 0.001;
  const faceHeight = dist2D(forehead, chin) || 0.001;

  // Midpoint between cheeks
  const cheekMidX = (leftCheek.x + rightCheek.x) / 2;
  // Yaw: offset of nose relative to cheek midpoint normalized by cheek span
  const yaw = (nose.x - cheekMidX) / (cheekSpan * 0.5);

  // Midpoint between forehead and chin
  const faceMidY = (forehead.y + chin.y) / 2;
  // Pitch: offset of nose relative to vertical midpoint
  const pitch = (nose.y - faceMidY) / (faceHeight * 0.5);

  // Roll: tilt angle between cheeks
  const roll = Math.atan2(rightCheek.y - leftCheek.y, rightCheek.x - leftCheek.x);

  return { yaw, pitch, roll };
}

function calculateVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / values.length;
}

export class PassiveMotionDetector {
  private windowDurationMs: number;
  private minFramesRequired: number;
  private earBlinkVarianceThreshold: number;
  private poseVarianceThreshold: number;
  private minPlanarDisplacement: number;
  private minDepthParallaxVariance: number;

  private frameBuffer: FrameMetrics[] = [];

  constructor(options?: PassiveDetectorOptions) {
    this.windowDurationMs = options?.windowDurationMs ?? 1000;
    this.minFramesRequired = options?.minFramesRequired ?? 15;
    this.earBlinkVarianceThreshold = options?.earBlinkVarianceThreshold ?? 0.0004;
    this.poseVarianceThreshold = options?.poseVarianceThreshold ?? 0.0002;
    this.minPlanarDisplacement = options?.minPlanarDisplacement ?? 0.008;
    this.minDepthParallaxVariance = options?.minDepthParallaxVariance ?? 0.0001;
  }

  public reset(): void {
    this.frameBuffer = [];
  }

  public feedFrame(landmarks: LandmarkPoint[], timestamp: number = Date.now()): void {
    if (!landmarks || landmarks.length < 468) return;

    const ear = calculateEAR(landmarks);
    const pose = estimateHeadPose(landmarks);

    // Approximate face center from nose (4) and eye midpoint
    const center = {
      x: landmarks[4].x,
      y: landmarks[4].y,
    };

    const noseZ = landmarks[4].z ?? 0;
    const cheekDistance = dist2D(landmarks[234], landmarks[454]);

    this.frameBuffer.push({
      timestamp,
      landmarks,
      ear,
      pose,
      center,
      noseZ,
      cheekDistance,
    });

    // Prune frames older than windowDurationMs
    const cutoff = timestamp - this.windowDurationMs;
    this.frameBuffer = this.frameBuffer.filter((f) => f.timestamp >= cutoff);
  }

  public getFrameCount(): number {
    return this.frameBuffer.length;
  }

  public evaluate(): LivenessVerdict {
    const count = this.frameBuffer.length;

    if (count < this.minFramesRequired) {
      return {
        isLive: false,
        verdict: "inconclusive",
        confidence: 0,
        reasons: ["INSUFFICIENT_FRAMES"],
        bestFrameIndex: Math.floor(count / 2),
        metrics: {
          frameCount: count,
          earVariance: 0,
          poseVariance: 0,
          displacement: 0,
          depthParallaxVariance: 0,
        },
      };
    }

    const ears = this.frameBuffer.map((f) => f.ear);
    const yaws = this.frameBuffer.map((f) => f.pose.yaw);
    const pitches = this.frameBuffer.map((f) => f.pose.pitch);
    const rolls = this.frameBuffer.map((f) => f.pose.roll);

    const earVariance = calculateVariance(ears);
    const yawVariance = calculateVariance(yaws);
    const pitchVariance = calculateVariance(pitches);
    const rollVariance = calculateVariance(rolls);
    const poseVariance = (yawVariance + pitchVariance + rollVariance) / 3;

    // Center displacement (across window)
    const xs = this.frameBuffer.map((f) => f.center.x);
    const ys = this.frameBuffer.map((f) => f.center.y);
    const displacement = Math.sqrt(calculateVariance(xs) + calculateVariance(ys));

    // 3D Depth parallax metric:
    // When moving, the ratio of nose-to-cheek depth vs cheek span fluctuates for 3D faces,
    // whereas for a flat 2D photo translated in plane, depth parallax remains static.
    const parallaxRatios = this.frameBuffer.map(
      (f) => (f.landmarks[4].x - f.landmarks[234].x) / (f.cheekDistance || 0.001)
    );
    const depthParallaxVariance = calculateVariance(parallaxRatios);

    const reasons: string[] = [];

    // --- CHECK 1: Static Photo Attack (Print Attack or Still Screen) ---
    // If displacement, EAR variance, and pose variance are all virtually 0:
    const isStatic = displacement < 0.001 && earVariance < 0.0001 && poseVariance < 0.00005;
    if (isStatic) {
      reasons.push("STATIC_PHOTO_DETECTED");
      return {
        isLive: false,
        verdict: "spoof",
        confidence: 0.1,
        reasons,
        bestFrameIndex: Math.floor(count / 2),
        metrics: {
          frameCount: count,
          earVariance,
          poseVariance,
          displacement,
          depthParallaxVariance,
        },
      };
    }

    // --- CHECK 2: Planar 2D Motion Spoof (Shaking a photo/phone) ---
    // Has translational movement, but zero blink variance and zero 3D parallax variation
    const isPlanarDisplacement = displacement >= this.minPlanarDisplacement;
    const isRigidZeroParallax = depthParallaxVariance < this.minDepthParallaxVariance;
    const isFixedEyes = earVariance < 0.0002;

    if (isPlanarDisplacement && isRigidZeroParallax && isFixedEyes) {
      reasons.push("PLANAR_MOTION_SPOOF_DETECTED");
      return {
        isLive: false,
        verdict: "spoof",
        confidence: 0.2,
        reasons,
        bestFrameIndex: Math.floor(count / 2),
        metrics: {
          frameCount: count,
          earVariance,
          poseVariance,
          displacement,
          depthParallaxVariance,
        },
      };
    }

    // --- CHECK 3: Real Human Live Detection ---
    let livenessScore = 0.5;

    // Blink evidence
    if (earVariance >= this.earBlinkVarianceThreshold) {
      livenessScore += 0.35;
      reasons.push("NATURAL_BLINK_VERIFIED");
    } else if (earVariance >= 0.00015) {
      livenessScore += 0.15;
      reasons.push("MICRO_EYE_MOVEMENT");
    }

    // Pose dynamics evidence
    if (poseVariance >= this.poseVarianceThreshold) {
      livenessScore += 0.3;
      reasons.push("3D_HEAD_DYNAMICS_VERIFIED");
    } else if (poseVariance >= 0.00008) {
      livenessScore += 0.15;
    }

    // 3D Parallax evidence
    if (depthParallaxVariance >= this.minDepthParallaxVariance) {
      livenessScore += 0.2;
      reasons.push("3D_DEPTH_PARALLAX_CONFIRMED");
    }

    const confidence = Math.min(0.99, Math.max(0.0, livenessScore));
    const isLive = confidence >= 0.65;

    return {
      isLive,
      verdict: isLive ? "live" : "inconclusive",
      confidence,
      reasons,
      bestFrameIndex: this.findBestFrameIndex(),
      metrics: {
        frameCount: count,
        earVariance,
        poseVariance,
        displacement,
        depthParallaxVariance,
      },
    };
  }

  /**
   * Selects the clearest, most neutral frontal frame from the buffer
   */
  private findBestFrameIndex(): number {
    if (this.frameBuffer.length === 0) return 0;
    let bestIdx = 0;
    let minDeviation = Infinity;

    for (let i = 0; i < this.frameBuffer.length; i++) {
      const p = this.frameBuffer[i].pose;
      // Prefer frontal pose (yaw near 0, pitch near 0) with open eyes (ear >= 0.22)
      const dev = Math.abs(p.yaw) * 2 + Math.abs(p.pitch) * 1.5 + Math.abs(p.roll);
      const eyeBonus = this.frameBuffer[i].ear >= 0.2 ? -0.2 : 0.5;
      const score = dev + eyeBonus;

      if (score < minDeviation) {
        minDeviation = score;
        bestIdx = i;
      }
    }
    return bestIdx;
  }
}
