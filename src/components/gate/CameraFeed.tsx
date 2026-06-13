'use client';

import { useEffect, useRef, useState } from 'react';

interface CameraFeedProps {
  src: string;
  label: string;
  overlay?: {
    bbox?: [number, number, number, number];
    landmarks?: [number, number][];
    status?: string;
  } | null;
  onStatusChange?: (ok: boolean) => void;
}

const OVERLAY_COLORS: Record<string, string> = {
  granted: '#22c55e',
  wrong_direction: '#eab308',
  expired: '#f97316',
  spoof: '#ef4444',
};

export default function CameraFeed({ src, label, overlay, onStatusChange }: CameraFeedProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ts] = useState(() => Date.now());
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    onStatusChange?.(ok === true);
  }, [ok, onStatusChange]);

  useEffect(() => {
    if (!overlay?.bbox && !overlay?.landmarks) return;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const rect = img.getBoundingClientRect();
    const scaleX = rect.width / (img.naturalWidth || 1);
    const scaleY = rect.height / (img.naturalHeight || 1);

    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (overlay.bbox) {
      const [x1, y1, x2, y2] = overlay.bbox;
      ctx.strokeStyle = OVERLAY_COLORS[overlay.status || 'granted'] || '#22c55e';
      ctx.lineWidth = 3;
      ctx.strokeRect(x1 * scaleX, y1 * scaleY, (x2 - x1) * scaleX, (y2 - y1) * scaleY);
    }

    if (overlay.landmarks) {
      overlay.landmarks.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x * scaleX, y * scaleY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
      });
    }
  }, [overlay]);

  return (
    <div className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700">
      <div className="bg-slate-800 px-4 py-2 flex items-center gap-2 border-b border-slate-700">
        <span className={`w-2 h-2 rounded-full ${ok === null ? 'bg-yellow-400 animate-pulse' : ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
        <span className="text-sm font-medium text-slate-300">{label}</span>
      </div>
      <div className="relative aspect-video">
        <img
          ref={imgRef}
          src={`${src}?_t=${ts}`}
          className="w-full h-full object-contain bg-black"
          onLoad={() => setOk(true)}
          onError={() => setOk(false)}
          alt={label}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
        {ok === null && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-slate-400 text-sm">Đang kết nối...</div>
          </div>
        )}
      </div>
    </div>
  );
}