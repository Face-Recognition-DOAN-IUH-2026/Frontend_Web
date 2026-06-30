"use client";

const ITEMS = [
  { color: "bg-surface-3 border-border-2", label: "Đã qua" },
  { color: "bg-success/40 border-success", label: "Đang trực" },
  { color: "bg-primary/40 border-primary-dim", label: "Sắp tới" },
  { color: "bg-warning/40 border-warning", label: "Hôm nay" },
  { color: "bg-orange-400/40 border-orange-400", label: "Thiếu người" },
  { color: "bg-error/40 border-error", label: "Tạm ngưng" },
];

export default function TimetableLegend() {
  return (
    <div className="flex items-center gap-4 pt-4 border-t border-border">
      <span className="text-xs font-medium text-text-3 mr-1">Chú thích:</span>
      {ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={`w-3 h-3 rounded-sm border ${item.color}`} />
          <span className="text-xs text-text-3">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
