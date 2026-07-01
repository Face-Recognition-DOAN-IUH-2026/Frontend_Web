"use client";

import { useState } from "react";
import api, { getErrorMessage } from "@/lib/api-client";

interface UseAutoScheduleReturn {
  autoStep: "select" | "preview";
  autoProposals: any[];
  autoSkipped: number;
  autoLoading: boolean;
  autoActualRange: { from: string; to: string } | null;
  handleAutoSchedule: (from: string, to: string) => Promise<void>;
  handleAutoScheduleConfirm: () => Promise<void>;
  resetAuto: () => void;
  setError: (msg: string | null) => void;
}

export function useAutoSchedule(onSuccess: () => void): UseAutoScheduleReturn {
  const [autoStep, setAutoStep] = useState<"select" | "preview">("select");
  const [autoProposals, setAutoProposals] = useState<any[]>([]);
  const [autoSkipped, setAutoSkipped] = useState(0);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoActualRange, setAutoActualRange] = useState<{ from: string; to: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAutoSchedule = async (autoFrom: string, autoTo: string) => {
    setAutoLoading(true);
    setError(null);
    try {
      const result = await api.autoSchedule({ from: autoFrom, to: autoTo });
      const count = result.proposed?.length || 0;
      setAutoActualRange(result.actualFrom && result.actualTo ? { from: result.actualFrom, to: result.actualTo } : null);
      if (count === 0) { setAutoProposals([]); setAutoSkipped(result.skipped || 0); setAutoStep("preview"); setAutoLoading(false); return; }
      setAutoProposals(result.proposed);
      setAutoSkipped(result.skipped || 0);
      setAutoStep("preview");
    } catch (err) { setError(getErrorMessage(err)); }
    setAutoLoading(false);
  };

  const handleAutoScheduleConfirm = async () => {
    setAutoLoading(true);
    try {
      await api.createScheduleAssignmentsBulk(autoProposals);
      await onSuccess();
      setAutoStep("select");
    } catch (err) { setError(getErrorMessage(err)); }
    setAutoLoading(false);
  };

  const resetAuto = () => {
    setAutoStep("select");
    setAutoProposals([]);
    setAutoSkipped(0);
    setAutoActualRange(null);
  };

  return {
    autoStep, autoProposals, autoSkipped, autoLoading, autoActualRange,
    handleAutoSchedule, handleAutoScheduleConfirm, resetAuto, setError,
  };
}
