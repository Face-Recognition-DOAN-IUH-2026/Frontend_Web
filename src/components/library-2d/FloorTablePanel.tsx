"use client";

import { useMemo, useState } from "react";
import type { BookData, ShelfData } from "@/components/library-3d/types";

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
    <div className="absolute top-14 left-4 z-20 w-[420px] max-h-[calc(100vh-80px)] rounded-xl bg-surface/95 backdrop-blur-xl shadow-xl border border-primary/10 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <h3 className="text-sm font-bold text-text flex items-center gap-1.5">
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Bảng chọn tầng
        </h3>

        {/* Floor tabs */}
        <div className="flex items-center gap-1.5 mt-3">
          {floors.map((f) => (
            <button
              key={f}
              onClick={() => handleFloorClick(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                activeFloor === f
                  ? "bg-primary text-white border-primary"
                  : "bg-surface-2 text-text-2 border-border hover:bg-surface-3"
              }`}
            >
              Tầng {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-2">
              <th className="px-3 py-2 text-left font-bold text-text-3 uppercase tracking-wider w-[60px]">Kệ</th>
              <th className="px-3 py-2 text-left font-bold text-text-3 uppercase tracking-wider w-[55px]">Tầng</th>
              <th className="px-3 py-2 text-left font-bold text-text-3 uppercase tracking-wider w-[70px]">Mặt</th>
              <th className="px-3 py-2 text-left font-bold text-text-3 uppercase tracking-wider">Sách</th>
            </tr>
          </thead>
          <tbody>
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
                    <tr
                      key={`${shelf.id}-${tierIndex}-${faceIdx}`}
                      className={`border-t border-border hover:bg-primary/[0.04] transition ${
                        isFirst ? "border-t-2 border-t-primary/20" : ""
                      }`}
                    >
                      {isFirst && (
                        <td className="px-3 py-2 font-bold text-primary align-top" rowSpan={tiers.length * 2}>
                          {shelf.code}
                        </td>
                      )}
                      {isFirstFace && (
                        <td className="px-3 py-2 text-text-2 font-medium align-top" rowSpan={2}>
                          {tierIndex + 1}
                        </td>
                      )}
                      <td className="px-3 py-1.5 text-text-3 whitespace-nowrap">
                        {FACE_LABELS[faceIdx]}
                      </td>
                      <td className="px-3 py-1.5">
                        {faceBooks.length === 0 ? (
                          <span className="text-text-3 italic">Trống</span>
                        ) : (
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                            {faceBooks.map((book) => (
                              <button
                                key={book.id}
                                onClick={() => onBookClick?.(book)}
                                className="text-left group/row"
                              >
                                <span className="text-text group-hover/row:text-primary transition">
                                  {book.title}
                                </span>
                                <span className="text-text-3 ml-0.5">— {book.author}</span>
                                <span
                                  className={`ml-1 inline-block w-1.5 h-1.5 rounded-full align-middle ${
                                    book.status === "available" ? "bg-success" : "bg-error"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
