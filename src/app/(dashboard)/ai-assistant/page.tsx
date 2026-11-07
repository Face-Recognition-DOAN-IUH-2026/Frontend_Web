"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import SendIcon from "@mui/icons-material/SendOutlined";
import AssistantIcon from "@mui/icons-material/SupportAgentOutlined";
import WarningIcon from "@mui/icons-material/WarningAmberOutlined";
import GroupsIcon from "@mui/icons-material/GroupsOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTimeOutlined";
import RuleIcon from "@mui/icons-material/GavelOutlined";
import ScheduleIcon from "@mui/icons-material/CalendarTodayOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import SmartToyIcon from "@mui/icons-material/SmartToyOutlined";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import CopyIcon from "@mui/icons-material/ContentCopyOutlined";
import CheckIcon from "@mui/icons-material/CheckOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";

import Markdown from "react-markdown";
import PageHeader from "@/app/(dashboard)/_components/ui/PageHeader";
import DashboardCard from "@/app/(dashboard)/_components/ui/DashboardCard";
import EmptyState from "@/app/(dashboard)/_components/ui/EmptyState";
import LoadingOverlay from "@/app/(dashboard)/_components/ui/LoadingOverlay";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import api from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import BookCard, { parseBookCard } from "@/app/(dashboard)/_components/BookCard";
import LibraryHoursCard, { type LibraryScheduleData } from "@/app/(dashboard)/_components/AIWidget/cards/LibraryHoursCard";
import { fadeInUp } from "@/lib/animations";
import type { AIToolSummary } from "@/lib/types";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolResults?: ToolResult[];
  timestamp: Date;
}

interface ToolResult {
  name: string;
  result: { success: boolean; data?: any; error?: string };
}

const STORAGE_KEY = "ai-assistant-session";

const SUGGESTIONS = [
  { label: "Tìm sách về AI", icon: <SearchIcon sx={{ fontSize: 16 }} />, color: "#0A2540" },
  { label: "Lịch trực hôm nay", icon: <ScheduleIcon sx={{ fontSize: 16 }} />, color: "#8B0000" },
  { label: "Sách quá hạn", icon: <WarningIcon sx={{ fontSize: 16 }} />, color: "#DC2626" },
  { label: "Giờ mở cửa", icon: <AccessTimeIcon sx={{ fontSize: 16 }} />, color: "#059669" },
  { label: "Quy định mượn trả", icon: <RuleIcon sx={{ fontSize: 16 }} />, color: "#D97706" },
  { label: "Độc giả trong thư viện", icon: <GroupsIcon sx={{ fontSize: 16 }} />, color: "#0F3C5C" },
];

async function chat(message: string, sessionId?: string, role?: string) {
  // Endpoint theo role (staff -> /api/ai/staff/chat, admin -> /api/ai/admin/chat),
  // khop voi tool registry da tach theo role trong ai-service.
  // Doc gia (patron) khong dung trang nay — dung chatbot n8n.
  return api.askAiChat(message, sessionId, role);
}

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

function parseAiSegments(content: string): Array<
  | { type: "text"; content: string }
  | { type: "book_card"; bookData: any }
  | { type: "library_hours"; scheduleData: LibraryScheduleData }
> {
  if (!content) return [];

  const sched = extractSchedule(content);
  if (sched.scheduleData) {
    const beforeSegments = sched.before ? parseAiSegments(sched.before) : [];
    const afterSegments = sched.after ? parseAiSegments(sched.after) : [];
    return [
      ...beforeSegments,
      { type: "library_hours", scheduleData: sched.scheduleData },
      ...afterSegments,
    ];
  }

  const parsedBook = parseBookCard(content);
  if (parsedBook.bookData) {
    const beforeSegments = parsedBook.before ? parseAiSegments(parsedBook.before) : [];
    const afterSegments = parsedBook.after ? parseAiSegments(parsedBook.after) : [];
    return [
      ...beforeSegments,
      { type: "book_card", bookData: parsedBook.bookData },
      ...afterSegments,
    ];
  }

  const trimmed = content.trim();
  return trimmed ? [{ type: "text", content: trimmed }] : [];
}

function MessageContent({ content }: { content: string }) {
  const segments = parseAiSegments(content);
  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.type === "book_card") {
          return <BookCard key={idx} data={seg.bookData} />;
        }
        if (seg.type === "library_hours") {
          return <LibraryHoursCard key={idx} data={seg.scheduleData} />;
        }
        return <Markdown key={idx}>{seg.content}</Markdown>;
      })}
    </>
  );
}

export default function AiAssistantPage() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [tools, setTools] = useState<AIToolSummary[]>([]);
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getAiTools().then(setTools).catch(() => {});
  }, [user?.role]);

  const roleSuggestions = useMemo(() => {
    const role = user?.role || "patron";
    if (role === "admin") {
      return [
        { label: "Tất cả ca trực hôm nay", icon: <ScheduleIcon sx={{ fontSize: 16 }} />, color: "#8B0000", prompt: "Xem tất cả lịch trực của nhân viên hôm nay" },
        { label: "Sách quá hạn", icon: <WarningIcon sx={{ fontSize: 16 }} />, color: "#DC2626", prompt: "Danh sách sách đang mượn quá hạn" },
        { label: "Độc giả trong thư viện", icon: <GroupsIcon sx={{ fontSize: 16 }} />, color: "#0F3C5C", prompt: "Hiện có bao nhiêu bạn đọc đang ở trong thư viện?" },
        { label: "Tìm sách AI", icon: <SearchIcon sx={{ fontSize: 16 }} />, color: "#0A2540", prompt: "Tìm sách về Trí tuệ nhân tạo và Machine Learning" },
        { label: "Quy định mượn trả", icon: <RuleIcon sx={{ fontSize: 16 }} />, color: "#D97706", prompt: "Cho tôi biết quy định mượn trả sách và thời hạn tối đa" },
      ];
    }
    if (role === "staff") {
      return [
        { label: "Lịch trực của tôi hôm nay", icon: <ScheduleIcon sx={{ fontSize: 16 }} />, color: "#8B0000", prompt: "Xem lịch trực của tôi hôm nay" },
        { label: "Sách quá hạn", icon: <WarningIcon sx={{ fontSize: 16 }} />, color: "#DC2626", prompt: "Danh sách sách đang mượn quá hạn" },
        { label: "Giờ mở cửa", icon: <AccessTimeIcon sx={{ fontSize: 16 }} />, color: "#059669", prompt: "Giờ mở cửa phục vụ của thư viện hôm nay" },
        { label: "Độc giả trong thư viện", icon: <GroupsIcon sx={{ fontSize: 16 }} />, color: "#0F3C5C", prompt: "Hiện có bao nhiêu bạn đọc đang ở trong thư viện?" },
        { label: "Tìm giáo trình CNTT", icon: <SearchIcon sx={{ fontSize: 16 }} />, color: "#0A2540", prompt: "Tìm sách giáo trình Công nghệ thông tin" },
      ];
    }
    return [
      { label: "Tìm sách Lập trình & AI", icon: <SearchIcon sx={{ fontSize: 16 }} />, color: "#0A2540", prompt: "Tìm cho tôi sách về Lập trình và Trí tuệ nhân tạo" },
      { label: "Giờ mở cửa thư viện", icon: <AccessTimeIcon sx={{ fontSize: 16 }} />, color: "#059669", prompt: "Thư viện mở cửa vào những khung giờ nào?" },
      { label: "Quy định mượn sách", icon: <RuleIcon sx={{ fontSize: 16 }} />, color: "#D97706", prompt: "Sinh viên được mượn tối đa bao nhiêu cuốn sách và trong bao lâu?" },
      { label: "Vị trí phòng đọc", icon: <GroupsIcon sx={{ fontSize: 16 }} />, color: "#0F3C5C", prompt: "Phòng đọc và các khu vực tự học nằm ở tầng mấy?" },
    ];
  }, [user?.role]);

  // Dynamic storage key isolated per user
  const currentStorageKey = useMemo(() => {
    return user?.id ? `ai-assistant-session_${user.id}` : "ai-assistant-session_guest";
  }, [user?.id]);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(currentStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.sessionId) setSessionId(parsed.sessionId);
        if (Array.isArray(parsed.messages) && parsed.messages.length) {
          setMessages(
            parsed.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
          );
        } else {
          initDefaultGreeting();
        }
      } catch {
        initDefaultGreeting();
      }
    } else {
      initDefaultGreeting();
    }
  }, [currentStorageKey]);

  const initDefaultGreeting = () => {
    setSessionId("");
    setMessages([
      {
        id: "1",
        role: "assistant",
        content:
          "Xin chào! Tôi là Trợ lý AI của Thư viện IUH. Tôi có thể hỗ trợ bạn:\n\n• Tìm kiếm sách và vị trí kệ\n• Trả lời câu hỏi về thư viện (giờ mở cửa, quy định mượn trả, chính sách phạt...)\n• Tra cứu thông tin độc giả và lịch sử mượn\n• Xem lịch trực nhân viên hôm nay\n• Đề xuất sách theo nhu cầu\n\nBạn cần tôi giúp gì?",
        timestamp: new Date(),
      },
    ]);
  };

  useEffect(() => {
    if (mounted && currentStorageKey) {
      localStorage.setItem(currentStorageKey, JSON.stringify({ sessionId, messages }));
    }
  }, [sessionId, messages, mounted, currentStorageKey]);

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
    setError("");

    try {
      const data = await chat(textToSend, sessionId || undefined, user?.role);
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
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.message || e?.response?.data?.error;
      const isTimeout = e?.code === "ECONNABORTED" || e?.message?.includes("timeout");
      setError(
        status === 401
          ? "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."
          : status === 403
            ? "Tài khoản của bạn không có quyền dùng kênh chat này."
            : status === 429
              ? "Hệ thống đang bận. Vui lòng thử lại sau vài giây."
              : status === 503
                ? "Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau."
                : isTimeout
                  ? "AI phản hồi quá lâu (quá 60s). Vui lòng thử lại câu hỏi ngắn hơn."
                  : (detail || "Không thể kết nối AI. Vui lòng thử lại."),
      );
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: "assistant",
        content: "Đã bắt đầu cuộc trò chuyện mới. Tôi có thể giúp gì cho bạn hôm nay?",
        timestamp: new Date(),
      },
    ]);
    setSessionId("");
    if (currentStorageKey) {
      localStorage.removeItem(currentStorageKey);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const stats = [
    { key: "msg", label: "Tin nhắn", value: messages.length, gradient: "linear-gradient(135deg, #8B0000 0%, #700000 100%)" },
    { key: "session", label: "Phiên", value: sessionId ? sessionId.slice(0, 6) : "Mới", gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)" },
    { key: "status", label: "Trạng thái", value: loading ? "Xử lý..." : "Sẵn sàng", gradient: "linear-gradient(135deg, #D97706 0%, #B45309 100%)" },
  ];

  const showEmpty = messages.length <= 1 && messages[0]?.role === "assistant";

  const statBadges = stats
    .map((s) => `${s.label}: ${typeof s.value === "number" ? s.value.toLocaleString("vi-VN") : s.value}`)
    .join(" • ");

  return (
    <Stack spacing={3} sx={{ height: "100%", overflow: "hidden" }}>
      <PageHeader
        title="AI Trợ lý"
        icon={SmartToyIcon}
        statBadges={statBadges}
        onRefresh={clearChat}
        actions={
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<BuildOutlinedIcon />}
              onClick={() => setToolsModalOpen(true)}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 1.5,
              }}
            >
              Công cụ AI ({tools.length})
            </Button>

            {isAdmin && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<AutoStoriesOutlinedIcon />}
                onClick={() => router.push("/knowledge-base")}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 1.5,
                  borderColor: "#0A2540",
                  color: "#0A2540",
                  bgcolor: alpha("#0A2540", 0.04),
                  "&:hover": {
                    bgcolor: alpha("#0A2540", 0.1),
                  },
                }}
              >
                Kho tri thức RAG
              </Button>
            )}

            <Button
              variant="outlined"
              size="small"
              startIcon={<AddCommentOutlinedIcon />}
              onClick={clearChat}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 1.5,
                borderColor: "primary.main",
                color: "primary.main",
                bgcolor: alpha("#8B0000", 0.04),
                "&:hover": {
                  bgcolor: alpha("#8B0000", 0.1),
                  borderColor: "primary.main",
                },
              }}
            >
              Đoạn chat mới
            </Button>
            {sessionId ? (
              <Chip
                label={`Phiên: ${sessionId.slice(0, 8)}...`}
                size="small"
                sx={{ color: "text.secondary", borderColor: "divider", fontWeight: 600, fontSize: "0.72rem" }}
                variant="outlined"
              />
            ) : null}
          </Stack>
        }
      />

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", m: 0, borderRadius: 0 }}>
        <DashboardCard noPadding>
        <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2 }}>
          <Stack spacing={2.5}>
            {showEmpty ? (
              <EmptyState
                icon={
                  <Avatar sx={{ width: 72, height: 72, bgcolor: "rgba(139,0,0,0.12)", border: "2px solid rgba(139,0,0,0.25)" }}>
                    <SmartToyIcon sx={{ fontSize: 36, color: "primary.main" }} />
                  </Avatar>
                }
                title="Trợ lý AI Thư viện IUH"
                description="Hỏi tôi về sách, lịch trực, quy định thư viện, vị trí phòng đọc..."
                action={
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center", maxWidth: 640, mx: "auto" }}>
                    {roleSuggestions.map((s) => (
                      <Button
                        key={s.label}
                        startIcon={s.icon}
                        variant="outlined"
                        size="small"
                        onClick={() => sendMessage(s.prompt || s.label)}
                        sx={{
                          borderRadius: 99,
                          borderColor: alpha(s.color, 0.4),
                          color: s.color,
                          fontWeight: 600,
                          fontSize: "0.78rem",
                          textTransform: "none",
                          "&:hover": {
                            borderColor: s.color,
                            bgcolor: alpha(s.color, 0.08),
                          },
                        }}
                      >
                        {s.label}
                      </Button>
                    ))}
                  </Box>
                }
              />
            ) : (
              messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
            )}

            <LoadingOverlay loading={loading} message="AI đang suy nghĩ..." />

            <div ref={bottomRef} />
          </Stack>
        </Box>

        <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider", bgcolor: "background.paper" }}>
          {error ? (
            <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          ) : null}

          {/* Quick Suggestions Chips Bar */}
          <Box
            sx={{
              display: "flex",
              gap: 1,
              overflowX: "auto",
              pb: 1.25,
              mb: 1,
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {roleSuggestions.map((s) => (
              <Chip
                key={s.label}
                icon={s.icon}
                label={s.label}
                size="small"
                onClick={() => sendMessage(s.prompt || s.label)}
                clickable
                sx={{
                  borderRadius: 99,
                  borderColor: alpha(s.color, 0.35),
                  color: s.color,
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  bgcolor: alpha(s.color, 0.04),
                  flexShrink: 0,
                  "&:hover": {
                    borderColor: s.color,
                    bgcolor: alpha(s.color, 0.1),
                  },
                }}
              />
            ))}
          </Box>

          <Paper
            variant="outlined"
            sx={{
              p: 1,
              borderRadius: 3,
              borderColor: "divider",
              transition: "border-color 0.2s, box-shadow 0.2s",
              "&:focus-within": { borderColor: "primary.main", boxShadow: "0 0 0 2px rgba(139,0,0,0.12)" },
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "flex-end" }}>
              <TextField
                inputRef={inputRef}
                placeholder="Hỏi tôi về thư viện, sách, lịch trực, chính sách..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                multiline
                maxRows={4}
                fullWidth
                disabled={loading}
                size="small"
                variant="standard"
                slotProps={{ inputLabel: { shrink: true } }}
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
                  background: "linear-gradient(135deg, #8B0000 0%, #700000 100%)",
                  color: "white",
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  boxShadow: "0 4px 14px rgba(139,0,0,0.3)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    background: "linear-gradient(135deg, #700000 0%, #500000 100%)",
                    transform: "scale(1.05)",
                    boxShadow: "0 6px 20px rgba(139,0,0,0.4)",
                  },
                  "&:disabled": {
                    background: "action.disabledBackground",
                    boxShadow: "none",
                    transform: "none",
                  },
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
      </DashboardCard>
      </Box>

      {/* AI Tools Dialog */}
      <Dialog
        open={toolsModalOpen}
        onClose={() => setToolsModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1.5 }}>
          <BuildOutlinedIcon color="primary" />
          Công Cụ AI Khả Dụng ({user?.role?.toUpperCase() || "PATRON"})
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Dưới đây là các công cụ mà Trợ lý AI có thể tự động gọi để hỗ trợ bạn dựa trên quyền hạn tài khoản:
          </Typography>

          <List sx={{ pt: 0 }}>
            {tools.map((t, idx) => (
              <Paper
                key={t.name}
                variant="outlined"
                sx={{
                  p: 1.5,
                  mb: 1.5,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.5,
                  bgcolor: alpha(theme.palette.primary.main, 0.02),
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: "primary.main",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    mt: 0.5,
                  }}
                >
                  <SmartToyIcon sx={{ fontSize: 18 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {t.name}
                    </Typography>
                    <Chip label={`#${idx + 1}`} size="small" sx={{ height: 20, fontSize: "0.68rem" }} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {t.description}
                  </Typography>
                </Box>
              </Paper>
            ))}

            {tools.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
                Đang tải danh sách công cụ...
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setToolsModalOpen(false)} sx={{ textTransform: "none", fontWeight: 700 }}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
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

  if (tr.name === "get_library_hours") {
    const sched = data?.schedule
      ? data
      : data?.data?.schedule
      ? data.data
      : null;
    if (sched) {
      return <LibraryHoursCard data={sched} />;
    }
  }

  if ((tr.name === "search_books" || tr.name === "lookup_book") && data) {
    const books = Array.isArray(data)
      ? data
      : data.book
      ? [data.book]
      : data.title
      ? [data]
      : [];
    if (books.length > 0) {
      return (
        <Box>
          <Chip
            label={tr.name === "lookup_book" ? "📖 Chi tiết sách" : `📖 Tìm thấy ${books.length} cuốn sách`}
            size="small"
            color="primary"
            sx={{ fontWeight: 800, fontSize: 11, mb: 1, height: 24 }}
          />
          <Stack spacing={1}>
            {books.map((book: any, i: number) => (
              <Paper key={i} elevation={0} sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
                <Box sx={{ display: "flex" }}>
                  <Box sx={{ width: 4, bgcolor: book.is_available ? "#10b981" : "#f59e0b", flexShrink: 0 }} />
                  <Box sx={{ flex: 1, p: 1.5 }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                      <Avatar sx={{ width: 40, height: 40, background: "linear-gradient(135deg, #8B0000 0%, #700000 100%)", fontSize: 18, flexShrink: 0, boxShadow: "0 2px 8px rgba(139,0,0,0.2)" }}>📖</Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.3, fontSize: 13 }}>{book.title}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.4 }}>{book.author}</Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: "wrap", gap: 0.5 }}>
                          <Chip label={book.categories || "Sách"} size="small" variant="outlined" sx={{ fontSize: 10, height: 20, fontWeight: 600, borderRadius: 1.5 }} />
                          {book.isbn && <Chip label={book.isbn} size="small" variant="outlined" sx={{ fontSize: 10, height: 20, fontFamily: "monospace", borderRadius: 1.5 }} />}
                          <Chip label={book.is_available !== false ? "Có sẵn" : "Đang mượn"} size="small" color={book.is_available !== false ? "success" : "warning"} sx={{ fontSize: 10, height: 20, fontWeight: 700, borderRadius: 1.5 }} />
                        </Stack>
                        {book.shelf_location ? (
                          <Chip label={`📍 ${book.shelf_location}`} size="small" color="primary" variant="outlined" sx={{ mt: 0.5, fontSize: 10, height: 20, fontWeight: 700, fontFamily: "monospace", borderRadius: 1.5 }} />
                        ) : null}
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
                      <Chip
                        label={`⏰ Quá hạn: ${item.due_at ? new Date(item.due_at).toLocaleDateString("vi-VN") : "N/A"}`}
                        size="small"
                        color="error"
                        sx={{ mt: 0.5, fontSize: 10, height: 20, fontWeight: 700, borderRadius: 1.5 }}
                      />
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

  if (
    (tr.name === "get_patron_borrows" ||
      tr.name === "get_my_borrows" ||
      tr.name === "get_my_history" ||
      tr.name === "get_patron_history_by_id") &&
    Array.isArray(data)
  ) {
    if (data.length === 0) {
      return (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "#10b981", bgcolor: alpha("#10b981", 0.04) }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Avatar sx={{ width: 36, height: 36, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", fontSize: 18 }}>✓</Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "#10b981" }}>Không có sách mượn / lịch sử</Typography>
              <Typography variant="caption" color="text.secondary">Độc giả chưa có bản ghi mượn trả</Typography>
            </Box>
          </Stack>
        </Paper>
      );
    }
    return (
      <Box>
        <Chip label={`📚 Danh sách sách (${data.length} cuốn)`} size="small" color="info" sx={{ fontWeight: 800, fontSize: 11, mb: 1, height: 24 }} />
        <Stack spacing={1}>
          {data.map((item: any, i: number) => (
            <Paper key={i} elevation={0} sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
              <Box sx={{ display: "flex" }}>
                <Box sx={{ width: 4, bgcolor: "primary.main", flexShrink: 0 }} />
                <Box sx={{ flex: 1, p: 1.5 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                    <Avatar sx={{ width: 36, height: 36, background: "linear-gradient(135deg, #8B0000 0%, #0A2540 100%)", fontSize: 16, flexShrink: 0 }}>📚</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, fontSize: 13 }}>{item.book?.title || item.title || "N/A"}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.book?.author || item.author || ""}</Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.5 }}>
                        <Chip label={item.status === "borrowed" ? "Đang mượn" : "Đã trả"} size="small" color={item.status === "borrowed" ? "warning" : "success"} sx={{ fontSize: 10, height: 20, fontWeight: 700, borderRadius: 1.5 }} />
                        {item.due_at ? (
                          <Chip label={`Hạn: ${new Date(item.due_at).toLocaleDateString("vi-VN")}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 20, borderRadius: 1.5 }} />
                        ) : null}
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

  if (
    (tr.name === "get_my_patron_info" || tr.name === "get_patron_info_by_id") &&
    data &&
    (data.full_name || data.email || data.name)
  ) {
    return (
      <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Avatar sx={{ width: 42, height: 42, background: "linear-gradient(135deg, #0A2540 0%, #0F3C5C 100%)", fontWeight: 700, fontSize: 16 }}>
            {(data.full_name || data.name || data.email || "ĐG").slice(0, 2).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {data.full_name || data.name || "Thông tin độc giả"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              {data.email} {data.patron_code ? `• Mã SV: ${data.patron_code}` : ""}
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.5 }}>
              <Chip
                label={data.status === "active" ? "Đang hoạt động" : data.status || "Hoạt động"}
                size="small"
                color={data.status === "active" ? "success" : "default"}
                sx={{ height: 20, fontSize: 10, fontWeight: 700, borderRadius: 1.5 }}
              />
              {data.membership_type && (
                <Chip label={`Hạng: ${data.membership_type}`} size="small" variant="outlined" sx={{ height: 20, fontSize: 10, borderRadius: 1.5 }} />
              )}
            </Stack>
          </Box>
        </Stack>
      </Paper>
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
                <Box sx={{ width: 4, bgcolor: "secondary.main", flexShrink: 0 }} />
                <Box sx={{ flex: 1, p: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, mb: 0.75, fontSize: 13 }}>📍 {shelf}</Typography>
                  <Stack spacing={0.5}>
                    {Array.isArray(books) ? books.map((book: any, j: number) => (
                      <Paper key={j} variant="outlined" sx={{ p: 1, borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 12 }}>{book.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{book.author}</Typography>
                      </Paper>
                    )) : null}
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
      "Ca sáng": { icon: "🌅", gradient: "linear-gradient(135deg, #D4AF37 0%, #B89628 100%)" },
      "Ca chiều": { icon: "🌤️", gradient: "linear-gradient(135deg, #0A2540 0%, #0F3C5C 100%)" },
      "Ca tối": { icon: "🌙", gradient: "linear-gradient(135deg, #8B0000 0%, #700000 100%)" },
      "Sáng": { icon: "🌅", gradient: "linear-gradient(135deg, #D4AF37 0%, #B89628 100%)" },
      "Chiều": { icon: "🌤️", gradient: "linear-gradient(135deg, #0A2540 0%, #0F3C5C 100%)" },
      "Tối": { icon: "🌙", gradient: "linear-gradient(135deg, #8B0000 0%, #700000 100%)" },
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
                        {shiftTime ? <Typography variant="caption" color="text.secondary">{shiftTime}</Typography> : null}
                      </Box>
                    </Stack>
                    <Stack spacing={0.75}>
                      {items.map((item: any, j: number) => {
                        const staffName = item.staff?.fullName || item.staff?.email || item.staffId?.slice(0, 8) || "N/A";
                        const zoneName = item.zone?.zoneName || (item.zone?.floor ? `Tầng ${item.zone.floor}` : "");
                        const isCheckedIn = item.staff?.currentStatus === "inside" || !!item.attendance?.checkInAt;
                        return (
                          <Paper key={j} variant="outlined" sx={{ p: 1, borderRadius: 1.5, display: "flex", alignItems: "center", gap: 1, transition: "background 0.15s", "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.04) } }}>
                            <Avatar sx={{ width: 26, height: 26, background: isCheckedIn ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "grey.300", fontSize: 11 }}>{isCheckedIn ? "✓" : "👤"}</Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, display: "block", lineHeight: 1.3 }}>{staffName}</Typography>
                              {zoneName ? (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>📍 {zoneName}</Typography>
                              ) : null}
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

  // An raw tool payload — chi hien thi curated cards (BookCard, LibraryHoursCard,
  // lich truc, qua han, thong tin doc gia). Khong do JSON tho ra UI.
  return null;
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(msg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Box sx={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", animation: `${fadeInUp} 0.3s ease-out` }}>
      <Box
        sx={{
          display: "flex",
          gap: { xs: 1, sm: 1.5 },
          maxWidth: { xs: "96%", sm: "88%", md: "82%" },
          flexDirection: isUser ? "row-reverse" : "row",
          alignItems: "flex-start",
        }}
      >
        <Avatar
          sx={{
            width: { xs: 32, sm: 36 },
            height: { xs: 32, sm: 36 },
            background: isUser
              ? "linear-gradient(135deg, #0A2540 0%, #0F3C5C 100%)"
              : "linear-gradient(135deg, #8B0000 0%, #700000 100%)",
            fontSize: 14,
            mt: 0.25,
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            flexShrink: 0,
          }}
        >
          {isUser ? "👤" : <AssistantIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />}
        </Avatar>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, flex: 1, minWidth: 0 }}>
          <Paper
            elevation={0}
            sx={{
              px: { xs: 1.75, sm: 2.25 },
              py: { xs: 1.25, sm: 1.75 },
              bgcolor: isUser
                ? "primary.main"
                : (theme) => (theme.palette.mode === "dark" ? "#1E293B" : "#FFFFFF"),
              background: isUser
                ? "linear-gradient(135deg, #8B0000 0%, #700000 100%)"
                : undefined,
              color: isUser ? "#FFFFFF" : "text.primary",
              border: isUser ? "none" : "1px solid",
              borderColor: isUser
                ? "transparent"
                : (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
              borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              boxShadow: isUser
                ? "0 3px 12px rgba(139,0,0,0.22)"
                : (theme) =>
                    theme.palette.mode === "dark"
                      ? "0 2px 8px rgba(0,0,0,0.3)"
                      : "0 2px 8px rgba(15,23,42,0.04)",
              maxWidth: "100%",
              overflow: "hidden",
              wordBreak: "break-word",
              "& h1, & h2, & h3, & h4": { fontWeight: 800, mt: 1.5, mb: 0.75, lineHeight: 1.35 },
              "& h1": { fontSize: { xs: "1.15rem", sm: "1.25rem" } },
              "& h2": { fontSize: { xs: "1.05rem", sm: "1.15rem" } },
              "& h3": { fontSize: { xs: "0.95rem", sm: "1.05rem" } },
              "& p": { mt: 0.5, mb: 0.5, lineHeight: 1.7, fontSize: { xs: "0.875rem", sm: "0.925rem" } },
              "& ul, & ol": { pl: 2.5, mt: 0.5, mb: 0.5 },
              "& li": { mb: 0.35, lineHeight: 1.6, fontSize: { xs: "0.875rem", sm: "0.925rem" } },
              "& strong": { fontWeight: 700 },
              "& em": { fontStyle: "italic" },
              "& code": {
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                bgcolor: isUser
                  ? "rgba(255,255,255,0.18)"
                  : (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "#F1F5F9"),
                color: isUser ? "#FFFFFF" : "primary.main",
                px: 0.6,
                py: 0.2,
                borderRadius: 1,
                fontSize: "0.85em",
                fontWeight: 600,
              },
              "& pre": {
                bgcolor: isUser
                  ? "rgba(255,255,255,0.1)"
                  : (theme) => (theme.palette.mode === "dark" ? "#0F172A" : "#F8FAFC"),
                p: 1.5,
                borderRadius: 2,
                border: isUser ? "none" : "1px solid",
                borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "divider"),
                overflowX: "auto",
                maxWidth: "100%",
                my: 1.5,
              },
              "& pre code": {
                bgcolor: "transparent",
                color: "inherit",
                p: 0,
                fontWeight: 400,
              },
              "& table": {
                display: "block",
                width: "100%",
                maxWidth: "100%",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
                borderCollapse: "collapse",
                my: 1.5,
                fontSize: { xs: "0.8rem", sm: "0.875rem" },
                borderRadius: 1.5,
                border: "1px solid",
                borderColor: "divider",
              },
              "& th": {
                bgcolor: isUser
                  ? "rgba(255,255,255,0.12)"
                  : (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "#F8FAFC"),
                fontWeight: 700,
                textAlign: "left",
                px: 1.5,
                py: 1,
                borderBottom: "1px solid",
                borderColor: "divider",
                whiteSpace: "nowrap",
              },
              "& td": {
                px: 1.5,
                py: 0.85,
                borderBottom: "1px solid",
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
              },
              "& tr:last-child td": {
                borderBottom: "none",
              },
              "& blockquote": {
                borderLeft: "3px solid",
                borderColor: isUser ? "rgba(255,255,255,0.6)" : "primary.main",
                pl: 1.5,
                ml: 0,
                my: 1,
                color: isUser ? "rgba(255,255,255,0.85)" : "text.secondary",
                fontStyle: "italic",
              },
              "& hr": {
                border: "none",
                borderTop: `1px solid ${isUser ? "rgba(255,255,255,0.2)" : "divider"}`,
                my: 1.5,
              },
              "& a": {
                color: isUser ? "white" : "primary.main",
                textDecoration: "none",
                fontWeight: 600,
                "&:hover": { textDecoration: "underline" },
              },
            }}
          >
            {isUser ? (
              <Typography sx={{ whiteSpace: "pre-wrap", lineHeight: 1.65, fontSize: { xs: "0.875rem", sm: "0.925rem" } }}>
                {msg.content}
              </Typography>
            ) : (
              <MessageContent content={msg.content} />
            )}
          </Paper>

          {msg.toolResults && msg.toolResults.length > 0 ? (
            <Stack spacing={1} sx={{ maxWidth: "100%", mt: 0.5 }}>
              {msg.toolResults.map((tr, i) => (
                <ToolResultCards key={i} tr={tr} />
              ))}
            </Stack>
          ) : null}

          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              justifyContent: isUser ? "flex-end" : "space-between",
              px: 0.75,
              mt: 0.25,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
              {msg.timestamp.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </Typography>
            {!isUser && (
              <Tooltip title={copied ? "Đã sao chép!" : "Sao chép câu trả lời"} placement="top">
                <IconButton
                  size="small"
                  onClick={handleCopy}
                  sx={{
                    p: 0.5,
                    color: copied ? "success.main" : "text.secondary",
                    transition: "color 0.2s, background-color 0.2s",
                    "&:hover": {
                      color: copied ? "success.dark" : "primary.main",
                      bgcolor: "action.hover",
                    },
                  }}
                >
                  {copied ? <CheckIcon sx={{ fontSize: 14 }} /> : <CopyIcon sx={{ fontSize: 14 }} />}
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
