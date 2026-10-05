"use client";

import LandingOverlay from "@/app/_components/landing/LandingOverlay";
import TechLibraryBackground from "@/app/_components/landing/TechLibraryBackground";

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-transparent overflow-hidden">
      <TechLibraryBackground />
      <LandingOverlay />
    </div>
  );
}

