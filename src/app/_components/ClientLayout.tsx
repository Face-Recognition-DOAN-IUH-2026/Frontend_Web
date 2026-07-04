"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { setupGlobalErrorHandlers } from "@/lib/error-reporter";
import AIWidget from "@/app/(dashboard)/_components/AIWidget";

const PUBLIC_PAGES = ["/library/vr-tour"];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showChatbot = !PUBLIC_PAGES.includes(pathname);

  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);

  return (
    <>
      {children}
      {showChatbot && <AIWidget />}
    </>
  );
}
