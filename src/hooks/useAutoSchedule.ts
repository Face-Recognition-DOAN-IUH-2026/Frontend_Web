"use client";

import { useCallback, useRef, useState } from "react";
import api, { getErrorMessage } from "@/lib/api-client";

export interface AutoScheduleState {
  showAutoSchedule: boolean;
  setShowAutoSchedule: (v: boolean) => void;
  autoStep: "select" | "preview";
  autoProposals: any[];
  autoSkipped: number;
  autoActualRange: { from: string; to: string } | null;
  autoLoading: boolean;
  handleAutoSchedule: (from: string, to: string) => Promise<void>;
  handleAutoScheduleConfirm: (selected?: any[]) => Promise<void>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useAutoSchedule(
  loadData: () => Promise<void>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
): AutoScheduleState {
  const [showAutoSchedule, setShowAutoSchedule] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoStep, setAutoStep] = useState<"select" | "preview">("select");
  const [autoProposals, setAutoProposals] = useState<any[]>([]);
  const [autoSkipped, setAutoSkipped] = useState(0);
  const [autoActualRange, setAutoActualRange] = useState<{ from: string; to: string } | null>(null);

  // Ref giữ loadData mới nhất → handleAutoScheduleConfirm ổn định identity.
  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;

  const handleAutoSchedule = useCallback(async (autoFrom: string, autoTo: string) => {
    setAutoLoading(true);
    setError(null);
    try {
      const result = await api.autoSchedule({ from: autoFrom, to: autoTo });
      const count = result.proposed?.length || 0;
      setAutoActualRange(
        result.actualFrom && result.actualTo ? { from: result.actualFrom, to: result.actualTo } : null,
      );
      if (count === 0) {
        setAutoProposals([]);
        setAutoSkipped(result.skipped || 0);
        setAutoStep("preview");
        setAutoLoading(false);
        return;
      }
      setAutoProposals(result.proposed);
      setAutoSkipped(result.skipped || 0);
      setAutoStep("preview");
    } catch (err) {
      setError(getErrorMessage(err));
    }
    setAutoLoading(false);
  }, [setError]);

  const handleAutoScheduleConfirm = useCallback(async (selected?: any[]) => {
    setAutoLoading(true);
    try {
      const items = selected && selected.length > 0 ? selected : autoProposals;
      await api.createScheduleAssignmentsBulk(items);
      await loadDataRef.current();
      setShowAutoSchedule(false);
      setAutoStep("select");
    } catch (err) {
      setError(getErrorMessage(err));
    }
    setAutoLoading(false);
  }, [autoProposals, setError]);

  return {
    showAutoSchedule, setShowAutoSchedule,
    autoStep, autoProposals, autoSkipped, autoActualRange, autoLoading,
    handleAutoSchedule, handleAutoScheduleConfirm, setError,
  };
}
