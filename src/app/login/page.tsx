"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Eye, Camera, Upload } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api-client";

type LoginMode = "password" | "face";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const startCamera = useCallback(async () => {
    try {
      setError("");
      setCameraReady(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraOn(true);
    } catch {
      setError("Camera access denied or not available");
      setIsCameraOn(false);
    }
  }, []);

  useEffect(() => {
    if (!isCameraOn || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    const onReady = () => setCameraReady(true);
    video.onloadedmetadata = onReady;
    video.onplaying = onReady;
    video.onerror = () => setError("Camera error");
    video.srcObject = stream;
    if (video.readyState >= 2) onReady();
    readyTimeoutRef.current = setTimeout(() => setCameraReady(true), 3000);
    return () => { if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current); };
  }, [isCameraOn]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraOn(false);
    setCameraReady(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current || !cameraReady) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "face.jpg", { type: "image/jpeg" });
      setImageFile(file);
      setImagePreview(canvas.toDataURL("image/jpeg"));
      stopCamera();
    }, "image/jpeg", 0.9);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    stopCamera();
  };

  const handleFaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile || !email) return;
    setError("");
    setIsLoading(true);
    setJobId(null);
    try {
      const { job_id } = await api.faceLogin(email, imageFile);
      setJobId(job_id);
      pollFaceLogin(job_id);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Face login failed");
      setIsLoading(false);
    }
  };

  const pollFaceLogin = useCallback(
    async (taskId: string) => {
      const interval = setInterval(async () => {
        try {
          const resp = await api.getTaskStatus(taskId);
          if (resp.status === "SUCCESS" && resp.result) {
            clearInterval(interval);
            if (resp.result.status === "error") {
              setError(resp.result.error || "Face login failed");
              setIsLoading(false);
              setJobId(null);
            } else if (resp.result.access_token) {
              localStorage.setItem("access_token", resp.result.access_token);
              if (resp.result.refresh_token) {
                localStorage.setItem("refresh_token", resp.result.refresh_token);
              }
              const userData = { id: "", email, role: "user" };
              localStorage.setItem("user", JSON.stringify(userData));
              setSuccess(true);
              setJobId(null);
              setIsLoading(false);
              setTimeout(() => router.push("/dashboard"), 1500);
            }
          } else if (resp.status === "FAILURE") {
            clearInterval(interval);
            setError(resp.result?.error || "Face login failed");
            setIsLoading(false);
            setJobId(null);
          }
        } catch {
          clearInterval(interval);
          setError("Failed to poll login status");
          setIsLoading(false);
          setJobId(null);
        }
      }, 2000);
    },
    [email, router],
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        <div className="flex mb-6 border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => { setMode("password"); setError(""); setJobId(null); }}
            className={`flex-1 py-2 text-sm font-medium ${
              mode === "password"
                ? "bg-primary text-primary-foreground"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => { setMode("face"); setError(""); setJobId(null); }}
            className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1 ${
              mode === "face"
                ? "bg-primary text-primary-foreground"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Eye className="w-4 h-4" />
            Face
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center py-8">
            <div className="rounded-full h-16 w-16 bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-green-600">Login Successful!</p>
            <p className="text-sm text-gray-500 mt-1">Redirecting to dashboard...</p>
          </div>
        ) : jobId ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Verifying face...</p>
            <p className="text-xs text-gray-400 mt-1">Job ID: {jobId}</p>
          </div>
        ) : mode === "password" ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
              <input
                id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
              <input
                id="password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" required
              />
            </div>
            <button type="submit" disabled={isLoading}
              className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleFaceSubmit} className="space-y-4">
            <div>
              <label htmlFor="face-email" className="block text-sm font-medium mb-1">Email</label>
              <input
                id="face-email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter your email" required
              />
            </div>

            {imagePreview ? (
              <div className="space-y-2">
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <img src={imagePreview} alt="Captured" className="w-full h-full object-contain" />
                </div>
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="w-full py-2 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Retake
                </button>
              </div>
            ) : (
              <>
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  {isCameraOn ? (
                    <>
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                      {!cameraReady && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                          Loading camera...
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm p-4">
                      Click "Start Camera" or "Upload"
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  {!isCameraOn ? (
                    <button type="button" onClick={startCamera}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      <Camera className="w-5 h-5" /> Start Camera
                    </button>
                  ) : (
                    <button type="button" onClick={capturePhoto} disabled={!cameraReady}
                      className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
                    >
                      Capture
                    </button>
                  )}
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer">
                    <Upload className="w-5 h-5" /> Upload
                    <input type="file" accept="image/*" capture="user" onChange={handleFileChange} className="hidden" />
                  </label>
                  {isCameraOn && (
                    <button type="button" onClick={stopCamera}
                      className="px-4 py-2 text-red-600 bg-red-50 rounded-md hover:bg-red-100"
                    >
                      Stop
                    </button>
                  )}
                </div>
              </>
            )}

            {imagePreview && (
              <button type="submit" disabled={!email || isLoading}
                className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                {isLoading ? "Verifying..." : "Login with Face"}
              </button>
            )}
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
