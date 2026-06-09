"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import api from "@/lib/api-client";
import type { TaskStatusResponse } from "@/lib/types";

interface JobPollProps {
  jobId: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

export default function JobPoll({ jobId, onComplete, onError }: JobPollProps) {
  const [status, setStatus] = useState<string>("PENDING");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const response = await api.getTaskStatus(jobId);
        setStatus(response.status);

        if (response.status === "SUCCESS") {
          setResult(response.result);
          onComplete?.(response.result);
        } else if (response.status === "FAILURE") {
          const errorMsg = response.result?.error || response.result?.detail || "Task failed";
          setError(errorMsg);
          onError?.(errorMsg);
        }
      } catch (err: any) {
        const msg = err.message || "Failed to get task status";
        setError(msg);
        onError?.(msg);
      }
    };

    poll();
    const interval = setInterval(poll, 2000);

    return () => clearInterval(interval);
  }, [jobId, onComplete, onError]);

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-lg">
        <XCircle className="w-6 h-6" />
        <div>
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (status === "SUCCESS") {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 text-green-600 rounded-lg">
        <CheckCircle className="w-6 h-6" />
        <div>
          <p className="font-semibold">Success</p>
          {result && (
            <p className="text-sm">
              {result.verified !== undefined && (
                <span>
                  Verified: {result.verified ? "Yes" : "No"} (Score:{" "}
                  {result.score?.toFixed(4)})
                </span>
              )}
              {result.matches && (
                <span>
                  Found {result.matches.length} match(es)
                </span>
              )}
              {result.is_live !== undefined && (
                <span>
                  Live: {result.is_live ? "Yes" : "No"} (Score:{" "}
                  {result.liveness_score?.toFixed(4)})
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-blue-50 text-blue-600 rounded-lg">
      <Loader2 className="w-6 h-6 animate-spin" />
      <div>
        <p className="font-semibold">Processing...</p>
        <p className="text-sm">Job ID: {jobId}</p>
      </div>
    </div>
  );
}