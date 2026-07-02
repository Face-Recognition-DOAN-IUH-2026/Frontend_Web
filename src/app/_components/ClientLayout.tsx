"use client";

import { usePathname } from "next/navigation";
import AIWidget from "@/app/(dashboard)/_components/AIWidget";

const PUBLIC_PAGES = ["/library/vr-tour"];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showChatbot = !PUBLIC_PAGES.includes(pathname);

  return (
    <>
      {children}
      {showChatbot && <AIWidget />}
    </>
  );
}
