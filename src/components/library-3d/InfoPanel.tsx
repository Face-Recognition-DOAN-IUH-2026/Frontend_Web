"use client";

import type { BookData } from "./types";

interface InfoPanelProps {
  book: BookData | null;
  onClose: () => void;
}

export default function InfoPanel({ book, onClose }: InfoPanelProps) {
  if (!book) return null;

  return (
    <div className="absolute top-6 right-6 z-10 w-72 p-5 rounded-2xl bg-surface/95 backdrop-blur-xl shadow-glow-sm border border-primary/10 animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-serif text-lg font-semibold text-primary leading-tight pr-2">Chi tiết sách</h3>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-text-3 hover:text-text transition flex-shrink-0 border border-border"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium text-text">{book.title}</div>
          <div className="text-xs text-text-3 mt-0.5">{book.author}</div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="relative flex w-2.5 h-2.5">
            <span className={`absolute inline-flex w-full h-full rounded-full ${book.status === "available" ? "bg-success" : "bg-error"}`} />
            <span className={`absolute inline-flex w-full h-full rounded-full animate-ping opacity-75 ${book.status === "available" ? "bg-success" : "bg-error"}`} />
          </span>
          <span className={`text-xs font-semibold font-serif ${book.status === "available" ? "text-success" : "text-error"}`}>
            {book.status === "available" ? "Có sẵn" : "Đã được mượn"}
          </span>
        </div>

        <div className="text-xs text-text-3">
          <span className="font-medium text-text-2">ISBN:</span> {book.isbn}
        </div>

        <button
          disabled={book.status !== "available"}
          className={`w-full mt-1 py-2.5 rounded-xl text-sm font-medium transition shadow-sm active:scale-[0.98] ${
            book.status === "available"
              ? "bg-primary hover:bg-primary-dark text-bg"
              : "bg-surface-2 text-text-3 cursor-not-allowed"
          }`}
        >
          {book.status === "available" ? "Mượn ngay" : "Không thể mượn"}
        </button>
      </div>
    </div>
  );
}
