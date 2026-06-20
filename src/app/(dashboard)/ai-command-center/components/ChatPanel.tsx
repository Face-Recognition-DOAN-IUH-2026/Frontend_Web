"use client";

import { useState, useRef, useEffect } from "react";
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Paper,
  Avatar,
  CircularProgress,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AssistantIcon from "@mui/icons-material/SupportAgent";
import UserIcon from "@mui/icons-material/Person";
import Markdown from "react-markdown";
import type { BookData } from "@/components/library-3d/types";
import QuickActions from "./QuickActions";

type ChatState = "idle" | "thinking" | "responding";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolResults?: any[];
}

interface ChatPanelProps {
  onChatStateChange: (state: ChatState, message?: string) => void;
  onBookSelect?: (book: BookData) => void;
  onFloorSelect?: (floor: string) => void;
}

const STORAGE_KEY = "ai-command-center-session";

function buildApiUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  return `${base}/api/ai/agent${path}`;
}

async function chat(message: string, sessionId?: string, patronId?: string) {
  const res = await fetch(buildApiUrl("/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId, patronId }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function ChatPanel({
  onChatStateChange,
  onBookSelect,
  onFloorSelect,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.sessionId) setSessionId(parsed.sessionId);
        if (Array.isArray(parsed.messages) && parsed.messages.length) {
          setMessages(
            parsed.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            }))
          );
        }
      } catch {}
    } else {
      setMessages([
        {
          id: "1",
          role: "assistant",
          content:
            "Xin chào! Tôi là TVTL - Trợ lý AI của Thư viện IUH.\n\nTôi có thể hỗ trợ bạn:\n\n• Tìm kiếm sách và vị trí kệ\n• Tra cứu thông tin độc giả\n• Xem lịch trực nhân viên\n• Thêm/sửa sách (với xác nhận)\n\nBạn cần tôi giúp gì?",
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sessionId, messages })
    );
  }, [sessionId, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const textToSend = (text || input).trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    onChatStateChange("thinking");

    try {
      const data = await chat(textToSend, sessionId || undefined);
      if (data.sessionId && !sessionId) setSessionId(data.sessionId);

      let responseText = data.response || "";
      if (
        !responseText.trim() &&
        data.toolResults &&
        data.toolResults.length > 0
      ) {
        const toolNames = data.toolResults.map((t: any) => t.name).join(", ");
        responseText = `Đã truy vấn xong (${toolNames}).`;
      }
      if (!responseText.trim()) {
        responseText = "Tôi không có phản hồi.";
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseText,
        toolResults: data.toolResults,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      onChatStateChange("responding", responseText);

      setTimeout(() => {
        onChatStateChange("idle");
      }, 3000);
    } catch {
      onChatStateChange("idle");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Box className="h-full flex flex-col">
      {/* Messages */}
      <Box className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <Box
            key={msg.id}
            className={`flex gap-2 ${
              msg.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            <Avatar
              className={
                msg.role === "assistant"
                  ? "bg-primary"
                  : "bg-gray-500"
              }
            >
              {msg.role === "assistant" ? <AssistantIcon /> : <UserIcon />}
            </Avatar>
            <Paper
              className={`max-w-[80%] p-3 ${
                msg.role === "user"
                  ? "bg-primary text-white"
                  : "bg-surface"
              }`}
            >
              <div className="text-sm">
                <Markdown>{msg.content}</Markdown>
              </div>
              <Typography
                variant="caption"
                className="block mt-1 opacity-60"
              >
                {msg.timestamp.toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Typography>
            </Paper>
          </Box>
        ))}
        <div ref={bottomRef} />
      </Box>

      {/* Quick Actions */}
      <QuickActions
        onAction={(action) => sendMessage(action)}
        onFloorSelect={onFloorSelect}
      />

      {/* Input */}
      <Box className="p-4 border-t">
        <div className="flex gap-2">
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Nhập tin nhắn..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            inputRef={inputRef}
            disabled={loading}
            size="small"
          />
          <IconButton
            color="primary"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
          >
            {loading ? <CircularProgress size={20} /> : <SendIcon />}
          </IconButton>
        </div>
      </Box>
    </Box>
  );
}
