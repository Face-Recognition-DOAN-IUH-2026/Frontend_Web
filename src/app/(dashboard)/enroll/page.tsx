"use client";

import { useState, useRef, useEffect } from "react";
import { CheckCircle } from "lucide-react";
import api, { getErrorMessage } from "@/lib/api-client";
import MultiAngleCapture, { type CaptureAngle } from "@/components/MultiAngleCapture";

export default function EnrollPage() {
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  const pollForResult = async (taskId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const data = await api.getTaskStatus(taskId);

        if (data.status === "SUCCESS") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;

          const inner = data.result;
          if (inner && inner.status === "error") {
            setError(inner.error || "Enrollment failed");
            setResult(inner);
          } else {
            setResult(inner);
          }
          setIsLoading(false);
        } else if (data.status === "FAILURE") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          const inner = data.result;
          setError(inner?.error || "Enrollment failed");
          setResult(inner);
          setIsLoading(false);
        }
      } catch {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
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

    // Temporary: use existing enrollBatch until API client is updated.
    try {
      const { frontal, right, left, down } = files;
      const data = await api.enrollBatch({ frontal, right, left, down }, consent);
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

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Enroll Face</h1>

      {error && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}

      {result ? (
        <div className="bg-white p-6 rounded-lg border">
          {result.status === "error" ? (
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <CheckCircle className="w-8 h-8" />
              <h2 className="text-xl font-semibold">Enrollment Partially Failed</h2>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-green-600 mb-4">
              <CheckCircle className="w-8 h-8" />
              <h2 className="text-xl font-semibold">Enrollment Successful!</h2>
            </div>
          )}
          <p className="text-gray-600 mb-4">
            {result.status === "error"
              ? `${result.results?.filter((r: any) => r.status !== "success").length} angle(s) failed.`
              : "Your face has been enrolled successfully."}
          </p>

          {result.results && (
            <div className="mb-4 space-y-1">
              <p className="text-sm font-medium text-gray-700">Per-angle status:</p>
              {result.results.map((r: any, i: number) => (
                <p key={i} className={`text-sm ${r.status === "success" ? "text-green-600" : "text-red-600"}`}>
                  {r.angle}: {r.status === "success" ? "✓" : "✗"} {r.error || ""}
                </p>
              ))}
            </div>
          )}

          <button onClick={handleReset} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
            {result.status === "error" ? "Try Again" : "Enroll Another"}
          </button>
        </div>
      ) : jobId && !result ? (
        <div className="bg-white p-6 rounded-lg border text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Processing...</h2>
          <p className="text-gray-600 text-sm">Job ID: {jobId}</p>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg border space-y-6">
          <MultiAngleCapture consent={consent} setConsent={setConsent} onFilesReady={handleFilesReady} />
          {isLoading && (
            <div className="text-center text-sm text-gray-600">Submitting enrollment...</div>
          )}
        </div>
      )}
    </div>
  );
}

