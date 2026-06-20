"use client";

import { useRef, useCallback, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useKeyboardControls } from "./useKeyboardControls";
import { useFloorRaycast } from "./useFloorRaycast";
import { PathfindingGrid } from "../utils/PathfindingGrid";

export type MovementState = "idle" | "walking" | "sitting";

interface RobotMovementOptions {
  walkSpeed: number;
  runSpeed: number;
  rotationSpeed: number;
  arriveThreshold: number;
  pathfindingThreshold: number;
  autoSitDelay: number; // ms
  shelves: Array<{ position: [number, number, number] }>;
}

const DEFAULT_OPTIONS: RobotMovementOptions = {
  walkSpeed: 2.0,
  runSpeed: 4.0,
  rotationSpeed: 5.0,
  arriveThreshold: 0.1,
  pathfindingThreshold: 1.0,
  autoSitDelay: 30000,
  shelves: [],
};

export function useRobotMovement(
  groupRef: React.RefObject<THREE.Group | null>,
  options: Partial<RobotMovementOptions> = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const keys = useKeyboardControls();

  // State
  const position = useRef(new THREE.Vector3(0, 0, 8));
  const targetPosition = useRef(new THREE.Vector3(0, 0, 8));
  const velocity = useRef(new THREE.Vector3());
  const currentPath = useRef<THREE.Vector3[]>([]);
  const pathIndex = useRef(0);

  const movementState = useRef<MovementState>("idle");
  const lastMovementTime = useRef(Date.now());
  const clickTarget = useRef<THREE.Vector3 | null>(null);

  // Pathfinding grid
  const pathfindingGrid = useRef<PathfindingGrid | null>(null);

  // Initialize pathfinding grid
  useEffect(() => {
    pathfindingGrid.current = new PathfindingGrid(opts.shelves);
  }, [opts.shelves]);

  // Handle floor click for movement
  const handleFloorClick = useCallback(
    (point: THREE.Vector3) => {
      if (!pathfindingGrid.current) return;

      // Clamp to floor bounds
      const clampedPoint = new THREE.Vector3(
        Math.max(-14, Math.min(14, point.x)),
        0,
        Math.max(-9, Math.min(9, point.z))
      );

      const distance = position.current.distanceTo(clampedPoint);

      // Store click target for facing direction
      clickTarget.current = clampedPoint.clone();

      // Use pathfinding if far enough
      if (distance > opts.pathfindingThreshold) {
        const path = pathfindingGrid.current.findPath(position.current, clampedPoint);
        if (path.length > 0) {
          currentPath.current = path;
          pathIndex.current = 1; // Start from second point (first is current position)
          targetPosition.current = path[path.length - 1];
          movementState.current = "walking";
        }
      } else {
        // Direct movement
        targetPosition.current.copy(clampedPoint);
        currentPath.current = [clampedPoint.clone()];
        pathIndex.current = 0;
        movementState.current = "walking";
      }

      lastMovementTime.current = Date.now();
    },
    [opts.pathfindingThreshold]
  );

  useFloorRaycast(handleFloorClick);

  // Keyboard movement
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const { forward, backward, left, right, run } = keys.current;
    const isMovingKeys = forward || backward || left || right;

    if (isMovingKeys) {
      // Calculate movement direction from keys
      const direction = new THREE.Vector3();

      if (forward) direction.z -= 1;
      if (backward) direction.z += 1;
      if (left) direction.x -= 1;
      if (right) direction.x += 1;

      direction.normalize();

      // Store click target for facing direction (keyboard movement faces walk direction)
      clickTarget.current = position.current.clone().add(direction.clone().multiplyScalar(10));

      // Apply movement
      const speed = run ? opts.runSpeed : opts.walkSpeed;
      const movement = direction.multiplyScalar(speed * delta);

      const newPos = position.current.clone().add(movement);

      // Clamp to bounds
      newPos.x = Math.max(-14, Math.min(14, newPos.x));
      newPos.z = Math.max(-9, Math.min(9, newPos.z));

      // Check pathfinding grid for obstacles
      if (pathfindingGrid.current && !pathfindingGrid.current.isWalkable(
        pathfindingGrid.current.worldToGridX(newPos.x),
        pathfindingGrid.current.worldToGridZ(newPos.z)
      )) {
        // Try sliding along axes
        const slideX = position.current.clone();
        slideX.x = newPos.x;
        if (pathfindingGrid.current.isWalkable(
          pathfindingGrid.current.worldToGridX(slideX.x),
          pathfindingGrid.current.worldToGridZ(slideX.z)
        )) {
          position.current.copy(slideX);
        }

        const slideZ = position.current.clone();
        slideZ.z = newPos.z;
        if (pathfindingGrid.current.isWalkable(
          pathfindingGrid.current.worldToGridX(slideZ.x),
          pathfindingGrid.current.worldToGridZ(slideZ.z)
        )) {
          position.current.copy(slideZ);
        }
      } else {
        position.current.copy(newPos);
      }

      // Rotate to face movement direction
      const targetRotation = Math.atan2(direction.x, direction.z);
      const currentRotation = groupRef.current.rotation.y;
      const rotationDiff = targetRotation - currentRotation;

      // Smooth rotation
      const smoothRotation = THREE.MathUtils.lerp(
        currentRotation,
        currentRotation + rotationDiff,
        opts.rotationSpeed * delta
      );
      groupRef.current.rotation.y = smoothRotation;

      movementState.current = "walking";
      lastMovementTime.current = Date.now();
    } else if (currentPath.current.length > 0 && pathIndex.current < currentPath.current.length) {
      // Follow pathfinding path
      const target = currentPath.current[pathIndex.current];
      const direction = target.clone().sub(position.current);
      const distance = direction.length();

      if (distance < opts.arriveThreshold) {
        pathIndex.current++;
        if (pathIndex.current >= currentPath.current.length) {
          currentPath.current = [];
          movementState.current = "idle";
        }
      } else {
        direction.normalize();
        const speed = opts.walkSpeed * delta;
        const movement = direction.multiplyScalar(Math.min(speed, distance));
        position.current.add(movement);

        // Always face toward the click target (final destination)
        const faceTarget = clickTarget.current || target;
        const faceDir = faceTarget.clone().sub(position.current);
        const targetRotation = Math.atan2(faceDir.x, faceDir.z);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          groupRef.current.rotation.y,
          targetRotation,
          opts.rotationSpeed * delta
        );

        lastMovementTime.current = Date.now();
      }
    } else if (movementState.current === "walking") {
      // Arrived at target
      movementState.current = "idle";
    }

    // Auto-sit after idle delay
    if (movementState.current === "idle" && Date.now() - lastMovementTime.current > opts.autoSitDelay) {
      movementState.current = "sitting";
    }

    // Update group position
    groupRef.current.position.copy(position.current);
  });

  return {
    position,
    targetPosition,
    movementState,
    setMovementState: (state: MovementState) => {
      movementState.current = state;
      if (state !== "idle") {
        lastMovementTime.current = Date.now();
      }
    },
    setPosition: (pos: THREE.Vector3) => {
      position.current.copy(pos);
      targetPosition.current.copy(pos);
      if (groupRef.current) {
        groupRef.current.position.copy(pos);
      }
    },
  };
}
