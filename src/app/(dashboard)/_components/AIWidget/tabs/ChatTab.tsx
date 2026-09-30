"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  Stack,
  Avatar,
  useTheme,
  CircularProgress,
  Chip,
  alpha,
} from "@mui/material";
import SendIcon from "@mui/icons-material/SendOutlined";
import SmartToyIcon from "@mui/icons-material/SmartToyOutlined";
import PersonIcon from "@mui/icons-material/PersonOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTimeOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonthOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";
import ReactMarkdown from "react-markdown";

import { useAIWidgetStore, ChatMessage } from "../store/useAIWidgetStore";
import { type BookCardData } from "../../BookCard";
import BookLocationCard from "../cards/BookLocationCard";
import LibraryHoursCard, { type LibraryScheduleData } from "../cards/LibraryHoursCard";

type Segment =
  | { type: "text"; content: string }
  | { type: "book_card"; bookData: BookCardData; shelfLocation?: string }
  | { type: "library_hours"; scheduleData: LibraryScheduleData };

const QUICK_SUGGESTIONS = [
  { label: "Giờ mở cửa thư viện?", icon: <AccessTimeIcon sx={{ fontSize: 15 }} /> },
  { label: "Tìm sách lập trình Web", icon: <SearchIcon sx={{ fontSize: 15 }} /> },
  { label: "Lịch trực hôm nay", icon: <CalendarMonthIcon sx={{ fontSize: 15 }} /> },
  { label: "Quy định mượn trả sách", icon: <HelpOutlineIcon sx={{ fontSize: 15 }} /> },
];

function extractSchedule(text: string): {
  before: string;
  scheduleData: LibraryScheduleData | null;
  after: string;
} {
  const blockRegex = /```(?:json)?\s*(\{[\s\S]*?"schedule"\s*:\s*\[[\s\S]*?\][\s\S]*?\})\s*```/;
  const blockMatch = text.match(blockRegex);
  if (blockMatch) {
    try {
      const parsed = JSON.parse(blockMatch[1]);
      if (Array.isArray(parsed.schedule)) {
        const idx = text.indexOf(blockMatch[0]);
        return {
          before: text.substring(0, idx).trim(),
          scheduleData: parsed,
          after: text.substring(idx + blockMatch[0].length).trim(),
        };
      }
    } catch {}
  }

  const rawRegex = /\{[\s\S]*?"schedule"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/;
  const rawMatch = text.match(rawRegex);
  if (rawMatch) {
    try {
      const parsed = JSON.parse(rawMatch[0]);
      if (Array.isArray(parsed.schedule)) {
        const idx = text.indexOf(rawMatch[0]);
        return {
          before: text.substring(0, idx).trim(),
          scheduleData: parsed,
          after: text.substring(idx + rawMatch[0].length).trim(),
        };
      }
    } catch {}
  }

  return { before: text, scheduleData: null, after: "" };
}

function extractBookCard(text: string): {
  before: string;
  bookData: BookCardData | null;
  after: string;
} {
  const marker = /:::book_card\s*([\s\S]*?)\s*:::/;
  const match = text.match(marker);
  if (!match) {
    return { before: text, bookData: null, after: "" };
  }

  const idx = text.indexOf(match[0]);
  const before = text.substring(0, idx).trim();
  const after = text.substring(idx + match[0].length).trim();

  try {
    const bookData = JSON.parse(match[1]) as BookCardData;
    return { before, bookData, after };
  } catch {
    return { before: text, bookData: null, after: "" };
  }
}

function parseMessageSegments(content: string): Segment[] {
  if (!content) return [];

  // 1. Check for library schedule JSON block
  const sched = extractSchedule(content);
  if (sched.scheduleData) {
    const beforeSegments = sched.before ? parseMessageSegments(sched.before) : [];
    const afterSegments = sched.after ? parseMessageSegments(sched.after) : [];
    return [
      ...beforeSegments,
      { type: "library_hours", scheduleData: sched.scheduleData },
      ...afterSegments,
    ];
  }

  // 2. Check for book card block
  const book = extractBookCard(content);
  if (book.bookData) {
    const beforeSegments = book.before ? parseMessageSegments(book.before) : [];
    const afterSegments = book.after ? parseMessageSegments(book.after) : [];
    return [
      ...beforeSegments,
      {
        type: "book_card",
        bookData: book.bookData,
        shelfLocation: (book.bookData as any).shelf_location,
      },
      ...afterSegments,
    ];
  }

  // 3. Plain text segment
  const trimmed = content.trim();
  return trimmed ? [{ type: "text", content: trimmed }] : [];
}

export default function ChatTab() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { messages, sendMessage, isLoadingChat } = useAIWidgetStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoadingChat]);

  const handleSend = async (customText?: string) => {
    const trimmed = (customText ?? input).trim();
    if (!trimmed || isLoadingChat) return;

    if (!customText) setInput("");
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
          <Stack
            spacing={2}
            sx={{
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              py: 2,
            }}
          >
            <Avatar
              sx={{
                width: 52,
                height: 52,
                bgcolor: "primary.main",
                boxShadow: isDark
                  ? "0 4px 16px rgba(0,0,0,0.5)"
                  : "0 4px 16px rgba(30, 96, 145, 0.25)",
              }}
            >
              <SmartToyIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Box sx={{ textAlign: "center", px: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Trợ lý AI Thư viện IUH
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.82rem" }}>
                Hỏi tôi về sách, giờ mở cửa, lịch trực, quy định mượn trả...
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                justifyContent: "center",
                maxWidth: 340,
                mt: 1,
              }}
            >
              {QUICK_SUGGESTIONS.map((item) => (
                <Chip
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  size="small"
                  onClick={() => handleSend(item.label)}
                  variant="outlined"
                  sx={{
                    cursor: "pointer",
                    borderRadius: 2,
                    fontSize: "0.75rem",
                    borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
                    bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                    "&:hover": {
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      borderColor: "primary.main",
                      "& .MuiChip-icon": { color: "inherit" },
                    },
                    transition: "all 0.2s ease",
                  }}
                />
              ))}
            </Box>
          </Stack>
        ) : (
          <Stack spacing={2}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoadingChat && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, pl: 1 }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: "primary.main" }}>
                  <SmartToyIcon sx={{ fontSize: 16 }} />
                </Avatar>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">
                  AI đang xử lý câu trả lời...
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
            placeholder="Hỏi AI về thư viện, sách, lịch trực..."
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
            onClick={() => handleSend()}
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
  const isDark = theme.palette.mode === "dark";
  const isUser = message.role === "user";

  const segments: Segment[] = isUser
    ? [{ type: "text", content: message.content }]
    : parseMessageSegments(message.content);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-start",
        gap: 1.25,
        width: "100%",
      }}
    >
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: isUser ? "secondary.main" : "primary.main",
          boxShadow: isDark
            ? "0 2px 8px rgba(0,0,0,0.4)"
            : "0 2px 8px rgba(139, 0, 0, 0.2)",
          flexShrink: 0,
          mt: 0.5,
        }}
      >
        {isUser ? <PersonIcon sx={{ fontSize: 18 }} /> : <SmartToyIcon sx={{ fontSize: 18 }} />}
      </Avatar>

      <Box
        sx={{
          maxWidth: "88%",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 0.75,
        }}
      >
        {segments.map((seg, i) => {
          if (seg.type === "book_card") {
            return (
              <BookLocationCard
                key={i}
                data={{ ...seg.bookData, shelf_location: seg.shelfLocation }}
              />
            );
          }

          if (seg.type === "library_hours") {
            return <LibraryHoursCard key={i} data={seg.scheduleData} />;
          }

          return (
            <Paper
              key={i}
              elevation={0}
              sx={{
                p: 1.75,
                borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                bgcolor: isUser
                  ? isDark
                    ? "primary.dark"
                    : "primary.main"
                  : isDark
                  ? alpha(theme.palette.background.paper, 0.85)
                  : "#FFFFFF",
                color: isUser ? "primary.contrastText" : "text.primary",
                border: "1px solid",
                borderColor: isUser
                  ? "transparent"
                  : isDark
                  ? alpha("#FFFFFF", 0.08)
                  : alpha("#000000", 0.08),
                boxShadow: isUser
                  ? isDark
                    ? "0 2px 8px rgba(0,0,0,0.3)"
                    : "0 2px 10px rgba(139, 0, 0, 0.2)"
                  : isDark
                  ? "0 2px 10px rgba(0,0,0,0.25)"
                  : "0 2px 8px rgba(0, 0, 0, 0.04)",
                overflow: "hidden",
                wordBreak: "break-word",
              }}
            >
              {isUser ? (
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {seg.content}
                </Typography>
              ) : (
                <Box
                  sx={{
                    fontSize: "0.875rem",
                    lineHeight: 1.65,
                    "& p": { my: 0.5 },
                    "& p:first-of-type": { mt: 0 },
                    "& p:last-of-type": { mb: 0 },
                    "& ul, & ol": { pl: 2.2, my: 0.5 },
                    "& li": { mb: 0.35, lineHeight: 1.55 },
                    "& strong": {
                      fontWeight: 700,
                      color: isDark ? "secondary.light" : "primary.main",
                    },
                    "& em": { fontStyle: "italic" },
                    "& h1, & h2, & h3, & h4": {
                      fontWeight: 700,
                      mt: 1,
                      mb: 0.5,
                      lineHeight: 1.3,
                    },
                    "& h1": { fontSize: "1.1rem" },
                    "& h2": { fontSize: "1.02rem" },
                    "& h3": { fontSize: "0.95rem" },
                    "& code": {
                      fontFamily: "monospace",
                      bgcolor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
                      px: 0.6,
                      py: 0.2,
                      borderRadius: 1,
                      fontSize: "0.85em",
                    },
                    "& pre": {
                      bgcolor: isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.05)",
                      p: 1.25,
                      borderRadius: 1.5,
                      overflow: "auto",
                      my: 0.75,
                      "& code": { bgcolor: "transparent", p: 0 },
                    },
                    "& table": {
                      width: "100%",
                      borderCollapse: "collapse",
                      my: 1,
                      fontSize: "0.82rem",
                    },
                    "& th, & td": {
                      border: "1px solid",
                      borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
                      p: 0.75,
                    },
                    "& th": {
                      bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                      fontWeight: 700,
                    },
                    "& blockquote": {
                      borderLeft: "3px solid",
                      borderColor: "primary.main",
                      pl: 1.5,
                      my: 0.75,
                      fontStyle: "italic",
                      color: "text.secondary",
                    },
                    "& a": {
                      color: isDark ? "secondary.light" : "primary.main",
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                    },
                  }}
                >
                  <ReactMarkdown>{seg.content}</ReactMarkdown>
                </Box>
              )}
            </Paper>
          );
        })}

        <Typography
          variant="caption"
          sx={{
            display: "block",
            textAlign: isUser ? "right" : "left",
            opacity: 0.65,
            fontSize: 10,
            px: 0.5,
          }}
        >
          {new Date(message.timestamp).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Typography>
      </Box>
    </Box>
  );
}