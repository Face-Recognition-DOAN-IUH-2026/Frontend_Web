"use client";

import { useEffect, useState } from "react";
import type { ShelfData } from "../types";
import { assignPositions } from "../config/shelf-positions";
import { MOCK_SHELVES } from "../data/mock-shelves";

export function useLibraryData() {
  const [shelves, setShelves] = useState<ShelfData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/library/shelves");
        if (!res.ok) throw new Error("API not ready");
        const data = await res.json();
        setShelves(assignPositions(data.shelves));
      } catch {
        setShelves(assignPositions(MOCK_SHELVES));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { shelves, loading, error };
}
