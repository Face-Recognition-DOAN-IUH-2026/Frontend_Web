"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import { useAuth } from "@/lib/auth-context";
import { usePermission } from "@/lib/permission-context";
import { useTutorialStore } from "@/hooks/useTutorialStore";
import { getQuestsForUser } from "@/lib/tutorial/quests";

export default function QuestHubModal() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const pathname = usePathname() || "";
  const { user } = useAuth();
  const { can } = usePermission();

  const {
    questHubOpen,
    completedQuestIds,
    closeQuestHub,
    startQuest,
    resetProgress,
  } = useTutorialStore();

  const quests = useMemo(
    () => getQuestsForUser(user?.role, can),
    [user?.role, can],
  );

  const completedSet = useMemo(() => new Set(completedQuestIds), [completedQuestIds]);
  const completedCount = useMemo(
    () => quests.filter((q) => completedSet.has(q.id)).length,
    [quests, completedSet],
  );

  const progressPct = quests.length > 0 ? Math.round((completedCount / quests.length) * 100) : 0;

  const recommendedQuests = useMemo(
    () => quests.filter((q) => q.matchRoutes.some((r) => pathname.startsWith(r))),
    [quests, pathname],
  );

  return (
    <Dialog
      open={questHubOpen}
      onClose={closeQuestHub}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
          },
        },
      }}
    >
      {/* Header Banner */}
      <DialogTitle
        sx={{
          p: 2.5,
          background: "linear-gradient(135deg, #0A2540 0%, #163A5F 60%, #8B0000 100%)",
          color: "#FFFFFF",
        }}
      >
        <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2,
                bgcolor: "rgba(255, 255, 255, 0.14)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <MenuBookOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                Trung tâm Hướng dẫn Sử dụng
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)" }}>
                Chọn chủ đề để xem hướng dẫn thao tác từng bước ngay trên giao diện
              </Typography>
            </Box>
          </Stack>

          <IconButton
            size="small"
            onClick={closeQuestHub}
            aria-label="Đóng hướng dẫn sử dụng"
            sx={{ color: "rgba(255,255,255,0.8)", "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.12)" } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Completion Progress Bar */}
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 2,
            bgcolor: "rgba(0, 0, 0, 0.22)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
              Tiến độ đã xem hướng dẫn
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#FDE68A" }}>
              {completedCount}/{quests.length} chủ đề ({progressPct}%)
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progressPct}
            sx={{
              height: 6,
              borderRadius: 99,
              bgcolor: "rgba(255,255,255,0.15)",
              "& .MuiLinearProgress-bar": {
                bgcolor: "#D4AF37",
                borderRadius: 99,
              },
            }}
          />
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, maxHeight: "62vh", overflowY: "auto" }}>
        <Stack spacing={2.5}>
          {/* Contextual recommendations for current page */}
          {recommendedQuests.length > 0 && (
            <Box>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 1 }}>
                <HelpOutlineRoundedIcon sx={{ fontSize: 16, color: "primary.main" }} />
                <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", color: "text.secondary", letterSpacing: 0.6 }}>
                  Hướng dẫn cho trang bạn đang mở
                </Typography>
              </Stack>
              <Stack spacing={1.25}>
                {recommendedQuests.map((quest) => {
                  const isDone = completedSet.has(quest.id);
                  return (
                    <Paper
                      key={`rec-${quest.id}`}
                      variant="outlined"
                      sx={{
                        p: 1.75,
                        borderRadius: 2.5,
                        borderColor: "primary.main",
                        bgcolor: alpha(theme.palette.primary.main, isDark ? 0.08 : 0.04),
                      }}
                    >
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", mb: 0.25 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              {quest.title}
                            </Typography>
                            {isDone && (
                              <Chip
                                icon={<CheckCircleRoundedIcon sx={{ fontSize: 14 }} />}
                                label="Đã xem"
                                size="small"
                                color="success"
                                sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }}
                              />
                            )}
                          </Stack>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            {quest.subtitle} · {quest.steps.length} bước
                          </Typography>
                        </Box>

                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => startQuest(quest.id)}
                          startIcon={isDone ? <ReplayRoundedIcon /> : <PlayArrowRoundedIcon />}
                          sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 700,
                            flexShrink: 0,
                            bgcolor: "#8B0000",
                            "&:hover": { bgcolor: "#700000" },
                          }}
                        >
                          {isDone ? "Xem lại" : "Xem hướng dẫn"}
                        </Button>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </Box>
          )}

          {/* Full Guide List */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", color: "text.secondary", letterSpacing: 0.6, display: "block", mb: 1 }}>
              Tất cả Chủ đề Hướng dẫn ({quests.length})
            </Typography>

            <Stack spacing={1.25}>
              {quests.map((quest) => {
                const isDone = completedSet.has(quest.id);
                return (
                  <Paper
                    key={quest.id}
                    variant="outlined"
                    sx={{
                      p: 1.75,
                      borderRadius: 2.5,
                      borderColor: isDone ? alpha("#10B981", 0.45) : "divider",
                      bgcolor: isDone ? alpha("#10B981", isDark ? 0.06 : 0.04) : "background.paper",
                    }}
                  >
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", mb: 0.4 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                            {quest.title}
                          </Typography>
                          <Chip
                            size="small"
                            label={quest.role === "admin" ? "Admin" : quest.role === "staff" ? "Thủ thư" : "Chung"}
                            sx={{
                              height: 19,
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              bgcolor: quest.role === "admin" ? alpha("#8B0000", 0.12) : alpha("#0A2540", 0.1),
                              color: quest.role === "admin" ? "#8B0000" : isDark ? "#93C5FD" : "#0A2540",
                            }}
                          />
                          {isDone && (
                            <CheckCircleRoundedIcon sx={{ fontSize: 17, color: "success.main" }} />
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                          {quest.subtitle}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600 }}>
                          {quest.steps.length} bước · ~{quest.estimatedMinutes} phút
                        </Typography>
                      </Box>

                      <Button
                        size="small"
                        variant={isDone ? "outlined" : "contained"}
                        color={isDone ? "success" : "primary"}
                        onClick={() => startQuest(quest.id)}
                        startIcon={isDone ? <ReplayRoundedIcon /> : <PlayArrowRoundedIcon />}
                        sx={{
                          borderRadius: 2,
                          textTransform: "none",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {isDone ? "Xem lại" : "Xem hướng dẫn"}
                      </Button>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 2.5, py: 1.5, justifyContent: "space-between" }}>
        <Button
          size="small"
          color="inherit"
          onClick={resetProgress}
          startIcon={<RestartAltRoundedIcon sx={{ fontSize: 16 }} />}
          sx={{ textTransform: "none", color: "text.secondary", fontWeight: 600 }}
        >
          Đặt lại trạng thái đã xem
        </Button>

        <Button
          size="small"
          onClick={closeQuestHub}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
}
