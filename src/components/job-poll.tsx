"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2, Eye, EyeOff } from "lucide-react";
import api from "@/lib/api-client";
import type { LivenessBreakdown } from "@/lib/types";

interface JobPollProps {
  jobId: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

const breakdownLabels: Record<keyof LivenessBreakdown, string> = {
  lbp: "Kết cấu (LBP)",
  color: "Màu sắc",
  noise: "Nhiễu",
  fft: "Tần số (FFT)",
  multi_scale: "Đa tỷ lệ",
  bbox: "Tỷ lệ khuôn mặt",
  insightface: "Học sâu",
};

function BreakdownBar({ label, score }: { label: string; score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.7 ? "bg-green-500" : score >= 0.4 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-28 text-right text-gray-600 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-200 rounded h-2">
        <div
          className={`h-2 rounded transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right font-mono text-xs text-gray-500">{pct}%</span>
    </div>
  );
}

function LivenessResultCard({ result }: { result: any }) {
  const isLive = result.is_live;
  const score = result.liveness_score ?? 0;
  const breakdown: LivenessBreakdown | undefined = result.breakdown;

  return (
    <div className="bg-white p-6 rounded-lg border space-y-4">
      <div className="flex items-center gap-3">
        {isLive ? (
          <Eye className="w-8 h-8 text-green-600" />
        ) : (
          <EyeOff className="w-8 h-8 text-red-600" />
        )}
        <div>
          <p className="text-xl font-bold">
            {isLive ? "KHUÔN MẶT THẬT" : "PHÁT HIỆN GIẢ MẠO"}
          </p>
          <p className="text-sm text-gray-500">
            Độ tin cậy: {(score * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {breakdown && (
        <div className="space-y-2 pt-3 border-t">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Chi tiết kỹ thuật
          </p>
          {Object.entries(breakdownLabels).map(([key, label]) => {
            const val = breakdown[key as keyof LivenessBreakdown];
            if (val === undefined) return null;
            return <BreakdownBar key={key} label={label} score={val} />;
          })}
        </div>
      )}
    </div>
  );
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
          const taskResult = response.result;
          if (taskResult?.status === "error") {
            const errorMsg = taskResult.error || "Task failed";
            setError(errorMsg);
            onError?.(errorMsg);
          } else {
            setResult(taskResult);
            onComplete?.(taskResult);
          }
          if (intervalId) clearInterval(intervalId);
        } else if (response.status === "FAILURE") {
          const errorMsg = response.result?.error || response.result?.detail || "Task failed";
          setError(errorMsg);
          onError?.(errorMsg);
          if (intervalId) clearInterval(intervalId);
        }
      } catch (err: any) {
        const msg = err.message || "Failed to get task status";
        setError(msg);
        onError?.(msg);
        if (intervalId) clearInterval(intervalId);
      }
    };

    poll();
    intervalId = setInterval(poll, 2000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
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
    if (result?.breakdown) {
      return <LivenessResultCard result={result} />;
    }
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 text-green-600 rounded-lg">
        <CheckCircle className="w-6 h-6" />
        <div>
          <p className="font-semibold">Success</p>
          {result && (
            <p className="text-sm">
              {result.verified !== undefined && (
                <span>
                  Đã xác minh: {result.verified ? "Có" : "Không"} (Điểm:{" "}
                  {result.score?.toFixed(4)})
                </span>
              )}
              {result.matches && (
                <span>
                  Tìm thấy {result.matches.length} kết quả
                </span>
              )}
              {result.is_live !== undefined && (
                <span>
                  Khuôn mặt thật: {result.is_live ? "Có" : "Không"} (Điểm:{" "}
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
        <p className="font-semibold">Đang xử lý...</p>
        <p className="text-sm">Job ID: {jobId}</p>
      </div>
    </div>
  );
}