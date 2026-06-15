'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, LogOut, ShieldCheck } from 'lucide-react';
import api, { getErrorMessage } from '@/lib/api-client';
import CameraFeed from '@/components/gate/CameraFeed';
import MssvInput from '@/components/gate/MssvInput';
import GateButton from '@/components/gate/GateButton';
import ResultCard from '@/components/gate/ResultCard';
import type { AccessLogPublic, CameraEvent, KioskResult, PatronLookupResult } from '@/lib/types';

interface TodayCounts { entries: number; exits: number; no_match: number; spoof: number; }

const ENTRY_CAM = process.env.NEXT_PUBLIC_ENTRY_CAM || 'http://192.168.1.121:8080/video';
const EXIT_CAM = process.env.NEXT_PUBLIC_EXIT_CAM || 'http://192.168.1.240:8080/video';
const ENTRY_CAM_ID = process.env.NEXT_PUBLIC_ENTRY_CAM_ID || 'entry_gate';
const EXIT_CAM_ID = process.env.NEXT_PUBLIC_EXIT_CAM_ID || 'exit_gate';

type Step = 'idle' | 'verify' | 'result';

interface Toast {
  id: number;
  type: 'entry' | 'exit' | 'error' | 'info';
  message: string;
  patron_name?: string;
}

let toastId = 0;

const HISTORY_LIMIT = 8;

function formatGateTime(value?: string) {
  if (!value) return '--:--';
  return new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatConfidence(value?: number | null) {
  if (typeof value !== 'number') return null;
  return `${Math.round(value * 100)}%`;
}

function buildLogFromEvent(event: CameraEvent): AccessLogPublic {
  return {
    id: `${event.camera_id}-${event.patron_id || event.student_code || 'unknown'}-${Date.now()}`,
    patron_id: event.patron_id || null,
    patron_name: event.full_name || null,
    student_code: event.student_code || null,
    access_type: event.access_type === 'exit' ? 'exit' : 'entry',
    verify_method: 'face',
    confidence: event.score ?? null,
    camera_id: event.camera_id,
    access_time: new Date().toISOString(),
    status: event.status,
  };
}

export default function GatePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [step, setStep] = useState<Step>('idle');
  const [mssv, setMssv] = useState('');
  const [lookup, setLookup] = useState<PatronLookupResult | null>(null);
  const [result, setResult] = useState<KioskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [recentLogs, setRecentLogs] = useState<AccessLogPublic[]>([]);
  const [todayCounts, setTodayCounts] = useState<TodayCounts>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('gate_today_counts');
      if (cached) {
        try { return JSON.parse(cached) as TodayCounts; } catch {}
      }
    }
    return { entries: 0, exits: 0, no_match: 0, spoof: 0 };
  });
  const [entryOverlay, setEntryOverlay] = useState<{ bbox?: [number, number, number, number]; landmarks?: [number, number][]; status?: string } | null>(null);
  const [exitOverlay, setExitOverlay] = useState<{ bbox?: [number, number, number, number]; landmarks?: [number, number][]; status?: string } | null>(null);
  const overlayTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++toastId;
    setToasts((prev) => [{ ...t, id }, ...prev.slice(0, 4)]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 6000);
  }, []);

  const addRecentLog = useCallback((log: AccessLogPublic) => {
    setRecentLogs((prev) => [log, ...prev].slice(0, HISTORY_LIMIT * 2));
  }, []);

  const stopCamera = useCallback(() => {
    if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      addToast({ type: 'error', message: 'Không thể mở camera' });
    }
  }, [addToast]);

  const captureImage = useCallback((): Promise<File> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      if (!video || !video.videoWidth) {
        reject(new Error('Camera chưa sẵn sàng'));
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Không thể tạo canvas')); return; }
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'face_capture.jpg', { type: 'image/jpeg' });
          resolve(file);
        } else {
          reject(new Error('Không thể tạo ảnh'));
        }
      }, 'image/jpeg', 0.9);
    });
  }, []);

  const pollTask = useCallback(async (jobId: string, intervalMs = 1000, timeoutMs = 30000): Promise<any> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, intervalMs));
      try {
        const task = await api.getTaskStatus(jobId);
        if (task.status === 'SUCCESS') return task.result;
        if (task.status === 'FAILURE') throw new Error(task.result?.error || 'Task failed');
        setStatusText(task.result?.status === 'granted' ? 'Đã ghi nhận...' : 'Đang xử lý...');
      } catch {}
    }
    throw new Error('Timeout waiting for result');
  }, []);

  const handleLookup = async (inputMssv: string) => {
    if (!inputMssv.trim()) return;
    setMssv(inputMssv.trim());
    setLoading(true);
    setStatusText('Đang tra cứu...');
    try {
      const res = await api.kioskLookup(inputMssv.trim());
      setLookup(res);
      if (res.exists && res.has_face && !res.is_expired) {
        setStep('verify');
        setStatusText('Mở camera...');
        await startCamera();
      } else if (res.exists && !res.has_face) {
        setStep('result');
        setResult({
          success: false,
          message: 'Tài khoản chưa được đăng ký khuôn mặt. Vui lòng đăng ký tại quầy.',
          patron: res.patron,
          job_id: null,
        });
      } else if (res.exists && res.is_expired) {
        setStep('result');
        setResult({ success: false, message: 'Thẻ hội viên đã hết hạn', patron: res.patron, job_id: null });
      } else {
        setStep('result');
        setResult({ success: false, message: 'Không tìm thấy tài khoản. Vui lòng đăng ký tại quầy.', patron: null, job_id: null });
      }
    } catch (err: any) {
      setStep('result');
      setResult({ success: false, message: getErrorMessage(err) || 'Tra cứu thất bại', patron: null, job_id: null });
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setStatusText('Đang chụp ảnh...');
    try {
      const imageFile = await captureImage();
      stopCamera();
      setStatusText('Đang xác thực khuôn mặt...');
      const res = await api.kioskEnter(imageFile, mssv);
      if (res.job_id) {
        const taskResult = await pollTask(res.job_id);
        const success = taskResult?.status === 'success';
        const confidence = taskResult?.score ?? taskResult?.confidence;
        setResult({
          success,
          message: success
            ? `Xác thực thành công — ${taskResult?.access_type === 'exit' ? 'Ra' : 'Vào'} thư viện`
            : (taskResult?.error || 'Xác thực thất bại'),
          patron: res.patron,
          job_id: res.job_id,
          confidence,
        });
      } else {
        setResult(res);
      }
      setStep('result');
    } catch (err: any) {
      const msg = getErrorMessage(err) || 'Xác thực thất bại';
      setResult({ success: false, message: msg, patron: null, job_id: null });
      setStep('result');
      addToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  const reset = () => {
    setStep('idle');
    setMssv('');
    setLookup(null);
    setResult(null);
    stopCamera();
  };

  useEffect(() => {
    api.getStats().then((s) => {
      if (s) {
        const fresh: TodayCounts = { entries: s.today_entries ?? 0, exits: s.today_exits ?? 0, no_match: 0, spoof: 0 };
        setTodayCounts(fresh);
        localStorage.setItem('gate_today_counts', JSON.stringify(fresh));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.getRecentLogs()
      .then((res) => setRecentLogs(res.items.slice(0, HISTORY_LIMIT * 2)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem('gate_today_counts', JSON.stringify(todayCounts));
  }, [todayCounts]);

  useEffect(() => {
    const cleanup = api.connectAccessSSE((event: CameraEvent) => {
      if (event.bbox || event.landmarks) {
        const overlay = { bbox: event.bbox, landmarks: event.landmarks };
        if (event.camera_id === ENTRY_CAM_ID) {
          setEntryOverlay({ ...overlay, status: event.status });
        } else if (event.camera_id === EXIT_CAM_ID) {
          setExitOverlay({ ...overlay, status: event.status });
        }
        if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
        overlayTimeoutRef.current = setTimeout(() => {
          setEntryOverlay(null);
          setExitOverlay(null);
        }, 2000);
      }
      if (event.status === 'granted') {
        const type = event.access_type === 'entry' ? 'entry' : 'exit';
        addRecentLog(buildLogFromEvent(event));
        addToast({
          type,
          message: `${event.full_name} — ${type === 'entry' ? 'Vào' : 'Ra'} thư viện`,
          patron_name: event.full_name,
        });
        setTodayCounts((prev: TodayCounts) => ({ ...prev, [type === 'entry' ? 'entries' : 'exits']: prev[type === 'entry' ? 'entries' : 'exits'] + 1 }));
      } else if (event.status === 'no_match') {
        setTodayCounts((prev: TodayCounts) => ({ ...prev, no_match: prev.no_match + 1 }));
        addToast({ type: 'info', message: 'Khuôn mặt mới — không nhận diện được' });
      } else if (event.status === 'spoof') {
        setTodayCounts((prev: TodayCounts) => ({ ...prev, spoof: prev.spoof + 1 }));
        addToast({ type: 'error', message: 'Phát hiện giả mạo!' });
      }
    });
    return cleanup;
  }, [addRecentLog, addToast]);

  const getResultStatus = () => {
    if (!result) return 'processing';
    if (result.success) return 'success';
    if (result.message?.includes('đăng ký tại quầy')) return 'unregistered';
    return 'error';
  };

  const entryLogs = recentLogs.filter((log) => log.access_type === 'entry').slice(0, HISTORY_LIMIT);
  const exitLogs = recentLogs.filter((log) => log.access_type === 'exit').slice(0, HISTORY_LIMIT);

  const renderHistoryColumn = (
    title: string,
    subtitle: string,
    logs: AccessLogPublic[],
    type: 'entry' | 'exit',
  ) => {
    const Icon = type === 'entry' ? LogIn : LogOut;
    const toneClasses = type === 'entry'
      ? {
          header: 'bg-emerald-500/10',
          icon: 'bg-emerald-500/15 text-emerald-300',
          count: 'text-emerald-300',
          confidence: 'bg-emerald-500/15 text-emerald-300',
        }
      : {
          header: 'bg-orange-500/10',
          icon: 'bg-orange-500/15 text-orange-300',
          count: 'text-orange-300',
          confidence: 'bg-orange-500/15 text-orange-300',
        };

    return (
      <div className="bg-slate-800/70 rounded-2xl border border-slate-700 overflow-hidden">
        <div className={`px-4 py-3 border-b border-slate-700 ${toneClasses.header}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toneClasses.icon}`}>
                <Icon size={20} />
              </div>
              <div>
                <h2 className="text-white font-semibold">{title}</h2>
                <p className="text-xs text-slate-400">{subtitle}</p>
              </div>
            </div>
            <span className={`text-2xl font-bold tabular-nums ${toneClasses.count}`}>{logs.length}</span>
          </div>
        </div>

        <div className="divide-y divide-slate-700/70">
          {logs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              Chưa có lượt {type === 'entry' ? 'vào' : 'ra'} gần đây
            </div>
          ) : (
            logs.map((log) => {
              const confidence = formatConfidence(log.confidence);
              return (
                <div key={log.id} className="px-4 py-3 hover:bg-slate-700/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {log.patron_name || 'Không rõ tên'}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        <span className="font-mono">{log.student_code || '---'}</span>
                        <span>{formatGateTime(log.access_time)}</span>
                        <span className="font-mono">{log.camera_id || '-'}</span>
                      </div>
                    </div>
                    {confidence ? (
                      <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${toneClasses.confidence}`}>
                        {confidence}
                      </span>
                    ) : (
                      <ShieldCheck className="shrink-0 text-slate-500" size={17} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-amber-400 transition-colors text-sm mb-2">
              ← Quay lại Dashboard
            </button>
            <h1 className="text-3xl font-bold text-white font-['Outfit',sans-serif]">
              <span className="text-amber-400">Cổng</span> Thư Viện
            </h1>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-400">{todayCounts.entries}</p>
              <p className="text-xs text-slate-400">Vào hôm nay</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-400">{todayCounts.exits}</p>
              <p className="text-xs text-slate-400">Ra hôm nay</p>
            </div>
          </div>
        </div>

        {toasts.length > 0 && (
          <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
                  t.type === 'entry' ? 'bg-emerald-600' :
                  t.type === 'exit' ? 'bg-orange-600' :
                  t.type === 'error' ? 'bg-red-600' : 'bg-slate-700'
                }`}
              >
                {t.patron_name && <strong>{t.patron_name}</strong>} {t.message}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="col-span-2 grid grid-cols-2 gap-4">
            <CameraFeed
              src={`${ENTRY_CAM}`}
              label="Cổng vào"
              overlay={entryOverlay}
              onStatusChange={(ok) => {}}
            />
            <CameraFeed
              src={`${EXIT_CAM}`}
              label="Cổng ra"
              overlay={exitOverlay}
              onStatusChange={(ok) => {}}
            />
          </div>

          <div className="space-y-4">
            {step === 'idle' && (
              <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-white">Chào mừng</h2>
                  <p className="text-slate-400 text-sm mt-1">Nhập MSSV để xác thực khuôn mặt</p>
                </div>
                <MssvInput onSubmit={handleLookup} disabled={loading} />
                {loading && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-amber-400">
                    <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">{statusText || 'Đang xử lý...'}</span>
                  </div>
                )}
              </div>
            )}

            {step === 'verify' && (
              <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-semibold text-white">Xác thực khuôn mặt</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    {lookup?.patron?.full_name || mssv}
                  </p>
                </div>
                <div className="relative bg-black rounded-xl overflow-hidden mb-4 aspect-[4/3]">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-32 h-32 border-2 border-amber-400/50 rounded-full" />
                  </div>
                  {loading && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
                      <p className="text-white text-sm">{statusText}</p>
                    </div>
                  )}
                </div>
                <GateButton onClick={handleVerify} disabled={loading} fullWidth>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Xác thực & Vào cổng
                </GateButton>
                <button
                  onClick={reset}
                  className="mt-3 w-full py-3 text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Hủy
                </button>
              </div>
            )}

            {step === 'result' && (
              <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700">
                <ResultCard
                  status={getResultStatus()}
                  patronInfo={result?.patron ? {
                    fullName: result.patron.full_name || '',
                    mssv: result.patron.student_code || result?.patron?.id || '',
                    faculty: '',
                  } : undefined}
                  message={result?.message}
                />
                <GateButton onClick={reset} variant="secondary" fullWidth className="mt-4">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Thử lại
                </GateButton>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {renderHistoryColumn('Lịch sử vào', 'Các lượt vừa qua cổng vào', entryLogs, 'entry')}
          {renderHistoryColumn('Lịch sử ra', 'Các lượt vừa qua cổng ra', exitLogs, 'exit')}
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Hệ thống đang hoạt động
          </div>
        </div>
      </div>
    </div>
  );
}
