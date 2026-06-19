"use client";

import { useState, Suspense } from "react";
import dynamic from "next/dynamic";
import type { BookData } from "@/components/library-3d/types";
import { useLibraryData } from "@/components/library-3d/hooks/useLibraryData";
import SearchOverlay from "@/components/library-3d/SearchOverlay";
import InfoPanel from "@/components/library-3d/InfoPanel";
import Instructions from "@/components/library-3d/Instructions";

const LibraryScene = dynamic(() => import("@/components/library-3d/LibraryScene"), { ssr: false });

export default function LibraryMap3DPage() {
  const { shelves, loading } = useLibraryData();
  const [selectedBook, setSelectedBook] = useState<BookData | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<[number, number, number] | null>(null);

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
      <Suspense fallback={null}>
        <LibraryScene
          shelves={shelves}
          selectedBook={selectedBook}
          flyToTarget={flyToTarget}
          onBookSelect={(book) => setSelectedBook(book)}
        />
      </Suspense>

      <SearchOverlay
        shelves={shelves}
        onSearch={(book) => setSelectedBook(book)}
        onFlyTo={(pos) => setFlyToTarget([pos[0], pos[1] + 1.6, pos[2]])}
      />

      <InfoPanel book={selectedBook} onClose={() => setSelectedBook(null)} />
      <Instructions />
    </div>
  );
}
