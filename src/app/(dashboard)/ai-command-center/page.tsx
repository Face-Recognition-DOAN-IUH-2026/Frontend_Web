"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import BoltIcon from "@mui/icons-material/BoltOutlined";
import CheckIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import LibraryIcon from "@mui/icons-material/LocalLibraryOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";
import LightbulbIcon from "@mui/icons-material/LightbulbOutlined";
import PeopleIcon from "@mui/icons-material/GroupsOutlined";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";
import ScheduleIcon from "@mui/icons-material/CalendarMonthOutlined";
import SendIcon from "@mui/icons-material/SendOutlined";
import WarningIcon from "@mui/icons-material/WarningAmberOutlined";
import api from "@/lib/api-client";
import type { AiCommandCenterSummary, AiInsight, AiInsightExplanation } from "@/lib/types";
import { fadeInUp } from "@/lib/animations";

const severityColor: Record<string, "default" | "info" | "warning" | "error"> = {
  info: "info",
  warning: "warning",
  critical: "error",
};

const categoryLabel: Record<string, string> = {
  access: "Ra/vào",
  borrow: "Mượn trả",
  schedule: "Lịch trực",
  inventory: "Kho sách",
  risk: "Rủi ro",
};

function formatTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: string }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Avatar sx={{ bgcolor: tone, color: "primary.contrastText" }}>
            <Icon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>{label}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>{value.toLocaleString("vi-VN")}</Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function InsightCard({ insight, onDismiss, onExplain }: { insight: AiInsight; onDismiss: (id: string) => void; onExplain: (id: string) => void }) {
  return (
    <Card variant="outlined" sx={{ borderColor: insight.severity === "critical" ? "error.main" : undefined }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
              <Chip size="small" color={severityColor[insight.severity]} label={insight.severity === "critical" ? "Khẩn cấp" : insight.severity === "warning" ? "Cảnh báo" : "Thông tin"} />
              <Chip size="small" variant="outlined" label={categoryLabel[insight.category] || insight.category} />
              <Chip size="small" variant="outlined"
                color={insight.confidence >= 0.8 ? "success" : insight.confidence >= 0.6 ? "warning" : "error"}
                label={`${(insight.confidence * 100).toFixed(0)}% tin cậy`}
              />
            </Stack>
            <Stack direction="row" spacing={0.5}>
              <Button size="small" startIcon={<HelpOutlineIcon />} onClick={() => onExplain(insight.id)}>
                Giải thích
              </Button>
              <Button size="small" startIcon={<CheckIcon />} onClick={() => onDismiss(insight.id)}>
                Đã xử lý
              </Button>
            </Stack>
          </Stack>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>{insight.title}</Typography>
          <Typography color="text.secondary">{insight.summary}</Typography>
          {insight.reason ? (
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "background.default", borderColor: "info.main" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                <LightbulbIcon fontSize="small" color="info" sx={{ mt: 0.25 }} />
                <Typography variant="body2" color="text.secondary">{insight.reason}</Typography>
              </Stack>
            </Paper>
          ) : null}
          {insight.evidence.length ? (
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
              {insight.evidence.map((item, index) => (
                <Chip key={`${item.label}-${index}`} size="small" label={`${item.label}: ${item.value}`} />
              ))}
            </Stack>
          ) : null}
          <Divider />
          <Stack spacing={0.75}>
            {insight.recommended_actions.map((action, index) => (
              <Typography key={`${action}-${index}`} variant="body2">• {action}</Typography>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function AiCommandCenterPage() {
  const theme = useTheme();
  const [summary, setSummary] = useState<AiCommandCenterSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [explanation, setExplanation] = useState<AiInsightExplanation | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  const load = async (force = false) => {
    try {
      setError("");
      if (force) setRefreshing(true);
      else setLoading(true);
      const data = force ? await api.refreshAiCommandCenter() : await api.getAiCommandCenterSummary();
      setSummary(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Không thể tải AI Command Center.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(false); }, []);

  const sortedInsights = useMemo(() => {
    const order = { critical: 0, warning: 1, info: 2 } as Record<string, number>;
    return [...(summary?.insights || [])].sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
  }, [summary]);

  const dismissInsight = async (id: string) => {
    await api.dismissAiInsight(id);
    setSummary((prev) => prev ? { ...prev, insights: prev.insights.filter((item) => item.id !== id) } : prev);
  };

  const handleExplain = async (id: string) => {
    setExplanationLoading(true);
    try {
      const data = await api.explainAiInsight(id);
      setExplanation(data);
    } catch {
      setExplanation(null);
    } finally {
      setExplanationLoading(false);
    }
  };

  const ask = async () => {
    if (!question.trim()) return;
    setChatLoading(true);
    setAnswer("");
    try {
      const data = await api.askAiCommandCenter(question.trim());
      setAnswer(data.answer);
    } catch (err: any) {
      setAnswer(err?.response?.data?.error || "AI chưa thể trả lời câu hỏi này.");
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: 420, display: "grid", placeItems: "center" }}>
        <Stack spacing={2} sx={{ alignItems: "center" }}>
          <CircularProgress />
          <Typography color="text.secondary">Đang dựng bức tranh vận hành...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 3, overflow: "hidden", position: "relative" }}>
        <Box sx={{ position: "absolute", inset: "auto -90px -90px auto", width: 220, height: 220, borderRadius: "50%", bgcolor: "primary.main", opacity: 0.08 }} />
        <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ alignItems: { lg: "center" }, justifyContent: "space-between", position: "relative" }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.main", color: "primary.contrastText", borderRadius: 2 }}>
              <AutoAwesomeIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 950 }}>AI Command Center</Typography>
              <Typography color="text.secondary">Bản sao số phân tích vận hành thư viện theo thời gian gần thực.</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Chip color="primary" icon={<BoltIcon />} label={summary?.model || "AI"} />
            <Chip variant="outlined" label={`Cập nhật: ${formatTime(summary?.generated_at)}`} />
            <Button variant="contained" startIcon={<RefreshIcon />} disabled={refreshing} onClick={() => load(true)}>
              Làm mới phân tích
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {summary ? (
        <>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>{summary.headline}</Typography>
                <Chip color={summary.operational_score >= 80 ? "success" : summary.operational_score >= 60 ? "warning" : "error"} label={`${summary.operational_score}/100`} />
              </Stack>
              <LinearProgress variant="determinate" value={summary.operational_score} sx={{ height: 8, borderRadius: 8 }} />
            </Stack>
          </Paper>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(5, 1fr)" }, gap: 2 }}>
            {[
              { label: "Đang hiện diện", value: summary.snapshot.active_patrons, icon: PeopleIcon, tone: theme.palette.success.main },
              { label: "Vào hôm nay", value: summary.snapshot.today_entries, icon: LibraryIcon, tone: theme.palette.info.main },
              { label: "Ra hôm nay", value: summary.snapshot.today_exits, icon: LibraryIcon, tone: theme.palette.warning.main },
              { label: "Sách đang mượn", value: summary.snapshot.active_borrows, icon: LibraryIcon, tone: theme.palette.primary.main },
              { label: "Ca trực hôm nay", value: summary.snapshot.scheduled_staff_today, icon: ScheduleIcon, tone: theme.palette.secondary.main },
            ].map((card, idx) => (
              <Box key={card.label} sx={{ animation: `${fadeInUp} 0.35s ease-out`, animationDelay: `${idx * 0.08}s`, animationFillMode: "both" }}>
                <MetricCard {...card} />
              </Box>
            ))}
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1.35fr 0.65fr" }, gap: 2 }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <WarningIcon color="warning" />
                <Typography variant="h6" sx={{ fontWeight: 900 }}>AI cảnh báo và đề xuất</Typography>
              </Stack>
              {sortedInsights.length ? (
                sortedInsights.map((insight) => <InsightCard key={insight.id} insight={insight} onDismiss={dismissInsight} onExplain={handleExplain} />)
              ) : (
                <Alert severity="success">Không còn cảnh báo đang mở.</Alert>
              )}
            </Stack>

            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <AutoAwesomeIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>Hỏi AI</Typography>
                  </Stack>
                  <TextField
                    label="Câu hỏi vận hành"
                    placeholder="Ví dụ: Hôm nay nên ưu tiên tầng nào?"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    multiline
                    minRows={3}
                    fullWidth
                  />
                  <Button variant="contained" endIcon={chatLoading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />} onClick={ask} disabled={chatLoading || !question.trim()}>
                    Hỏi AI
                  </Button>
                  {answer ? (
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: "background.default" }}>
                      <Typography sx={{ whiteSpace: "pre-wrap" }}>{answer}</Typography>
                    </Paper>
                  ) : (
                    <Alert severity="info">AI chỉ trả lời dựa trên snapshot và insight nội bộ hiện có.</Alert>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </>
      ) : null}

      <Dialog open={!!explanation || explanationLoading} onClose={() => setExplanation(null)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 900 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <HelpOutlineIcon color="primary" />
            <span>Giải thích quyết định AI</span>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {explanationLoading ? (
            <Box sx={{ p: 4, display: "grid", placeItems: "center" }}>
              <CircularProgress />
            </Box>
          ) : explanation ? (
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>{explanation.title}</Typography>
              <Chip
                size="small"
                color={severityColor[explanation.severity]}
                label={`${(explanation.confidence * 100).toFixed(0)}% tin cậy`}
                sx={{ alignSelf: "flex-start" }}
              />
              <LinearProgress
                variant="determinate"
                value={explanation.confidence * 100}
                color={explanation.confidence >= 0.8 ? "success" : explanation.confidence >= 0.6 ? "warning" : "error"}
                sx={{ height: 8, borderRadius: 8 }}
              />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Lý do AI đưa ra nhận định này</Typography>
                <Typography color="text.secondary">{explanation.reason || explanation.summary}</Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Dữ liệu được phân tích</Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, mt: 1 }}>
                  {explanation.evidence.map((item, idx) => (
                    <Chip key={idx} size="small" label={`${item.label}: ${item.value}`} />
                  ))}
                </Stack>
              </Box>

              {explanation.alternatives.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Các phương án khác đã cân nhắc</Typography>
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {explanation.alternatives.map((alt, idx) => (
                      <Typography key={idx} variant="body2">• {alt}</Typography>
                    ))}
                  </Stack>
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Hành động đề xuất</Typography>
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  {explanation.recommended_actions.map((action, idx) => (
                    <Typography key={idx} variant="body2">• {action}</Typography>
                  ))}
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>Reasoning Trace (quy trình suy luận)</Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: "background.default", maxHeight: 200, overflow: "auto" }}>
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{ fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap", m: 0 }}
                  >
                    {explanation.reasoning_trace}
                  </Typography>
                </Paper>
              </Box>
            </Stack>
          ) : (
            <Alert severity="error">Không thể tải giải thích cho insight này.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExplanation(null)} variant="contained">Đóng</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
