"use client";

import { Box, Card, CardContent, Typography, Stack, LinearProgress, Chip, useTheme } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUpOutlined";
import TrendingDownIcon from "@mui/icons-material/TrendingDownOutlined";
import GroupsIcon from "@mui/icons-material/GroupsOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmberOutlined";
import CalendarTodayIcon from "@mui/icons-material/CalendarTodayOutlined";
import { useAIWidgetStore } from "../store/useAIWidgetStore";

export default function AIScoreCard() {
  const theme = useTheme();
  const { lastSummary } = useAIWidgetStore();

  if (!lastSummary) {
    return (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack spacing={2} sx={{ alignItems: "center", py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Đang tải dữ liệu...
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const score = lastSummary.operational_score;
  const scoreGrade = score >= 80 ? "Tốt" : score >= 60 ? "Bình thường" : score >= 40 ? "Cảnh báo" : "Nguy hiểm";
  const scoreColor = score >= 80 ? "success" : score >= 60 ? "warning" : score >= 40 ? "warning" : "error";

  return (
    <Stack spacing={2}>
      <Card
        variant="outlined"
        sx={{
          borderColor: `${scoreColor}.main`,
          borderWidth: 2,
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.mode === "dark" ? "rgba(3,168,244,0.1)" : "rgba(3,168,244,0.05)"})`,
        }}
      >
        <CardContent>
          <Stack spacing={2}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                Điểm vận hành
              </Typography>
              {score >= 70 ? (
                <TrendingUpIcon color="success" fontSize="small" />
              ) : (
                <TrendingDownIcon color="error" fontSize="small" />
              )}
            </Box>

            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
              <Typography variant="h2" sx={{ fontWeight: 900, lineHeight: 1, color: `${scoreColor}.main` }}>
                {score}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                / 100
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 1 }}>
              <Chip
                size="small"
                color={scoreColor}
                label={scoreGrade}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`Cập nhật: ${new Date(lastSummary.generated_at).toLocaleTimeString("vi-VN")}`}
                sx={{ fontSize: 10 }}
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Thông số hiện tại
            </Typography>

            <Stack spacing={1.5}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <GroupsIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography variant="body2">Độc giả trong thư viện</Typography>
                </Stack>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {lastSummary.active_patrons}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <WarningAmberIcon sx={{ fontSize: 18, color: lastSummary.overdue_borrows > 5 ? "error.main" : "text.secondary" }} />
                  <Typography variant="body2" color={lastSummary.overdue_borrows > 5 ? "error.main" : "text.secondary"}>
                    Sách quá hạn
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ fontWeight: 700, color: lastSummary.overdue_borrows > 5 ? "error.main" : "text.primary" }}>
                  {lastSummary.overdue_borrows}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <CalendarTodayIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography variant="body2">Nhân viên trực hôm nay</Typography>
                </Stack>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {lastSummary.scheduled_staff_today}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Lượt ra vào hôm nay
            </Typography>
            <Stack direction="row" spacing={2}>
              <Box sx={{ flex: 1, textAlign: "center" }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "success.main" }}>
                  {lastSummary.today_entries}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Lượt vào
                </Typography>
              </Box>
              <Box sx={{ flex: 1, textAlign: "center" }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "warning.main" }}>
                  {lastSummary.today_exits}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Lượt ra
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}