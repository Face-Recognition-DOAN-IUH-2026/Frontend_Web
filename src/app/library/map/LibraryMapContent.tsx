"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { BookData } from "@/components/library-3d/types";
import { useLibraryData } from "@/components/library-3d/hooks/useLibraryData";
import SearchOverlay from "@/components/library-3d/SearchOverlay";
import InfoPanel from "@/components/library-3d/InfoPanel";
import Instructions from "@/components/library-3d/Instructions";
import FloorTablePanel from "@/components/library-2d/FloorTablePanel";

const LibraryScene = dynamic(() => import("@/components/library-3d/LibraryScene"), { ssr: false });

export default function LibraryMapContent() {
  const { shelves, loading } = useLibraryData();
  const [selectedBook, setSelectedBook] = useState<BookData | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<[number, number, number] | null>(null);
  const [showFloorPanel, setShowFloorPanel] = useState(false);

  const handleFloorSelect = (floor: string) => {
    const floorShelves = shelves.filter((s) => s.floor === floor);
    if (floorShelves.length === 0) return;
    const avgX = floorShelves.reduce((sum, s) => sum + s.position[0], 0) / floorShelves.length;
    const avgZ = floorShelves.reduce((sum, s) => sum + s.position[2], 0) / floorShelves.length;
    setFlyToTarget([avgX, 0, avgZ]);
  };

  if (loading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center gap-8 bg-bg">
        <div className="flex items-end gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="shimmer rounded-lg"
              style={{ width: `${12 + i * 4}px`, height: `${28 + i * 16}px` }}
            />
          ))}
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-48 h-2 shimmer rounded-full" />
          <div className="w-32 h-2 shimmer rounded-full" />
        </div>
        <div className="text-text-3 text-xs animate-pulse font-serif tracking-wider">Đang sắp xếp sách lên kệ...</div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-bg">
      {/* 3D Scene */}
      <LibraryScene
        shelves={shelves}
        selectedBook={selectedBook}
        flyToTarget={flyToTarget}
        onBookSelect={(book) => setSelectedBook(book)}
      />

      {/* Search */}
      <SearchOverlay
        shelves={shelves}
        onSearch={(book) => setSelectedBook(book)}
        onFlyTo={(pos) => setFlyToTarget([pos[0], pos[1] + 1.6, pos[2]])}
      />

      {/* Book detail */}
      <InfoPanel book={selectedBook} onClose={() => setSelectedBook(null)} />

      {/* Instructions */}
      <Instructions />

      {/* Floor table toggle button */}
      <button
        onClick={() => setShowFloorPanel(!showFloorPanel)}
        className={`absolute top-6 right-6 z-20 px-3 py-2 rounded-xl text-xs font-semibold transition-all border shadow-sm ${
          showFloorPanel
            ? "bg-primary text-white border-primary"
            : "bg-surface/80 backdrop-blur-xl text-text-2 border-border hover:bg-surface-2"
        }`}
      >
        {showFloorPanel ? "Đóng bảng" : "Bảng tầng"}
      </button>

      {/* Floor table panel */}
      {showFloorPanel && (
        <FloorTablePanel
          shelves={shelves}
          onBookClick={(book) => setSelectedBook(book)}
          onFloorSelect={handleFloorSelect}
        />
      )}
    </div>
  );
}
