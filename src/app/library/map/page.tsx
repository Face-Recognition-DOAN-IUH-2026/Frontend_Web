"use client";

import { useEffect, useState } from "react";

export default function LibraryMapPage() {
  const [Comp, setComp] = useState<React.ComponentType<object> | null>(null);

  useEffect(() => {
    import("./LibraryMapContent").then((m) => setComp(() => m.default));
  }, []);

  if (!Comp) {
    return <div className="w-screen h-screen bg-gray-900" />;
  }

  return <Comp />;
}
