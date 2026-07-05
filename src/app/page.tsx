"use client";

import LandingOverlay from "@/app/_components/landing/LandingOverlay";

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-[#0f172a] overflow-hidden">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #12151f 50%, #0f172a 100%)",
        }}
      />
      <LandingOverlay />
    </div>
  );
}
