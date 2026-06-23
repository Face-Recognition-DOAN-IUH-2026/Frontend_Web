"use client";

import { useState, useRef, useEffect } from "react";
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
  List,
  ListItem,
  ListItemText,
  Paper,
  Slide,
  Stack,
  TextField,
  Typography,
  Zoom,
} from "@mui/material";
import SendIcon from "@mui/icons-material/SendOutlined";
import CloseIcon from "@mui/icons-material/CloseOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import AssistantIcon from "@mui/icons-material/SupportAgentOutlined";
import Tooltip from "@mui/material/Tooltip";
import Markdown from "react-markdown";
import api from "@/lib/api-client";
import BookCard, { parseBookCard } from "@/components/BookCard";

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

async function getSession(sessionId: string) {
  const res = await fetch(buildApiUrl(`/sessions/${sessionId}`), {
    headers: getAuthHeaders(),
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
    } catch (err: any) {
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
      content: action === "approve"
        ? "Đang xử lý yêu cầu của bạn..."
        : "Đã hủy thao tác theo yêu cầu của bạn.",
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

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Box sx={{ px: 3, py: 2, borderBottom: `1px solid`, borderColor: "divider", bgcolor: "background.paper" }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Avatar sx={{ bgcolor: "primary.main", width: 40, height: 40 }}>
              <AssistantIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2 }}>Trợ lý AI</Typography>
              <Typography variant="caption" color="text.secondary">meta/llama-3.1-70b-instruct</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            {sessionId ? <Chip label={`Phiên: ${sessionId.slice(0, 8)}...`} size="small" variant="outlined" /> : null}
            <Tooltip title="Xóa cuộc trò chuyện">
              <Button size="small" variant="outlined" color="error" onClick={clearChat}>Xóa chat</Button>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {error ? <Alert severity="error" onClose={() => setError("")} sx={{ m: 2 }}>{error}</Alert> : null}

      <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2 }}>
        <Stack spacing={2}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {loading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, pl: 1 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: 14 }}>
                <AssistantIcon />
              </Avatar>
              <Box sx={{ display: "flex", gap: 0.5 }}>
                {[0, 1, 2].map((i) => (
                  <Box key={i} sx={{
                    width: 8, height: 8, borderRadius: "50%", bgcolor: "primary.main",
                    animation: "bounce 1.4s infinite ease-in-out both",
                    animationDelay: `${i * 0.16}s`,
                    "@keyframes bounce": {
                      "0%, 80%, 100%": { transform: "scale(0)" },
                      "40%": { transform: "scale(1)" },
                    },
                  }} />
                ))}
              </Box>
            </Box>
          )}
          <div ref={bottomRef} />
        </Stack>
      </Box>

      <Box sx={{ p: 2, borderTop: `1px solid`, borderColor: "divider", bgcolor: "background.paper" }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-end" }}>
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
            sx={{ "& .MuiInputBase-root": { pr: 1 } }}
          />
          <IconButton
            color="primary"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            sx={{ bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" }, borderRadius: 2, width: 42, height: 42 }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          </IconButton>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block", textAlign: "center" }}>
          AI có thể sai. Luôn kiểm tra thông tin trước khi hành động.
        </Typography>
      </Box>

      <Dialog open={confirmDialog.open} onClose={() => handleConfirm("reject")} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 1 }}>
          <AutoAwesomeIcon color="primary" />
          Xác nhận thao tác
        </DialogTitle>
        <DialogContent dividers>
          {confirmDialog.pending ? (
            <Stack spacing={1.5}>
              <Alert severity="warning" sx={{ fontWeight: 700 }}>
                Thao tác này sẽ ảnh hưởng đến dữ liệu. Vui lòng xác nhận.
              </Alert>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "background.default" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Mô tả thao tác</Typography>
                <Typography sx={{ whiteSpace: "pre-wrap" }}>{confirmDialog.pending.description}</Typography>
              </Paper>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>HÀNH ĐỘNG</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", mt: 0.5 }}>{confirmDialog.pending.action}</Typography>
              </Box>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => handleConfirm("reject")} variant="outlined" color="error" startIcon={<CancelIcon />}>
            Hủy bỏ
          </Button>
          <Button onClick={() => handleConfirm("approve")} variant="contained" startIcon={<CheckCircleIcon />}>
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
      <Paper variant="outlined" sx={{ p: 2, bgcolor: "#FFF5F5", borderRadius: 2, border: "1px solid", borderColor: "error.main" }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: "error.main", fontSize: 16 }}>✕</Avatar>
          <Box>
            <Chip label={tr.name} size="small" color="error" sx={{ fontWeight: 800, fontSize: 10, mb: 0.5 }} />
            <Typography variant="body2" color="error.main" sx={{ fontSize: 12, fontWeight: 500 }}>
              {tr.result.error}
            </Typography>
          </Box>
        </Stack>
      </Paper>
    );
  }

  if (tr.name === "search_books" && Array.isArray(data)) {
    return (
      <Box>
        <Chip label={`📖 Tìm thấy ${data.length} cuốn sách`} size="small" color="primary" sx={{ fontWeight: 800, fontSize: 11, mb: 1 }} />
        <Stack spacing={1}>
          {data.map((book: any, i: number) => (
            <Paper key={i} elevation={0} sx={{ p: 0, borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
              <Box sx={{ display: "flex", height: "100%" }}>
                <Box sx={{ width: 6, bgcolor: book.is_available ? "success.main" : "warning.main", flexShrink: 0 }} />
                <Box sx={{ flex: 1, p: 1.5 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                    <Avatar sx={{ width: 44, height: 44, bgcolor: "primary.main", fontSize: 20, flexShrink: 0 }}>📖</Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.3, fontSize: 13 }}>{book.title}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.4 }}>{book.author}</Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: "wrap", gap: 0.5 }}>
                        <Chip label={book.categories || "Sách"} size="small" variant="outlined" sx={{ fontSize: 10, height: 20, fontWeight: 600 }} />
                        <Chip label={book.isbn} size="small" variant="outlined" sx={{ fontSize: 10, height: 20, fontFamily: "monospace" }} />
                        <Chip
                          icon={book.is_available ? <span style={{ fontSize: 8 }}>✓</span> : undefined}
                          label={book.is_available ? "Có sẵn" : "Đang mượn"}
                          size="small"
                          color={book.is_available ? "success" : "warning"}
                          sx={{ fontSize: 10, height: 20, fontWeight: 700 }}
                        />
                      </Stack>
                      {book.shelf_location && (
                        <Chip icon={<span style={{ fontSize: 8 }}>📍</span>} label={book.shelf_location} size="small" color="primary" variant="outlined"
                          sx={{ mt: 0.5, fontSize: 10, height: 20, fontWeight: 700, fontFamily: "monospace" }} />
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
        <Paper elevation={0} sx={{ p: 2, bgcolor: "#F0FFF4", borderRadius: 2, border: "1px solid", borderColor: "success.main" }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Avatar sx={{ width: 40, height: 40, bgcolor: "success.main", fontSize: 20 }}>✓</Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "success.main" }}>Không có sách quá hạn</Typography>
              <Typography variant="caption" color="text.secondary">Tất cả sách đều trong hạn trả</Typography>
            </Box>
          </Stack>
        </Paper>
      );
    }
    return (
      <Box>
        <Chip label={`⚠️ ${data.length} sách quá hạn`} size="small" color="error" sx={{ fontWeight: 800, fontSize: 11, mb: 1 }} />
        <Stack spacing={1}>
          {data.map((item: any, i: number) => (
            <Paper key={i} elevation={0} sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "error.main" }}>
              <Box sx={{ display: "flex" }}>
                <Box sx={{ width: 6, bgcolor: "error.main", flexShrink: 0 }} />
                <Box sx={{ flex: 1, p: 1.5, bgcolor: "#FFF5F5" }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: "error.main", fontSize: 18, flexShrink: 0 }}>⚠️</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, fontSize: 13 }}>{item.book?.title || "N/A"}</Typography>
                      <Typography variant="caption" color="text.secondary">Độc giả: {item.patron_id?.slice(0, 8)}...</Typography>
                      <Chip icon={<span style={{ fontSize: 8 }}>⏰</span>} label={`Quá hạn: ${item.due_at ? new Date(item.due_at).toLocaleDateString("vi-VN") : "N/A"}`}
                        size="small" color="error" sx={{ mt: 0.5, fontSize: 10, height: 20, fontWeight: 700 }} />
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
        <Paper elevation={0} sx={{ p: 2, bgcolor: "#F0FFF4", borderRadius: 2, border: "1px solid", borderColor: "success.main" }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Avatar sx={{ width: 40, height: 40, bgcolor: "success.main", fontSize: 20 }}>✓</Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "success.main" }}>Không sách đang mượn</Typography>
              <Typography variant="caption" color="text.secondary">Độc giả chưa mượn cuốn nào</Typography>
            </Box>
          </Stack>
        </Paper>
      );
    }
    return (
      <Box>
        <Chip label={`📚 ${data.length} sách đang mượn`} size="small" color="info" sx={{ fontWeight: 800, fontSize: 11, mb: 1 }} />
        <Stack spacing={1}>
          {data.map((item: any, i: number) => (
            <Paper key={i} elevation={0} sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
              <Box sx={{ display: "flex" }}>
                <Box sx={{ width: 6, bgcolor: "info.main", flexShrink: 0 }} />
                <Box sx={{ flex: 1, p: 1.5 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: "info.main", fontSize: 18, flexShrink: 0 }}>📚</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, fontSize: 13 }}>{item.book?.title || "N/A"}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.book?.author}</Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.5 }}>
                        <Chip label={item.status === "borrowed" ? "Đang mượn" : "Đã trả"}
                          size="small" color={item.status === "borrowed" ? "warning" : "success"}
                          sx={{ fontSize: 10, height: 20, fontWeight: 700 }} />
                        {item.due_at && (
                          <Chip label={`Hạn: ${new Date(item.due_at).toLocaleDateString("vi-VN")}`}
                            size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
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
        <Chip label="📍 Vị trí sách trên kệ" size="small" color="primary" sx={{ fontWeight: 800, fontSize: 11, mb: 1 }} />
        <Stack spacing={1}>
          {Object.entries(data).map(([shelf, books]: [string, any], i: number) => (
            <Paper key={i} elevation={0} sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
              <Box sx={{ display: "flex" }}>
                <Box sx={{ width: 6, bgcolor: "primary.main", flexShrink: 0 }} />
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
        <Paper elevation={0} sx={{ p: 2, bgcolor: "#F0FFF4", borderRadius: 2, border: "1px solid", borderColor: "success.main" }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Avatar sx={{ width: 40, height: 40, bgcolor: "success.main", fontSize: 20 }}>✓</Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "success.main" }}>Hôm nay không có lịch trực</Typography>
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

    const shiftMeta: Record<string, { icon: string; color: string }> = {
      "Ca sáng": { icon: "🌅", color: "#FF9800" },
      "Ca chiều": { icon: "🌤️", color: "#2196F3" },
      "Ca tối": { icon: "🌙", color: "#7C4DFF" },
      "Sáng": { icon: "🌅", color: "#FF9800" },
      "Chiều": { icon: "🌤️", color: "#2196F3" },
      "Tối": { icon: "🌙", color: "#7C4DFF" },
    };

    return (
      <Box>
        <Chip label={`📅 Lịch trực hôm nay: ${scheduleItems.length} ca`} size="small" color="primary" sx={{ fontWeight: 800, fontSize: 11, mb: 1 }} />
        <Stack spacing={1.5}>
          {Object.entries(groupedByShift).map(([shiftName, items], i) => {
            const meta = shiftMeta[shiftName] || { icon: "📋", color: "#757575" };
            const shiftTime = items[0]?.shift ? `${items[0].shift.startTime?.slice(0, 5)} - ${items[0].shift.endTime?.slice(0, 5)}` : "";
            return (
              <Paper key={i} elevation={0} sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
                <Box sx={{ display: "flex" }}>
                  <Box sx={{ width: 6, bgcolor: meta.color, flexShrink: 0 }} />
                  <Box sx={{ flex: 1, p: 1.5 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: meta.color, fontSize: 16 }}>{meta.icon}</Avatar>
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
                          <Paper key={j} variant="outlined" sx={{ p: 1, borderRadius: 1, display: "flex", alignItems: "center", gap: 1 }}>
                            <Avatar sx={{ width: 28, height: 28, bgcolor: isCheckedIn ? "success.main" : "grey.300", fontSize: 11 }}>
                              {isCheckedIn ? "✓" : "👤"}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, display: "block", lineHeight: 1.3 }}>
                                {staffName}
                              </Typography>
                              {item.staff?.email && item.staff?.fullName && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, display: "block" }}>
                                  {item.staff.email}
                                </Typography>
                              )}
                              {zoneName && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                                  📍 {zoneName}
                                </Typography>
                              )}
                            </Box>
                            <Chip
                              label={isCheckedIn ? "Đang trực" : item.status === "scheduled" ? "Đã xếp" : item.status}
                              size="small"
                              color={isCheckedIn ? "success" : "default"}
                              sx={{ fontSize: 9, height: 18, fontWeight: 600 }}
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
    <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "background.default", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
      <Chip label={tr.name} size="small" color="primary" variant="outlined" sx={{ fontWeight: 800, fontSize: 10, mb: 0.75 }} />
      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace", fontSize: 11, whiteSpace: "pre-wrap", maxHeight: 120, overflow: "auto" }}>
        {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
      </Typography>
    </Paper>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  return (
    <Box sx={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <Box sx={{ display: "flex", gap: 1.5, maxWidth: "80%", flexDirection: isUser ? "row-reverse" : "row" }}>
        <Avatar sx={{ width: 36, height: 36, bgcolor: isUser ? "secondary.main" : "primary.main", fontSize: 14, mt: 0.5 }}>
          {isUser ? "👤" : <AssistantIcon sx={{ fontSize: 18 }} />}
        </Avatar>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          <Paper
            elevation={0}
            sx={{
              px: 2, py: 1.5,
              bgcolor: isUser ? "secondary.main" : "background.paper",
              color: isUser ? "secondary.contrastText" : "text.primary",
              border: `1px solid ${isUser ? "transparent" : "divider"}`,
              borderRadius: isUser ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
              maxWidth: "100%",
              overflow: "hidden",
              "& h1, & h2, & h3, & h4": { fontWeight: 800, mt: 1.5, mb: 0.75, lineHeight: 1.3 },
              "& h1": { fontSize: "1.25rem" },
              "& h2": { fontSize: "1.15rem" },
              "& h3": { fontSize: "1.05rem" },
              "& p": { mt: 0.5, mb: 0.5, lineHeight: 1.7 },
              "& ul, & ol": { pl: 2.5, mt: 0.5, mb: 0.5 },
              "& li": { mb: 0.25, lineHeight: 1.6 },
              "& strong": { fontWeight: 800 },
              "& em": { fontStyle: "italic" },
              "& code": { fontFamily: "monospace", bgcolor: "action.hover", px: 0.5, py: 0.25, borderRadius: 0.5, fontSize: "0.875em" },
              "& pre": { bgcolor: "action.hover", p: 1.5, borderRadius: 1, overflow: "auto", mt: 1, mb: 1 },
              "& pre code": { bgcolor: "transparent", p: 0 },
              "& table": { width: "100%", borderCollapse: "collapse", mt: 1, mb: 1, fontSize: "0.875rem" },
              "& th": { bgcolor: "action.hover", fontWeight: 800, textAlign: "left", px: 1.5, py: 1, border: "1px solid", borderColor: "divider" },
              "& td": { px: 1.5, py: 0.75, border: "1px solid", borderColor: "divider" },
              "& tr:nth-of-type(even)": { bgcolor: "action.hover" },
              "& blockquote": { borderLeft: "3px solid", borderColor: "primary.main", pl: 1.5, ml: 0, mt: 1, mb: 1, color: "text.secondary" },
              "& hr": { border: "none", borderTop: "1px solid", borderColor: "divider", my: 1.5 },
              "& a": { color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } },
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