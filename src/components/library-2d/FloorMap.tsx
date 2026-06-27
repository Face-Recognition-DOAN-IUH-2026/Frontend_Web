"use client";

import { useMemo, useState } from "react";
import type { BookData, ShelfData } from "./types";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import MenuBookIcon from "@mui/icons-material/MenuBook";

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

  return (
    <div className="min-h-screen bg-bg p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <MenuBookIcon sx={{ fontSize: 28, color: "var(--color-primary)" }} />
          Bản đồ thư viện
        </h1>
        <p className="text-sm text-text-3 mt-1">
          Chọn tầng để xem vị trí sách trên kệ
        </p>
      </div>

      {/* Floor tabs */}
      <div className="flex items-center gap-2 mb-4">
        {floors.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFloor(f)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
              activeFloor === f
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-surface text-text-2 border-border hover:bg-surface-2"
            }`}
          >
            Tầng {f}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative mb-4 max-w-md">
        <SearchIcon
          sx={{ fontSize: 18, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-3)" }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm sách theo tên, tác giả, ISBN..."
          className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border bg-surface text-sm text-text placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-surface-2 transition"
          >
            <ClearIcon sx={{ fontSize: 16, color: "var(--color-text-3)" }} />
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-text-3 mb-4">
        <span>
          Kệ: <span className="font-bold text-text-2">{currentShelves.length}</span>
        </span>
        <span className="w-px h-3 bg-border" />
        <span>
          Sách: <span className="font-bold text-text-2">{totalBooks}</span>
        </span>
        {searchQuery && (
          <>
            <span className="w-px h-3 bg-border" />
            <span>
              Kết quả: <span className="font-bold text-primary">{groups.reduce((s, g) => s + g.tiers.reduce((ts, t) => ts + t.faces[0].length + t.faces[1].length, 0), 0)}</span>
            </span>
          </>
        )}
      </div>

      {/* Table */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-text-3">
          <MenuBookIcon sx={{ fontSize: 40, opacity: 0.3, mb: 2 }} />
          <p className="text-sm">Không tìm thấy kệ nào{searchQuery ? ` với từ khóa "${searchQuery}"` : ""}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-2">
                <th className="px-4 py-3 text-left text-xs font-bold text-text-3 uppercase tracking-wider w-[120px]">Kệ</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-text-3 uppercase tracking-wider w-[100px]">Tầng kệ</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-text-3 uppercase tracking-wider w-[110px]">Mặt</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-text-3 uppercase tracking-wider">Sách</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) =>
                group.tiers.flatMap((tier, ti) =>
                  tier.faces.map((faceBooks, faceIdx) => {
                    const isFirstRowOfShelf = ti === 0 && faceIdx === 0;
                    const isFirstFaceOfTier = faceIdx === 0;
                    return (
                      <tr
                        key={`${group.shelf.id}-${tier.tierIndex}-${faceIdx}`}
                        className={`border-t border-border transition hover:bg-primary/[0.03] ${
                          ti === 0 && faceIdx === 0 ? "border-t-2 border-t-primary/20" : ""
                        }`}
                      >
                        {/* Shelf code — only show on first row */}
                        {isFirstRowOfShelf && (
                          <td
                            className="px-4 py-3 font-bold text-primary align-top"
                            rowSpan={group.tiers.length * 2}
                          >
                            {group.shelf.code}
                          </td>
                        )}
                        {/* Tier — show on first face row, rowspan=2 */}
                        {isFirstFaceOfTier && (
                          <td
                            className="px-4 py-3 text-text-2 font-medium align-top"
                            rowSpan={2}
                          >
                            Tầng {tier.tierIndex + 1}
                          </td>
                        )}
                        {/* Face label */}
                        <td className="px-4 py-2 text-xs text-text-3">
                          {FACE_LABELS[faceIdx]}
                        </td>
                        {/* Books */}
                        <td className="px-4 py-2">
                          {faceBooks.length === 0 ? (
                            <span className="text-xs text-text-3 italic">Trống</span>
                          ) : (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                              {faceBooks.map((book) => (
                                <button
                                  key={book.id}
                                  onClick={() => onBookClick?.(book)}
                                  className="text-left group/book"
                                >
                                  <span className="text-xs text-text group-hover/book:text-primary transition">
                                    {book.title}
                                  </span>
                                  <span className="text-[10px] text-text-3 ml-1">
                                    — {book.author}
                                  </span>
                                  <span
                                    className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full align-middle ${
                                      book.status === "available" ? "bg-success" : "bg-error"
                                    }`}
                                    title={book.status === "available" ? "Có sẵn" : "Đã mượn"}
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
