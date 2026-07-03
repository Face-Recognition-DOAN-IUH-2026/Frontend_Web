"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api-client";
import type { FaceResultEvent } from "@/lib/types";

export interface TaskSSEState {
  /** Current task status: IDLE | CONNECTING | WAITING | SUCCESS | FAILURE | ERROR | TIMEOUT */
  status: "IDLE" | "CONNECTING" | "WAITING" | "SUCCESS" | "FAILURE" | "ERROR" | "TIMEOUT";
  /** Result data when status is SUCCESS */
  result: Record<string, unknown> | null;
  /** Error message when status is FAILURE or ERROR or TIMEOUT */
  error: string | null;
  /** Whether SSE is connected */
  connected: boolean;
}

/**
 * Generic hook that replaces HTTP polling for task results.
 *
 * Listens for `face_result` SSE events filtered by task_id.
 * Returns `{ status, result, error, connected }` and a `start` function.
 *
 * Usage:
 * ```tsx
 * const { state, start, reset } = useTaskSSE();
 * // After calling an async face API that returns job_id:
 * start(jobId);
 * // state.status will change to SUCCESS/FAILURE when the SSE event arrives
 * ```
 */
export function useTaskSSE(timeoutMs = 120000) {
  const [state, setState] = useState<TaskSSEState>({
    status: "IDLE",
    result: null,
    error: null,
    connected: false,
  });

  const targetTaskIdRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      cleanupRef.current?.();
    };
  }, []);

  const safeSetState = useCallback((updater: (prev: TaskSSEState) => TaskSSEState) => {
    if (mountedRef.current) setState(updater);
  }, []);

  const reset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    cleanupRef.current?.();
    cleanupRef.current = null;
    targetTaskIdRef.current = null;
    safeSetState(() => ({
      status: "IDLE",
      result: null,
      error: null,
      connected: false,
    }));
  }, [safeSetState]);

  const start = useCallback((taskId: string) => {
    // Clean up any previous listener
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    cleanupRef.current?.();

    targetTaskIdRef.current = taskId;
    safeSetState(() => ({
      status: "CONNECTING",
      result: null,
      error: null,
      connected: false,
    }));

    const cleanup = api.connectFaceResultSSE(
      (event: FaceResultEvent) => {
        if (event.task_id !== targetTaskIdRef.current) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        cleanupRef.current?.();
        cleanupRef.current = null;

        if (event.status === "SUCCESS") {
          safeSetState((prev) => ({
            ...prev,
            status: "SUCCESS",
            result: event.result || null,
            error: null,
          }));
        } else {
          const errorMsg = (event.result as any)?.error || "Tác vụ thất bại.";
          safeSetState((prev) => ({
            ...prev,
            status: "FAILURE",
            result: event.result || null,
            error: errorMsg,
          }));
        }
      },
      (connected) => {
        safeSetState((prev) => ({
          ...prev,
          connected,
          status: connected && prev.status === "CONNECTING" ? "WAITING" : prev.status,
        }));
      },
    );

    cleanupRef.current = cleanup;

    // Set timeout
    timeoutRef.current = setTimeout(() => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      safeSetState((prev) => ({
        ...prev,
        status: "TIMEOUT",
        error: "Quá thời gian chờ kết quả.",
      }));
    }, timeoutMs);
  }, [timeoutMs, safeSetState]);

  return { state, start, reset };
}
