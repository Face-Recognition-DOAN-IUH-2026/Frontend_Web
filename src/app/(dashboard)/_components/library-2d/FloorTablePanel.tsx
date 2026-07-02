"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import type { ShelfData, BookData } from "./types";

interface FloorTablePanelProps {
  shelves: ShelfData[];
  onBookClick?: (book: BookData) => void;
  onFloorSelect?: (floor: string) => void;
}

const FACE_LABELS = ["Mặt trái", "Mặt phải"] as const;

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

export default function FloorTablePanel({ shelves, onBookClick, onFloorSelect }: FloorTablePanelProps) {
  const floorMap = useMemo(() => groupByFloor(shelves), [shelves]);
  const floors = useMemo(() => Object.keys(floorMap).sort(), [floorMap]);
  const [activeFloor, setActiveFloor] = useState(() => floors[0] || "A");

  const currentShelves = floorMap[activeFloor] || [];

  const handleFloorClick = (f: string) => {
    setActiveFloor(f);
    onFloorSelect?.(f);
  };

  return (
    <Paper
      elevation={8}
      sx={{
        position: "absolute",
        top: 56,
        left: 16,
        zIndex: 20,
        width: 520,
        maxHeight: "calc(100vh - 80px)",
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
        overflow: "hidden",
        backdropFilter: "blur(12px)",
        bgcolor: "rgba(255,255,255,0.95)",
      }}
    >
      {/* Header */}
      <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 0.5 }}>
          <ViewModuleIcon sx={{ fontSize: 16, color: "primary.main" }} />
          Bảng chọn tầng
        </Typography>

        {/* Floor tabs */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1.5 }}>
          <ToggleButtonGroup
            value={activeFloor}
            exclusive
            onChange={(_, v) => v && handleFloorClick(v)}
            size="small"
            sx={{ "& .MuiToggleButton-root": { px: 1.5, py: 0.5, fontSize: "0.7rem", textTransform: "none", fontWeight: 600 } }}
          >
            {floors.map((f) => (
              <ToggleButton key={f} value={f}>
                Tầng {f}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" sx={{ ml: "auto", fontSize: "0.65rem" }}>
            {currentShelves.length} kệ
          </Typography>
        </Box>
      </Box>

      {/* Table scroll area */}
      <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "background.paper" }}>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: 0.5, width: 60 }}>Kệ</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: 0.5, width: 50 }}>Tầng</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: 0.5, width: 70 }}>Mặt</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Sách</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentShelves.map((shelf) => {
                const tierMap = new Map<number, [BookData[], BookData[]]>();
                for (const book of shelf.books) {
                  const t = book.tierIndex;
                  if (!tierMap.has(t)) tierMap.set(t, [[], []]);
                  tierMap.get(t)![book.face === 1 ? 1 : 0].push(book);
                }
                const tiers = Array.from(tierMap.entries()).sort(([a], [b]) => a - b);

                return tiers.flatMap(([tierIndex, faces], ti) =>
                  faces.map((faceBooks, faceIdx) => {
                    const isFirst = ti === 0 && faceIdx === 0;
                    const isFirstFace = faceIdx === 0;
                    return (
                      <TableRow
                        key={`${shelf.id}-${tierIndex}-${faceIdx}`}
                        sx={{
                          borderTop: isFirst ? 2 : 1,
                          borderColor: isFirst ? "primary.light" : "divider",
                          "&:hover": { bgcolor: "rgba(25,118,210,0.04)" },
                        }}
                      >
                        {isFirst && (
                          <TableCell rowSpan={tiers.length * 2} sx={{ fontWeight: 700, color: "primary.main", verticalAlign: "top" }}>
                            {shelf.code}
                          </TableCell>
                        )}
                        {isFirstFace && (
                          <TableCell rowSpan={2} sx={{ color: "text.secondary", fontWeight: 500, verticalAlign: "top" }}>
                            {tierIndex + 1}
                          </TableCell>
                        )}
                        <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap", fontSize: "0.75rem" }}>
                          {FACE_LABELS[faceIdx]}
                        </TableCell>
                        <TableCell>
                          {faceBooks.length === 0 ? (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>Trống</Typography>
                          ) : (
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: "2px 8px" }}>
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
                                        fontSize: 6,
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
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Paper>
  );
}
