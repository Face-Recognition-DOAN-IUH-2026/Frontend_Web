"use client";

import { useState, useEffect } from "react";
import CameraCapture from "@/components/camera-capture";
import JobPoll from "@/components/job-poll";
import { useAuth } from "@/lib/auth-context";

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
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("target_user_id", targetUserId);
      formData.append("consent_given", String(consent));

      const response = await fetch("/api/face/verify", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Verification failed");
      }

      const data = await response.json();
      setJobId(data.job_id);
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
          onComplete={(result) => console.log("Verification result:", result)}
          onError={(err) => setError(err)}
        />
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