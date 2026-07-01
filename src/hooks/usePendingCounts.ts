"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api-client";
import type { ManualCheckInRequest } from "@/lib/types";

export interface PendingCounts {
import { useEffect, useState } from "react";
import api from "@/lib/api-client";
import type { ManualCheckInRequest } from "@/lib/types";

interface UsePendingCountsReturn {
  pendingBidCount: number;
  pendingSwapCount: number;
  pendingManualCount: number;
}

export function usePendingCounts(isAdmin: boolean, loading: boolean): PendingCounts {
export function usePendingCounts(isAdmin: boolean, loading: boolean): UsePendingCountsReturn {
  const [pendingBidCount, setPendingBidCount] = useState(0);
  const [pendingSwapCount, setPendingSwapCount] = useState(0);
  const [pendingManualCount, setPendingManualCount] = useState(0);

  const loadCounts = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [bids, swaps, manuals] = await Promise.all([
        api.listAllBids({ status: "pending" }).catch(() => []),
        api.listAllSwaps({ status: "pending" }).catch(() => []),
        api.listManualCheckInRequests().catch(() => []),
      ]);
      setPendingBidCount(bids.length);
      setPendingSwapCount(swaps.length);
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
  useEffect(() => {
    if (!isAdmin) return;
    const loadCounts = async () => {
      try {
        const [bids, swaps, manuals] = await Promise.all([
          api.listAllBids({ status: "pending" }).catch(() => []),
          api.listAllSwaps({ status: "pending" }).catch(() => []),
          api.listManualCheckInRequests().catch(() => []),
        ]);
        setPendingBidCount(bids.length);
        setPendingSwapCount(swaps.length);
        setPendingManualCount(manuals.filter((m: ManualCheckInRequest) => m.status === "pending_manual").length);
      } catch {}
    };
    loadCounts();
    const interval = setInterval(loadCounts, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, loading]);

  return { pendingBidCount, pendingSwapCount, pendingManualCount };
}
