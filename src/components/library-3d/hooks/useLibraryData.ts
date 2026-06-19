"use client";

import { useEffect, useState } from "react";
import type { ShelfData } from "../types";
import { assignPositions } from "../config/shelf-positions";
import { MOCK_SHELVES } from "../data/mock-shelves";

function parseShelfCode(code: string): { floor: string; shelfNum: number } {
  const parts = code.split("-");
  return {
    floor: parts[0] || "A",
    shelfNum: parseInt(parts[1], 10) || 0,
  };
}

function enrichShelf(shelf: ShelfData): ShelfData {
  if (shelf.floor && shelf.shelfNum) return shelf;
  const parsed = parseShelfCode(shelf.code);
  return { ...shelf, floor: parsed.floor, shelfNum: parsed.shelfNum };
}

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
        setShelves(assignPositions(data.shelves.map(enrichShelf)));
      } catch {
        setShelves(assignPositions(MOCK_SHELVES.map(enrichShelf)));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { shelves, loading, error };
}
