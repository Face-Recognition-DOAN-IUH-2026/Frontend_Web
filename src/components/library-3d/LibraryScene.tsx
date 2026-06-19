"use client";

import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import type { BookData, ShelfData } from "./types";
import ShelfModel from "./ShelfModel";
import { useCameraAnimation } from "./hooks/useCameraAnimation";

interface LibrarySceneProps {
  shelves: ShelfData[];
  selectedBook: BookData | null;
  flyToTarget: [number, number, number] | null;
  onBookSelect: (book: BookData) => void;
}

function SceneContent({ shelves, onBookSelect, flyToTarget }: Omit<LibrarySceneProps, "selectedBook">) {
  const controlsRef = useRef<OrbitControlsType>(null);

  useCameraAnimation(controlsRef, flyToTarget);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[-3, 5, -2]} intensity={0.3} />
      <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.1} />
      <gridHelper args={[30, 30, "#444444", "#222222"]} />

      {shelves.map((shelf) => (
        <ShelfModel key={shelf.id} data={shelf} onBookClick={onBookSelect} />
      ))}
    </>
  );
}

export default function LibraryScene(props: LibrarySceneProps) {
  return (
    <Canvas
      camera={{ position: [8, 6, 10], fov: 50, near: 0.1, far: 50 }}
      shadows={{ enabled: true, type: THREE.PCFShadowMap }}
      style={{ width: "100vw", height: "100vh", display: "block" }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}
