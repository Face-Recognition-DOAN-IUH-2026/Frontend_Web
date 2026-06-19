"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { BookData } from "./types";

interface BookModelProps {
  data: BookData;
  position: [number, number, number];
  onClick: (book: BookData) => void;
}

const COLORS = {
  available: "#22c55e",
  borrowed: "#ef4444",
  hover: "#eab308",
};

export default function BookModel({ data, position, onClick }: BookModelProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const scaleRef = useRef(1);

  useFrame(() => {
    if (clicked) {
      scaleRef.current += (1.15 - scaleRef.current) * 0.15;
      if (Math.abs(scaleRef.current - 1.15) < 0.01) {
        setTimeout(() => setClicked(false), 150);
      }
    } else {
      scaleRef.current += (1 - scaleRef.current) * 0.1;
    }
    if (meshRef.current) {
      meshRef.current.scale.setScalar(scaleRef.current);
    }
  });

  const color = hovered ? COLORS.hover : COLORS[data.status];

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onPointerDown={(e) => {
          e.stopPropagation();
          setClicked(true);
          onClick(data);
        }}
        castShadow
      >
        <boxGeometry args={[0.2, 0.5, 0.3]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {hovered && (
        <Text
          position={[0, 0.45, 0]}
          fontSize={0.06}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.01}
          outlineColor="black"
        >
          {data.title}
        </Text>
      )}
    </group>
  );
}
