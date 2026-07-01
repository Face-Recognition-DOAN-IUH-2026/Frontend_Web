"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api-client";
import type { ManualCheckInRequest } from "@/lib/types";

export interface PendingCounts {
  pendingManualCount: number;
}

export function usePendingCounts(isAdmin: boolean, loading: boolean): PendingCounts {
  const [pendingManualCount, setPendingManualCount] = useState(0);

  const loadCounts = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const manuals = await api.listManualCheckInRequests().catch(() => []);
      setPendingManualCount(
        (manuals as ManualCheckInRequest[]).filter((m) => m.status === "pending_manual").length,
      );
    } catch {}
  }, [isAdmin]);

  useEffect(() => {
    loadCounts();
    const interval = setInterval(loadCounts, 30000);
    return () => clearInterval(interval);
  }, [loadCounts, loading]);

  return { pendingManualCount };
}
