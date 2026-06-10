"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import CameraCapture from "@/components/camera-capture";
import JobPoll from "@/components/job-poll";
import api from "@/lib/api-client";
import type { LivenessBreakdown } from "@/lib/types";

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
      setError(err.response?.data?.detail || err.message || "Kiểm tra liveness thất bại");
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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Kiểm tra Liveness</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}

      {result ? (
        <div className="space-y-4">
          <LivenessResultCard result={result} />
          <div className="flex justify-center">
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
            >
              Thử lại
            </button>
          </div>
        </div>
      ) : jobId ? (
        <JobPoll
          jobId={jobId}
          onComplete={handleComplete}
          onError={handleError}
        />
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-lg border space-y-6"
        >
          <div>
            <label className="block text-sm font-medium mb-2">
              Chụp ảnh khuôn mặt để kiểm tra liveness
            </label>
            <CameraCapture onCapture={handleCapture} />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="w-5 h-5"
            />
            <label htmlFor="consent" className="text-sm text-gray-600">
              Tôi đồng ý với việc kiểm tra liveness trên dữ liệu khuôn mặt của mình.
            </label>
          </div>

          <button
            type="submit"
            disabled={!imageFile || !consent || isLoading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? "Đang kiểm tra..." : "Kiểm tra Liveness"}
          </button>
        </form>
      )}
    </div>
  );
}