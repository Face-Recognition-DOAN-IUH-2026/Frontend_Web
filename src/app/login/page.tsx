"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Eye, Camera } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import api, { getErrorMessage } from "@/lib/api-client";

type LoginMode = "password" | "face";

export default function LoginPage() {
  const { login, setAuthFromToken } = useAuth();
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
  const [success, setSuccess] = useState(false);
  const [faceFailCount, setFaceFailCount] = useState(0);
  const faceFailCountRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const autoCaptureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setError("Không thể truy cập camera");
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
    return () => {
      if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
      if (autoCaptureTimeoutRef.current) clearTimeout(autoCaptureTimeoutRef.current);
      video.onloadedmetadata = null;
      video.onplaying = null;
      video.onerror = null;
      video.srcObject = null;
    };
  }, [isCameraOn]);

  useEffect(() => {
    if (cameraReady && mode === "face" && !imagePreview) {
      autoCaptureTimeoutRef.current = setTimeout(autoCapture, 1500);
    }
    return () => {
      if (autoCaptureTimeoutRef.current) clearTimeout(autoCaptureTimeoutRef.current);
    };
  }, [cameraReady, mode, imagePreview]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraOn(false);
    setCameraReady(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const resetFaceState = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const doFaceLogin = useCallback(async (file: File) => {
    setError("");
    setIsLoading(true);
    try {
      const res = await api.faceLogin(file);
      if (!res.access_token) {
        throw new Error("Backend did not return access_token");
      }
      const payload = JSON.parse(atob(res.access_token.split(".")[1]));
      const email = payload?.email || "";
      const role = ((payload?.roles as string[])?.[0]) || "user";
      setAuthFromToken(res.access_token, res.refresh_token, email, role);
      setSuccess(true);
      setIsLoading(false);
      setFaceFailCount(0);
      faceFailCountRef.current = 0;
      setTimeout(() => router.push("/dashboard"), 500);
    } catch (err: any) {
      const msg = getErrorMessage(err) || "Đăng nhập thất bại";
      setError(msg);
      setIsLoading(false);
      const newCount = faceFailCountRef.current + 1;
      faceFailCountRef.current = newCount;
      setFaceFailCount(newCount);
      if (newCount >= 2) {
        setMode("password");
        setFaceFailCount(0);
        faceFailCountRef.current = 0;
        resetFaceState();
        setError(msg + " — Chuyển sang đăng nhập mật khẩu");
      } else {
        resetFaceState();
        startCamera();
      }
    }
  }, [router]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(getErrorMessage(err) || "Đăng nhập thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const capturePhoto = useCallback((cb?: (file: File) => void) => {
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
      cb?.(file);
    }, "image/jpeg", 0.9);
  }, [cameraReady]);

  const autoCapture = useCallback(() => {
    capturePhoto((file) => {
      stopCamera();
      doFaceLogin(file);
    });
  }, [capturePhoto, stopCamera, doFaceLogin]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,168,83,0.08) 0%, transparent 70%)",
      }} />

      {/* Decorative orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #D4A853 0%, transparent 70%)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-5 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #D4A853 0%, transparent 70%)" }} />

      <div className="w-full max-w-md relative">
        {/* Card */}
        <div className="card-elevated p-8">
          {/* Logo / Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-primary">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" fill="currentColor" opacity="0.3" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" fill="currentColor" />
              </svg>
            </div>
            <h1 className="text-display-lg text-text font-display font-bold">THƯ VIỆN IUH</h1>
            <p className="text-body-sm text-text-3 mt-1">Đăng nhập vào hệ thống quản lý</p>
          </div>

          {/* Mode toggle */}
          <div className="flex mb-6 bg-surface-2 rounded-lg p-1">
            <button
              type="button"
              onClick={() => { setMode("password"); setError(""); setFaceFailCount(0); resetFaceState(); }}
              className={`flex-1 py-2 text-body-sm font-medium rounded-md transition-all ${
                mode === "password"
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-3 hover:text-text-2"
              }`}
            >
              Mật khẩu
            </button>
            <button
              type="button"
              onClick={() => { setMode("face"); setError(""); setFaceFailCount(0); resetFaceState(); }}
              className={`flex-1 py-2 text-body-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                mode === "face"
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-3 hover:text-text-2"
              }`}
            >
              <Eye size={14} />
              Khuôn mặt
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-error/10 border border-error/20 rounded-lg text-error text-body-sm flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              {error}
            </div>
          )}

          {/* Success */}
          {success ? (
            <div className="text-center py-8 animate-success-pop">
              <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-success">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-heading-md text-text font-semibold text-success">Đăng nhập thành công!</p>
              <p className="text-body-sm text-text-3 mt-1">Đang chuyển hướng...</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-body-sm text-text-3">
                {mode === "face" ? "Đang xác thực khuôn mặt..." : "Đang đăng nhập..."}
              </p>
            </div>
          ) : mode === "password" ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-body-sm font-medium text-text-2 mb-1.5">Email</label>
                <input
                  id="email" type="email" value={email} autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@iuh.edu.vn"
                  className="input w-full" required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-body-sm font-medium text-text-2 mb-1.5">Mật khẩu</label>
                <input
                  id="password" type="password" value={password} autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input w-full" required
                />
              </div>
              <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5 mt-2">
                Đăng nhập
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {imagePreview ? (
                <div className="space-y-3">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <img src={imagePreview} alt="Captured" className="w-full h-full object-contain" />
                  </div>
                  <button
                    type="button"
                    onClick={() => { resetFaceState(); startCamera(); }}
                    className="btn-secondary w-full"
                  >
                    Chụp lại
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    {isCameraOn ? (
                      <>
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                        {!cameraReady && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-body-sm">
                            Đang kết nối camera...
                          </div>
                        )}
                        {cameraReady && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-48 h-48 border-2 border-primary/50 rounded-full" />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-text-3 text-body-sm gap-2">
                        <Camera size={24} />
                        <span>Bật camera</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    {!isCameraOn ? (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="btn-secondary flex-1 flex items-center justify-center gap-2"
                      >
                        <Camera size={16} /> Bật camera
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="btn-ghost flex-1 px-4 text-error"
                      >
                        Tắt
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
