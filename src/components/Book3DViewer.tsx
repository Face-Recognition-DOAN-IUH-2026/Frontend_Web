"use client";

import { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { Box, CircularProgress, Typography } from "@mui/material";

interface BookProps {
  coverUrl: string;
}

function BookModel({ coverUrl }: BookProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Use useTexture from drei which handles suspense and caching better
  // Provide a fallback if coverUrl is empty or fails
  const fallbackUrl = "https://via.placeholder.com/400x600?text=Book+Cover";
  const validUrl = coverUrl && coverUrl.startsWith("http") ? coverUrl : fallbackUrl;
  
  // Use a public image proxy that injects CORS headers to avoid WebGL cross-origin tainted canvas issues
  const proxiedUrl = validUrl.includes("via.placeholder.com") 
    ? validUrl 
    : `https://images.weserv.nl/?url=${encodeURIComponent(validUrl)}&w=400&h=600&fit=cover`;

  const coverTexture = useTexture(proxiedUrl);
  
  // Basic colors for other sides
  const pageMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.8 });
  const coverMaterial = new THREE.MeshStandardMaterial({ map: coverTexture, roughness: 0.3 });
  const backMaterial = new THREE.MeshStandardMaterial({ color: 0x1976d2, roughness: 0.4 }); // Primary color spine/back

  // Materials for BoxGeometry (right, left, top, bottom, front, back)
  const materials = [
    pageMaterial,  // right (pages edge)
    backMaterial,  // left (spine)
    pageMaterial,  // top (pages edge)
    pageMaterial,  // bottom (pages edge)
    coverMaterial, // front cover
    backMaterial,  // back cover
  ];

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} material={materials} rotation={[0, -Math.PI / 8, 0]}>
      {/* Width, Height, Depth */}
      <boxGeometry args={[2.2, 3.2, 0.4]} />
    </mesh>
  );
}

function Loader() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", flexDirection: "column", gap: 1 }}>
      <CircularProgress size={30} />
      <Typography variant="caption" color="text.secondary">Đang tải 3D...</Typography>
    </Box>
  );
}

export default function Book3DViewer({ coverUrl }: BookProps) {
  return (
    <Box sx={{ width: "100%", height: "400px", cursor: "grab", "&:active": { cursor: "grabbing" } }}>
      <Suspense fallback={<Loader />}>
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 10, 5]} intensity={0.8} />
          <spotLight position={[-5, 5, 5]} angle={0.5} penumbra={1} intensity={0.5} />
          <Environment preset="city" />
          <BookModel coverUrl={coverUrl} />
          <OrbitControls 
            enableZoom={true} 
            enablePan={false} 
            minDistance={3} 
            maxDistance={8}
            autoRotate={true}
            autoRotateSpeed={1.5}
          />
        </Canvas>
      </Suspense>
    </Box>
  );
}
