"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import SendIcon from "@mui/icons-material/SendOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import AssistantIcon from "@mui/icons-material/SupportAgentOutlined";
import ChatBubbleIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import BuildIcon from "@mui/icons-material/BuildOutlined";
import SessionIcon from "@mui/icons-material/HistoryOutlined";
import StatusIcon from "@mui/icons-material/FiberManualRecord";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import ScheduleIcon from "@mui/icons-material/CalendarTodayOutlined";
import WarningIcon from "@mui/icons-material/WarningAmberOutlined";
import GroupsIcon from "@mui/icons-material/GroupsOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTimeOutlined";
import RuleIcon from "@mui/icons-material/GavelOutlined";
import Tooltip from "@mui/material/Tooltip";
import Markdown from "react-markdown";
import api from "@/lib/api-client";
import BookCard, { parseBookCard } from "@/components/BookCard";
import { fadeInUp, shimmer } from "@/lib/animations";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolResults?: ToolResult[];
  requiresConfirmation?: boolean;
  pendingAction?: PendingAction;
  timestamp: Date;
}

interface ToolResult {
  name: string;
  result: { success: boolean; data?: any; error?: string };
}

interface PendingAction {
  action: string;
  description: string;
  params: Record<string, any>;
}

const STORAGE_KEY = "ai-assistant-session";

const STAT_GRADIENT = {
  msg: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
  tool: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
  session: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  status: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
};

const SUGGESTIONS = [
  { label: "Tìm sách về AI", icon: <SearchIcon sx={{ fontSize: 16 }} />, color: "#6366f1" },
  { label: "Lịch trực hôm nay", icon: <ScheduleIcon sx={{ fontSize: 16 }} />, color: "#3b82f6" },
  { label: "Sách quá hạn", icon: <WarningIcon sx={{ fontSize: 16 }} />, color: "#ef4444" },
  { label: "Giờ mở cửa", icon: <AccessTimeIcon sx={{ fontSize: 16 }} />, color: "#10b981" },
  { label: "Quy định mượn trả", icon: <RuleIcon sx={{ fontSize: 16 }} />, color: "#f59e0b" },
  { label: "Độc giả trong thư viện", icon: <GroupsIcon sx={{ fontSize: 16 }} />, color: "#8b5cf6" },
];

function buildApiUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  return `${base}/api/ai${path}`;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function chat(message: string, sessionId?: string, patronId?: string) {
  const res = await fetch(buildApiUrl("/chat"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ message, sessionId, patronId }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function confirmAction(sessionId: string, action: "approve" | "reject") {
  const res = await fetch(buildApiUrl("/confirm"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ sessionId, action }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function MessageContent({ content }: { content: string }) {
  const { before, bookData, after } = parseBookCard(content);
  return (
    <>
      {before && <Markdown>{before}</Markdown>}
      {bookData && <BookCard data={bookData} />}
      {after && <Markdown>{after}</Markdown>}
    </>
  );
}

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; pending?: PendingAction }>({ open: false });
  const [mounted, setMounted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.sessionId) setSessionId(parsed.sessionId);
        if (Array.isArray(parsed.messages) && parsed.messages.length) {
          setMessages(parsed.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
        }
      } catch {}
    } else {
      setMessages([{
        id: "1",
        role: "assistant",
        content: "Xin chào! Tôi là Trợ lý AI của Thư viện IUH. Tôi có thể hỗ trợ bạn:\n\n• Tìm kiếm sách và vị trí kệ\n• Trả lời câu hỏi về thư viện (giờ mở cửa, quy định mượn trả, chính sách phạt...)\n• Tra cứu thông tin độc giả và lịch sử mượn\n• Xem lịch trực nhân viên hôm nay\n• Đề xuất sách theo nhu cầu\n\nBạn cần tôi giúp gì?",
        timestamp: new Date(),
      }]);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId, messages }));
    }
  }, [sessionId, messages, mounted]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const textToSend = (text || input).trim();
    if (!textToSend || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: textToSend, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const data = await chat(textToSend, sessionId || undefined);
      if (data.sessionId && !sessionId) setSessionId(data.sessionId);

      let responseText = data.response || "";
      if (!responseText.trim() && data.toolResults && data.toolResults.length > 0) {
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
        requiresConfirmation: data.requiresConfirmation,
        pendingAction: data.pendingAction,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.requiresConfirmation && data.pendingAction) {
        setConfirmDialog({ open: true, pending: data.pendingAction });
      }
    } catch {
      setError("Không thể kết nối AI. Vui lòng thử lại.");
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleConfirm = async (action: "approve" | "reject") => {
    if (!sessionId) return;
    setConfirmDialog({ open: false });
    setLoading(true);

    const confirmMsg: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: action === "approve" ? "Đang xử lý yêu cầu của bạn..." : "Đã hủy thao tác theo yêu cầu của bạn.",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, confirmMsg]);

    try {
      const result = await confirmAction(sessionId, action);
      const resultMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.result || result.response || (action === "approve" ? "Thao tác đã được thực hiện thành công." : "Đã hủy."),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev.slice(0, -1), resultMsg]);
    } catch {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Thao tác thất bại. Vui lòng thử lại.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev.slice(0, -1), errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now().toString(),
      role: "assistant",
      content: "Đã xóa cuộc trò chuyện. Tôi có thể giúp gì cho bạn?",
      timestamp: new Date(),
    }]);
    setSessionId("");
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toolCount = useMemo(() => {
    const names = new Set<string>();
    messages.forEach((m) => m.toolResults?.forEach((t) => names.add(t.name)));
    return names.size;
  }, [messages]);

  const stats = [
    { key: "msg", label: "Tin nhắn", value: messages.length, icon: <ChatBubbleIcon sx={{ fontSize: 18 }} />, gradient: STAT_GRADIENT.msg },
    { key: "tool", label: "Công cụ", value: toolCount, icon: <BuildIcon sx={{ fontSize: 18 }} />, gradient: STAT_GRADIENT.tool },
    { key: "session", label: "Phiên", value: sessionId ? sessionId.slice(0, 6) : "Mới", icon: <SessionIcon sx={{ fontSize: 18 }} />, gradient: STAT_GRADIENT.session },
    { key: "status", label: "Trạng thái", value: loading ? "Xử lý..." : "Sẵn sàng", icon: <StatusIcon sx={{ fontSize: 10, color: loading ? "#f59e0b" : "#10b981" }} />, gradient: STAT_GRADIENT.status },
  ];

  const showEmpty = messages.length <= 1 && messages[0]?.role === "assistant";

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* ── Gradient Header ── */}
      <Box
        sx={{
          px: 3, py: 2.5,
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
          borderBottom: "1px solid",
          borderColor: "rgba(99,102,241,0.3)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box sx={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", bgcolor: "rgba(99,102,241,0.08)", pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -50, left: 150, width: 200, height: 200, borderRadius: "50%", bgcolor: "rgba(99,102,241,0.05)", pointerEvents: "none" }} />

        <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between", zIndex: 1, position: "relative" }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Avatar sx={{ bgcolor: "rgba(99,102,241,0.3)", width: 46, height: 46, border: "1px solid rgba(99,102,241,0.5)" }}>
              <AssistantIcon sx={{ color: "#a5b4fc", fontSize: 24 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#e0e7ff", lineHeight: 1.2 }}>Trợ lý AI</Typography>
              <Typography variant="caption" sx={{ color: "rgba(199,210,254,0.7)" }}>meta/llama-3.1-70b-instruct</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            {sessionId && (
              <Chip
                label={`Phiên: ${sessionId.slice(0, 8)}...`}
                size="small"
                sx={{ color: "#a5b4fc", borderColor: "rgba(165,180,252,0.4)", fontWeight: 600, fontSize: "0.72rem" }}
                variant="outlined"
              />
            )}
            <Tooltip title="Xóa cuộc trò chuyện">
              <Button
                size="small"
                variant="outlined"
                onClick={clearChat}
                sx={{ color: "#a5b4fc", borderColor: "rgba(165,180,252,0.4)", fontWeight: 600, fontSize: "0.75rem", "&:hover": { borderColor: "#a5b4fc", bgcolor: "rgba(165,180,252,0.08)" } }}
              >
                Xóa chat
              </Button>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* ── Quick Stats ── */}
      <Box sx={{ px: 3, py: 1.5, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1.5 }}>
          {stats.map((s, idx) => (
            <Paper
              key={s.key}
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                borderColor: "divider",
                transition: "transform 0.2s, box-shadow 0.2s",
                animation: `${fadeInUp} 0.4s ease-out`,
                animationDelay: `${idx * 0.05}s`,
                animationFillMode: "both",
                "&:hover": { transform: "translateY(-1px)", boxShadow: 2 },
              }}
            >
              <Avatar sx={{ background: s.gradient, width: 34, height: 34, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                {s.icon}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, fontSize: "0.65rem" }}>
                  {s.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.2, fontSize: "0.85rem" }}>
                  {typeof s.value === "number" ? s.value.toLocaleString("vi-VN") : s.value}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>

      {error && <Alert severity="error" onClose={() => setError("")} sx={{ m: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* ── Chat Area ── */}
      <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2 }}>
        <Stack spacing={2.5}>
          {showEmpty && (
            <Box sx={{ textAlign: "center", py: 4, animation: `${fadeInUp} 0.5s ease-out` }}>
              <Avatar sx={{ width: 72, height: 72, bgcolor: "rgba(99,102,241,0.15)", mx: "auto", mb: 2, border: "2px solid rgba(99,102,241,0.3)" }}>
                <AssistantIcon sx={{ fontSize: 36, color: "#6366f1" }} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>Trợ lý AI Thư viện IUH</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Hỏi tôi về sách, lịch trực, quy định thư viện...</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center", maxWidth: 600, mx: "auto" }}>
                {SUGGESTIONS.map((s) => (
                  <Chip
                    key={s.label}
                    icon={s.icon}
                    label={s.label}
                    onClick={() => sendMessage(s.label)}
                    variant="outlined"
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.78rem",
                      borderRadius: "20px!important",
                      borderColor: alpha(s.color, 0.4),
                      color: s.color,
                      "&:hover": { bgcolor: alpha(s.color, 0.08), borderColor: s.color },
                      transition: "all 0.2s",
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {!showEmpty && messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {loading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, pl: 1, animation: `${fadeInUp} 0.3s ease-out` }}>
              <Avatar sx={{ width: 36, height: 36, background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                <AssistantIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: "12px 12px 12px 4px", borderColor: "divider" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    {[0, 1, 2].map((i) => (
                      <Box key={i} sx={{
                        width: 7, height: 7, borderRadius: "50%", bgcolor: "#6366f1",
                        animation: "bounce 1.4s infinite ease-in-out both",
                        animationDelay: `${i * 0.16}s`,
                        "@keyframes bounce": {
                          "0%, 80%, 100%": { transform: "scale(0)" },
                          "40%": { transform: "scale(1)" },
                        },
                      }} />
                    ))}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontStyle: "italic" }}>
                    AI đang suy nghĩ...
                  </Typography>
                </Stack>
              </Paper>
            </Box>
          )}
          <div ref={bottomRef} />
        </Stack>
      </Box>

      {/* ── Input Area ── */}
      <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider", bgcolor: "background.paper" }}>
        <Paper
          variant="outlined"
          sx={{
            p: 1,
            borderRadius: 3,
            borderColor: "divider",
            transition: "border-color 0.2s, box-shadow 0.2s",
            "&:focus-within": { borderColor: "#6366f1", boxShadow: "0 0 0 2px rgba(99,102,241,0.1)" },
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "flex-end" }}>
            <TextField
              inputRef={inputRef}
              placeholder="Hỏi tôi về thư viện, sách, lịch trực..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              multiline
              maxRows={4}
              fullWidth
              disabled={loading}
              size="small"
              variant="standard"
              sx={{
                px: 1,
                "& .MuiInput-root": { borderBottom: "none" },
                "& .MuiInput-root:before": { borderBottom: "none" },
                "& .MuiInput-root:after": { borderBottom: "none" },
              }}
            />
            <IconButton
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              sx={{
                background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
                color: "white",
                width: 40,
                height: 40,
                borderRadius: 2,
                boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": { background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)", transform: "scale(1.05)", boxShadow: "0 6px 20px rgba(99,102,241,0.5)" },
                "&:disabled": { background: "action.disabledBackground", boxShadow: "none", transform: "none" },
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon sx={{ fontSize: 20 }} />}
            </IconButton>
          </Stack>
        </Paper>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block", textAlign: "center", fontSize: "0.7rem" }}>
          AI có thể sai. Luôn kiểm tra thông tin trước khi hành động.
        </Typography>
      </Box>

      {/* ── Confirmation Dialog ── */}
      <Dialog open={confirmDialog.open} onClose={() => handleConfirm("reject")} maxWidth="sm" fullWidth>
        <Box sx={{ background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", p: 2.5, color: "white" }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", width: 40, height: 40 }}>
                <AutoAwesomeIcon />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Xác nhận thao tác</Typography>
            </Stack>
            <IconButton onClick={() => handleConfirm("reject")} size="small" sx={{ color: "white", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}>
              <CancelIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>
        <DialogContent sx={{ pt: 3 }}>
          {confirmDialog.pending && (
            <Stack spacing={2}>
              <Alert severity="warning" sx={{ borderRadius: 2, fontWeight: 600 }}>
                Thao tác này sẽ ảnh hưởng đến dữ liệu. Vui lòng xác nhận.
              </Alert>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "background.default", borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Mô tả thao tác
                </Typography>
                <Typography sx={{ mt: 0.5, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {confirmDialog.pending.description}
                </Typography>
              </Paper>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Hành động
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", mt: 0.5, bgcolor: "action.hover", p: 1, borderRadius: 1 }}>
                  {confirmDialog.pending.action}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => handleConfirm("reject")} variant="outlined" color="inherit" startIcon={<CancelIcon />} sx={{ borderRadius: 2 }}>
            Hủy bỏ
          </Button>
          <Button onClick={() => handleConfirm("approve")} variant="contained" startIcon={<CheckCircleIcon />}
            sx={{ borderRadius: 2, fontWeight: 700, background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", "&:hover": { background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)" } }}>
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function ToolResultCards({ tr }: { tr: ToolResult }) {
  const data = tr.result?.data ?? tr.result;
  const isError = !!tr.result?.error;

  if (isError) {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: "error.main", overflow: "hidden" }}>
        <Box sx={{ display: "flex" }}>
          <Box sx={{ width: 4, bgcolor: "error.main", flexShrink: 0 }} />
          <Box sx={{ flex: 1, pl: 1.5 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: "error.main", fontSize: 14 }}>✕</Avatar>
              <Box>
                <Chip label={tr.name} size="small" color="error" sx={{ fontWeight: 800, fontSize: 10, height: 20 }} />
                <Typography variant="body2" color="error.main" sx={{ fontSize: 12, fontWeight: 500, mt: 0.25 }}>
                  {tr.result.error}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Paper>
    );
  }

  if (tr.name === "search_books" && Array.isArray(data)) {
    return (
      <Box>
        <Chip label={`📖 Tìm thấy ${data.length} cuốn sách`} size="small" color="primary" sx={{ fontWeight: 800, fontSize: 11, mb: 1, height: 24 }} />
        <Stack spacing={1}>
          {data.map((book: any, i: number) => (
            <Paper key={i} elevation={0} sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
              <Box sx={{ display: "flex" }}>
                <Box sx={{ width: 4, bgcolor: book.is_available ? "#10b981" : "#f59e0b", flexShrink: 0 }} />
                <Box sx={{ flex: 1, p: 1.5 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                    <Avatar sx={{ width: 40, height: 40, background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", fontSize: 18, flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>📖</Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.3, fontSize: 13 }}>{book.title}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.4 }}>{book.author}</Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: "wrap", gap: 0.5 }}>
                        <Chip label={book.categories || "Sách"} size="small" variant="outlined" sx={{ fontSize: 10, height: 20, fontWeight: 600, borderRadius: 1.5 }} />
                        <Chip label={book.isbn} size="small" variant="outlined" sx={{ fontSize: 10, height: 20, fontFamily: "monospace", borderRadius: 1.5 }} />
                        <Chip
                          label={book.is_available ? "Có sẵn" : "Đang mượn"}
                          size="small"
                          color={book.is_available ? "success" : "warning"}
                          sx={{ fontSize: 10, height: 20, fontWeight: 700, borderRadius: 1.5 }}
                        />
                      </Stack>
                      {book.shelf_location && (
                        <Chip label={`📍 ${book.shelf_location}`} size="small" color="primary" variant="outlined"
                          sx={{ mt: 0.5, fontSize: 10, height: 20, fontWeight: 700, fontFamily: "monospace", borderRadius: 1.5 }} />
                      )}
                    </Box>
                  </Stack>
                </Box>
              </Box>
            </Paper>
          ))}
        </Stack>
      </Box>
    );
  }

  if (tr.name === "get_overdue_borrows" && Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "#10b981", bgcolor: alpha("#10b981", 0.04) }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Avatar sx={{ width: 36, height: 36, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", fontSize: 18 }}>✓</Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "#10b981" }}>Không có sách quá hạn</Typography>
              <Typography variant="caption" color="text.secondary">Tất cả sách đều trong hạn trả</Typography>
            </Box>
          </Stack>
        </Paper>
      );
    }
    return (
      <Box>
        <Chip label={`⚠️ ${data.length} sách quá hạn`} size="small" color="error" sx={{ fontWeight: 800, fontSize: 11, mb: 1, height: 24 }} />
        <Stack spacing={1}>
          {data.map((item: any, i: number) => (
            <Paper key={i} elevation={0} sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "error.main" }}>
              <Box sx={{ display: "flex" }}>
                <Box sx={{ width: 4, bgcolor: "#ef4444", flexShrink: 0 }} />
                <Box sx={{ flex: 1, p: 1.5, bgcolor: alpha("#ef4444", 0.04) }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                    <Avatar sx={{ width: 36, height: 36, background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", fontSize: 16, flexShrink: 0 }}>⚠️</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, fontSize: 13 }}>{item.book?.title || "N/A"}</Typography>
                      <Typography variant="caption" color="text.secondary">Độc giả: {item.patron_id?.slice(0, 8)}...</Typography>
                      <Chip label={`⏰ Quá hạn: ${item.due_at ? new Date(item.due_at).toLocaleDateString("vi-VN") : "N/A"}`}
                        size="small" color="error" sx={{ mt: 0.5, fontSize: 10, height: 20, fontWeight: 700, borderRadius: 1.5 }} />
                    </Box>
                  </Stack>
                </Box>
              </Box>
            </Paper>
          ))}
        </Stack>
      </Box>
    );
  }

  if (tr.name === "get_patron_borrows" && Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "#10b981", bgcolor: alpha("#10b981", 0.04) }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Avatar sx={{ width: 36, height: 36, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", fontSize: 18 }}>✓</Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "#10b981" }}>Không sách đang mượn</Typography>
              <Typography variant="caption" color="text.secondary">Độc giả chưa mượn cuốn nào</Typography>
            </Box>
          </Stack>
        </Paper>
      );
    }
    return (
      <Box>
        <Chip label={`📚 ${data.length} sách đang mượn`} size="small" color="info" sx={{ fontWeight: 800, fontSize: 11, mb: 1, height: 24 }} />
        <Stack spacing={1}>
          {data.map((item: any, i: number) => (
            <Paper key={i} elevation={0} sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
              <Box sx={{ display: "flex" }}>
                <Box sx={{ width: 4, bgcolor: "#3b82f6", flexShrink: 0 }} />
                <Box sx={{ flex: 1, p: 1.5 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                    <Avatar sx={{ width: 36, height: 36, background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", fontSize: 16, flexShrink: 0 }}>📚</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, fontSize: 13 }}>{item.book?.title || "N/A"}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.book?.author}</Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.5 }}>
                        <Chip label={item.status === "borrowed" ? "Đang mượn" : "Đã trả"}
                          size="small" color={item.status === "borrowed" ? "warning" : "success"}
                          sx={{ fontSize: 10, height: 20, fontWeight: 700, borderRadius: 1.5 }} />
                        {item.due_at && (
                          <Chip label={`Hạn: ${new Date(item.due_at).toLocaleDateString("vi-VN")}`}
                            size="small" variant="outlined" sx={{ fontSize: 10, height: 20, borderRadius: 1.5 }} />
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              </Box>
            </Paper>
          ))}
        </Stack>
      </Box>
    );
  }

  if (tr.name === "get_shelf_location" && typeof data === "object" && data !== null && !Array.isArray(data)) {
    return (
      <Box>
        <Chip label="📍 Vị trí sách trên kệ" size="small" color="primary" sx={{ fontWeight: 800, fontSize: 11, mb: 1, height: 24 }} />
        <Stack spacing={1}>
          {Object.entries(data).map(([shelf, books]: [string, any], i: number) => (
            <Paper key={i} elevation={0} sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
              <Box sx={{ display: "flex" }}>
                <Box sx={{ width: 4, bgcolor: "#6366f1", flexShrink: 0 }} />
                <Box sx={{ flex: 1, p: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, mb: 0.75, fontSize: 13 }}>📍 {shelf}</Typography>
                  <Stack spacing={0.5}>
                    {Array.isArray(books) && books.map((book: any, j: number) => (
                      <Paper key={j} variant="outlined" sx={{ p: 1, borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 12 }}>{book.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{book.author}</Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              </Box>
            </Paper>
          ))}
        </Stack>
      </Box>
    );
  }

  if (tr.name === "get_schedule_today") {
    const scheduleItems = data?.items || (Array.isArray(data) ? data : []);
    if (scheduleItems.length === 0) {
      return (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "#10b981", bgcolor: alpha("#10b981", 0.04) }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Avatar sx={{ width: 36, height: 36, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", fontSize: 18 }}>✓</Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "#10b981" }}>Hôm nay không có lịch trực</Typography>
              <Typography variant="caption" color="text.secondary">Chưa có nhân viên nào được xếp ca</Typography>
            </Box>
          </Stack>
        </Paper>
      );
    }

    const groupedByShift: Record<string, any[]> = {};
    scheduleItems.forEach((item: any) => {
      const shiftName = item.shift?.name || "Ca khác";
      if (!groupedByShift[shiftName]) groupedByShift[shiftName] = [];
      groupedByShift[shiftName].push(item);
    });

    const shiftMeta: Record<string, { icon: string; gradient: string }> = {
      "Ca sáng": { icon: "🌅", gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" },
      "Ca chiều": { icon: "🌤️", gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" },
      "Ca tối": { icon: "🌙", gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)" },
      "Sáng": { icon: "🌅", gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" },
      "Chiều": { icon: "🌤️", gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" },
      "Tối": { icon: "🌙", gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)" },
    };

    return (
      <Box>
        <Chip label={`📅 Lịch trực hôm nay: ${scheduleItems.length} ca`} size="small" color="primary" sx={{ fontWeight: 800, fontSize: 11, mb: 1, height: 24 }} />
        <Stack spacing={1.5}>
          {Object.entries(groupedByShift).map(([shiftName, items], i) => {
            const meta = shiftMeta[shiftName] || { icon: "📋", gradient: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)" };
            const shiftTime = items[0]?.shift ? `${items[0].shift.startTime?.slice(0, 5)} - ${items[0].shift.endTime?.slice(0, 5)}` : "";
            return (
              <Paper key={i} elevation={0} sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
                <Box sx={{ display: "flex" }}>
                  <Box sx={{ width: 4, background: meta.gradient, flexShrink: 0 }} />
                  <Box sx={{ flex: 1, p: 1.5 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                      <Avatar sx={{ width: 30, height: 30, background: meta.gradient, fontSize: 14 }}>{meta.icon}</Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 800, fontSize: 13 }}>{shiftName}</Typography>
                        {shiftTime && <Typography variant="caption" color="text.secondary">{shiftTime}</Typography>}
                      </Box>
                    </Stack>
                    <Stack spacing={0.75}>
                      {items.map((item: any, j: number) => {
                        const staffName = item.staff?.fullName || item.staff?.email || item.staffId?.slice(0, 8) || "N/A";
                        const zoneName = item.zone?.zoneName || (item.zone?.floor ? `Tầng ${item.zone.floor}` : "");
                        const isCheckedIn = item.staff?.currentStatus === "inside" || !!item.attendance?.checkInAt;
                        return (
                          <Paper key={j} variant="outlined" sx={{ p: 1, borderRadius: 1.5, display: "flex", alignItems: "center", gap: 1, transition: "background 0.15s", "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.04) } }}>
                            <Avatar sx={{ width: 26, height: 26, background: isCheckedIn ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "grey.300", fontSize: 11 }}>
                              {isCheckedIn ? "✓" : "👤"}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, display: "block", lineHeight: 1.3 }}>{staffName}</Typography>
                              {zoneName && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>📍 {zoneName}</Typography>
                              )}
                            </Box>
                            <Chip
                              label={isCheckedIn ? "Đang trực" : item.status === "scheduled" ? "Đã xếp" : item.status}
                              size="small"
                              color={isCheckedIn ? "success" : "default"}
                              sx={{ fontSize: 9, height: 18, fontWeight: 600, borderRadius: 1.5 }}
                            />
                          </Paper>
                        );
                      })}
                    </Stack>
                  </Box>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      </Box>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
      <Chip label={tr.name} size="small" color="primary" variant="outlined" sx={{ fontWeight: 800, fontSize: 10, mb: 0.75, height: 20, borderRadius: 1.5 }} />
      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace", fontSize: 11, whiteSpace: "pre-wrap", maxHeight: 120, overflow: "auto" }}>
        {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
      </Typography>
    </Paper>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  return (
    <Box sx={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", animation: `${fadeInUp} 0.3s ease-out` }}>
      <Box sx={{ display: "flex", gap: 1.5, maxWidth: "80%", flexDirection: isUser ? "row-reverse" : "row" }}>
        <Avatar
          sx={{
            width: 36, height: 36,
            background: isUser ? "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)" : "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
            fontSize: 14, mt: 0.5,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          {isUser ? "👤" : <AssistantIcon sx={{ fontSize: 18 }} />}
        </Avatar>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Paper
            elevation={0}
            sx={{
              px: 2, py: 1.5,
              background: isUser
                ? "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)"
                : "background.paper",
              color: isUser ? "white" : "text.primary",
              border: isUser ? "none" : "1px solid",
              borderColor: isUser ? "transparent" : "divider",
              borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              maxWidth: "100%",
              overflow: "hidden",
              boxShadow: isUser ? "0 2px 12px rgba(99,102,241,0.3)" : "none",
              "& h1, & h2, & h3, & h4": { fontWeight: 800, mt: 1.5, mb: 0.75, lineHeight: 1.3 },
              "& h1": { fontSize: "1.25rem" },
              "& h2": { fontSize: "1.15rem" },
              "& h3": { fontSize: "1.05rem" },
              "& p": { mt: 0.5, mb: 0.5, lineHeight: 1.7 },
              "& ul, & ol": { pl: 2.5, mt: 0.5, mb: 0.5 },
              "& li": { mb: 0.25, lineHeight: 1.6 },
              "& strong": { fontWeight: 800 },
              "& em": { fontStyle: "italic" },
              "& code": { fontFamily: "monospace", bgcolor: isUser ? "rgba(255,255,255,0.15)" : "action.hover", px: 0.5, py: 0.25, borderRadius: 0.5, fontSize: "0.875em" },
              "& pre": { bgcolor: isUser ? "rgba(255,255,255,0.1)" : "action.hover", p: 1.5, borderRadius: 1, overflow: "auto", mt: 1, mb: 1 },
              "& pre code": { bgcolor: "transparent", p: 0 },
              "& table": { width: "100%", borderCollapse: "collapse", mt: 1, mb: 1, fontSize: "0.875rem" },
              "& th": { bgcolor: isUser ? "rgba(255,255,255,0.1)" : "action.hover", fontWeight: 800, textAlign: "left", px: 1.5, py: 1, border: "1px solid", borderColor: isUser ? "rgba(255,255,255,0.2)" : "divider" },
              "& td": { px: 1.5, py: 0.75, border: "1px solid", borderColor: isUser ? "rgba(255,255,255,0.2)" : "divider" },
              "& blockquote": { borderLeft: "3px solid", borderColor: isUser ? "rgba(255,255,255,0.5)" : "primary.main", pl: 1.5, ml: 0, mt: 1, mb: 1, color: isUser ? "rgba(255,255,255,0.8)" : "text.secondary" },
              "& hr": { border: "none", borderTop: `1px solid ${isUser ? "rgba(255,255,255,0.2)" : "divider"}`, my: 1.5 },
              "& a": { color: isUser ? "white" : "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } },
            }}
          >
            {isUser ? (
              <Typography sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{msg.content}</Typography>
            ) : (
              <MessageContent content={msg.content} />
            )}
          </Paper>

          {msg.toolResults && msg.toolResults.length > 0 && (
            <Stack spacing={0.75} sx={{ maxWidth: "100%" }}>
              {msg.toolResults.map((tr, i) => (
                <ToolResultCards key={i} tr={tr} />
              ))}
            </Stack>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, fontSize: 10 }}>
            {msg.timestamp.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
