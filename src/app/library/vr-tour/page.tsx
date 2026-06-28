'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Import VRViewer with SSR disabled since it uses WebGL/window objects
const VRViewer = dynamic(() => import('@/components/vr/VRViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
      <h2 className="text-white text-lg font-bold">Đang tải không gian tham quan 3D...</h2>
      <p className="text-slate-400 text-sm mt-2">Vui lòng chờ trong giây lát</p>
    </div>
  ),
});

export default function VRTourPage() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-white text-lg font-bold">Đang tải không gian tham quan 3D...</h2>
        <p className="text-slate-400 text-sm mt-2">Vui lòng chờ trong giây lát</p>
      </div>
    );
  }

  return (
    <main className="w-screen h-screen overflow-hidden bg-black">
      <VRViewer />
    </main>
  );
}
