"use client";

import { useState } from "react";
import CameraCapture from "@/components/camera-capture";
import JobPoll from "@/components/job-poll";

export default function LivenessPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [dataUrl, setDataUrl] = useState<string>("");
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleCapture = (file: File, url: string) => {
    setImageFile(file);
    setDataUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return;

    setError("");
    setIsLoading(true);
    setJobId(null);

    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("consent_given", String(consent));

      const response = await fetch("/api/face/liveness", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Liveness check failed");
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
      <h1 className="text-2xl font-bold mb-6">Liveness Check</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}

      {jobId ? (
        <JobPoll
          jobId={jobId}
          onComplete={(result) => console.log("Liveness result:", result)}
          onError={(err) => setError(err)}
        />
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-lg border space-y-6"
        >
          <div>
            <label className="block text-sm font-medium mb-2">
              Capture Face for Liveness Check
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
              I consent to the liveness check of my facial data.
            </label>
          </div>

          <button
            type="submit"
            disabled={!imageFile || !consent || isLoading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? "Checking..." : "Check Liveness"}
          </button>
        </form>
      )}
    </div>
  );
}