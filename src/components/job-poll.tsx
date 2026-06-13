"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import api, { getErrorMessage } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

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
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const poll = async () => {
      try {
        const response = await api.getTaskStatus(jobId);
        setStatus(response.status);
        if (response.status === "SUCCESS") {
          if (response.result?.status === "error") {
            const errorMsg = response.result.error || "Task failed";
            setError(errorMsg);
            onError?.(errorMsg);
          } else {
            setResult(response.result);
            onComplete?.(response.result);
          }
          if (intervalId) clearInterval(intervalId);
        } else if (response.status === "FAILURE") {
          const errorMsg = response.result?.error || response.result?.detail || "Task failed";
          setError(errorMsg);
          onError?.(errorMsg);
          if (intervalId) clearInterval(intervalId);
        }
      } catch (err: any) {
        const msg = getErrorMessage(err) || "Failed to get task status";
        setError(msg);
        onError?.(msg);
        if (intervalId) clearInterval(intervalId);
      }
    };
    poll();
    intervalId = setInterval(poll, 2000);
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [jobId, onComplete, onError]);

  if (error) {
    return (
      <Card accent="error">
        <CardContent className="p-4 flex items-center gap-3 text-error">
          <XCircle size={20} />
          <div>
            <p className="text-body-md font-semibold">Lỗi</p>
            <p className="text-body-sm opacity-80">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "SUCCESS") {
    return (
      <Card accent="success">
        <CardContent className="p-4 flex items-center gap-3 text-success">
          <CheckCircle size={20} />
          <div>
            <p className="text-body-md font-semibold">Thành công</p>
            {result && (
              <p className="text-body-sm opacity-80">
                {result.verified !== undefined && `Xác minh: ${result.verified ? "Có" : "Không"} (Điểm: ${result.score?.toFixed(4)})`}
                {result.matches && `Tìm thấy ${result.matches.length} kết quả`}
                {result.is_live !== undefined && `Khuôn mặt thật: ${result.is_live ? "Có" : "Không"} (Điểm: ${result.liveness_score?.toFixed(4)})`}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3 text-info">
        <Loader2 size={20} className="animate-spin shrink-0" />
        <div>
          <p className="text-body-md font-semibold text-text">Đang xử lý...</p>
          <p className="text-body-sm text-text-3 font-mono">Job ID: {jobId}</p>
        </div>
      </CardContent>
    </Card>
  );
}