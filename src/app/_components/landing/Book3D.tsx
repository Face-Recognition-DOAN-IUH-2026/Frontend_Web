"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Book3DProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  scale?: number;
  floatSpeed?: number;
  floatAmplitude?: number;
  rotateSpeed?: number;
}

const COVER_COLORS = [
  "#1A73E8", // Blue
  "#4A8C5C", // Green
  "#C44E4E", // Red
  "#E6A817", // Gold
  "#8B5CF6", // Violet
  "#F59E0B", // Amber
  "#3B82F6", // Light Blue
  "#10B981", // Emerald
];

export default function Book3D({
  position,
  rotation = [0, 0, 0],
  color,
  scale = 1,
  floatSpeed = 1,
  floatAmplitude = 0.15,
  rotateSpeed = 0.3,
}: Book3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const initialY = useRef(position[1]);

  const coverColor = useMemo(() => color || COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)], [color]);

  const materials = useMemo(() => {
    const coverMat = new THREE.MeshStandardMaterial({
      color: coverColor,
      roughness: 0.4,
      metalness: 0.1,
    });
    const spineMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(coverColor).multiplyScalar(0.7),
      roughness: 0.5,
      metalness: 0.05,
    });
    const pageMat = new THREE.MeshStandardMaterial({
      color: 0xF5F5F0,
      roughness: 0.8,
      metalness: 0,
    });

    return [
      pageMat,   // right (pages edge)
      spineMat,  // left (spine)
      pageMat,   // top (pages edge)
      pageMat,   // bottom (pages edge)
      coverMat,  // front cover
      spineMat,  // back cover
    ];
  }, [coverColor]);

  // Clean up materials to prevent WebGL memory leaks
  useEffect(() => {
    return () => {
      materials.forEach((mat) => mat.dispose());
    };
  }, [materials]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.position.y = initialY.current + Math.sin(t * floatSpeed + position[0]) * floatAmplitude;
    meshRef.current.rotation.y += rotateSpeed * 0.003;
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      scale={scale}
      material={materials}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1.2, 1.8, 0.25]} />
    </mesh>
  );
}
