"use client";

import { useState, useEffect } from "react";
import CameraCapture from "@/components/camera-capture";
import JobPoll from "@/components/job-poll";
import { useAuth } from "@/lib/auth-context";
import api, { getErrorMessage } from "@/lib/api-client";
import type { TaskResult } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

function decodeJwt(token: string): { sub: string } | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export default function VerifyPage() {
  const { accessToken } = useAuth();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [dataUrl, setDataUrl] = useState<string>("");
  const [targetUserId, setTargetUserId] = useState("");
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TaskResult | null>(null);

  useEffect(() => {
    if (accessToken) {
      const payload = decodeJwt(accessToken);
      if (payload?.sub) setTargetUserId(payload.sub);
    }
  }, [accessToken]);

  const handleCapture = (file: File, url: string) => {
    setImageFile(file);
    setDataUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile || !targetUserId) return;
    setError("");
    setIsLoading(true);
    setJobId(null);
    try {
      const res = await api.verifyFace(imageFile, targetUserId, consent);
      setJobId(res.job_id);
    } catch (err: any) {
      setError(getErrorMessage(err) || "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-3 text-error">
          {error}
        </div>
      )}

      {jobId ? (
        <JobPoll
          jobId={jobId}
          onComplete={(r) => { setResult(r); setIsLoading(false); }}
          onError={(err) => setError(err)}
        />
      ) : result ? (
        <Card accent={result.verified ? "success" : "error"}>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                result.verified ? "bg-success/15" : "bg-error/15"
              }`}>
                {result.verified ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-success">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-error">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="text-heading-lg text-text">
                  {result.verified ? "Xác thực thành công" : "Xác thực thất bại"}
                </h2>
                {result.score != null && (
                  <p className="text-body-sm text-text-3 mt-1">
                    Độ tin cậy: {(Number(result.score) * 100).toFixed(1)}%
                  </p>
                )}
                {result.error && <p className="text-body-sm text-error mt-1">{result.error}</p>}
              </div>
            </div>
            <Button
              onClick={() => { setResult(null); setImageFile(null); setDataUrl(""); }}
              variant="ghost"
            >
              Thử lại
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Xác thực khuôn mặt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <p className="text-body-sm font-medium text-text-2 mb-3">Chụp khuôn mặt</p>
                <CameraCapture onCapture={handleCapture} />
              </div>

              <div>
                <label className="block text-body-sm font-medium text-text-2 mb-1.5">
                  User ID (tự động từ đăng nhập)
                </label>
                <input
                  type="text"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="input font-mono"
                  placeholder="Enter user ID"
                  required
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border accent-primary"
                />
                <span className="text-body-sm text-text-2">
                  Tôi đồng ý cho việc xác thực dữ liệu khuôn mặt của mình.
                </span>
              </label>

              <Button
                type="submit"
                disabled={!imageFile || !targetUserId || !consent || isLoading}
                loading={isLoading}
                className="w-full"
              >
                Xác thực khuôn mặt
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}