"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Box, Typography, Paper, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AssistantIcon from "@mui/icons-material/SupportAgent";
import PartySocket from "partysocket";
import { useLibraryData } from "@/components/library-3d/hooks/useLibraryData";
import type { BookData } from "@/components/library-3d/types";
import type { RemoteRobot, PartyMessage } from "@/components/library-3d/types/multiplayer";
import LibraryScene from "@/components/library-3d/LibraryScene";
import ChatPanel from "./components/ChatPanel";
import FloorSelector from "./components/FloorSelector";

type ChatState = "idle" | "thinking" | "responding";

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999";

function getLocalUser() {
  if (typeof window === "undefined") return { userId: "anonymous", userName: "Anonymous" };
  try {
    const stored = localStorage.getItem("user");
    if (stored) {
      const user = JSON.parse(stored);
      return {
        userId: user.id || "anonymous",
        userName: user.full_name || user.email || "Anonymous",
      };
    }
  } catch {}
  return { userId: "anonymous", userName: "Anonymous" };
}

function generateClientId() {
  return Math.random().toString(36).substring(2, 15);
}

const localUser = getLocalUser();
const localClientId = generateClientId();

export default function AICommandCenter() {
  const { shelves, loading } = useLibraryData();
  const [selectedBook, setSelectedBook] = useState<BookData | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<[number, number, number] | null>(null);
  const [chatState, setChatState] = useState<ChatState>("idle");
  const [currentMessage, setCurrentMessage] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [currentFloor, setCurrentFloor] = useState<string>("all");
  const [remoteRobots, setRemoteRobots] = useState<RemoteRobot[]>([]);

  const socketRef = useRef<PartySocket | null>(null);
  const localUserRef = useRef(getLocalUser());
  const localClientIdRef = useRef(generateClientId());
  const connectionIdRef = useRef<string | null>(null);
  const lastBroadcastRef = useRef<number>(0);

  useEffect(() => {
    const roomId = "tvl-ai-center";
    const user = localUserRef.current;
    const clientId = localClientIdRef.current;

    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
    });

    socketRef.current = socket;

    socket.addEventListener("open", () => {
      console.log("[Party] Connected with clientId:", clientId);
    });

    socket.addEventListener("message", (event) => {
      try {
        const msg: PartyMessage = JSON.parse(event.data);

        switch (msg.type) {
          case "init":
            connectionIdRef.current = msg.connectionId || null;
            console.log("[Party] Got connectionId:", connectionIdRef.current);
            if (msg.robots) {
              setRemoteRobots(msg.robots.filter((r) => r.clientId !== clientId));
            }
            break;

          case "robot:update":
            if (msg.robot && msg.robot.clientId !== clientId) {
              setRemoteRobots((prev) => {
                const exists = prev.find((r) => r.id === msg.robot!.id);
                if (exists) {
                  return prev.map((r) => (r.id === msg.robot!.id ? msg.robot! : r));
                }
                return [...prev, msg.robot!];
              });
            }
            break;

          case "robot:remove":
            if (msg.robotId) {
              setRemoteRobots((prev) => prev.filter((r) => r.id !== msg.robotId));
            }
            break;

          case "robot:chat-state":
            if (msg.robotId) {
              setRemoteRobots((prev) =>
                prev.map((r) =>
                  r.id === msg.robotId
                    ? { ...r, chatState: msg.chatState || r.chatState, message: msg.message || r.message }
                    : r
                )
              );
            }
            break;
        }
      } catch (err) {
        console.error("Party message parse error:", err);
      }
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  const broadcastRobotMove = useCallback(
    (position: [number, number, number], rotation: number) => {
      const socket = socketRef.current;
      if (!socket) return;

      const now = Date.now();
      if (now - lastBroadcastRef.current < 50) return;
      lastBroadcastRef.current = now;

      const user = localUserRef.current;
      socket.send(
        JSON.stringify({
          type: "robot:move",
          userId: user.userId,
          userName: user.userName,
          clientId: localClientIdRef.current,
          position,
          rotation,
          chatState,
          message: currentMessage,
        })
      );
    },
    [chatState, currentMessage]
  );

  const handleBookSelect = (book: BookData) => {
    setSelectedBook(book);
  };

  const handleFloorSelect = (floor: string) => {
    setCurrentFloor(floor);
    const floorShelves = shelves.filter((s) => s.floor === floor);
    if (floorShelves.length > 0) {
      const avgX = floorShelves.reduce((sum, s) => sum + s.position[0], 0) / floorShelves.length;
      const avgZ = floorShelves.reduce((sum, s) => sum + s.position[2], 0) / floorShelves.length;
      setFlyToTarget([avgX, 0, avgZ]);
    }
  };

  const handleCharacterClick = () => {
    setChatOpen(true);
  };

  const handleChatStateChange = (state: ChatState, message?: string) => {
    setChatState(state);
    if (message) setCurrentMessage(message);

    const socket = socketRef.current;
    if (socket) {
      socket.send(
        JSON.stringify({
          type: "robot:chat-state",
          chatState: state,
          message: message || "",
        })
      );
    }
  };

  if (loading) {
    return (
      <Box className="w-full h-screen flex items-center justify-center bg-bg">
        <Typography className="text-text-3 animate-pulse">Đang tải...</Typography>
      </Box>
    );
  }

  return (
    <Box className="w-full h-screen flex flex-col overflow-hidden bg-bg">
      {/* Header */}
      <Paper className="flex items-center justify-between px-4 py-2 border-b" elevation={0}>
        <div className="flex items-center gap-2">
          <AssistantIcon className="text-primary" />
          <Typography variant="h6" className="font-bold">
            AI Command Center
          </Typography>
          <Typography variant="caption" className="text-text-3 ml-2">
            TVTL - Trợ lý Vi tính Thư viện IUH
          </Typography>
        </div>
        <Typography variant="caption" className="text-text-3">
          {remoteRobots.length + 1} người online
        </Typography>
      </Paper>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Scene */}
        <div className={`relative transition-all duration-300 ${chatOpen ? "w-2/3" : "w-full"} h-full`}>
          <LibraryScene
            shelves={shelves}
            selectedBook={selectedBook}
            flyToTarget={flyToTarget}
            onBookSelect={handleBookSelect}
            showCharacter={true}
            characterChatState={chatState}
            characterMessage={currentMessage}
            onCharacterClick={handleCharacterClick}
            onCharacterPositionUpdate={broadcastRobotMove}
            remoteRobots={remoteRobots}
          />

          {/* Floor Selector */}
          <FloorSelector
            currentFloor={currentFloor}
            onFloorSelect={handleFloorSelect}
          />

          {/* Toggle Chat Button */}
          <IconButton
            className="absolute top-4 right-4 z-10 bg-surface/80 backdrop-blur-xl hover:bg-surface-2"
            onClick={() => setChatOpen(!chatOpen)}
          >
            {chatOpen ? <CloseIcon /> : <AssistantIcon />}
          </IconButton>
        </div>

        {/* Chat Panel */}
        {chatOpen && (
          <div className="w-1/3 border-l">
            <ChatPanel
              onChatStateChange={handleChatStateChange}
              onBookSelect={handleBookSelect}
              onFloorSelect={handleFloorSelect}
            />
          </div>
        )}
      </div>
    </Box>
  );
}
