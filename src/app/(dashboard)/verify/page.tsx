"use client";

import { useState, useEffect } from "react";
import CameraCapture from "@/components/camera-capture";
import JobPoll from "@/components/job-poll";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api-client";
import type { TaskResult } from "@/lib/types";

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
      if (payload?.sub) {
        setTargetUserId(payload.sub);
      }
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
      const result = await api.verifyFace(imageFile, targetUserId, consent);
      setJobId(result.job_id);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Verify Face</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}

      {jobId ? (
        <JobPoll
          jobId={jobId}
          onComplete={(r) => { setResult(r); setIsLoading(false); }}
          onError={(err) => setError(err)}
        />
      ) : result ? (
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${result.verified ? "bg-green-100" : "bg-red-100"}`}>
            <p className="text-lg font-semibold">{result.verified ? "Xác thực thành công" : "Xác thực thất bại"}</p>
            {result.score != null && (
              <p className="text-sm text-gray-700 mt-1">Score: {(Number(result.score) * 100).toFixed(1)}%</p>
            )}
            {result.error && <p className="text-sm text-red-600 mt-1">{result.error}</p>}
          </div>
          <button onClick={() => { setResult(null); setImageFile(null); setDataUrl(""); }} className="text-sm text-primary hover:underline">
            Thử lại
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-lg border space-y-6"
        >
          <div>
            <label className="block text-sm font-medium mb-2">
              Capture Face
            </label>
            <CameraCapture onCapture={handleCapture} />
          </div>

          <div>
            <label
              htmlFor="targetUserId"
              className="block text-sm font-medium mb-1"
            >
              Your User ID (auto-filled from login)
            </label>
            <input
              id="targetUserId"
              type="text"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter user ID"
              required
            />
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
              I consent to the verification of my facial data.
            </label>
          </div>

          <button
            type="submit"
            disabled={!imageFile || !targetUserId || !consent || isLoading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? "Verifying..." : "Verify Face"}
          </button>
        </form>
      )}
    </div>
  );
}