"use client";

import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import CloseIcon from "@mui/icons-material/CloseOutlined";
import LightbulbIcon from "@mui/icons-material/LightbulbOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNewOutlined";
import api from "@/lib/api-client";
import type { AIBookRecommendation, AIBookRecommendationResponse } from "@/lib/types";
import { fadeInUp } from "@/lib/animations";

export default function BookRecommendations({
  studentCode,
  onClose,
}: {
  studentCode: string;
  onClose?: () => void;
}) {
  const [data, setData] = useState<AIBookRecommendationResponse | null>(null);
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
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        borderColor: "rgba(139,0,0,0.2)",
        bgcolor: (t) =>
          t.palette.mode === "dark"
            ? "rgba(139,0,0,0.06)"
            : "rgba(139,0,0,0.02)",
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <AutoAwesomeIcon sx={{ color: "primary.main" }} fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
              Gợi ý sách cho {data.patron_name}
            </Typography>
            <Chip
              size="small"
              variant="outlined"
              label="AI đề xuất"
              color="primary"
              sx={{ fontWeight: 700, height: 22 }}
            />
          </Stack>
          {onClose && (
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(auto-fill, minmax(280px, 1fr))",
            },
            gap: 2,
          }}
        >
          {data.recommendations.slice(0, 6).map((book, idx) => (
            <RecommendationCard
              key={book.book_id || book.isbn || idx}
              book={book}
              index={idx}
            />
          ))}
        </Box>
      </Stack>
    </Paper>
  );
}

function RecommendationCard({
  book,
  index,
}: {
  book: AIBookRecommendation;
  index: number;
}) {
  const isHighMatch = (book.relevance_score || 0) >= 70;
  const matchColor = isHighMatch ? "#059669" : "#1E6091";
  const matchBg = isHighMatch
    ? "rgba(5,150,105,0.1)"
    : "rgba(30,96,145,0.1)";

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2.5,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        borderColor: (t) =>
          t.palette.mode === "dark"
            ? "rgba(255,255,255,0.08)"
            : "rgba(10,37,64,0.08)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        animation: `${fadeInUp} 0.35s ease-out`,
        animationDelay: `${index * 0.06}s`,
        animationFillMode: "both",
        "&:hover": {
          transform: "translateY(-2px)",
          borderColor: "primary.main",
          boxShadow: "0 6px 18px rgba(139,0,0,0.12)",
        },
      }}
    >
      <CardContent
        sx={{
          p: 2,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          "&:last-child": { pb: 2 },
        }}
      >
        {/* Header badge row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Chip
            icon={<AutoAwesomeIcon sx={{ fontSize: "13px !important" }} />}
            label={`${book.relevance_score}% phù hợp`}
            size="small"
            sx={{
              height: 22,
              fontWeight: 800,
              fontSize: "0.72rem",
              bgcolor: matchBg,
              color: matchColor,
              border: `1px solid ${matchColor}30`,
            }}
          />
          {book.category && (
            <Chip
              size="small"
              variant="outlined"
              label={book.category}
              sx={{
                height: 20,
                fontSize: "0.68rem",
                color: "text.secondary",
                maxWidth: 140,
              }}
            />
          )}
        </Box>

        {/* Book cover + titles */}
        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            alignItems: "flex-start",
            minHeight: 74,
          }}
        >
          {book.cover_url ? (
            <Box
              component="img"
              src={book.cover_url}
              alt={book.title}
              sx={{
                width: 52,
                height: 74,
                objectFit: "cover",
                borderRadius: 1.5,
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                bgcolor: "action.hover",
              }}
            />
          ) : (
            <Avatar
              variant="rounded"
              sx={{
                width: 52,
                height: 74,
                borderRadius: 1.5,
                bgcolor: "action.hover",
                color: "text.secondary",
                flexShrink: 0,
              }}
            >
              <BookIcon fontSize="medium" />
            </Avatar>
          )}

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Tooltip title={book.title} arrow placement="top">
              <Typography
                variant="subtitle2"
                component={book.book_id ? "a" : "p"}
                href={book.book_id ? `/books/${book.book_id}` : undefined}
                target={book.book_id ? "_blank" : undefined}
                rel="noopener noreferrer"
                sx={{
                  fontWeight: 800,
                  fontSize: "0.875rem",
                  lineHeight: 1.35,
                  color: "text.primary",
                  textDecoration: "none",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  mb: 0.5,
                  "&:hover": book.book_id
                    ? { color: "primary.main", textDecoration: "underline" }
                    : undefined,
                }}
              >
                {book.title}
              </Typography>
            </Tooltip>

            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "-webkit-box",
                WebkitLineClamp: 1,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                lineHeight: 1.3,
                fontSize: "0.75rem",
              }}
            >
              {book.author || "Tác giả chưa cập nhật"}
            </Typography>

            {book.isbn && (
              <Typography
                variant="caption"
                sx={{
                  color: "text.disabled",
                  fontFamily: "monospace",
                  fontSize: "0.7rem",
                  display: "block",
                  mt: 0.25,
                }}
              >
                ISBN: {book.isbn}
              </Typography>
            )}
          </Box>
        </Box>

        {/* AI Reason callout */}
        {book.reason && (
          <Box
            sx={{
              p: 1.25,
              borderRadius: 1.5,
              bgcolor: (t) =>
                t.palette.mode === "dark"
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(10,37,64,0.03)",
              border: "1px dashed",
              borderColor: "divider",
              mt: "auto",
            }}
          >
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "flex-start" }}>
              <LightbulbIcon
                sx={{ fontSize: 14, color: "#D97706", mt: "2px", flexShrink: 0 }}
              />
              <Tooltip title={book.reason} arrow placement="bottom">
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontSize: "0.725rem",
                    lineHeight: 1.45,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {book.reason}
                </Typography>
              </Tooltip>
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
