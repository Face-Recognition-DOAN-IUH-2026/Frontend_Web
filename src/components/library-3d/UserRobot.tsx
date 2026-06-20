"use client";

import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Html } from "@react-three/drei";
import type { GLTF } from "three-stdlib";
import * as THREE from "three";
import type { RemoteRobot } from "./types/multiplayer";

interface UserRobotProps {
  robot: RemoteRobot;
}

type AnimationState = "Idle" | "Walking" | "Sitting" | "Wave" | "Thinking" | "Talking";

export default function UserRobot({ robot }: UserRobotProps) {
  const { scene, animations } = useGLTF(
    "/models/gltf/RobotExpressive/RobotExpressive.glb"
  ) as GLTF;

  const group = useRef<THREE.Group>(null);
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const actions = useRef<Record<string, THREE.AnimationAction>>({});
  const currentAction = useRef<THREE.AnimationAction | null>(null);
  const [currentAnimState, setCurrentAnimState] = useState<AnimationState>("Idle");

  const targetPosition = useRef(new THREE.Vector3(...robot.position));
  const currentPosition = useRef(new THREE.Vector3(...robot.position));
  const prevChatState = useRef(robot.chatState);

  useEffect(() => {
    if (!scene) return;

    mixer.current = new THREE.AnimationMixer(scene);

    animations.forEach((clip) => {
      const action = mixer.current!.clipAction(clip);
      actions.current[clip.name] = action;

      if (["Idle", "Walking", "Running"].includes(clip.name)) {
        action.loop = THREE.LoopRepeat;
      } else {
        action.clampWhenFinished = true;
        action.loop = THREE.LoopOnce;
      }
    });

    const idleAction = actions.current["Idle"];
    if (idleAction) {
      idleAction.play();
      currentAction.current = idleAction;
    }

    return () => {
      mixer.current?.stopAllAction();
    };
  }, [scene, animations]);

  useEffect(() => {
    targetPosition.current.set(...robot.position);
  }, [robot.position]);

  useEffect(() => {
    if (robot.chatState !== prevChatState.current) {
      prevChatState.current = robot.chatState;

      let targetAnim: AnimationState = "Idle";
      if (robot.chatState === "thinking") {
        targetAnim = "Thinking";
      } else if (robot.chatState === "responding") {
        targetAnim = "Talking";
      }

      if (targetAnim !== currentAnimState) {
        fadeToAction(targetAnim, 0.5);
        setCurrentAnimState(targetAnim);
      }
    }
  }, [robot.chatState, currentAnimState]);

  useFrame((_, delta) => {
    if (!group.current) return;

    if (mixer.current) {
      mixer.current.update(delta);
    }

    const distance = currentPosition.current.distanceTo(targetPosition.current);
    if (distance > 0.01) {
      currentPosition.current.lerp(targetPosition.current, delta * 5);
      group.current.position.copy(currentPosition.current);

      const dir = targetPosition.current.clone().sub(currentPosition.current).normalize();
      if (dir.length() > 0.01) {
        const targetRotation = Math.atan2(dir.x, dir.z);
        group.current.rotation.y = THREE.MathUtils.lerp(
          group.current.rotation.y,
          targetRotation,
          delta * 8
        );
      }
    } else {
      group.current.position.copy(currentPosition.current);
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        robot.rotation,
        delta * 8
      );
    }

    if (group.current && currentAnimState === "Idle") {
      group.current.position.y = robot.position[1] + Math.sin(Date.now() * 0.001) * 0.05;
    }
  });

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

  const getUserColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <group ref={group}>
      <primitive object={scene} scale={0.8} />

      <Html position={[0, 2, 0]} center distanceFactor={12}>
        <div
          className="px-2 py-1 rounded-lg text-white text-xs font-medium whitespace-nowrap"
          style={{ backgroundColor: getUserColor(robot.userName) }}
        >
          {robot.userName}
        </div>
      </Html>

      {robot.chatState === "responding" && robot.message && (
        <Html position={[0, 2.5, 0]} center distanceFactor={10}>
          <div className="bg-white rounded-xl px-4 py-2 shadow-lg max-w-xs text-sm text-gray-800 relative">
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white" />
            {robot.message}
          </div>
        </Html>
      )}

      {robot.chatState === "thinking" && (
        <Html position={[0, 2.5, 0]} center distanceFactor={10}>
          <div className="bg-blue-500 rounded-full px-3 py-1 flex gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </Html>
      )}
    </group>
  );
}

useGLTF.preload("/models/gltf/RobotExpressive/RobotExpressive.glb");