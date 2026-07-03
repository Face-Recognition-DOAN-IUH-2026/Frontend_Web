"use client";

import { Suspense, useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { Box, Typography } from "@mui/material";

// Mock data for the 3D visualization
const MOCK_DATA = [
  { label: "CNTT", value: 45, color: "#1976d2" },
  { label: "Kinh tế", value: 30, color: "#2e7d32" },
  { label: "Cơ khí", value: 25, color: "#ed6c02" },
  { label: "Ngoại ngữ", value: 15, color: "#9c27b0" },
  { label: "Điện tử", value: 35, color: "#d32f2f" },
  { label: "Luật", value: 20, color: "#0288d1" },
];

function Bar3D({ position, height, color, label }: { position: [number, number, number]; height: number; color: string; label: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Normalize height for display
  const displayHeight = height / 10;
  
  // Animated float effect on hover
  const targetY = hovered ? displayHeight / 2 + 0.5 : displayHeight / 2;

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.y = THREE.MathUtils.lerp(
        meshRef.current.position.y,
        targetY,
        delta * 5
      );
    }
  });

  return (
    <group position={[position[0], 0, position[2]]}>
      <mesh
        ref={meshRef}
        position={[0, displayHeight / 2, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[1, displayHeight, 1]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.2} 
          metalness={0.1}
          emissive={color}
          emissiveIntensity={hovered ? 0.5 : 0}
        />
      </mesh>
      
      {/* Label under the bar */}
      <Text
        position={[0, -0.5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.4}
        color="#333333"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
      
      {/* Value on top of the bar (only when hovered) */}
      {hovered && (
        <Text
          position={[0, displayHeight + 1, 0]}
          fontSize={0.5}
          color={color}
          anchorX="center"
          anchorY="middle"
        >
          {height}
        </Text>
      )}
    </group>
  );
}

function GridFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#f0f0f0" />
      <gridHelper args={[20, 20, "#cccccc", "#e0e0e0"]} rotation={[Math.PI / 2, 0, 0]} />
    </mesh>
  );
}

export default function DataVisualization3D() {
  return (
    <Box sx={{ width: "100%", height: 350, position: "relative", borderRadius: 2, overflow: "hidden", bgcolor: "#fafafa" }}>
      <Box sx={{ position: "absolute", top: 16, left: 16, zIndex: 1, pointerEvents: "none" }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: "bold" }}>
          TƯƠNG QUAN MƯỢN SÁCH THEO KHOA
        </Typography>
        <Typography variant="caption" color="text.disabled">
          Tương tác: Kéo thả để xoay • Cuộn để zoom • Trỏ chuột vào cột
        </Typography>
      </Box>
      <Suspense fallback={<Box sx={{ width: "100%", height: 350, bgcolor: "action.hover", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} />}>
      <Canvas shadows camera={{ position: [5, 5, 8], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1} 
          castShadow 
          shadow-mapSize-width={1024} 
          shadow-mapSize-height={1024} 
        />
        
        <GridFloor />
        
        {/* Layout bars in a circle or line */}
        <group position={[-((MOCK_DATA.length - 1) * 1.5) / 2, 0, 0]}>
          {MOCK_DATA.map((item, index) => (
            <Bar3D 
              key={item.label}
              position={[index * 1.5, 0, 0]}
              height={item.value}
              color={item.color}
              label={item.label}
            />
          ))}
        </group>

        <OrbitControls 
          enablePan={false}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2 - 0.1} // Prevent going below floor
          minDistance={3}
          maxDistance={15}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
      </Suspense>
    </Box>
  );
}
