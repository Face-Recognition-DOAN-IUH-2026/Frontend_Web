"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import type { BookData, ShelfData } from "./types";

interface FloorMapProps {
  shelves: ShelfData[];
  onBookClick?: (book: BookData) => void;
}

interface ShelfGroup {
  shelf: ShelfData;
  tiers: TierRow[];
}

interface TierRow {
  tierIndex: number;
  faces: [BookData[], BookData[]];
}

function groupByFloor(shelves: ShelfData[]): Record<string, ShelfData[]> {
  const map: Record<string, ShelfData[]> = {};
  for (const s of shelves) {
    const f = s.floor || "A";
    if (!map[f]) map[f] = [];
    map[f].push(s);
  }
  for (const f of Object.keys(map)) {
    map[f].sort((a, b) => a.shelfNum - b.shelfNum);
  }
  return map;
}

function buildGroups(shelves: ShelfData[], query: string): ShelfGroup[] {
  const q = query.toLowerCase().trim();
  return shelves
    .map((shelf) => {
      const tierMap = new Map<number, [BookData[], BookData[]]>();
      for (const book of shelf.books) {
        if (q) {
          const match =
            book.title.toLowerCase().includes(q) ||
            book.author.toLowerCase().includes(q) ||
            book.isbn.toLowerCase().includes(q);
          if (!match) continue;
        }
        if (!tierMap.has(book.tierIndex)) tierMap.set(book.tierIndex, [[], []]);
        const face = book.face === 1 ? 1 : 0;
        tierMap.get(book.tierIndex)![face].push(book);
      }
      const tiers: TierRow[] = Array.from(tierMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([tierIndex, faces]) => ({ tierIndex, faces }));
      return { shelf, tiers };
    })
    .sort((a, b) => a.shelf.shelfNum - b.shelf.shelfNum);
}

const FACE_LABELS = ["Mặt trái", "Mặt phải"] as const;

export default function FloorMap({ shelves, onBookClick }: FloorMapProps) {
  const floorMap = useMemo(() => groupByFloor(shelves), [shelves]);
  const floors = useMemo(() => Object.keys(floorMap).sort(), [floorMap]);

  const [activeFloor, setActiveFloor] = useState(() => floors[0] || "A");
  const [searchQuery, setSearchQuery] = useState("");

  const currentShelves = floorMap[activeFloor] || [];
  const groups = useMemo(() => buildGroups(currentShelves, searchQuery), [currentShelves, searchQuery]);

  const totalBooks = useMemo(() => {
    return currentShelves.reduce((sum, s) => sum + s.books.length, 0);
  }, [currentShelves]);

  const searchResultCount = groups.reduce((s, g) => s + g.tiers.reduce((ts, t) => ts + t.faces[0].length + t.faces[1].length, 0), 0);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          <MenuBookIcon sx={{ fontSize: 28, color: "primary.main" }} />
          Bản đồ thư viện
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Chọn tầng để xem vị trí sách trên kệ
        </Typography>
      </Box>

      {/* Floor tabs */}
      <ToggleButtonGroup
        value={activeFloor}
        exclusive
        onChange={(_, v) => v && setActiveFloor(v)}
        size="small"
        sx={{ mb: 2, "& .MuiToggleButton-root": { px: 2, py: 1, textTransform: "none", fontWeight: 600 } }}
      >
        {floors.map((f) => (
          <ToggleButton key={f} value={f}>
            Tầng {f}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* Search bar */}
      <TextField
        size="small"
        fullWidth
        placeholder="Tìm kiếm sách theo tên, tác giả, ISBN..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 2, maxWidth: 480 }}
        slotProps={{
          input: {
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery("")}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          },
        }}
      />

      {/* Stats */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Kệ: <Box component="span" sx={{ fontWeight: 700 }}>{currentShelves.length}</Box>
        </Typography>
        <Divider orientation="vertical" flexItem />
        <Typography variant="caption" color="text.secondary">
          Sách: <Box component="span" sx={{ fontWeight: 700 }}>{totalBooks}</Box>
        </Typography>
        {searchQuery && (
          <>
            <Divider orientation="vertical" flexItem />
            <Typography variant="caption" color="text.secondary">
              Kết quả: <Box component="span" sx={{ fontWeight: 700, color: "primary.main" }}>{searchResultCount}</Box>
            </Typography>
          </>
        )}
      </Box>

      {/* Table */}
      {groups.length === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8, color: "text.secondary" }}>
          <MenuBookIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
          <Typography variant="body2">Không tìm thấy kệ nào{searchQuery ? ` với từ khóa "${searchQuery}"` : ""}</Typography>
        </Box>
      ) : (
        <TableContainer sx={{ borderRadius: 2, border: 1, borderColor: "divider" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "background.paper" }}>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: 0.5, width: 120 }}>Kệ</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: 0.5, width: 100 }}>Tầng kệ</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: 0.5, width: 110 }}>Mặt</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Sách</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((group) =>
                group.tiers.flatMap((tier, ti) =>
                  tier.faces.map((faceBooks, faceIdx) => {
                    const isFirstRowOfShelf = ti === 0 && faceIdx === 0;
                    const isFirstFaceOfTier = faceIdx === 0;
                    return (
                      <TableRow
                        key={`${group.shelf.id}-${tier.tierIndex}-${faceIdx}`}
                        sx={{
                          borderTop: ti === 0 && faceIdx === 0 ? 2 : 1,
                          borderColor: ti === 0 && faceIdx === 0 ? "primary.light" : "divider",
                          "&:hover": { bgcolor: "rgba(25,118,210,0.03)" },
                        }}
                      >
                        {isFirstRowOfShelf && (
                          <TableCell rowSpan={group.tiers.length * 2} sx={{ fontWeight: 700, color: "primary.main", verticalAlign: "top" }}>
                            {group.shelf.code}
                          </TableCell>
                        )}
                        {isFirstFaceOfTier && (
                          <TableCell rowSpan={2} sx={{ color: "text.secondary", fontWeight: 500, verticalAlign: "top" }}>
                            Tầng {tier.tierIndex + 1}
                          </TableCell>
                        )}
                        <TableCell sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                          {FACE_LABELS[faceIdx]}
                        </TableCell>
                        <TableCell>
                          {faceBooks.length === 0 ? (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>Trống</Typography>
                          ) : (
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: "2px 12px" }}>
                              {faceBooks.map((book) => (
                                <Tooltip key={book.id} title={book.status === "available" ? "Có sẵn" : "Đã mượn"} arrow>
                                  <Box
                                    component="button"
                                    onClick={() => onBookClick?.(book)}
                                    sx={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      border: "none",
                                      bgcolor: "transparent",
                                      cursor: "pointer",
                                      p: 0,
                                      "&:hover": { "& .book-title": { color: "primary.main" } },
                                    }}
                                  >
                                    <Typography variant="caption" className="book-title" sx={{ transition: "color 0.15s" }}>
                                      {book.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                      — {book.author}
                                    </Typography>
                                    <FiberManualRecordIcon
                                      sx={{
                                        fontSize: 8,
                                        ml: 0.5,
                                        color: book.status === "available" ? "success.main" : "error.main",
                                      }}
                                    />
                                  </Box>
                                </Tooltip>
                              ))}
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
