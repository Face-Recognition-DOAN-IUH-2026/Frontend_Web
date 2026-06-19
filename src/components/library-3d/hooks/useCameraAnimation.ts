"use client";

import { useEffect, useRef } from "react";
import type * as THREE from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";

export function useCameraAnimation(
  controlsRef: React.MutableRefObject<OrbitControlsType | null>,
  target: [number, number, number] | null
) {
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!target || !controlsRef.current) return;

    const controls = controlsRef.current;
    const camera = controls.object;
    const targetPos = { x: target[0], y: target[1], z: target[2] };
    const camTarget = { x: target[0] + 4, y: target[1] + 2, z: target[2] + 4 };
    const threshold = 0.05;

    function animate() {
      controls.target.lerp(targetPos, 0.06);
      camera.position.lerp(camTarget, 0.06);
      controls.update();

      const dx = camera.position.x - camTarget.x;
      const dy = camera.position.y - camTarget.y;
      const dz = camera.position.z - camTarget.z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) > threshold) {
        frameRef.current = requestAnimationFrame(animate);
      }
    }

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, controlsRef]);
}
