"use client";

import dynamic from "next/dynamic";

const LibraryMapContent = dynamic(() => import("./LibraryMapContent"), { ssr: false });

export default function LibraryMapPage() {
  return <LibraryMapContent />;
}
