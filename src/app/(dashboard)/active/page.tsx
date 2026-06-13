"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api-client";
import type { ActivePatron } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { UserCheck, MapPin, Clock, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ActivePage() {
  const [patrons, setPatrons] = useState<ActivePatron[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const load = async () => {
    try {
      const data = await api.getActivePatrons();
      setPatrons(data.items);
      setLastUpdate(new Date());
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="success" dot>
            {patrons.length} đang ở trong thư viện
          </Badge>
          {!loading && (
            <span className="text-caption text-text-3 flex items-center gap-1">
              <RefreshCw size={10} />
              Cập nhật {lastUpdate.toLocaleTimeString("vi-VN")}
            </span>
          )}
        </div>
        <button
          onClick={load}
          className="btn-ghost p-2"
          title="Làm mới"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading && patrons.length === 0 ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-body-sm text-text-3">Đang tải...</p>
          </div>
        </div>
      ) : patrons.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<UserCheck size={24} />}
              title="Thư viện trống"
              description="Không có độc giả nào đang có mặt trong thư viện lúc này"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patrons.map((p) => (
            <Card key={p.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                    {p.full_name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-semibold text-text truncate">
                      {p.full_name}
                    </p>
                    <p className="text-caption font-mono text-text-3 mt-0.5">
                      {p.student_code}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-body-sm text-text-2">
                    <Clock size={13} className="shrink-0 text-text-3" />
                    <span>
                      Vào lúc{" "}
                      {new Date(p.entered_at).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-body-sm text-text-2">
                    <MapPin size={13} className="shrink-0 text-text-3" />
                    <span className="font-mono text-caption">{p.camera_id}</span>
                  </div>
                  {p.confidence && (
                    <div className="flex items-center gap-2 text-body-sm">
                      <div className="flex-1 h-1 bg-surface-3 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success rounded-full"
                          style={{ width: `${(p.confidence * 100).toFixed(0)}%` }}
                        />
                      </div>
                      <span className="text-caption text-success font-medium">
                        {(p.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}