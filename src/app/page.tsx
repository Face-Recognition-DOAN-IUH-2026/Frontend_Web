"use client";

import dynamic from "next/dynamic";
import LandingOverlay from "@/components/landing/LandingOverlay";

const Landing3DScene = dynamic(
  () => import("@/components/landing/Landing3DScene"),
  { ssr: false }
);

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-[#0f172a] overflow-hidden">
      <Landing3DScene />
      <LandingOverlay />
    </div>
  );
}
