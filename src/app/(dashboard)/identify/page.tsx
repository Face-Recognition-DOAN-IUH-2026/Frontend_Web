"use client";

import { useState } from "react";
import CameraCapture from "@/components/camera-capture";
import JobPoll from "@/components/job-poll";
import api, { getErrorMessage } from "@/lib/api-client";

export default function IdentifyPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [dataUrl, setDataUrl] = useState<string>("");
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [matches, setMatches] = useState<any[] | null>(null);

  const handleCapture = (file: File, url: string) => {
    setImageFile(file);
    setDataUrl(url);
    setMatches(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return;

    setError("");
    setIsLoading(true);
    setJobId(null);
    setMatches(null);

    try {
      const data = await api.identifyFace(imageFile, consent);
      setJobId(data.job_id);
    } catch (err: any) {
      setError(getErrorMessage(err) || "Identification failed");
      setIsLoading(false);
    }
  };

  const handleComplete = (result: any) => {
    setIsLoading(false);
    setJobId(null);
    if (result?.matches) {
      setMatches(result.matches);
    }
  };

  const handleError = (msg: string) => {
    setError(msg);
    setIsLoading(false);
    setJobId(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Identify Face</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}

      {jobId ? (
        <JobPoll
          jobId={jobId}
          onComplete={handleComplete}
          onError={handleError}
        />
      ) : matches ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Found {matches.length} match(es)
            </h2>
            <button
              onClick={() => { setMatches(null); setDataUrl(""); setImageFile(null); }}
              className="text-sm text-primary hover:underline"
            >
              Try another
            </button>
          </div>

          {dataUrl && (
            <img
              src={dataUrl}
              alt="Captured"
              className="w-48 h-48 object-cover rounded-lg border mx-auto"
            />
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left border">Score</th>
                  <th className="p-2 text-left border">User ID</th>
                  <th className="p-2 text-left border">Email</th>
                  <th className="p-2 text-left border">Name</th>
                  <th className="p-2 text-left border">Role</th>
                  <th className="p-2 text-left border">Created</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m, i) => {
                  const score = m.score ?? 0;
                  const pct = Number((score * 100).toFixed(1));
                  const color =
                    score > 0.6
                      ? "bg-green-50"
                      : score > 0.3
                      ? "bg-yellow-50"
                      : "bg-red-50";
                  return (
                    <tr key={i} className={color}>
                      <td className="p-2 border font-mono">
                        {pct}%
                        <div className="w-full bg-gray-200 rounded h-1.5 mt-1">
                          <div
                            className={`h-1.5 rounded ${
                              score > 0.6 ? "bg-green-500" : score > 0.3 ? "bg-yellow-500" : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="p-2 border font-mono text-xs">{m.user_id}</td>
                      <td className="p-2 border">{m.email || "—"}</td>
                      <td className="p-2 border">{m.full_name || "—"}</td>
                      <td className="p-2 border">{m.role || "—"}</td>
                      <td className="p-2 border text-xs">
                        {m.created_at ? new Date(m.created_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="w-5 h-5"
            />
            <label htmlFor="consent" className="text-sm text-gray-600">
              I consent to the identification of facial data.
            </label>
          </div>

          <button
            type="submit"
            disabled={!imageFile || !consent || isLoading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? "Identifying..." : "Identify Face"}
          </button>
        </form>
      )}
    </div>
  );
}