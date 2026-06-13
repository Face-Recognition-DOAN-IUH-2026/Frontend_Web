"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import CameraCapture from "@/components/camera-capture";
import JobPoll from "@/components/job-poll";
import api, { getErrorMessage } from "@/lib/api-client";
import type { LivenessBreakdown } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

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
  const color = score >= 0.7 ? "bg-success" : score >= 0.4 ? "bg-warning" : "bg-error";
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-right text-body-sm text-text-2 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right text-caption font-mono text-text-3 shrink-0">{pct}%</span>
    </div>
  );
}

function LivenessResultCard({ result }: { result: any }) {
  const isLive = result.is_live;
  const score = result.liveness_score ?? 0;
  const breakdown: LivenessBreakdown | undefined = result.breakdown;

  return (
    <Card accent={isLive ? "success" : "error"}>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            isLive ? "bg-success/15" : "bg-error/15"
          }`}>
            {isLive ? <Eye size={28} className="text-success" /> : <EyeOff size={28} className="text-error" />}
          </div>
          <div>
            <p className="text-heading-lg text-text font-display font-bold">
              {isLive ? "KHUÔN MẶT THẬT" : "PHÁT HIỆN GIẢ MẠO"}
            </p>
            <p className="text-body-sm text-text-3 mt-1">
              Độ tin cậy: {(score * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {breakdown && (
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-caption text-text-3 uppercase tracking-wide">Chi tiết kỹ thuật</p>
            {Object.entries(breakdownLabels).map(([key, label]) => {
              const val = breakdown[key as keyof LivenessBreakdown];
              if (val === undefined) return null;
              return <BreakdownBar key={key} label={label} score={val} />;
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LivenessPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleCapture = (file: File, _dataUrl: string) => {
    setImageFile(file);
    setResult(null);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return;
    setError("");
    setIsLoading(true);
    setJobId(null);
    setResult(null);
    try {
      const data = await api.livenessCheck(imageFile, consent);
      setJobId(data.job_id);
    } catch (err: any) {
      setError(getErrorMessage(err) || "Kiểm tra thất bại");
      setIsLoading(false);
    }
  };

  const handleComplete = (res: any) => {
    setResult(res);
    setIsLoading(false);
    setJobId(null);
  };

  const handleError = (err: string) => {
    setError(err);
    setIsLoading(false);
    setJobId(null);
  };

  const handleReset = () => {
    setImageFile(null);
    setJobId(null);
    setResult(null);
    setError("");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-3 text-error">
          {error}
        </div>
      )}

      {result ? (
        <div className="space-y-4">
          <LivenessResultCard result={result} />
          <div className="flex justify-center">
            <Button onClick={handleReset}>Thử lại</Button>
          </div>
        </div>
      ) : jobId ? (
        <JobPoll jobId={jobId} onComplete={handleComplete} onError={handleError} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Kiểm tra Liveness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <p className="text-body-sm font-medium text-text-2 mb-3">
                  Chụp ảnh khuôn mặt để kiểm tra
                </p>
                <CameraCapture onCapture={handleCapture} />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border accent-primary"
                />
                <span className="text-body-sm text-text-2">
                  Tôi đồng ý với việc kiểm tra liveness trên dữ liệu khuôn mặt của mình.
                </span>
              </label>

              <Button
                type="submit"
                disabled={!imageFile || !consent || isLoading}
                loading={isLoading}
                className="w-full"
              >
                Kiểm tra Liveness
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}