"use client";

import dynamic from "next/dynamic";
import LandingOverlay from "@/app/_components/landing/LandingOverlay";

// Lazy-load canvas animation — splits it from the initial JS bundle
// and prevents it from blocking first paint.
const TechLibraryBackground = dynamic(
  () => import("@/app/_components/landing/TechLibraryBackground"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background:
            "linear-gradient(135deg, #0A2540 0%, #1E6091 50%, #0F3C5C 100%)",
        }}
      />
    ),
  }
);

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-transparent overflow-hidden">
      <TechLibraryBackground />
      <LandingOverlay />
    </div>
  );
}

