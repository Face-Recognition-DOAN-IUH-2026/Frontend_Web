"use client";

export default function Instructions() {
  return (
    <div className="absolute bottom-6 left-6 z-10 px-4 py-3 rounded-xl bg-black/50 backdrop-blur-sm text-white/80 text-xs leading-relaxed select-none">
      <div className="flex items-center gap-1.5">🖱 Kéo để xoay | Lăn để phóng to/thu nhỏ</div>
      <div className="flex items-center gap-1.5 mt-0.5">👆 Click vào sách để xem chi tiết</div>
    </div>
  );
}
