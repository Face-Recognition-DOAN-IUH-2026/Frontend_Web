"use client";

import { useState } from "react";
import CameraCapture from "@/components/camera-capture";
import JobPoll from "@/components/job-poll";
import api, { getErrorMessage } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

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
    if (result?.matches) setMatches(result.matches);
  };

  const handleError = (msg: string) => {
    setError(msg);
    setIsLoading(false);
    setJobId(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-3 text-error">
          {error}
        </div>
      )}

      {jobId ? (
        <JobPoll jobId={jobId} onComplete={handleComplete} onError={handleError} />
      ) : matches ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-heading-md text-text">
              Tìm thấy {matches.length} kết quả
            </h2>
            <Button
              onClick={() => { setMatches(null); setDataUrl(""); setImageFile(null); }}
              variant="ghost"
              size="sm"
            >
              Thử lại
            </Button>
          </div>

          {dataUrl && (
            <img
              src={dataUrl}
              alt="Captured"
              className="w-40 h-40 object-cover rounded-lg border border-border mx-auto"
            />
          )}

          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Độ tin cậy</th>
                    <th>User ID</th>
                    <th>Tên</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m, i) => {
                    const score = m.score ?? 0;
                    const pct = Number((score * 100).toFixed(1));
                    return (
                      <tr key={i}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${score > 0.6 ? "bg-success" : score > 0.3 ? "bg-warning" : "bg-error"}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-body-sm font-mono text-text">{pct}%</span>
                          </div>
                        </td>
                        <td className="font-mono text-text-3">{m.user_id}</td>
                        <td className="font-medium">{m.full_name || "—"}</td>
                        <td className="text-text-3">{m.email || "—"}</td>
                        <td>
                          <Badge variant="neutral" className="capitalize">{m.role || "—"}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Nhận diện khuôn mặt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <p className="text-body-sm font-medium text-text-2 mb-3">Chụp khuôn mặt</p>
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
                  Tôi đồng ý cho việc nhận diện dữ liệu khuôn mặt của mình.
                </span>
              </label>

              <Button
                type="submit"
                disabled={!imageFile || !consent || isLoading}
                loading={isLoading}
                className="w-full"
              >
                Nhận diện khuôn mặt
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}