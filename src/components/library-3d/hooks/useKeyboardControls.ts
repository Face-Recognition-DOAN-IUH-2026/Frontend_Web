"use client";

import { useEffect, useRef, useCallback } from "react";

interface KeyboardState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
}

export function useKeyboardControls() {
  const keys = useRef<KeyboardState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    run: false,
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        keys.current.forward = true;
        break;
      case "KeyS":
      case "ArrowDown":
        keys.current.backward = true;
        break;
      case "KeyA":
      case "ArrowLeft":
        keys.current.left = true;
        break;
      case "KeyD":
      case "ArrowRight":
        keys.current.right = true;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        keys.current.run = true;
        break;
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        keys.current.forward = false;
        break;
      case "KeyS":
      case "ArrowDown":
        keys.current.backward = false;
        break;
      case "KeyA":
      case "ArrowLeft":
        keys.current.left = false;
        break;
      case "KeyD":
      case "ArrowRight":
        keys.current.right = false;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        keys.current.run = false;
        break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return keys;
}
