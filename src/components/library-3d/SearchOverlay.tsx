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
    <div ref={ref} className="absolute top-6 left-1/2 -translate-x-1/2 z-10 w-[28rem]">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface/80 backdrop-blur-xl shadow-glow-sm border border-primary/10">
        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Tìm sách theo tên hoặc tác giả..."
          className="flex-1 bg-transparent text-sm text-text placeholder:text-text-3/50 focus:outline-none"
        />
      </div>

      {showDropdown && results.length > 0 && (
        <div className="mt-2 rounded-xl bg-surface/95 backdrop-blur-xl shadow-xl border border-primary/10 overflow-hidden">
          {results.map((book) => (
            <button
              key={book.id}
              onClick={() => handleSelect(book)}
              className="w-full text-left px-4 py-3 hover:bg-surface-2 transition flex items-center gap-3 border-b border-border last:border-0"
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${book.status === "available" ? "bg-success shadow-[0_0_6px_rgba(74,140,92,0.5)]" : "bg-error shadow-[0_0_6px_rgba(196,78,78,0.5)]"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-text truncate">{book.title}</div>
                <div className="text-xs text-text-3 truncate">{book.author} &mdash; Kệ {book.shelfCode}</div>
              </div>
              <span className={`text-xs font-medium font-serif ${book.status === "available" ? "text-success" : "text-error"}`}>
                {book.status === "available" ? "Có sẵn" : "Đã mượn"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
