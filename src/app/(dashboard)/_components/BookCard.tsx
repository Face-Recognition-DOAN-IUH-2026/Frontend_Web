"use client";

import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  Divider,
} from "@mui/material";
import { motion } from "framer-motion";
import { SPRINGS } from "@/lib/motion";

export interface BookCardData {
  title: string;
  author?: string;
  isbn?: string;
  categories?: string;
  description?: string;
  cover_url?: string;
  publisher?: string;
  published_date?: string;
  page_count?: number;
  language?: string;
  source?: "database" | "google_books" | "not_found";
}

interface BookCardProps {
  data: BookCardData;
  showActions?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function BookCard({
  data,
  showActions = false,
  onConfirm,
  onCancel,
}: BookCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={SPRINGS.gentle}
      style={{ willChange: "transform" }}
    >
      <Card
        sx={{
          maxWidth: 360,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
          my: 1,
          transition: "box-shadow 280ms cubic-bezier(0.16, 1, 0.3, 1)",
          "&:hover": {
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          },
        }}
      >
      {data.cover_url && (
        <CardMedia
          component="img"
          height="200"
          image={data.cover_url}
          alt={data.title}
          sx={{ objectFit: "contain", bgcolor: "grey.100", p: 1 }}
          onError={(e: any) => {
            e.target.style.display = "none";
          }}
        />
      )}
      <CardContent sx={{ p: 2 }}>
        <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 0.5 }}>
          {data.title}
        </Typography>

        {data.author && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Tác giả: {data.author}
          </Typography>
        )}

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
          {data.isbn && (
            <Chip label={`ISBN: ${data.isbn}`} size="small" variant="outlined" />
          )}
          {data.categories && (
            <Chip label={data.categories} size="small" color="primary" variant="outlined" />
          )}
          {data.source && (
            <Chip
              label={data.source === "database" ? "Trong thư viện" : "Google Books"}
              size="small"
              color={data.source === "database" ? "success" : "info"}
            />
          )}
        </Box>

        {data.description && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                lineHeight: 1.5,
              }}
            >
              {data.description}
            </Typography>
          </>
        )}

        <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
          {data.publisher && (
            <Typography variant="caption" color="text.secondary">
              NXB: {data.publisher}
            </Typography>
          )}
          {data.published_date && (
            <Typography variant="caption" color="text.secondary">
              Năm: {data.published_date}
            </Typography>
          )}
          {data.page_count && (
            <Typography variant="caption" color="text.secondary">
              {data.page_count} trang
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
    </motion.div>
  );
}

export function parseBookCard(text: string): { before: string; bookData: BookCardData | null; after: string } {
  const marker = /:::book_card\s*\n([\s\S]*?)\n:::/;
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
