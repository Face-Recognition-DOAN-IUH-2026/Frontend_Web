"use client";

import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import { useAuth } from "@/lib/auth-context";
import { usePermission } from "@/lib/permission-context";
import { useTutorialStore } from "@/hooks/useTutorialStore";
import { getQuestsForUser } from "@/lib/tutorial/quests";

export default function WelcomeQuestModal() {
  const { user } = useAuth();
  const { can } = usePermission();
  const {
    hydratedUserId,
    welcomeSeen,
    activeQuestId,
    questHubOpen,
    startQuest,
    markWelcomeSeen,
  } = useTutorialStore();

  const quests = getQuestsForUser(user?.role, can);
  const firstQuest = quests[0];

  const open =
    Boolean(hydratedUserId) &&
    !welcomeSeen &&
    !activeQuestId &&
    !questHubOpen &&
    Boolean(firstQuest);

  if (!open || !firstQuest) return null;

  const isAdmin = user?.role === "admin";

  return (
    <Dialog
      open={open}
      onClose={markWelcomeSeen}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3.5,
            overflow: "hidden",
            border: "2px solid #D4AF37",
          },
        },
      }}
    >
      {/* Hero Banner */}
      <Box
        sx={{
          p: 3,
          background: "linear-gradient(135deg, #0A2540 0%, #8B0000 100%)",
          color: "#FFFFFF",
          textAlign: "center",
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            mx: "auto",
            mb: 1.5,
            borderRadius: 2.5,
            bgcolor: "rgba(212, 175, 55, 0.2)",
            border: "2px solid #D4AF37",
            color: "#D4AF37",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SportsEsportsRoundedIcon sx={{ fontSize: 32 }} />
        </Box>

        <Chip
          size="small"
          label={isAdmin ? "Chế độ Quản trị viên" : "Chế độ Thủ thư"}
          sx={{
            mb: 1,
            bgcolor: "rgba(212, 175, 55, 0.22)",
            color: "#FDE68A",
            fontWeight: 700,
            fontSize: "0.72rem",
          }}
        />

        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
          {isAdmin ? "Chào mừng Quản trị viên!" : "Chào mừng Thủ thư mới!"}
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)" }}>
          Hệ thống có {quests.length} nhiệm vụ hướng dẫn tương tác giúp bạn làm chủ toàn bộ thao tác chỉ trong vài phút.
        </Typography>
      </Box>

      <DialogContent sx={{ pt: 2.5, pb: 1.5 }}>
        <Stack spacing={1.25}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Nhiệm vụ khởi đầu: {firstQuest.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
            {firstQuest.subtitle} (~{firstQuest.estimatedMinutes} phút · +{firstQuest.xp} XP).
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: alpha("#0A2540", 0.05),
              alignItems: "center",
            }}
          >
            <HelpOutlineRoundedIcon sx={{ fontSize: 18, color: "primary.main", flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary">
              Bạn luôn có thể mở lại Sổ tay Nhiệm vụ bất cứ lúc nào qua nút <strong>(?)</strong> trên thanh công cụ phía trên.
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 1.5, justifyContent: "space-between" }}>
        <Button
          onClick={markWelcomeSeen}
          color="inherit"
          sx={{ textTransform: "none", fontWeight: 600, color: "text.secondary" }}
        >
          Để sau
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            markWelcomeSeen();
            startQuest(firstQuest.id);
          }}
          startIcon={<PlayArrowRoundedIcon />}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 800,
            bgcolor: "#8B0000",
            "&:hover": { bgcolor: "#700000" },
          }}
        >
          Bắt đầu hướng dẫn
        </Button>
      </DialogActions>
    </Dialog>
  );
}
