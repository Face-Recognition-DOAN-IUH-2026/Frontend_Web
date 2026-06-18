"use client";

import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import CloseIcon from "@mui/icons-material/CloseOutlined";
import LightbulbIcon from "@mui/icons-material/LightbulbOutlined";
import api from "@/lib/api-client";
import type { BookRecommendation, BookRecommendationResponse } from "@/lib/types";
import { fadeInUp } from "@/lib/animations";

export default function BookRecommendations({
  studentCode,
  onClose,
}: {
  studentCode: string;
  onClose?: () => void;
}) {
  const [data, setData] = useState<BookRecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!studentCode) return;
    setLoading(true);
    setError("");
    api
      .getBookRecommendations(studentCode)
      .then(setData)
      .catch(() => setError("Không thể tải gợi ý sách"))
      .finally(() => setLoading(false));
  }, [studentCode]);

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2} sx={{ alignItems: "center" }}>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary">AI đang phân tích sở thích đọc sách...</Typography>
        </Stack>
      </Paper>
    );
  }

  if (error) return null;

  if (!data || !data.recommendations.length) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderColor: "info.main" }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <AutoAwesomeIcon color="info" fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
              Gợi ý sách cho {data.patron_name}
            </Typography>
            <Chip size="small" variant="outlined" label="AI đề xuất" color="info" />
          </Stack>
          {onClose && (
            <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
          )}
        </Stack>

        <Box sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
          gap: 2,
        }}>
          {data.recommendations.slice(0, 4).map((book, idx) => (
            <RecommendationCard key={book.book_id || book.isbn} book={book} index={idx} />
          ))}
        </Box>
      </Stack>
    </Paper>
  );
}

function RecommendationCard({ book, index }: { book: BookRecommendation; index: number }) {
  return (
    <Card
      variant="outlined"
      sx={{
        animation: `${fadeInUp} 0.35s ease-out`,
        animationDelay: `${index * 0.08}s`,
        animationFillMode: "both",
        "&:hover": { borderColor: "info.main" },
      }}
    >
      <CardContent>
        <Stack spacing={1}>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
            <Avatar
              variant="rounded"
              sx={{ width: 36, height: 50, bgcolor: "background.default", flexShrink: 0 }}
            >
              <BookIcon fontSize="small" />
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap>{book.title}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>{book.author}</Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <LightbulbIcon sx={{ fontSize: 14, color: "info.main" }} />
            <Typography variant="caption" color="info.main">{book.reason}</Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={book.relevance_score}
            color={book.relevance_score >= 70 ? "success" : book.relevance_score >= 40 ? "warning" : "info"}
            sx={{ height: 4, borderRadius: 4 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: "right" }}>
            Phù hợp: {book.relevance_score}%
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
