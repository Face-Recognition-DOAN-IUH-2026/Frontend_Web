"use client";

export default function Instructions() {
  return (
    <div className="absolute bottom-6 left-6 z-10 px-4 py-3 rounded-xl bg-surface-2/70 backdrop-blur-sm text-text-3 text-xs leading-relaxed select-none border border-border/50">
      <div className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
        Kéo để xoay &bull; Lăn để phóng to/thu nhỏ
      </div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Click vào sách để xem chi tiết
      </div>
    </div>
  );
}
