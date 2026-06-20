"use client";

import { Suspense, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import type { BookData, ShelfData } from "./types";
import type { RemoteRobot } from "./types/multiplayer";
import ShelfModel from "./ShelfModel";
import { useCameraAnimation } from "./hooks/useCameraAnimation";
import AICharacter from "./AICharacter";
import UserRobot from "./UserRobot";

interface LibrarySceneProps {
  shelves: ShelfData[];
  selectedBook: BookData | null;
  flyToTarget: [number, number, number] | null;
  onBookSelect: (book: BookData) => void;
  // AI Character props
  showCharacter?: boolean;
  characterChatState?: "idle" | "thinking" | "responding";
  characterMessage?: string;
  onCharacterClick?: () => void;
  onCharacterPositionUpdate?: (position: [number, number, number], rotation: number) => void;
  // Multiplayer
  remoteRobots?: RemoteRobot[];
}

function SceneContent({
  shelves,
  onBookSelect,
  flyToTarget,
  showCharacter = false,
  characterChatState = "idle",
  characterMessage = "",
  onCharacterClick,
  onCharacterPositionUpdate,
  remoteRobots = [],
}: Omit<LibrarySceneProps, "selectedBook">) {
  const controlsRef = useRef<OrbitControlsType>(null);

  useCameraAnimation(controlsRef, flyToTarget);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3, 5, -2]} intensity={0.3} />
      <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.1} />
      <gridHelper args={[30, 30, "#444444", "#222222"]} />

      {shelves.map((shelf) => (
        <ShelfModel key={shelf.id} data={shelf} onBookClick={onBookSelect} />
      ))}

      {/* Remote Robots (other users) */}
      {remoteRobots.map((robot) => (
        <Suspense key={robot.id} fallback={null}>
          <UserRobot robot={robot} />
        </Suspense>
      ))}

      {/* AI Character */}
      {showCharacter && (
        <Suspense fallback={null}>
          <AICharacter
            position={[0, 0, 8]}
            chatState={characterChatState}
            message={characterMessage}
            onClick={onCharacterClick}
            shelves={shelves}
            onPositionUpdate={onCharacterPositionUpdate}
          />
        </Suspense>
      )}
    </>
  );
}

function SceneBackground() {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color("#1a1a2e");
  }, [scene]);
  return null;
}

export default function LibraryScene(props: LibrarySceneProps) {
  return (
    <Canvas
      camera={{ position: [8, 6, 10], fov: 50, near: 0.1, far: 50 }}
      shadows={{ enabled: true, type: THREE.PCFShadowMap }}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <SceneBackground />
      <Suspense fallback={null}>
        <SceneContent {...props} />
      </Suspense>
    </Canvas>
  );
}
