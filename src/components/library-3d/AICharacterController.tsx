"use client";

import { useState, useCallback } from "react";
import AICharacter from "./AICharacter";
import SpeechBubble from "./SpeechBubble";

interface AICharacterControllerProps {
  position?: [number, number, number];
  onCharacterClick?: () => void;
  chatState?: "idle" | "thinking" | "responding";
  message?: string;
}

export default function AICharacterController({
  position = [0, 0, 8],
  onCharacterClick,
  chatState = "idle",
  message = "",
}: AICharacterControllerProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback(() => {
    onCharacterClick?.();
  }, [onCharacterClick]);

  return (
    <group>
      <AICharacter
        position={position}
        chatState={chatState}
        message={message}
        onClick={handleClick}
      />

      {/* Name label when hovered */}
      {isHovered && (
        <SpeechBubble
          position={[position[0], position[1] + 2.5, position[2]]}
          text="TVTL - Trợ lý AI"
          color="blue"
        />
      )}
    </group>
  );
}
