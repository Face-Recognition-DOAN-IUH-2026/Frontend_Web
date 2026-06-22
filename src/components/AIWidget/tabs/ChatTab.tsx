"use client";

import React, { useState, useRef, useEffect } from "react";
import { Box, Typography, TextField, IconButton, Paper, Stack, Avatar, useTheme, CircularProgress } from "@mui/material";
import SendIcon from "@mui/icons-material/SendOutlined";
import SmartToyIcon from "@mui/icons-material/SmartToyOutlined";
import PersonIcon from "@mui/icons-material/PersonOutlined";
import { useAIWidgetStore, ChatMessage } from "../store/useAIWidgetStore";

export default function ChatTab() {
  const theme = useTheme();
  const { messages, sendMessage, isLoadingChat, clearMessages } = useAIWidgetStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoadingChat) return;

    setInput("");
    await sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        {messages.length === 0 ? (
          <Stack spacing={2} sx={{ alignItems: "center", justifyContent: "center", height: "100%" }}>
            <Avatar sx={{ width: 48, height: 48, bgcolor: "primary.main" }}>
              <SmartToyIcon />
            </Avatar>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
              Xin chào! Tôi là AI Library Helper.
              <br />
              Hỏi tôi về thư viện, lịch trực, sách...
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoadingChat && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, pl: 2 }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: "primary.main" }}>
                  <SmartToyIcon sx={{ fontSize: 16 }} />
                </Avatar>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">
                  AI đang trả lời...
                </Typography>
              </Box>
            )}
          </Stack>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box
        sx={{
          p: 1.5,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
          <TextField
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hỏi AI..."
            size="small"
            fullWidth
            multiline
            maxRows={4}
            disabled={isLoadingChat}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!input.trim() || isLoadingChat}
            sx={{
              bgcolor: "primary.main",
              color: "primary.contrastText",
              "&:hover": { bgcolor: "primary.dark" },
              "&.Mui-disabled": { bgcolor: "action.disabledBackground" },
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const theme = useTheme();
  const isUser = message.role === "user";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-start",
        gap: 1,
      }}
    >
      {!isUser && (
        <Avatar sx={{ width: 28, height: 28, bgcolor: "primary.main" }}>
          <SmartToyIcon sx={{ fontSize: 16 }} />
        </Avatar>
      )}
      <Paper
        sx={{
          p: 1.5,
          maxWidth: "75%",
          bgcolor: isUser ? "primary.main" : theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "grey.100",
          color: isUser ? "primary.contrastText" : "text.primary",
          borderRadius: 2,
          borderBottomRightRadius: isUser ? 0 : 2,
          borderBottomLeftRadius: isUser ? 2 : 0,
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {message.content}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            textAlign: isUser ? "right" : "left",
            opacity: 0.7,
            mt: 0.5,
            fontSize: 10,
          }}
        >
          {new Date(message.timestamp).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Typography>
      </Paper>
      {isUser && (
        <Avatar sx={{ width: 28, height: 28, bgcolor: "secondary.main" }}>
          <PersonIcon sx={{ fontSize: 16 }} />
        </Avatar>
      )}
    </Box>
  );
}