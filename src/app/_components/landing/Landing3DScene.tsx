"use client";

import { Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Box } from "@mui/material";
import Book3D from "./Book3D";
import Bookshelf3D from "./Bookshelf3D";
function FloatingParticles() {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const count = 300;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palette = [
      new THREE.Color(0x1A73E8),
      new THREE.Color(0xE6A817),
      new THREE.Color(0xffffff),
    ];

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15 - 3;
      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return [pos, col];
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.02;
    pointsRef.current.rotation.x += delta * 0.008;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.7}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function CameraRig() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    state.camera.position.x = Math.sin(t * 0.1) * 0.5;
    state.camera.position.y = Math.cos(t * 0.08) * 0.3;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

const books = [
  { pos: [-3.5, 1.5, -2] as [number, number, number], rot: [0.1, 0.3, -0.1] as [number, number, number], color: "#1A73E8", scale: 0.9, floatSpeed: 0.8 },
  { pos: [3.8, 0.5, -3] as [number, number, number], rot: [-0.05, -0.2, 0.15] as [number, number, number], color: "#E6A817", scale: 0.7, floatSpeed: 1.2 },
  { pos: [-1.5, -1, -1.5] as [number, number, number], rot: [0.2, 0.5, 0] as [number, number, number], color: "#8B5CF6", scale: 0.8, floatSpeed: 0.6 },
  { pos: [2, 2, -4] as [number, number, number], rot: [0, -0.4, 0.1] as [number, number, number], color: "#C44E4E", scale: 0.6, floatSpeed: 1.0 },
  { pos: [-4, -0.5, -3.5] as [number, number, number], rot: [0.1, 0.2, -0.2] as [number, number, number], color: "#10B981", scale: 0.75, floatSpeed: 0.9 },
  { pos: [1, -1.8, -2] as [number, number, number], rot: [-0.1, 0.6, 0.05] as [number, number, number], color: "#3B82F6", scale: 0.65, floatSpeed: 1.1 },
  { pos: [-2.5, 2.5, -5] as [number, number, number], rot: [0.15, -0.3, -0.1] as [number, number, number], color: "#F59E0B", scale: 0.55, floatSpeed: 0.7 },
  { pos: [4.5, -1, -4] as [number, number, number], rot: [0, 0.4, 0.2] as [number, number, number], color: "#EC4899", scale: 0.6, floatSpeed: 1.3 },
  { pos: [0.5, 3, -6] as [number, number, number], rot: [0.2, -0.1, 0] as [number, number, number], color: "#14B8A6", scale: 0.5, floatSpeed: 0.5 },
  { pos: [-5, 0, -5] as [number, number, number], rot: [-0.1, 0.3, 0.1] as [number, number, number], color: "#6366F1", scale: 0.7, floatSpeed: 0.85 },
  { pos: [5.5, 1.5, -6] as [number, number, number], rot: [0.1, -0.5, -0.1] as [number, number, number], color: "#EF4444", scale: 0.55, floatSpeed: 0.95 },
  { pos: [-3, -2.5, -4.5] as [number, number, number], rot: [0.05, 0.2, 0.15] as [number, number, number], color: "#4A8C5C", scale: 0.65, floatSpeed: 1.15 },
];

function Scene() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        background: "linear-gradient(135deg, #0f172a 0%, #12151f 50%, #0f172a 100%)",
        pointerEvents: "none",
      }}
    >
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }} dpr={[1, 1.5]}>
        <fog attach="fog" args={["#0f172a", 8, 25]} />

        <ambientLight intensity={0.35} />
        <directionalLight position={[5, 8, 5]} intensity={0.7} color="#ffffff" />
        <pointLight position={[-4, 3, 2]} intensity={0.5} color="#1A73E8" distance={15} />
        <pointLight position={[4, -2, 3]} intensity={0.3} color="#E6A817" distance={12} />

        {books.map((b, i) => (
          <Book3D
            key={i}
            position={b.pos}
            rotation={b.rot}
            color={b.color}
            scale={b.scale}
            floatSpeed={b.floatSpeed}
            floatAmplitude={0.1 + Math.random() * 0.1}
            rotateSpeed={0.2 + Math.random() * 0.3}
          />
        ))}

        <Bookshelf3D position={[-6, -3, -6]} rotation={[0, 0.3, 0]} scale={1.2} shelves={4} booksPerShelf={7} />
        <Bookshelf3D position={[6, -3.5, -7]} rotation={[0, -0.25, 0]} scale={1.0} shelves={3} booksPerShelf={6} />
        <Bookshelf3D position={[0, -4, -9]} rotation={[0, 0, 0]} scale={1.4} shelves={5} booksPerShelf={8} />

        <FloatingParticles />
        <CameraRig />
      </Canvas>
    </div>
  );
}

export default function Landing3DScene() {
  return (
    <Suspense fallback={
      <Box sx={{ width: "100vw", height: "100vh", bgcolor: "#0f172a" }} />
    }>
      <Scene />
    </Suspense>
  );
}
