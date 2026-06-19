"use client";

import { useState, Suspense } from "react";
import type { BookData } from "@/components/library-3d/types";
import { useLibraryData } from "@/components/library-3d/hooks/useLibraryData";
import LibraryScene from "@/components/library-3d/LibraryScene";
import SearchOverlay from "@/components/library-3d/SearchOverlay";
import InfoPanel from "@/components/library-3d/InfoPanel";
import Instructions from "@/components/library-3d/Instructions";

export default function LibraryMapPage() {
  const { shelves, loading } = useLibraryData();
  const [selectedBook, setSelectedBook] = useState<BookData | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<[number, number, number] | null>(null);

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white/60 text-sm animate-pulse">Đang tải bản đồ thư viện...</div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-gray-900">
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
        onFlyTo={(pos) => setFlyToTarget(pos)}
      />

      <InfoPanel book={selectedBook} onClose={() => setSelectedBook(null)} />
      <Instructions />
    </div>
  );
}
