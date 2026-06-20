"use client";

import dynamic from "next/dynamic";

const AICommandCenter = dynamic(() => import("./AICommandCenter"), { ssr: false });

export default function AICommandCenterPage() {
  return <AICommandCenter />;
}
