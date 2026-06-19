"use client";

import dynamic from "next/dynamic";

const LibraryMapContent = dynamic(() => import("./LibraryMapContent"), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen flex items-center justify-center bg-gray-900">
      <div className="text-white/60 text-sm animate-pulse">Đang tải bản đồ thư viện...</div>
    </div>
  ),
});

export default function LibraryMapPage() {
  return <LibraryMapContent />;
}
