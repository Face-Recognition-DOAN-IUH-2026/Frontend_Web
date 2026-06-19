"use client";

import { useState } from "react";
import type { BookData } from "@/components/library-3d/types";
import { useLibraryData } from "@/components/library-3d/hooks/useLibraryData";
import InfoPanel from "@/components/library-3d/InfoPanel";
import FloorMap from "@/components/library-2d/FloorMap";

export default function LibraryMapContent() {
  const { shelves, loading } = useLibraryData();
  const [selectedBook, setSelectedBook] = useState<BookData | null>(null);

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
    <div className="w-screen h-screen relative overflow-auto bg-bg">
      <FloorMap
        shelves={shelves}
        onBookClick={(book) => setSelectedBook(book)}
      />
      <InfoPanel
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        className="fixed top-6 right-6"
      />
    </div>
  );
}
