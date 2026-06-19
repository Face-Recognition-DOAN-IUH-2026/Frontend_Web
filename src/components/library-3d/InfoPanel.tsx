"use client";

import type { BookData } from "./types";

interface InfoPanelProps {
  book: BookData | null;
  onClose: () => void;
}

export default function InfoPanel({ book, onClose }: InfoPanelProps) {
  if (!book) return null;

  return (
    <div className="absolute top-6 right-6 z-10 w-72 p-5 rounded-2xl shadow-xl backdrop-blur-md bg-white/90 border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-900 leading-tight pr-2">Chi tiết sách</h3>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition flex-shrink-0"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2.5">
        <div>
          <div className="text-sm font-semibold text-gray-900">{book.title}</div>
          <div className="text-xs text-gray-500">{book.author}</div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${book.status === "available" ? "bg-green-500" : "bg-red-500"}`} />
          <span className={`text-sm font-semibold ${book.status === "available" ? "text-green-600" : "text-red-600"}`}>
            {book.status === "available" ? "Có sẵn" : "Đã được mượn"}
          </span>
        </div>

        <div className="text-xs text-gray-500">
          <span className="font-medium">ISBN:</span> {book.isbn}
        </div>

        <button
          disabled={book.status !== "available"}
          className={`w-full mt-2 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm ${
            book.status === "available"
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {book.status === "available" ? "Mượn ngay" : "Không thể mượn"}
        </button>
      </div>
    </div>
  );
}
