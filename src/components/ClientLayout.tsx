"use client";

import AIWidget from "@/components/AIWidget";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AIWidget />
    </>
  );
}