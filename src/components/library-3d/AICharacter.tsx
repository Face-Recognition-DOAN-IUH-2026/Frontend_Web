"use client";

import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Html } from "@react-three/drei";
import type { GLTF } from "three-stdlib";
import * as THREE from "three";
import { useRobotMovement, type MovementState } from "./hooks/useRobotMovement";

interface AICharacterProps {
  position?: [number, number, number];
  chatState?: "idle" | "thinking" | "responding";
  message?: string;
  onClick?: () => void;
  shelves?: Array<{ position: [number, number, number] }>;
  onPositionUpdate?: (position: [number, number, number], rotation: number) => void;
}

type AnimationState = "Idle" | "Walking" | "Sitting" | "Wave" | "Thinking" | "Talking";

export default function AICharacter({
  position = [0, 0, 8],
  chatState = "idle",
  message = "",
  onClick,
  shelves = [],
  onPositionUpdate,
}: AICharacterProps) {
  const { scene, animations } = useGLTF(
    "/models/gltf/RobotExpressive/RobotExpressive.glb"
  ) as GLTF;
  const group = useRef<THREE.Group>(null);
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const actions = useRef<Record<string, THREE.AnimationAction>>({});
  const currentAction = useRef<THREE.AnimationAction | null>(null);
  const [currentAnimState, setCurrentAnimState] =
    useState<AnimationState>("Idle");

  // Robot movement system
  const { movementState, setPosition } = useRobotMovement(group, {
    walkSpeed: 2.0,
    runSpeed: 4.0,
    autoSitDelay: 30000, // 30 seconds
    shelves,
  });

  // Set initial position
  useEffect(() => {
    setPosition(new THREE.Vector3(...position));
  }, []);

  // Initialize animation mixer and actions
  useEffect(() => {
    if (!scene) return;

    mixer.current = new THREE.AnimationMixer(scene);

    animations.forEach((clip) => {
      const action = mixer.current!.clipAction(clip);
      actions.current[clip.name] = action;

      // Loop animations for idle/walking states
      if (["Idle", "Walking", "Running"].includes(clip.name)) {
        action.loop = THREE.LoopRepeat;
      } else {
        // One-shot animations (emotes, sitting)
        action.clampWhenFinished = true;
        action.loop = THREE.LoopOnce;
      }
    });

    // Start with Idle animation
    const idleAction = actions.current["Idle"];
    if (idleAction) {
      idleAction.play();
      currentAction.current = idleAction;
    }

    return () => {
      if (mixer.current) {
        mixer.current.stopAllAction();
      }
    };
  }, [scene, animations]);

  // Handle animation state changes based on movementState and chatState
  useEffect(() => {
    if (!mixer.current) return;

    let targetAnim: AnimationState = "Idle";

    // Priority: chatState > movementState
    if (chatState === "thinking") {
      targetAnim = "Thinking";
    } else if (chatState === "responding") {
      targetAnim = "Talking";
    } else if (movementState.current === "walking") {
      targetAnim = "Walking";
    } else if (movementState.current === "sitting") {
      targetAnim = "Sitting";
    } else {
      targetAnim = "Idle";
    }

    if (targetAnim !== currentAnimState) {
      fadeToAction(targetAnim, 0.5);
      setCurrentAnimState(targetAnim);
    }
  }, [chatState, movementState.current]);

  // Animation frame update
  useFrame((_, delta) => {
    if (mixer.current) {
      mixer.current.update(delta);
    }

    // Add subtle bobbing animation when idle (not sitting)
    if (group.current && currentAnimState === "Idle") {
      const baseY = movementState.current === "sitting" ? 0.3 : position[1];
      group.current.position.y = baseY + Math.sin(Date.now() * 0.001) * 0.05;
    }

    // Sitting height adjustment
    if (group.current && currentAnimState === "Sitting") {
      group.current.position.y = THREE.MathUtils.lerp(
        group.current.position.y,
        0.3,
        delta * 3
      );
    }

    // Report position update (throttled to 100ms)
    if (group.current && onPositionUpdate) {
      const currentPos = group.current.position;
      onPositionUpdate(
        [currentPos.x, currentPos.y, currentPos.z],
        group.current.rotation.y
      );
    }
  });

  // Fade to a new animation
  const fadeToAction = (name: AnimationState, duration: number) => {
    const previousAction = currentAction.current;
    const newAction = actions.current[name];

    if (!newAction || previousAction === newAction) return;

    if (previousAction) {
      previousAction.fadeOut(duration);
    }

    newAction
      .reset()
      .setEffectiveTimeScale(1)
      .setEffectiveWeight(1)
      .fadeIn(duration)
      .play();

    currentAction.current = newAction;
  };

  // Handle click - play Wave animation
  const handleClick = () => {
    fadeToAction("Wave", 0.2);
    setTimeout(() => {
      fadeToAction("Idle", 0.5);
    }, 2000);
    onClick?.();
  };

  // Handle hover - look toward cursor (simple approach)
  const handlePointerOver = () => {
    document.body.style.cursor = "pointer";
  };

  const handlePointerOut = () => {
    document.body.style.cursor = "auto";
  };

  return (
    <group
      ref={group}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <primitive object={scene} scale={0.8} />

      {/* Speech Bubble when AI is responding */}
      {chatState === "responding" && message && (
        <Html position={[0, 2.2, 0]} center distanceFactor={10}>
          <div className="bg-white rounded-xl px-4 py-2 shadow-lg max-w-xs text-sm text-gray-800 relative">
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white" />
            {message}
          </div>
        </Html>
      )}

      {/* Thinking indicator */}
      {chatState === "thinking" && (
        <Html position={[0, 2.2, 0]} center distanceFactor={10}>
          <div className="bg-blue-500 rounded-full px-3 py-1 flex gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </Html>
      )}

      {/* Click prompt */}
      <Html position={[0, 1.8, 0]} center distanceFactor={15}>
        <div className="text-xs text-blue-400 font-medium opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          Nhấn để trò chuyện
        </div>
      </Html>
    </group>
  );
}

// Preload the model
useGLTF.preload("/models/gltf/RobotExpressive/RobotExpressive.glb");
