"use client";

import { useRef, useCallback, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export function useFloorRaycast(
  onFloorClick: (point: THREE.Vector3) => void,
  enabled: boolean = true
) {
  const { camera, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const floorPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (!enabled) return;

      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.current.setFromCamera(mouse, camera);
      const intersection = new THREE.Vector3();
      const intersected = raycaster.current.ray.intersectPlane(
        floorPlane.current,
        intersection
      );

      if (intersected) {
        onFloorClick(intersection);
      }
    },
    [camera, gl, onFloorClick, enabled]
  );

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("click", handleClick);
    return () => canvas.removeEventListener("click", handleClick);
  }, [gl, handleClick]);
}
