"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type * as THREE from "three";

interface SpeechBubbleProps {
  position?: [number, number, number];
  text: string;
  visible?: boolean;
  color?: "white" | "blue" | "green";
}

export default function SpeechBubble({
  position = [0, 2.2, 0],
  text,
  visible = true,
  color = "white",
}: SpeechBubbleProps) {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    if (group.current) {
      // Gentle floating animation
      group.current.position.y =
        position[1] + Math.sin(Date.now() * 0.002) * 0.05;
    }
  });

  if (!visible || !text) return null;

  const bgColorMap = {
    white: "bg-white",
    blue: "bg-blue-500 text-white",
    green: "bg-green-500 text-white",
  };

  return (
    <group ref={group} position={position}>
      <Html center distanceFactor={10}>
        <div
          className={`${bgColorMap[color]} rounded-xl px-4 py-2 shadow-lg max-w-xs text-sm relative`}
        >
          <div
            className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent ${
              color === "white"
                ? "border-t-white"
                : color === "blue"
                ? "border-t-blue-500"
                : "border-t-green-500"
            }`}
          />
          {text}
        </div>
      </Html>
    </group>
  );
}
