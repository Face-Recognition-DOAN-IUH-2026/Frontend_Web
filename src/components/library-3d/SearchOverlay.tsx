"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { BookData, ShelfData } from "./types";

interface SearchOverlayProps {
  shelves: ShelfData[];
  onSearch: (book: BookData) => void;
  onFlyTo: (position: [number, number, number]) => void;
}

export default function SearchOverlay({ shelves, onSearch, onFlyTo }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return shelves
      .flatMap((s) => s.books.map((b) => ({ ...b, shelfCode: s.code, shelfPosition: s.position })))
      .filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, shelves]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (book: typeof results[0]) => {
    setQuery(book.title);
    setShowDropdown(false);
    onSearch(book);
    onFlyTo(book.shelfPosition);
  };

  return (
    <div ref={ref} className="absolute top-6 left-1/2 -translate-x-1/2 z-10 w-96">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Tìm sách theo tên hoặc tác giả..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 shadow-lg backdrop-blur-md bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          Tìm
        </button>
      </div>

      {showDropdown && results.length > 0 && (
        <div className="mt-2 rounded-xl bg-white/95 backdrop-blur-md shadow-xl border border-gray-100 overflow-hidden">
          {results.map((book) => (
            <button
              key={book.id}
              onClick={() => handleSelect(book)}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition flex items-center gap-3 border-b border-gray-50 last:border-0"
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${book.status === "available" ? "bg-green-500" : "bg-red-500"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 truncate">{book.title}</div>
                <div className="text-xs text-gray-500 truncate">{book.author} — Kệ {book.shelfCode}</div>
              </div>
              <span className={`text-xs font-medium ${book.status === "available" ? "text-green-600" : "text-red-600"}`}>
                {book.status === "available" ? "Có sẵn" : "Đã mượn"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
