"use client";

import { useState, useRef, useEffect } from "react";
import { CheckCircle, AlertCircle, RotateCcw } from "lucide-react";
import api, { getErrorMessage } from "@/lib/api-client";
import MultiAngleCapture, { type CaptureAngle } from "@/components/MultiAngleCapture";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

export default function EnrollPage() {
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const pollForResult = async (taskId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const data = await api.getTaskStatus(taskId);
        if (data.status === "SUCCESS") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          const inner = data.result;
          if (inner?.status === "error") {
            setError(inner.error || "Enrollment failed");
            setResult(inner);
          } else {
            setResult(inner);
          }
          setIsLoading(false);
        } else if (data.status === "FAILURE") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setError(data.result?.error || "Enrollment failed");
          setResult(data.result);
          setIsLoading(false);
        }
      } catch {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setError("Failed to poll task status");
        setIsLoading(false);
      }
    }, 2000);
  };

  const handleFilesReady = async (files: Record<CaptureAngle, File>) => {
    setError("");
    setIsLoading(true);
    setJobId(null);
    setResult(null);
    try {
      const data = await api.enrollBatch(files, consent);
      setJobId(data.job_id);
      await pollForResult(data.job_id);
    } catch (err: any) {
      setError(getErrorMessage(err) || "Multi-angle enrollment failed");
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setConsent(false);
    setJobId(null);
    setResult(null);
    setError("");
    setIsLoading(false);
  };

  const failedCount = result?.results?.filter((r: any) => r.status !== "success").length || 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-3 text-error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {result ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                result.status === "error" ? "bg-error/15" : "bg-success/15"
              }`}>
                {result.status === "error" ? (
                  <AlertCircle size={24} className="text-error" />
                ) : (
                  <CheckCircle size={24} className="text-success" />
                )}
              </div>
              <div>
                <h2 className="text-heading-lg text-text">
                  {result.status === "error" ? "Đăng ký thất bại một phần" : "Đăng ký thành công!"}
                </h2>
                <p className="text-body-sm text-text-3 mt-0.5">
                  {result.status === "error"
                    ? `${failedCount} góc ảnh thất bại.`
                    : "Khuôn mặt của bạn đã được đăng ký thành công."}
                </p>
              </div>
            </div>

            {result.results && (
              <div className="border-t border-border pt-4 space-y-2">
                <p className="text-caption text-text-3 uppercase tracking-wide">Kết quả từng góc</p>
                {result.results.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <span className="text-body-sm text-text-2 capitalize">{r.angle}</span>
                    <Badge variant={r.status === "success" ? "success" : "error"} dot>
                      {r.status === "success" ? "Thành công" : "Thất bại"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            <Button onClick={handleReset} icon={<RotateCcw size={16} />}>
              {result.status === "error" ? "Thử lại" : "Đăng ký thêm"}
            </Button>
          </CardContent>
        </Card>
      ) : jobId && !result ? (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
            <div>
              <h2 className="text-heading-md text-text">Đang xử lý...</h2>
              <p className="text-body-sm text-text-3 font-mono mt-1">Job ID: {jobId}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card padding="none">
          <CardContent className="p-6 space-y-6">
            <MultiAngleCapture consent={consent} setConsent={setConsent} onFilesReady={handleFilesReady} />
            {isLoading && (
              <div className="text-center text-body-sm text-text-3">Đang gửi đăng ký...</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}